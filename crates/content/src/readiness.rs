//! What an item needs from the engine (ruling R4). A planned name -> `missing` (blocked, a
//! warning). An input field the engine would silently ignore -> `unknown` (engine-invalid,
//! blocking). Unknown component or fault kinds are left to the engine, which rejects them.

use crate::checks::Ctx;
use crate::issue::{codes, ContentIssue};
use crate::known;
use crate::types::EngineNeeds;
use serde_json::{Map, Value};
use sim_core::FaultKind;
use std::collections::BTreeSet;

#[derive(Debug, Default)]
pub(crate) struct Scan {
    pub missing: BTreeSet<String>,
    pub unknown: BTreeSet<String>,
    pub components: BTreeSet<String>,
    pub faults: BTreeSet<String>,
    pub calibration: BTreeSet<String>,
    pub node_overrides: BTreeSet<String>,
    pub metrics: BTreeSet<String>,
}

impl Scan {
    pub fn field(&mut self, ctx: &Ctx, name: String) {
        if ctx.planned.fields.contains(&name) {
            self.missing.insert(format!("field:{name}"));
        } else {
            self.unknown.insert(name);
        }
    }

    fn extra_keys(&mut self, obj: &Map<String, Value>, known: &BTreeSet<String>, prefix: &str) {
        for k in obj.keys().filter(|k| !known.contains(*k)) {
            self.unknown.insert(format!("{prefix}{k}"));
        }
    }

    pub fn input(&mut self, v: &Value, ctx: &Ctx) {
        let Some(o) = v.as_object() else { return };
        self.extra_keys(o, known::input_keys(), "");
        if let Some(g) = o.get("graph") {
            self.graph(g, ctx);
        }
        if let Some(w) = o.get("workload").and_then(Value::as_object) {
            let keys = known::workload_keys();
            for k in w.keys().filter(|k| !keys.contains(*k)) {
                self.field(ctx, format!("workload.{k}"));
            }
            for k in w
                .get("params")
                .and_then(Value::as_object)
                .into_iter()
                .flat_map(|p| p.keys())
            {
                if !ctx.caps.workload_params.contains(k) {
                    self.field(ctx, format!("workload.params.{k}"));
                }
            }
            if let Some(s) = w.get("surge").and_then(Value::as_object) {
                self.extra_keys(s, known::surge_keys(), "workload.surge.");
            }
        }
        if let Some(c) = o.get("calibration").and_then(Value::as_object) {
            let keys = known::calibration_keys();
            for k in c.keys() {
                if keys.contains(k) {
                    self.calibration.insert(k.clone());
                } else {
                    self.field(ctx, format!("calibration.{k}"));
                }
            }
        }
        for (i, f) in o
            .get("faults")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .enumerate()
        {
            self.fault(i, f, ctx);
        }
    }

