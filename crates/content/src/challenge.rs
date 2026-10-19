//! Challenges (spec §4, rulings R15 and R16): structure here; designs and runs in Tasks 16–17.

use crate::checks::{Ctx, Outcome};
use crate::choices::check_goals;
use crate::engine_input::{engine_check, mode_input, normalized, EngineCheck};
use crate::ids;
use crate::issue::{codes, ContentIssue};
use crate::readiness::Scan;
use crate::report::{Readiness, RunSummary};
use crate::types::*;
use serde_json::Value;
use sim_core::{grade, simulate, validate_graph, Goal, GoalOp, Graph, SimInput, ValidationIssue};
use std::collections::BTreeSet;

pub(crate) const BUDGET_GOAL: &str = "budget";

/// The challenge's goals plus the implicit budget goal of `mode`.
pub(crate) fn goals_for(c: &Challenge, m: &Mode) -> Vec<Goal> {
    let mut g = c.goals.clone();
    g.push(Goal {
        id: BUDGET_GOAL.into(),
        metric: "costPerMonth".into(),
        op: GoalOp::Le,
        value: m.budget_per_month,
    });
    g
}

pub(crate) fn start_node_ids(c: &Challenge) -> BTreeSet<String> {
    c.start["graph"]["nodes"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|n| n.get("id").and_then(Value::as_str).map(String::from))
        .collect()
}

pub(crate) fn check_structure(path: &str, c: &Challenge) -> Vec<ContentIssue> {
    let mut out = check_goals(path, &c.goals, Some(BUDGET_GOAL));
    let new = |code: &str| ContentIssue::new(code, path);
    if c.modes.is_empty() {
        out.push(
            new(codes::CHOICE)
                .field("modes")
                .detail("needs at least one mode"),
        );
    }
    let goal_ids: BTreeSet<&str> = c
        .goals
        .iter()
        .map(|g| g.id.as_str())
        .chain([BUDGET_GOAL])
        .collect();
    let mut seen = BTreeSet::new();
    for m in &c.modes {
        let id = m.id.clone();
        if !seen.insert(m.id.as_str()) {
            out.push(new(codes::DUPLICATE_ID).id(id.clone()).field("modes"));
        }
        if !ids::is_mode_id(&m.id) {
            out.push(
                new(codes::ID)
                    .id(id.clone())
                    .field("modes")
                    .detail("bad mode id"),
            );
        }
        if !(m.budget_per_month.is_finite() && m.budget_per_month > 0.0) {
            out.push(
                new(codes::LIMITS)
                    .id(id.clone())
                    .field("budgetPerMonth")
                    .detail("must be > 0"),
            );
        }
        if !m.faults.is_array() {
            out.push(
                new(codes::PARSE)
                    .id(id.clone())
                    .field("faults")
                    .detail("must be an array"),
            );
        }
        if !m.workload_override.is_object() {
            out.push(
                new(codes::PARSE)
                    .id(id.clone())
                    .field("workloadOverride")
                    .detail("must be an object"),
            );
        }
        for (name, g) in [
            ("reference.graph", &m.reference.graph),
            ("naive.graph", &m.naive.graph),
        ] {
            if !g.is_object() {
                out.push(
                    new(codes::PARSE)
                        .id(id.clone())
                        .field(name)
                        .detail("must be an object"),
                );
            }
        }
        if m.naive.fails_goals.is_empty() {
            out.push(
                new(codes::CHOICE)
                    .id(id.clone())
                    .field("naive.failsGoals")
                    .detail("a naive design must fail at least one goal"),
            );
        }
        for g in m
            .naive
            .fails_goals
            .iter()
            .filter(|g| !goal_ids.contains(g.as_str()))
        {
            out.push(
                new(codes::CHOICE)
                    .id(id.clone())
                    .field("naive.failsGoals")
                    .detail(format!("unknown goal {g}")),
            );
        }
    }
    let l = &c.limits;
    if l.max_nodes == Some(0)
        || l.max_instances == Some(0)
        || l.allowed_kinds.as_ref().is_some_and(Vec::is_empty)
    {
        out.push(
            new(codes::LIMITS)
                .field("limits")
                .detail("limits must allow at least one node"),
        );
    }
    let start_nodes = start_node_ids(c);
    let mut locked = BTreeSet::new();
    for n in &c.locked_nodes {
        if !locked.insert(n.as_str()) {
            out.push(new(codes::DUPLICATE_ID).id(n.clone()).field("lockedNodes"));
        }
        if !start_nodes.contains(n) {
            out.push(
                new(codes::LIMITS)
                    .id(n.clone())
                    .field("lockedNodes")
                    .detail("not in the start graph"),
            );
        }
    }
    let mut hints = BTreeSet::new();
    for h in &c.hints {
        if !hints.insert(h.as_str()) {
            out.push(new(codes::DUPLICATE_ID).id(h.clone()).field("hints"));
        }
        if !ids::numbered(h, 'h') {
            out.push(
                new(codes::ID)
                    .id(h.clone())
                    .field("hints")
                    .detail("bad hint id"),
            );
        }
    }
    out
}

