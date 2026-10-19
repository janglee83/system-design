//! Goals, experiment choices, the shape of `expect`, and reading checks (rulings R7, R13).

use crate::ids;
use crate::issue::{codes, ContentIssue};
use crate::known;
use crate::types::*;
use sim_core::fixture::parse_op;
use sim_core::{ConfigValue, Goal};
use std::collections::{BTreeMap, BTreeSet};

pub(crate) fn check_goals(path: &str, goals: &[Goal], reserved: Option<&str>) -> Vec<ContentIssue> {
    let mut out = vec![];
    if goals.is_empty() {
        out.push(
            ContentIssue::new(codes::CHOICE, path)
                .field("goals")
                .detail("needs at least one goal"),
        );
    }
    let metrics = known::metric_keys();
    let mut seen = BTreeSet::new();
    for g in goals {
        if !seen.insert(g.id.as_str()) || reserved == Some(g.id.as_str()) {
            out.push(
                ContentIssue::new(codes::DUPLICATE_ID, path)
                    .id(g.id.clone())
                    .field("goals"),
            );
        }
        if !metrics.contains(&g.metric) {
            out.push(
                ContentIssue::new(codes::EXPECT, path)
                    .id(g.id.clone())
                    .field(g.metric.clone())
                    .detail("unknown metric"),
            );
        }
    }
    out
}

fn check_expect(path: &str, c: &Choice) -> Vec<ContentIssue> {
    let metrics = known::metric_keys();
    let mut out = vec![];
    for (metric, ops) in &c.expect {
        if !metrics.contains(metric) {
            out.push(
                ContentIssue::new(codes::EXPECT, path)
                    .id(c.id.clone())
                    .field(metric.clone())
                    .detail("unknown metric"),
            );
        }
        if ops.is_empty() {
            out.push(
                ContentIssue::new(codes::EXPECT, path)
                    .id(c.id.clone())
                    .field(metric.clone())
                    .detail("no comparison"),
            );
        }
        for op in ops.keys() {
            if parse_op(op).is_none() {
                out.push(
                    ContentIssue::new(codes::EXPECT, path)
                        .id(c.id.clone())
                        .field(metric.clone())
                        .detail(format!("unknown op {op}")),
                );
            }
        }
    }
    out
}

/// Settings a choice runs with: every control, in control order.
pub(crate) fn effective(exp: &Experiment, c: &Choice) -> Vec<(String, ConfigValue)> {
    exp.controls
        .iter()
        .map(|k| (k.id.clone(), c.set.get(&k.id).unwrap_or(&k.default).clone()))
        .collect()
}

pub(crate) fn check_choices(path: &str, exp: &Experiment) -> Vec<ContentIssue> {
    let mut out = check_goals(path, &exp.goals, None);
    let choice = |id: &str| ContentIssue::new(codes::CHOICE, path).id(id.to_string());
    if !(2..=6).contains(&exp.choices.len()) {
        out.push(
            ContentIssue::new(codes::CHOICE, path)
                .field("choices")
                .detail("needs 2 to 6 choices"),
        );
    }
    if exp.choices.iter().filter(|c| c.correct).count() != 1 {
        out.push(
            ContentIssue::new(codes::CHOICE, path)
                .field("correct")
                .detail("needs exactly one correct choice"),
        );
    }
    let goals: BTreeSet<&str> = exp.goals.iter().map(|g| g.id.as_str()).collect();
    let controls: BTreeMap<&str, &Control> =
        exp.controls.iter().map(|c| (c.id.as_str(), c)).collect();
    let mut seen = BTreeSet::new();
    for c in &exp.choices {
        if !seen.insert(c.id.as_str()) {
            out.push(
                ContentIssue::new(codes::DUPLICATE_ID, path)
                    .id(c.id.clone())
                    .field("choices"),
            );
        }
        if !ids::is_choice_id(&c.id) {
            out.push(choice(&c.id).field("id").detail("choice ids are A-F"));
        }
        if c.correct {
            if c.misconception.is_some() || !c.fails_goals.is_empty() {
                out.push(
                    choice(&c.id)
                        .field("correct")
                        .detail("the correct choice has no misconception or failsGoals"),
                );
            }
        } else {
            if !c
                .misconception
                .as_deref()
                .is_some_and(|m| ids::numbered(m, 'M'))
            {
                out.push(choice(&c.id).field("misconception"));
            }
            if c.fails_goals.is_empty() {
                out.push(
                    choice(&c.id)
                        .field("failsGoals")
                        .detail("a wrong choice must fail at least one goal"),
                );
            }
        }
        for g in &c.fails_goals {
            if !goals.contains(g.as_str()) {
                out.push(
                    choice(&c.id)
                        .field("failsGoals")
                        .detail(format!("unknown goal {g}")),
                );
            }
        }
        for (k, v) in &c.set {
            match controls.get(k.as_str()) {
                None => out.push(
                    choice(&c.id)
                        .field("set")
                        .detail(format!("unknown control {k}")),
                ),
                Some(ctl) if !ctl.options.contains(v) => out.push(
                    choice(&c.id)
                        .field("set")
                        .detail(format!("{k}: not an option")),
                ),
                Some(_) => {}
            }
        }
        out.extend(check_expect(path, c));
    }
    for (j, b) in exp.choices.iter().enumerate() {
        if let Some(a) = exp.choices[..j]
            .iter()
            .find(|a| effective(exp, a) == effective(exp, b))
        {
            out.push(
                choice(&b.id)
                    .field("set")
                    .detail(format!("same settings as {}", a.id)),
            );
        }
    }
    out
}