    pub fn graph(&mut self, g: &Value, ctx: &Ctx) {
        let Some(go) = g.as_object() else { return };
        self.extra_keys(go, known::graph_keys(), "graph.");
        for n in go
            .get("nodes")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let Some(no) = n.as_object() else { continue };
            let id = no.get("id").and_then(Value::as_str).unwrap_or("?");
            self.extra_keys(no, known::node_keys(), &format!("graph.nodes[{id}]."));
            let kind = no.get("kind").and_then(Value::as_str).unwrap_or_default();
            self.components.insert(kind.to_string());
            match known::config_keys(kind) {
                None if ctx.planned.components.iter().any(|c| c == kind) => {
                    self.missing.insert(format!("component:{kind}"));
                }
                None => {} // unknown kind: the engine rejects it (node.unknown-kind)
                Some(keys) => {
                    for k in no
                        .get("config")
                        .and_then(Value::as_object)
                        .into_iter()
                        .flat_map(|c| c.keys())
                    {
                        if !keys.contains(k) {
                            self.field(ctx, format!("config.{kind}.{k}"));
                        } else if sim_core::components::NODE_OVERRIDE_KEYS.contains(&k.as_str()) {
                            self.node_overrides.insert(k.clone());
                        }
                    }
                }
            }
        }
        for e in go
            .get("edges")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(eo) = e.as_object() {
                let id = eo.get("id").and_then(Value::as_str).unwrap_or("?");
                self.extra_keys(eo, known::edge_keys(), &format!("graph.edges[{id}]."));
            }
        }
    }

    pub fn fault(&mut self, i: usize, f: &Value, ctx: &Ctx) {
        let Some(fo) = f.as_object() else { return };
        self.extra_keys(fo, known::fault_keys(), &format!("faults[{i}]."));
        let Some(name) = fo.get("kind").and_then(Value::as_str) else {
            return;
        };
        self.faults.insert(name.to_string());
        match serde_json::from_value::<FaultKind>(Value::from(name)) {
            Ok(k) if ctx.caps.faults.contains(&k) => {}
            Ok(_) => {
                self.missing.insert(format!("fault:{name}"));
            }
            Err(_) if ctx.planned.faults.iter().any(|p| p == name) => {
                self.missing.insert(format!("fault:{name}"));
            }
            Err(_) => {} // not a fault kind at all: typed parsing rejects it
        }
    }

    /// Unknown metric names are reported by `choices` as content.expect.
    pub fn metric(&mut self, name: &str, ctx: &Ctx) {
        if !known::metric_keys().contains(name) {
            return;
        }
        self.metrics.insert(name.to_string());
        if !ctx.caps.metrics.iter().any(|m| m == name) {
            self.missing.insert(format!("metric:{name}"));
        }
    }

    pub fn stops_engine(&self) -> bool {
        !self.unknown.is_empty() || !self.missing.is_empty()
    }

    pub fn issues(&self, path: &str) -> Vec<ContentIssue> {
        let mut out: Vec<ContentIssue> = self
            .unknown
            .iter()
            .map(|f| {
                ContentIssue::new(codes::ENGINE_INVALID, path)
                    .field(f.clone())
                    .detail("unknown field")
            })
            .collect();
        if !self.missing.is_empty() {
            out.push(
                ContentIssue::new(codes::BLOCKED, path)
                    .missing(self.missing.iter().cloned().collect()),
            );
        }
        out
    }

    pub fn needs(&self) -> EngineNeeds {
        let v = |s: &BTreeSet<String>| s.iter().filter(|x| !x.is_empty()).cloned().collect();
        EngineNeeds {
            components: v(&self.components),
            faults: v(&self.faults),
            dynamic: vec![],
            behaviors: vec![],
            calibration: v(&self.calibration),
            node_overrides: v(&self.node_overrides),
            metrics: v(&self.metrics),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::report::Readiness;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::{json, Value};

    fn lesson(edit: impl FnOnce(&mut Value)) -> crate::ItemReport {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| edit(&mut v["experiment"]));
        validate_tree(&t)
            .items
            .into_iter()
            .find(|i| i.id == "l0-fx-capacity")
            .unwrap()
    }

    fn blocked_with(item: &crate::ItemReport) -> Vec<String> {
        item.issues
            .iter()
            .find(|i| i.code == codes::BLOCKED)
            .map(|i| i.missing.clone())
            .unwrap_or_default()
    }

    #[test]
    fn planned_component_blocks_without_running() {
        let it = lesson(|e| {
            e["base"]["graph"]["nodes"]
                .as_array_mut()
                .unwrap()
                .push(json!({"id": "cache", "kind": "redis"}));
            e["base"]["graph"]["edges"]
                .as_array_mut()
                .unwrap()
                .push(json!({"id": "e2", "from": "web", "to": "cache", "kind": "cache"}));
        });
        assert_eq!(blocked_with(&it), vec!["component:redis"]);
        assert_eq!(it.readiness, Some(Readiness::Blocked));
        assert!(it.runs.is_empty());
        assert!(it.passed, "blocked is a warning");
    }

    #[test]
    fn unsupported_fault_and_unmeasured_metric_block() {
        let it = lesson(|e| {
            e["base"]["faults"] = json!([{"kind": "instance-slow", "target": "web", "atMs": 3000}]);
            e["goals"][1]["metric"] = "duplicateIds".into();
        });
        assert_eq!(
            blocked_with(&it),
            vec!["fault:instance-slow", "metric:duplicateIds"]
        );
    }

    #[test]
    fn planned_field_blocks_and_unplanned_field_fails() {
        let it = lesson(|e| e["base"]["workload"]["params"] = json!({"hotKeyShare": 0.5}));
        assert_eq!(blocked_with(&it), vec!["field:workload.params.hotKeyShare"]);
        // Review focus 1: a field the engine would silently ignore never passes as ready.
        for (name, edit) in [
            (
                "workload.params.other",
                Box::new(|e: &mut Value| e["base"]["workload"]["params"] = json!({"other": 1}))
                    as Box<dyn FnOnce(&mut Value)>,
            ),
            (
                "config.web-server.autoscale",
                Box::new(|e: &mut Value| {
                    e["base"]["graph"]["nodes"][1]["config"]["autoscale"] = true.into()
                }),
            ),
            (
                "speed",
                Box::new(|e: &mut Value| e["base"]["speed"] = 1.into()),
            ),
            (
                "faults[0].severity",
                Box::new(|e: &mut Value| {
                    e["base"]["faults"] =
                        json!([{"kind": "instance-down", "atMs": 1, "severity": 2}])
                }),
            ),
        ] {
            let it = lesson(edit);
            assert!(
                it.issues
                    .iter()
                    .any(|i| i.code == codes::ENGINE_INVALID && i.field.as_deref() == Some(name)),
                "{name}"
            );
            assert!(!it.passed && it.runs.is_empty(), "{name}");
        }
    }

    #[test]
    fn unknown_kinds_are_engine_invalid_not_blocked() {
        let it = lesson(|e| e["base"]["graph"]["nodes"][1]["kind"] = "mainframe".into());
        assert!(it.issues.iter().any(|i| i.code == codes::ENGINE_INVALID
            && i.engine.iter().any(|e| e.code == "node.unknown-kind")));
        let it = lesson(|e| e["base"]["faults"] = json!([{"kind": "meteor", "atMs": 1}]));
        assert!(it
            .issues
            .iter()
            .any(|i| i.code == codes::ENGINE_INVALID && i.detail.is_some()));
    }

    #[test]
    fn blocked_items_still_get_structural_checks() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["base"]["faults"] = json!([{"kind": "instance-slow", "atMs": 1}])
        });
        edit_prose(&mut t, "l0-fx-capacity", "vi", |s| {
            s.replace("- **B**:", "- **X**:")
        });
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::BLOCKED));
        assert!(has(&r, "l0-fx-capacity", codes::PROSE_KEY));
    }

    #[test]
    fn needs_are_collected() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["base"]["graph"]["nodes"][1]["config"]["costPerMonth"] = 30.into()
        });
        let p = crate::structure::parse_tree(&t);
        let ctx = crate::checks::Ctx::new(p.levels.as_ref());
        let o = crate::checks::check_lesson(&p.lessons[0], &ctx);
        assert_eq!(o.needs.components, vec!["client", "web-server"]);
        assert_eq!(o.needs.node_overrides, vec!["costPerMonth"]);
        assert_eq!(o.needs.metrics, vec!["p95", "requestsRejected"]);
    }

    #[test]
    fn a_control_on_a_planned_field_blocks_instead_of_failing() {
        let mut t = good_tree();
        edit_levels(&mut t, |v| {
            v["engine"]["planned"]["fields"] =
                json!(["config.web-server.turbo", "calibration.webBoost"]);
        });
        edit_json(&mut t, "l0-fx-capacity", |v| {
            let c = v["experiment"]["controls"].as_array_mut().unwrap();
            c.push(
                json!({"id": "turbo", "type": "toggle", "path": "graph.nodes[web].config.turbo",
                          "options": [false, true], "default": false}),
            );
            c.push(
                json!({"id": "boost", "type": "toggle", "path": "calibration.webBoost",
                          "options": [1, 2], "default": 1}),
            );
        });
        let it = validate_tree(&t)
            .items
            .into_iter()
            .find(|i| i.id == "l0-fx-capacity")
            .unwrap();
        assert!(
            !it.issues.iter().any(|i| i.code == codes::CONTROL),
            "{:#?}",
            it.issues
        );
        assert_eq!(
            blocked_with(&it),
            vec![
                "field:calibration.webBoost",
                "field:config.web-server.turbo"
            ]
        );
        assert_eq!(it.readiness, Some(Readiness::Blocked));
    }
}