fn limit_issues(graph: &Graph, limits: &sim_core::GraphLimits) -> Vec<ValidationIssue> {
    validate_graph(graph, Some(limits))
        .into_iter()
        .filter(|i| i.code.starts_with("limits."))
        .collect()
}

pub(crate) fn check_engine(
    path: &str,
    c: &Challenge,
    ctx: &Ctx,
    structural_ok: bool,
    out: &mut Outcome,
) {
    let start = normalized(&c.start);
    let mut scan = Scan::default();
    // Every mode replaces `faults`, so start's own faults never run: scan start without them.
    let mut start_alone = start.clone();
    if let Some(o) = start_alone.as_object_mut() {
        o.remove("faults");
    }
    scan.input(&start_alone, ctx);
    let mut designs: Vec<(&Mode, &str, Value)> = vec![];
    for m in &c.modes {
        if !(m.faults.is_array() && m.workload_override.is_object()) {
            continue; // reported structurally
        }
        let has_override = m
            .workload_override
            .as_object()
            .is_some_and(|o| !o.is_empty());
        if has_override && !start.get("workload").is_some_and(Value::is_object) {
            // The override has nothing to merge into; say so instead of dropping it.
            out.issues.push(
                ContentIssue::new(codes::ENGINE_INVALID, path)
                    .id(m.id.clone())
                    .field("workloadOverride")
                    .detail("start.workload is not an object"),
            );
            continue;
        }
        for (name, graph) in [("reference", &m.reference.graph), ("naive", &m.naive.graph)] {
            let v = mode_input(&start, m, graph);
            scan.input(&v, ctx);
            designs.push((m, name, v));
        }
    }
    for g in &c.goals {
        scan.metric(&g.metric, ctx);
    }
    scan.metric("costPerMonth", ctx);
    out.issues.extend(scan.issues(path));
    out.needs = scan.needs();
    out.missing = scan.missing.iter().cloned().collect();
    if !scan.missing.is_empty() {
        out.readiness = Some(Readiness::Blocked);
    }
    if !structural_ok || scan.stops_engine() {
        return;
    }

    let limits = c.limits.graph_limits();
    let start_graph: Graph = match serde_json::from_value(start["graph"].clone()) {
        Ok(g) => g,
        Err(e) => {
            out.issues.push(
                ContentIssue::new(codes::ENGINE_INVALID, path)
                    .id("start")
                    .detail(e.to_string()),
            );
            return;
        }
    };
    let lim = limit_issues(&start_graph, &limits);
    if !lim.is_empty() {
        out.issues.push(
            ContentIssue::new(codes::LIMITS, path)
                .id("start")
                .engine(lim),
        );
    }
    for (m, name, v) in designs {
        let label = format!("{}/{name}", m.id);
        let input = match engine_check(&v) {
            EngineCheck::Accepted(i) => i,
            failed => {
                if let Some(issue) = failed.issue(codes::ENGINE_INVALID, path) {
                    out.issues.push(issue.id(label));
                }
                continue;
            }
        };
        let lim = limit_issues(&input.graph, &limits);
        if !lim.is_empty() {
            out.issues.push(
                ContentIssue::new(codes::LIMITS, path)
                    .id(label.clone())
                    .engine(lim),
            );
        }
        for id in &c.locked_nodes {
            let before = start_graph.nodes.iter().find(|n| &n.id == id);
            let after = input.graph.nodes.iter().find(|n| &n.id == id);
            if before.is_some() && before != after {
                out.issues.push(
                    ContentIssue::new(codes::LIMITS, path)
                        .id(label.clone())
                        .field(id.clone())
                        .detail("locked node changed"),
                );
            }
        }
        run_design(path, c, m, name, &label, &input, out); // Task 17
    }
}

