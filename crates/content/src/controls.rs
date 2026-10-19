//! Control paths (spec §3.1, ruling R12): parse, resolve against `base`, write a value.

use crate::issue::{codes, ContentIssue};
use crate::known;
use crate::types::*;
use serde_json::{Map, Value};
use sim_core::ConfigValue;
use std::collections::BTreeSet;

#[derive(Debug, Clone, PartialEq)]
pub enum ControlPath {
    Workload(String),
    Calibration(String),
    DurationMs,
    Seed,
    NodeReplicas(String),
    NodeConfig(String, String),
    FaultAt(usize),
}

fn field_name(f: &str) -> bool {
    !f.is_empty() && f.chars().all(|c| c.is_ascii_alphanumeric())
}

pub fn parse_path(s: &str) -> Option<ControlPath> {
    use ControlPath::*;
    match s {
        "durationMs" => return Some(DurationMs),
        "seed" => return Some(Seed),
        _ => {}
    }
    if let Some(f) = s.strip_prefix("workload.") {
        return field_name(f).then(|| Workload(f.into()));
    }
    if let Some(f) = s.strip_prefix("calibration.") {
        return field_name(f).then(|| Calibration(f.into()));
    }
    if let Some(rest) = s.strip_prefix("graph.nodes[") {
        let (id, tail) = rest.split_once(']')?;
        if id.is_empty() {
            return None;
        }
        if tail == ".replicas" {
            return Some(NodeReplicas(id.into()));
        }
        let key = tail.strip_prefix(".config.")?;
        return field_name(key).then(|| NodeConfig(id.into(), key.into()));
    }
    if let Some(rest) = s.strip_prefix("faults[") {
        let (i, tail) = rest.split_once(']')?;
        if tail != ".atMs" {
            return None;
        }
        // Canonical digits only: no sign, no spaces, no leading zero.
        let canonical = !i.is_empty()
            && i.bytes().all(|b| b.is_ascii_digit())
            && (i == "0" || !i.starts_with('0'));
        return canonical.then(|| i.parse().ok()).flatten().map(FaultAt);
    }
    None
}

fn node<'a>(base: &'a Value, id: &str) -> Option<&'a Value> {
    base.get("graph")?
        .get("nodes")?
        .as_array()?
        .iter()
        .find(|n| n.get("id").and_then(Value::as_str) == Some(id))
}

/// Why `path` does not address a value in `base`, if it does not.
pub fn resolve(path: &ControlPath, base: &Value) -> Result<(), String> {
    use ControlPath::*;
    match path {
        Workload(f) if !known::workload_scalar_keys().contains(f) => {
            Err(format!("workload has no scalar field {f}"))
        }
        Calibration(f) if !known::calibration_keys().contains(f) => {
            Err(format!("calibration has no field {f}"))
        }
        NodeReplicas(id) => node(base, id).map(|_| ()).ok_or(format!("no node {id}")),
        NodeConfig(id, key) => {
            let n = node(base, id).ok_or(format!("no node {id}"))?;
            let kind = n.get("kind").and_then(Value::as_str).unwrap_or_default();
            match known::config_keys(kind) {
                Some(keys) if !keys.contains(key) => Err(format!("{kind} has no config key {key}")),
                _ => Ok(()), // a known key, or a planned kind that readiness blocks
            }
        }
        FaultAt(i) => base
            .get("faults")
            .and_then(Value::as_array)
            .and_then(|f| f.get(*i))
            .map(|_| ())
            .ok_or(format!("no fault {i}")),
        _ => Ok(()),
    }
}

fn to_json(v: &ConfigValue) -> Value {
    match v {
        ConfigValue::Bool(b) => Value::Bool(*b),
        ConfigValue::Str(s) => Value::String(s.clone()),
        // Whole numbers as integers, so u32 fields (replicas, seed, atMs) deserialize.
        ConfigValue::Num(n) if n.fract() == 0.0 && n.abs() < 9.0e15 => Value::from(*n as i64),
        ConfigValue::Num(n) => serde_json::Number::from_f64(*n)
            .map(Value::Number)
            .unwrap_or(Value::Null),
    }
}

fn obj<'a>(v: &'a mut Value, key: &str) -> Option<&'a mut Map<String, Value>> {
    v.as_object_mut()?
        .entry(key)
        .or_insert_with(|| Value::Object(Map::new()))
        .as_object_mut()
}

