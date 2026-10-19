//! Challenges (spec §4, rulings R15 and R16): structure here; designs and runs in Tasks 16–17.

use crate::choices::check_goals;
use crate::ids;
use crate::issue::{codes, ContentIssue};
use crate::types::*;
use serde_json::Value;
use sim_core::{Goal, GoalOp};
use std::collections::BTreeSet;

pub(crate) const BUDGET_GOAL: &str = "budget";

/// The challenge's goals plus the implicit budget goal of `mode`.
#[allow(dead_code)] // read by mode runs (plan Task 17); remove then
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
}