pub(crate) fn check_questions(path: &str, check: &Check) -> Vec<ContentIssue> {
    let mut out = vec![];
    let q_issue = |id: &str| ContentIssue::new(codes::CHOICE, path).id(id.to_string());
    let n = check.questions.len() as u32;
    if n == 0 {
        out.push(
            ContentIssue::new(codes::CHOICE, path)
                .field("questions")
                .detail("needs at least one question"),
        );
    }
    if check.pass_mark == 0 || check.pass_mark > n {
        out.push(
            ContentIssue::new(codes::CHOICE, path)
                .field("passMark")
                .detail("must be 1..=questions"),
        );
    }
    let mut seen = BTreeSet::new();
    for q in &check.questions {
        if !seen.insert(q.id.as_str()) {
            out.push(
                ContentIssue::new(codes::DUPLICATE_ID, path)
                    .id(q.id.clone())
                    .field("questions"),
            );
        }
        if !ids::numbered(&q.id, 'q') {
            out.push(q_issue(&q.id).field("id"));
        }
        if q.misconception
            .as_deref()
            .is_some_and(|m| !ids::numbered(m, 'M'))
        {
            out.push(q_issue(&q.id).field("misconception"));
        }
        match q.kind {
            QuestionType::Single => {
                if q.options.len() < 2 {
                    out.push(
                        q_issue(&q.id)
                            .field("options")
                            .detail("needs at least 2 options"),
                    );
                }
                let mut opts = BTreeSet::new();
                for o in &q.options {
                    if !opts.insert(o.as_str()) {
                        out.push(
                            ContentIssue::new(codes::DUPLICATE_ID, path)
                                .id(format!("{}.{o}", q.id))
                                .field("options"),
                        );
                    }
                    if !ids::is_option_id(o) {
                        out.push(
                            q_issue(&q.id)
                                .field("options")
                                .detail(format!("bad option id {o}")),
                        );
                    }
                }
                if !matches!(&q.answer, Answer::Text(a) if q.options.contains(a)) {
                    out.push(
                        q_issue(&q.id)
                            .field("answer")
                            .detail("answer must be one of the options"),
                    );
                }
            }
            QuestionType::Numeric => {
                if !matches!(q.answer, Answer::Number(_)) {
                    out.push(
                        q_issue(&q.id)
                            .field("answer")
                            .detail("numeric answer expected"),
                    );
                }
                if !q.options.is_empty() {
                    out.push(
                        q_issue(&q.id)
                            .field("options")
                            .detail("numeric questions have no options"),
                    );
                }
                if q.tolerance.is_some_and(|t| !t.is_finite() || t < 0.0) {
                    out.push(q_issue(&q.id).field("tolerance"));
                }
            }
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

    fn exp(edit: impl FnOnce(&mut Value)) -> Vec<ContentIssue> {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]));
        issues_of(&validate_tree(&t), "l0-fx-capacity")
    }

    fn check(edit: impl FnOnce(&mut Value)) -> Vec<ContentIssue> {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-reading", |v| edit(&mut v["check"]));
        issues_of(&validate_tree(&t), "l0-fx-reading")
    }

    type Edit = Box<dyn FnOnce(&mut Value)>;

    fn has_code(i: &[ContentIssue], code: &str) -> bool {
        i.iter().any(|i| i.code == code)
    }

    #[test]
    fn choice_rules() {
        let cases: Vec<(&str, Edit)> = vec![
            (
                "two correct",
                Box::new(|e| e["choices"][1]["correct"] = true.into()),
            ),
            (
                "none correct",
                Box::new(|e| e["choices"][0]["correct"] = false.into()),
            ),
            (
                "one choice",
                Box::new(|e| e["choices"].as_array_mut().unwrap().truncate(1)),
            ),
            (
                "seven choices",
                Box::new(|e| {
                    let c = e["choices"][2].clone();
                    let a = e["choices"].as_array_mut().unwrap();
                    for (id, cpu) in [("D", 4), ("E", 4), ("F", 4), ("G", 4)] {
                        let mut x = c.clone();
                        x["id"] = id.into();
                        x["set"] = json!({"cpu": cpu});
                        a.push(x);
                    }
                }),
            ),
            ("bad id", Box::new(|e| e["choices"][2]["id"] = "c".into())),
            (
                "wrong without misconception",
                Box::new(|e| {
                    e["choices"][1]
                        .as_object_mut()
                        .unwrap()
                        .remove("misconception");
                }),
            ),
            (
                "wrong without failsGoals",
                Box::new(|e| e["choices"][1]["failsGoals"] = json!([])),
            ),
            (
                "unknown goal",
                Box::new(|e| e["choices"][1]["failsGoals"] = json!(["slow"])),
            ),
            (
                "correct with failsGoals",
                Box::new(|e| e["choices"][0]["failsGoals"] = json!(["fast"])),
            ),
            (
                "set unknown control",
                Box::new(|e| e["choices"][0]["set"] = json!({"ram": 2})),
            ),
            (
                "set non-option",
                Box::new(|e| e["choices"][0]["set"] = json!({"cpu": 3})),
            ),
            (
                "same settings",
                Box::new(|e| e["choices"][2]["set"] = json!({"cpu": 1, "timeout": 5000})),
            ),
        ];
        for (name, edit) in cases {
            assert!(has_code(&exp(edit), codes::CHOICE), "{name}");
        }
    }

    #[test]
    fn goal_and_expect_shape() {
        assert!(has_code(
            &exp(|e| e["goals"][1]["id"] = "fast".into()),
            codes::DUPLICATE_ID
        ));
        assert!(has_code(
            &exp(|e| e["goals"][0]["metric"] = "p96".into()),
            codes::EXPECT
        ));
        assert!(has_code(
            &exp(|e| e["choices"][0]["expect"] = json!({"p95": {"<": 3}})),
            codes::EXPECT
        ));
        assert!(has_code(
            &exp(|e| e["choices"][0]["expect"] = json!({"latency": {"<=": 3}})),
            codes::EXPECT
        ));
        assert!(has_code(&exp(|e| e["goals"] = json!([])), codes::CHOICE));
        assert!(has_code(
            &exp(|e| e["choices"][2]["id"] = "B".into()),
            codes::DUPLICATE_ID
        ));
    }

    #[test]
    fn reading_check_rules() {
        assert!(has_code(
            &check(|c| c["passMark"] = 3.into()),
            codes::CHOICE
        ));
        assert!(has_code(
            &check(|c| c["passMark"] = 0.into()),
            codes::CHOICE
        ));
        assert!(has_code(
            &check(|c| c["questions"][0]["answer"] = "d".into()),
            codes::CHOICE
        ));
        assert!(has_code(
            &check(|c| c["questions"][0]["options"] = json!(["a"])),
            codes::CHOICE
        ));
        assert!(has_code(
            &check(|c| c["questions"][1]["answer"] = "x".into()),
            codes::CHOICE
        ));
        assert!(has_code(
            &check(|c| c["questions"][1]["tolerance"] = (-1).into()),
            codes::CHOICE
        ));
        assert!(has_code(
            &check(|c| c["questions"][1]["id"] = "q1".into()),
            codes::DUPLICATE_ID
        ));
        assert!(has_code(
            &check(|c| c["questions"][0]["options"] = json!(["a", "a"])),
            codes::DUPLICATE_ID
        ));
        assert!(has_code(
            &check(|c| c["questions"][1]["id"] = "Q2".into()),
            codes::CHOICE
        ));
    }

    #[test]
    fn a_reserved_goal_id_is_a_duplicate_only_when_reserved() {
        let g = vec![sim_core::Goal {
            id: "budget".into(),
            metric: "p95".into(),
            op: sim_core::GoalOp::Le,
            value: 1.0,
        }];
        assert!(super::check_goals("x", &g, None).is_empty());
        let i = super::check_goals("x", &g, Some("budget"));
        assert_eq!(i.len(), 1);
        assert_eq!(
            (i[0].code.as_str(), i[0].id.as_deref()),
            (codes::DUPLICATE_ID, Some("budget"))
        );
    }

    #[test]
    fn an_empty_op_map_in_expect_is_an_expect_issue() {
        let i = exp(|e| e["choices"][0]["expect"] = json!({"p95": {}}));
        assert!(
            i.iter().any(|i| i.code == codes::EXPECT
                && i.field.as_deref() == Some("p95")
                && i.detail.as_deref() == Some("no comparison")),
            "{i:#?}"
        );
    }
}
