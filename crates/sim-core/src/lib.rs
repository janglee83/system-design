#![forbid(unsafe_code)]

/// Crate version, reported by the CLI and the wasm wrapper alongside results.
pub fn engine_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    #[test]
    fn reports_version() {
        assert_eq!(super::engine_version(), "0.1.0");
    }
}

pub mod calibration;
pub mod components;
pub use calibration::Calibration;
pub use components::list_components;

pub mod types;
pub use types::*;

pub mod histogram;
pub mod rng;

#[cfg(test)]
mod type_tests {
    use super::*;

    #[test]
    fn minimal_input_gets_defaults() {
        let json = r#"{
            "graph": {
                "nodes": [
                    {"id": "users", "kind": "client"},
                    {"id": "web", "kind": "web-server", "config": {"cpu": 2}}
                ],
                "edges": [{"id": "e1", "from": "users", "to": "web", "kind": "http"}]
            },
            "workload": {"baseRps": 100}
        }"#;
        let input: SimInput = serde_json::from_str(json).unwrap();
        assert_eq!(input.duration_ms, 10_000);
        assert_eq!(input.seed, 0);
        assert!(input.faults.is_empty());
        assert_eq!(input.workload.profile, Profile::Mixed);
        assert_eq!(input.workload.write_ratio, 0.2);
        assert_eq!(input.workload.client_timeout_ms, 1000.0);
        assert_eq!(input.graph.nodes[0].replicas, 1);
        assert_eq!(
            input.graph.nodes[1].config.get("cpu"),
            Some(&ConfigValue::Num(2.0))
        );
        assert_eq!(input.graph.edges[0].kind, EdgeKind::Http);
        assert_eq!(input.calibration, None);
    }

    #[test]
    fn calibration_overrides_are_optional_per_field() {
        let json = r#"{"graph":{"nodes":[],"edges":[]},"workload":{"baseRps":1},
                       "calibration":{"webRpsPerVcpu":3000,"edgeDelayDbMs":5}}"#;
        let input: SimInput = serde_json::from_str(json).unwrap();
        let c = input.calibration.unwrap();
        assert_eq!(c.web_rps_per_vcpu, Some(3000.0));
        assert_eq!(c.edge_delay_db_ms, Some(5.0));
        assert_eq!(c.web_cost_per_vcpu, None);
    }

    #[test]
    fn enums_use_kebab_case_and_goal_ops_use_symbols() {
        let f: Fault = serde_json::from_str(r#"{"kind":"traffic-surge-3x","atMs":2000}"#).unwrap();
        assert_eq!(f.kind, FaultKind::TrafficSurge3x);
        assert_eq!(f.target, None);
        assert_eq!(
            serde_json::to_string(&FaultKind::DbPrimaryDown).unwrap(),
            r#""db-primary-down""#
        );
        let g: Goal =
            serde_json::from_str(r#"{"id":"p95","metric":"p95","op":"<=","value":100}"#).unwrap();
        assert_eq!(g.op, GoalOp::Le);
    }

    #[test]
    fn config_value_accessors() {
        assert_eq!(ConfigValue::Num(3.0).as_f64(), Some(3.0));
        assert_eq!(ConfigValue::Str("x".into()).as_f64(), None);
        assert_eq!(ConfigValue::Str("x".into()).as_str(), Some("x"));
        assert_eq!(ConfigValue::Bool(true).as_bool(), Some(true));
    }
}

pub mod validate;
pub use validate::{has_blocking, validate_graph};

pub mod grade;
pub use grade::{grade, metric_value};

#[cfg(test)]
pub(crate) mod test_util;

mod engine;
pub mod simulate;
pub use simulate::{check_input, simulate};
mod faults;
mod traces;

pub mod capabilities;
pub use capabilities::{capabilities, Capabilities};

pub mod fixture;
pub mod parity;
