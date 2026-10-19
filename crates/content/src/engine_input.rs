//! Building engine inputs from content and asking the engine whether it accepts them.

use crate::controls::{apply, ControlPath};
use crate::issue::ContentIssue;
use crate::types::*;
use serde_json::Value;
use sim_core::{check_input, ConfigValue, SimInput, ValidationIssue};
use std::collections::BTreeMap;

/// Ruling R2: seed 1 unless the item sets one.
pub(crate) fn normalized(v: &Value) -> Value {
    let mut v = v.clone();
    if let Some(o) = v.as_object_mut() {
        o.entry("seed").or_insert(Value::from(1));
    }
    v
}

/// `base` with every control set: `set[id]` when given, else the control's default.
pub(crate) fn lesson_input(
    base: &Value,
    controls: &[(&ControlPath, &Control)],
    set: &BTreeMap<String, ConfigValue>,
) -> Value {
    let mut v = normalized(base);
    for (path, c) in controls {
        apply(&mut v, path, set.get(&c.id).unwrap_or(&c.default));
    }
    v
}

pub(crate) enum EngineCheck {
    Accepted(SimInput),
    Rejected(Vec<ValidationIssue>),
    Unreadable(String),
}

/// Typed conversion, then the same checks `simulate` runs. Warnings do not reject.
pub(crate) fn engine_check(v: &Value) -> EngineCheck {
    let input: SimInput = match serde_json::from_value(v.clone()) {
        Ok(i) => i,
        Err(e) => return EngineCheck::Unreadable(e.to_string()),
    };
    let blocking: Vec<ValidationIssue> = check_input(&input)
        .into_iter()
        .filter(|i| i.blocking)
        .collect();
    if blocking.is_empty() {
        EngineCheck::Accepted(input)
    } else {
        EngineCheck::Rejected(blocking)
    }
}

impl EngineCheck {
    /// The issue for a failed check, or `None` when the engine accepts the input.
    pub fn issue(&self, code: &str, path: &str) -> Option<ContentIssue> {
        match self {
            EngineCheck::Accepted(_) => None,
            EngineCheck::Rejected(e) => Some(ContentIssue::new(code, path).engine(e.clone())),
            EngineCheck::Unreadable(m) => Some(ContentIssue::new(code, path).detail(m.clone())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn seed_defaults_to_one() {
        assert_eq!(normalized(&json!({"graph": {}}))["seed"], json!(1));
        assert_eq!(normalized(&json!({"seed": 5}))["seed"], json!(5));
        assert_eq!(normalized(&json!([1])), json!([1])); // not an object: left alone
    }

    #[test]
    fn engine_check_three_ways() {
        let ok = json!({"graph": {"nodes": [{"id": "u", "kind": "client"}, {"id": "w", "kind": "web-server"}],
                                  "edges": [{"id": "e", "from": "u", "to": "w", "kind": "http"}]},
                        "workload": {"baseRps": 10}});
        assert!(matches!(engine_check(&ok), EngineCheck::Accepted(_)));
        let mut bad = ok.clone();
        bad["graph"]["edges"][0]["kind"] = "db".into();
        match engine_check(&bad) {
            EngineCheck::Rejected(e) => assert_eq!(e[0].code, "edge.not-accepted"),
            _ => panic!("expected Rejected"),
        }
        let mut unreadable = ok;
        unreadable["graph"]["nodes"][1]["replicas"] = json!(1.5);
        assert!(matches!(
            engine_check(&unreadable),
            EngineCheck::Unreadable(_)
        ));
    }
}
