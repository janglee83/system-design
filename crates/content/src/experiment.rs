//! Engine stage of an experiment: base and options (this task), runs and grading (Task 13),
//! numeric expectations (Task 14).

use crate::checks::Outcome;
use crate::controls::ControlPath;
use crate::engine_input::{engine_check, lesson_input};
use crate::issue::codes;
use crate::report::RunSummary;
use crate::types::*;
use sim_core::fixture::parse_op;
use sim_core::grade::compare;
use sim_core::{grade, metric_value, simulate};
use std::collections::BTreeMap;

/// Runs only when the structure is sound and readiness allows it; `paths[i]` belongs to
/// `exp.controls[i]`.
pub(crate) fn check_engine(path: &str, exp: &Experiment, paths: &[ControlPath], out: &mut Outcome) {
    let controls: Vec<(&ControlPath, &Control)> = paths.iter().zip(&exp.controls).collect();
    let defaults = lesson_input(&exp.base, &controls, &BTreeMap::new());
    if let Some(issue) = engine_check(&defaults).issue(codes::ENGINE_INVALID, path) {
        out.issues.push(issue.field("base"));
        return;
    }
    for (_, c) in &controls {
        for o in &c.options {
            let set = BTreeMap::from([(c.id.clone(), o.clone())]);
            let shown = serde_json::to_string(o).unwrap_or_default();
            let check = engine_check(&lesson_input(&exp.base, &controls, &set));
            if let Some(issue) = check.issue(codes::CONTROL, path) {
                let detail = match issue.detail.clone() {
                    Some(serde) => format!("option {shown}: {serde}"),
                    None => format!("option {shown}"),
                };
                out.issues
                    .push(issue.id(c.id.clone()).field("options").detail(detail));
            }
        }
    }
    run_choices(path, exp, &controls, out);
}

fn run_choices(
    path: &str,
    exp: &Experiment,
    controls: &[(&ControlPath, &Control)],
    out: &mut Outcome,
) {
    for c in &exp.choices {
        let check = engine_check(&lesson_input(&exp.base, controls, &c.set));
        let input = match check {
            crate::engine_input::EngineCheck::Accepted(i) => i,
            failed => {
                if let Some(issue) = failed.issue(codes::ENGINE_INVALID, path) {
                    out.issues.push(issue.id(c.id.clone()));
                }
                continue;
            }
        };
        let result = match simulate(&input) {
            Ok(r) => r,
            Err(e) => {
                out.issues.push(
                    crate::issue::ContentIssue::new(codes::ENGINE_INVALID, path)
                        .id(c.id.clone())
                        .engine(e),
                );
                continue;
            }
        };
        out.runs
            .push(RunSummary::of(format!("choice:{}", c.id), &result));
        for g in grade(&result, &exp.goals).goals {
            let listed = c.fails_goals.contains(&g.id);
            let code = match (c.correct, listed, g.passed) {
                (true, _, false) => codes::CORRECT_FAILS,
                (false, true, true) => codes::WRONG_PASSES,
                (false, false, false) => codes::WRONG_EXTRA_FAIL,
                _ => continue,
            };
            out.issues.push(
                crate::issue::ContentIssue::new(code, path)
                    .id(c.id.clone())
                    .field(g.id.clone())
                    .measured(g.measured),
            );
        }
        out.issues.extend(expect_issues(path, c, &result)); // Task 14
    }
}

