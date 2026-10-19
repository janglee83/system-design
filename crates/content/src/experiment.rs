//! Engine stage of an experiment: base and options (this task), runs and grading (Task 13),
//! numeric expectations (Task 14).

use crate::checks::Outcome;
use crate::controls::ControlPath;
use crate::engine_input::{engine_check, lesson_input};
use crate::issue::codes;
use crate::types::*;
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

/// Task 13.
fn run_choices(
    _path: &str,
    _exp: &Experiment,
    _controls: &[(&ControlPath, &Control)],
    _out: &mut Outcome,
) {
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
}