fn run_design(
    path: &str,
    c: &Challenge,
    m: &Mode,
    name: &str,
    label: &str,
    input: &SimInput,
    out: &mut Outcome,
) {
    let result = match simulate(input) {
        Ok(r) => r,
        Err(e) => {
            out.issues.push(
                ContentIssue::new(codes::ENGINE_INVALID, path)
                    .id(label)
                    .engine(e),
            );
            return;
        }
    };
    out.runs
        .push(RunSummary::of(format!("mode:{label}"), &result));
    for g in grade(&result, &goals_for(c, m)).goals {
        let code = match (name, g.passed) {
            ("reference", false) => codes::REFERENCE_FAILS,
            ("naive", true) if m.naive.fails_goals.contains(&g.id) => codes::NAIVE_PASSES,
            // Same rule as a wrong lesson choice: an unlisted failure only warns.
            ("naive", false) if !m.naive.fails_goals.contains(&g.id) => codes::WRONG_EXTRA_FAIL,
            _ => continue,
        };
        out.issues.push(
            ContentIssue::new(code, path)
                .id(label)
                .field(g.id.clone())
                .measured(g.measured),
        );
    }
}

#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::{validate_tree, ContentIssue};
    use serde_json::{json, Value};

    fn shop(edit: impl FnOnce(&mut Value)) -> Vec<ContentIssue> {
        let mut t = good_tree();
        edit_json(&mut t, "c-l0-fx-shop", edit);
        issues_of(&validate_tree(&t), "c-l0-fx-shop")
    }

    type Edit = Box<dyn FnOnce(&mut Value)>;

    fn has_code(i: &[ContentIssue], code: &str) -> bool {
        i.iter().any(|i| i.code == code)
    }

    #[test]
    fn structural_rules() {
        let cases: Vec<(&str, &str, Edit)> = vec![
            (
                "budget goal id is reserved",
                codes::DUPLICATE_ID,
                Box::new(|c| c["goals"][1]["id"] = "budget".into()),
            ),
            (
                "no modes",
                codes::CHOICE,
                Box::new(|c| c["modes"] = json!([])),
            ),
            (
                "duplicate mode",
                codes::DUPLICATE_ID,
                Box::new(|c| c["modes"][1]["id"] = "standard".into()),
            ),
            (
                "bad mode id",
                codes::ID,
                Box::new(|c| c["modes"][1]["id"] = "X".into()),
            ),
            (
                "zero budget",
                codes::LIMITS,
                Box::new(|c| c["modes"][0]["budgetPerMonth"] = 0.into()),
            ),
            (
                "naive fails nothing",
                codes::CHOICE,
                Box::new(|c| c["modes"][0]["naive"]["failsGoals"] = json!([])),
            ),
            (
                "naive unknown goal",
                codes::CHOICE,
                Box::new(|c| c["modes"][0]["naive"]["failsGoals"] = json!(["slow"])),
            ),
            (
                "faults not an array",
                codes::PARSE,
                Box::new(|c| c["modes"][0]["faults"] = json!({})),
            ),
            (
                "override not an object",
                codes::PARSE,
                Box::new(|c| c["modes"][0]["workloadOverride"] = json!(3)),
            ),
            (
                "design graph not an object",
                codes::PARSE,
                Box::new(|c| c["modes"][0]["reference"]["graph"] = json!([])),
            ),
            (
                "locked node not in start",
                codes::LIMITS,
                Box::new(|c| c["lockedNodes"] = json!(["ghost"])),
            ),
            (
                "locked twice",
                codes::DUPLICATE_ID,
                Box::new(|c| c["lockedNodes"] = json!(["users", "users"])),
            ),
            (
                "bad hint id",
                codes::ID,
                Box::new(|c| c["hints"] = json!(["hint1"])),
            ),
            (
                "hint twice",
                codes::DUPLICATE_ID,
                Box::new(|c| c["hints"] = json!(["h1", "h1"])),
            ),
            (
                "limit zero",
                codes::LIMITS,
                Box::new(|c| c["limits"]["maxNodes"] = 0.into()),
            ),
            (
                "limits typo",
                codes::PARSE,
                Box::new(|c| c["limits"]["maxNode"] = 4.into()),
            ),
        ];
        for (name, code, edit) in cases {
            assert!(has_code(&shop(edit), code), "{name}");
        }
    }

    #[test]
    fn budget_may_be_listed_as_a_naive_failure() {
        let i = shop(|c| c["modes"][0]["naive"]["failsGoals"] = json!(["fast", "up", "budget"]));
        assert!(!has_code(&i, codes::CHOICE));
    }

    fn shop_item(edit: impl FnOnce(&mut Value)) -> crate::ItemReport {
        let mut t = good_tree();
        edit_json(&mut t, "c-l0-fx-shop", edit);
        validate_tree(&t)
            .items
            .into_iter()
            .find(|i| i.id == "c-l0-fx-shop")
            .unwrap()
    }

    #[test]
    fn design_over_the_instance_limit() {
        let it =
            shop_item(|c| c["modes"][1]["reference"]["graph"]["nodes"][2]["replicas"] = 6.into()); // lb 1 + web 6 = 7 > 6
        let i = it.issues.iter().find(|i| i.code == codes::LIMITS).unwrap();
        assert_eq!(i.id.as_deref(), Some("chaos/reference"));
        assert_eq!(i.engine[0].code, "limits.too-many-instances");
    }

    #[test]
    fn kind_not_allowed() {
        let it = shop_item(|c| c["limits"]["allowedKinds"] = json!(["client", "web-server"]));
        assert!(it.issues.iter().any(|i| i.code == codes::LIMITS
            && i.id.as_deref() == Some("chaos/reference")
            && i.engine.iter().any(|e| e.code == "limits.kind-not-allowed")));
    }

    #[test]
    fn locked_node_changed_or_equal() {
        let it = shop_item(|c| {
            c["modes"][0]["reference"]["graph"]["nodes"][0]["label"] = "visitors".into()
        });
        assert!(it.issues.iter().any(|i| i.code == codes::LIMITS
            && i.id.as_deref() == Some("standard/reference")
            && i.field.as_deref() == Some("users")));
        // Review focus 5: the same node written differently is unchanged.
        let it = shop_item(|c| {
            c["modes"][0]["reference"]["graph"]["nodes"][0] =
                json!({"kind": "client", "replicas": 1, "id": "users"})
        });
        assert!(!it.issues.iter().any(|i| i.code == codes::LIMITS));
    }

    #[test]
    fn start_over_the_limits() {
        let it = shop_item(|c| c["limits"]["maxNodes"] = 1.into());
        assert!(it
            .issues
            .iter()
            .any(|i| i.code == codes::LIMITS && i.id.as_deref() == Some("start")));
    }

    #[test]
    fn design_rejected_by_the_engine() {
        let it = shop_item(|c| c["modes"][0]["naive"]["graph"]["edges"][0]["kind"] = "db".into());
        let i = it
            .issues
            .iter()
            .find(|i| i.code == codes::ENGINE_INVALID)
            .unwrap();
        assert_eq!(i.id.as_deref(), Some("standard/naive"));
        assert_eq!(i.engine[0].code, "edge.not-accepted");
    }

    #[test]
    fn blocked_challenge_and_unknown_override_field() {
        let it = shop_item(|c| {
            c["modes"][1]["faults"] = json!([{"kind": "instance-slow", "atMs": 3000}])
        });
        assert!(it
            .issues
            .iter()
            .any(|i| i.code == codes::BLOCKED && i.missing == vec!["fault:instance-slow"]));
        assert!(it.runs.is_empty() && it.passed);
        assert_eq!(it.readiness, Some(crate::Readiness::Blocked));
        let it = shop_item(|c| c["modes"][0]["workloadOverride"] = json!({"burst": 2}));
        assert!(it.issues.iter().any(
            |i| i.code == codes::ENGINE_INVALID && i.field.as_deref() == Some("workload.burst")
        ));
    }

    #[test]
    fn good_shop_runs_every_design() {
        let it = shop_item(|_| {});
        let labels: Vec<&str> = it.runs.iter().map(|r| r.label.as_str()).collect();
        assert_eq!(
            labels,
            vec![
                "mode:standard/reference",
                "mode:standard/naive",
                "mode:chaos/reference",
                "mode:chaos/naive"
            ]
        );
        // Measured while writing the plan.
        assert_eq!(it.runs[0].metrics.cost_per_month, 50.0);
        assert!(it.runs[3].metrics.availability < 0.5); // one web instance, lost at 3 s
        assert!(it.passed, "{:#?}", it.issues);
    }

    #[test]
    fn reference_missing_goals_and_budget() {
        let it = shop_item(|c| {
            c["modes"][0]["reference"]["graph"]["nodes"][1]["config"]["cpu"] = 1.into()
        });
        let f: Vec<_> = it
            .issues
            .iter()
            .filter(|i| i.code == codes::REFERENCE_FAILS)
            .filter_map(|i| i.field.clone())
            .collect();
        assert_eq!(f, vec!["fast", "up"]);
        let it = shop_item(|c| c["modes"][0]["budgetPerMonth"] = 40.into());
        let b = it
            .issues
            .iter()
            .find(|i| i.code == codes::REFERENCE_FAILS)
            .unwrap();
        assert_eq!(
            (b.field.as_deref(), b.measured),
            (Some("budget"), Some(50.0))
        );
    }

    #[test]
    fn naive_passing_a_goal_it_should_fail() {
        let it = shop_item(|c| {
            c["modes"][0]["naive"]["graph"]["nodes"][1]["config"] = json!({"cpu": 2});
            c["modes"][0]["naive"]["failsGoals"] = json!(["fast"]);
        });
        let i = it
            .issues
            .iter()
            .find(|i| i.code == codes::NAIVE_PASSES)
            .unwrap();
        assert_eq!(
            (i.id.as_deref(), i.field.as_deref()),
            (Some("standard/naive"), Some("fast"))
        );
    }

    #[test]
    fn naive_failing_an_unlisted_goal_only_warns() {
        let it = shop_item(|c| c["modes"][0]["naive"]["failsGoals"] = json!(["fast"]));
        let w = it
            .issues
            .iter()
            .find(|i| i.code == codes::WRONG_EXTRA_FAIL)
            .expect("warning");
        assert_eq!(
            (w.id.as_deref(), w.field.as_deref(), w.blocking),
            (Some("standard/naive"), Some("up"), false)
        );
        assert!(it.passed);
    }

    #[test]
    fn start_faults_are_not_scanned_because_modes_replace_them() {
        let it = shop_item(|c| {
            c["start"]["faults"] = json!([{"kind": "instance-slow", "atMs": 1, "extra": 1}])
        });
        assert!(it.issues.is_empty(), "{:#?}", it.issues);
        assert_eq!(it.readiness, Some(crate::Readiness::Ready));
    }

    #[test]
    fn an_override_without_a_start_workload_object_is_engine_invalid() {
        let it = shop_item(|c| {
            c["start"]["workload"] = json!(12000);
            c["modes"][0]["workloadOverride"] = json!({"baseRps": 1});
        });
        assert!(
            it.issues.iter().any(|i| i.code == codes::ENGINE_INVALID
                && i.id.as_deref() == Some("standard")
                && i.field.as_deref() == Some("workloadOverride")
                && i.detail.as_deref() == Some("start.workload is not an object")),
            "{:#?}",
            it.issues
        );
    }

    #[test]
    fn a_locked_node_written_with_2_or_2_point_0_is_unchanged() {
        let mut t = good_tree();
        edit_json(&mut t, "c-l0-fx-shop", |c| {
            c["lockedNodes"] = json!(["users", "web"]);
            c["start"]["graph"]["nodes"][1]["config"] = json!({"cpu": 2});
            c["modes"][0]["reference"]["graph"]["nodes"][1]["config"] = json!({"cpu": 77});
        });
        // Write the standard reference's cpu as `2.0` in the raw text.
        let item = t
            .challenges
            .iter_mut()
            .find(|i| i.folder == "c-l0-fx-shop")
            .unwrap();
        let text = item
            .json
            .text()
            .unwrap()
            .replacen("\"cpu\": 77", "\"cpu\": 2.0", 1);
        let v: Value = serde_json::from_str(&text).unwrap();
        assert!(v["modes"][0]["reference"]["graph"]["nodes"][1]["config"]["cpu"].is_f64());
        assert!(v["start"]["graph"]["nodes"][1]["config"]["cpu"].is_u64());
        item.json = crate::tree::FileText::Text(text);
        let it = validate_tree(&t)
            .items
            .into_iter()
            .find(|i| i.id == "c-l0-fx-shop")
            .unwrap();
        let locked: Vec<_> = it
            .issues
            .iter()
            .filter(|i| {
                i.code == codes::LIMITS && i.detail.as_deref() == Some("locked node changed")
            })
            .filter_map(|i| i.id.clone())
            .collect();
        // The other designs leave web's config out, so they do change it; standard/reference does not.
        assert!(
            !locked.contains(&"standard/reference".to_string()),
            "{locked:?}"
        );
        assert!(locked.contains(&"standard/naive".to_string()), "{locked:?}");
    }
}