fn expect_issues(
    path: &str,
    c: &Choice,
    r: &sim_core::SimResult,
) -> Vec<crate::issue::ContentIssue> {
    let mut out = vec![];
    for (metric, ops) in &c.expect {
        let measured = metric_value(&r.metrics, metric);
        for (op, expected) in ops {
            let Some(parsed) = parse_op(op) else { continue }; // reported structurally
            if !measured.is_some_and(|v| compare(v, parsed, *expected)) {
                out.push(
                    crate::issue::ContentIssue::new(codes::EXPECT, path)
                        .id(c.id.clone())
                        .field(metric.clone())
                        .measured(measured)
                        .detail(format!("{op} {expected}")),
                );
            }
        }
    }
    for code in &c.expect_events {
        if !r.events.iter().any(|e| &e.code == code) {
            out.push(
                crate::issue::ContentIssue::new(codes::EXPECT, path)
                    .id(c.id.clone())
                    .field(format!("event:{code}"))
                    .detail("event did not occur"),
            );
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::json;

    #[test]
    fn base_rejected_by_the_engine() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["base"]["graph"]["edges"][0]["kind"] = "db".into()
        });
        let i = issues_of(&validate_tree(&t), "l0-fx-capacity");
        let e = i
            .iter()
            .find(|i| i.code == codes::ENGINE_INVALID)
            .expect("engine-invalid");
        assert_eq!(e.field.as_deref(), Some("base"));
        assert_eq!(e.engine[0].code, "edge.not-accepted");
    }

    #[test]
    fn options_rejected_by_the_engine() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["controls"][0]["options"] = json!([0, 1, 2, 4]); // cpu 0 is out of range
            v["experiment"]["controls"][1] = json!({"id": "timeout", "type": "select",
                "path": "workload.clientTimeoutMs", "options": [-5, 1000, 5000], "default": 1000});
        });
        let i = issues_of(&validate_tree(&t), "l0-fx-capacity");
        let cpu = i
            .iter()
            .find(|i| i.code == codes::CONTROL && i.id.as_deref() == Some("cpu"))
            .unwrap();
        assert_eq!(cpu.engine[0].code, "config.invalid");
        assert!(i.iter().any(|i| i.code == codes::CONTROL
            && i.id.as_deref() == Some("timeout")
            && i.engine.iter().any(|e| e.code == "workload.invalid")));
    }

    #[test]
    fn non_integer_replicas_option_is_unreadable_not_a_panic() {
        let mut t = good_tree();
        // A third control, so no choice references it and the structure stays sound.
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["controls"].as_array_mut().unwrap().push(json!({
            "id": "reps", "type": "select", "path": "graph.nodes[web].replicas", "options": [1, 1.5], "default": 1}))
        });
        let i = issues_of(&validate_tree(&t), "l0-fx-capacity");
        assert!(i
            .iter()
            .any(|i| i.code == codes::CONTROL
                && i.detail.as_deref().is_some_and(|d| d.contains("1.5"))));
    }

    fn item(edit: impl FnOnce(&mut serde_json::Value)) -> crate::ItemReport {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]));
        validate_tree(&t)
            .items
            .into_iter()
            .find(|i| i.id == "l0-fx-capacity")
            .unwrap()
    }

    #[test]
    fn good_lesson_runs_every_choice() {
        let it = item(|_| {});
        let labels: Vec<&str> = it.runs.iter().map(|r| r.label.as_str()).collect();
        assert_eq!(labels, vec!["choice:A", "choice:B", "choice:C"]);
        // Measured while writing the plan: 2 vCPU -> p95 4.68; 1 vCPU -> 953.86 and 21,391 rejected.
        assert!(it.runs[0].metrics.p95 < 10.0);
        assert!(it.runs[1].metrics.requests_rejected > 1_000.0);
        assert_eq!(it.runs[1].events, vec!["node.overloaded"]);
    }

    #[test]
    fn correct_choice_missing_a_goal() {
        let it = item(|e| e["goals"][0]["value"] = 1.into());
        let i = it
            .issues
            .iter()
            .find(|i| i.code == codes::CORRECT_FAILS)
            .unwrap();
        assert_eq!(
            (i.id.as_deref(), i.field.as_deref()),
            (Some("A"), Some("fast"))
        );
        assert!(i.measured.unwrap() > 1.0);
    }

    #[test]
    fn wrong_choice_passing_a_listed_goal() {
        let it = item(|e| {
            e["choices"][2] = json!({"id": "C", "misconception": "M2", "set": {"cpu": 4},
                                                   "failsGoals": ["fast", "no-drops"]})
        });
        let goals: Vec<_> = it
            .issues
            .iter()
            .filter(|i| i.code == codes::WRONG_PASSES)
            .filter_map(|i| i.field.clone())
            .collect();
        assert_eq!(goals, vec!["fast", "no-drops"]);
        assert!(!it.passed);
    }

    #[test]
    fn wrong_choice_failing_an_unlisted_goal_only_warns() {
        let it = item(|e| e["choices"][2]["failsGoals"] = json!(["fast"]));
        let w = it
            .issues
            .iter()
            .find(|i| i.code == codes::WRONG_EXTRA_FAIL)
            .unwrap();
        assert_eq!(
            (w.id.as_deref(), w.field.as_deref(), w.blocking),
            (Some("C"), Some("no-drops"), false)
        );
        assert!(it.passed);
    }

    #[test]
    fn failed_numeric_expectation_reports_the_measured_value() {
        let it = item(|e| e["choices"][0]["expect"] = json!({"p95": {"<=": 1, ">=": 0}}));
        let x: Vec<_> = it
            .issues
            .iter()
            .filter(|i| i.code == codes::EXPECT)
            .collect();
        assert_eq!(x.len(), 1, "only <= 1 fails");
        assert_eq!(
            (
                x[0].id.as_deref(),
                x[0].field.as_deref(),
                x[0].detail.as_deref()
            ),
            (Some("A"), Some("p95"), Some("<= 1"))
        );
        assert!((x[0].measured.unwrap() - 4.68).abs() < 0.1);
    }

    #[test]
    fn missing_event() {
        let it =
            item(|e| e["choices"][1]["expectEvents"] = json!(["node.overloaded", "db.promoted"]));
        let x: Vec<_> = it
            .issues
            .iter()
            .filter(|i| i.code == codes::EXPECT)
            .collect();
        assert_eq!(x.len(), 1);
        assert_eq!(x[0].field.as_deref(), Some("event:db.promoted"));
    }

    #[test]
    fn unknown_ops_are_reported_once() {
        let it = item(|e| e["choices"][0]["expect"] = json!({"p95": {"<": 3}}));
        assert_eq!(
            it.issues.iter().filter(|i| i.code == codes::EXPECT).count(),
            1
        );
    }
}