/// Write `value` at `path`. Paths are resolved before this is called; anything that does not
/// fit (a non-object base) is skipped here and caught by the engine check.
pub fn apply(input: &mut Value, path: &ControlPath, value: &ConfigValue) {
    use ControlPath::*;
    let v = to_json(value);
    match path {
        Workload(f) => {
            if let Some(w) = obj(input, "workload") {
                w.insert(f.clone(), v);
            }
        }
        Calibration(f) => {
            if let Some(c) = obj(input, "calibration") {
                c.insert(f.clone(), v);
            }
        }
        DurationMs => {
            if let Some(o) = input.as_object_mut() {
                o.insert("durationMs".into(), v);
            }
        }
        Seed => {
            if let Some(o) = input.as_object_mut() {
                o.insert("seed".into(), v);
            }
        }
        NodeReplicas(id) | NodeConfig(id, _) => {
            let Some(nodes) = input
                .get_mut("graph")
                .and_then(|g| g.get_mut("nodes"))
                .and_then(Value::as_array_mut)
            else {
                return;
            };
            let Some(n) = nodes
                .iter_mut()
                .find(|n| n.get("id").and_then(Value::as_str) == Some(id))
            else {
                return;
            };
            match path {
                NodeReplicas(_) => {
                    if let Some(o) = n.as_object_mut() {
                        o.insert("replicas".into(), v);
                    }
                }
                NodeConfig(_, key) => {
                    if let Some(c) = obj(n, "config") {
                        c.insert(key.clone(), v);
                    }
                }
                _ => {}
            }
        }
        FaultAt(i) => {
            if let Some(f) = input
                .get_mut("faults")
                .and_then(Value::as_array_mut)
                .and_then(|f| f.get_mut(*i))
                .and_then(Value::as_object_mut)
            {
                f.insert("atMs".into(), v);
            }
        }
    }
}

/// Every control paired with its resolved path, in control order.
pub(crate) type Resolved<'a> = Vec<(&'a Control, ControlPath)>;

/// Structural control checks. The resolved list is all-or-nothing: `None` as soon as one
/// path does not parse or resolve, so callers can never pair a control with another's path.
/// Engine acceptance of each option is checked in `experiment`.
pub(crate) fn check_controls<'a>(
    path: &str,
    exp: &'a Experiment,
) -> (Vec<ContentIssue>, Option<Resolved<'a>>) {
    let mut out = vec![];
    let mut resolved: Option<Resolved<'a>> = Some(vec![]);
    let mut seen = BTreeSet::new();
    for c in &exp.controls {
        let issue = |detail: String| {
            ContentIssue::new(codes::CONTROL, path)
                .id(c.id.clone())
                .detail(detail)
        };
        if !seen.insert(c.id.as_str()) {
            out.push(
                ContentIssue::new(codes::DUPLICATE_ID, path)
                    .id(c.id.clone())
                    .field("controls"),
            );
        }
        match parse_path(&c.path) {
            None => {
                out.push(issue(format!("bad path {}", c.path)).field("path"));
                resolved = None;
            }
            Some(p) => match resolve(&p, &exp.base) {
                Err(e) => {
                    out.push(issue(e).field("path"));
                    resolved = None;
                }
                Ok(()) => {
                    if let Some(r) = resolved.as_mut() {
                        r.push((c, p));
                    }
                }
            },
        }
        if c.options.len() < 2 {
            out.push(issue("needs at least 2 options".into()).field("options"));
        }
        for (i, a) in c.options.iter().enumerate() {
            if c.options[..i].contains(a) {
                out.push(issue("duplicate option".into()).field("options"));
            }
        }
        if !c.options.contains(&c.default) {
            out.push(issue("default is not an option".into()).field("default"));
        }
        match c.kind {
            ControlType::Stepper => {
                let nums: Option<Vec<f64>> = c.options.iter().map(ConfigValue::as_f64).collect();
                if !nums.is_some_and(|n| n.windows(2).all(|w| w[0] < w[1])) {
                    out.push(
                        issue("stepper options must be ascending numbers".into()).field("options"),
                    );
                }
            }
            ControlType::Toggle if c.options.len() != 2 => {
                out.push(issue("toggle needs exactly 2 options".into()).field("options"))
            }
            _ => {}
        }
    }
    (out, resolved)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::json;

    #[test]
    fn grammar() {
        use ControlPath::*;
        assert_eq!(
            parse_path("workload.baseRps"),
            Some(Workload("baseRps".into()))
        );
        assert_eq!(
            parse_path("calibration.edgeDelayHttpMs"),
            Some(Calibration("edgeDelayHttpMs".into()))
        );
        assert_eq!(parse_path("durationMs"), Some(DurationMs));
        assert_eq!(
            parse_path("graph.nodes[web].replicas"),
            Some(NodeReplicas("web".into()))
        );
        assert_eq!(
            parse_path("graph.nodes[web].config.cpu"),
            Some(NodeConfig("web".into(), "cpu".into()))
        );
        assert_eq!(parse_path("faults[0].atMs"), Some(FaultAt(0)));
        assert_eq!(parse_path("faults[10].atMs"), Some(FaultAt(10)));
        for bad in [
            "workload",
            "workload.surge.factor",
            "graph.nodes[].replicas",
            "graph.nodes[web].label",
            "faults[x].atMs",
            "faults[99999999999999999999].atMs",
            "faults[+1].atMs",
            "faults[01].atMs",
            "faults[ 1].atMs",
            "faults[].atMs",
            "nodes.web.config.cpu",
            "",
        ] {
            assert_eq!(parse_path(bad), None, "{bad}");
        }
    }

    #[test]
    fn apply_creates_missing_objects() {
        let mut v = json!({"graph": {"nodes": [{"id": "web", "kind": "web-server"}], "edges": []}, "workload": {"baseRps": 1}});
        apply(
            &mut v,
            &parse_path("graph.nodes[web].config.cpu").unwrap(),
            &ConfigValue::Num(2.0),
        );
        apply(
            &mut v,
            &parse_path("calibration.edgeDelayHttpMs").unwrap(),
            &ConfigValue::Num(40.5),
        );
        apply(&mut v, &parse_path("seed").unwrap(), &ConfigValue::Num(7.0));
        assert_eq!(v["graph"]["nodes"][0]["config"]["cpu"], json!(2));
        assert_eq!(v["calibration"]["edgeDelayHttpMs"], json!(40.5));
        assert_eq!(v["seed"], json!(7));
        let mut not_object = json!([1, 2]);
        apply(
            &mut not_object,
            &parse_path("seed").unwrap(),
            &ConfigValue::Num(1.0),
        ); // no panic
    }

    fn control_issues(edit: impl FnOnce(&mut serde_json::Value)) -> Vec<crate::ContentIssue> {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            edit(&mut v["experiment"]["controls"])
        });
        issues_of(&validate_tree(&t), "l0-fx-capacity")
    }

    #[test]
    fn unresolvable_paths() {
        for path in [
            "graph.nodes[ghost].replicas",
            "graph.nodes[ghost].config.cpu",
            "graph.nodes[web].config.turbo",
            "workload.surge",
            "workload.nope",
            "calibration.nope",
            "faults[0].atMs",
            "bogus",
        ] {
            let i = control_issues(|c| c[0]["path"] = path.into());
            assert!(
                i.iter()
                    .any(|i| i.code == codes::CONTROL && i.id.as_deref() == Some("cpu")),
                "{path}"
            );
        }
    }

    #[test]
    fn option_rules() {
        let p = "graph.nodes[web].config.cpu";
        let cases = vec![
            (
                "default not an option",
                json!({"id": "cpu", "type": "stepper", "path": p, "options": [1, 2], "default": 4}),
            ),
            (
                "one option",
                json!({"id": "cpu", "type": "select", "path": p, "options": [1], "default": 1}),
            ),
            (
                "duplicate options",
                json!({"id": "cpu", "type": "select", "path": p, "options": [1, 1], "default": 1}),
            ),
            (
                "stepper not ascending",
                json!({"id": "cpu", "type": "stepper", "path": p, "options": [2, 1], "default": 1}),
            ),
            (
                "stepper not numeric",
                json!({"id": "cpu", "type": "stepper", "path": p, "options": ["a", "b"], "default": "a"}),
            ),
            (
                "toggle with three",
                json!({"id": "cpu", "type": "toggle", "path": p, "options": [1, 2, 4], "default": 1}),
            ),
        ];
        for (name, c) in cases {
            let i = control_issues(|cs| cs[0] = c);
            assert!(i.iter().any(|i| i.code == codes::CONTROL), "{name}");
        }
    }

    #[test]
    fn duplicate_control_ids() {
        let i = control_issues(|c| c[1]["id"] = "cpu".into());
        assert!(i
            .iter()
            .any(|i| i.code == codes::DUPLICATE_ID && i.id.as_deref() == Some("cpu")));
    }

    #[test]
    fn a_string_enum_workload_field_is_a_valid_control() {
        let i = control_issues(|c| {
            c.as_array_mut().unwrap().push(json!({"id": "arr", "type": "toggle",
                "path": "workload.arrivals", "options": ["poisson", "uniform"], "default": "poisson"}))
        });
        assert!(i.is_empty(), "{i:#?}");
        let i = control_issues(|c| c[0]["path"] = "workload.params".into());
        assert!(i.iter().any(|i| i.code == codes::CONTROL));
    }

    fn capacity_experiment(edit: impl FnOnce(&mut serde_json::Value)) -> Experiment {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]));
        let l: crate::Lesson = serde_json::from_str(t.lessons[0].json.text().unwrap()).unwrap();
        l.experiment.unwrap()
    }

    #[test]
    fn resolution_is_all_or_nothing_and_keeps_each_control_with_its_path() {
        let e = capacity_experiment(|_| {});
        let (issues, resolved) = check_controls("x", &e);
        assert!(issues.is_empty());
        let pairs: Vec<(&str, ControlPath)> = resolved
            .unwrap()
            .into_iter()
            .map(|(c, p)| (c.id.as_str(), p))
            .collect();
        assert_eq!(
            pairs,
            vec![
                ("cpu", ControlPath::NodeConfig("web".into(), "cpu".into())),
                ("timeout", ControlPath::Workload("clientTimeoutMs".into())),
            ]
        );
        let e = capacity_experiment(|e| e["controls"][0]["path"] = "bogus".into());
        let (issues, resolved) = check_controls("x", &e);
        assert!(resolved.is_none());
        assert!(issues.iter().any(|i| i.id.as_deref() == Some("cpu")));
    }
}
