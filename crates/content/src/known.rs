//! Field names the engine reads, taken from sim-core's own types by serializing a sample.
//! sim-core serializes `None` as `null` (no `skip_serializing_if`), so every key appears.
//! A field added to sim-core shows up here with no change.

use serde::Serialize;
use sim_core::*;
use std::collections::{BTreeMap, BTreeSet};

fn keys_of<T: Serialize>(v: &T) -> BTreeSet<String> {
    serde_json::to_value(v)
        .ok()
        .and_then(|v| v.as_object().map(|o| o.keys().cloned().collect()))
        .unwrap_or_default()
}

fn sample() -> SimInput {
    SimInput {
        graph: Graph {
            nodes: vec![Node {
                id: "n".into(),
                kind: "client".into(),
                label: String::new(),
                replicas: 1,
                config: BTreeMap::new(),
            }],
            edges: vec![Edge {
                id: "e".into(),
                from: "n".into(),
                to: "n".into(),
                kind: EdgeKind::Http,
            }],
        },
        workload: Workload {
            profile: Profile::Mixed,
            base_rps: 0.0,
            write_ratio: 0.0,
            clients: 1,
            client_timeout_ms: 1.0,
            surge: Some(Surge {
                factor: 1.0,
                at_ms: 0,
                duration_ms: 0,
            }),
            params: BTreeMap::new(),
            traffic_end_ms: Some(1),
            arrivals: Some(Arrivals::Uniform),
        },
        faults: vec![Fault {
            kind: FaultKind::InstanceDown,
            target: None,
            at_ms: 0,
        }],
        duration_ms: 0,
        seed: 0,
        calibration: Some(CalibrationOverrides::default()),
    }
}

pub fn input_keys() -> BTreeSet<String> {
    keys_of(&sample())
}
pub fn graph_keys() -> BTreeSet<String> {
    keys_of(&sample().graph)
}
pub fn node_keys() -> BTreeSet<String> {
    keys_of(&sample().graph.nodes[0])
}
pub fn edge_keys() -> BTreeSet<String> {
    keys_of(&sample().graph.edges[0])
}
pub fn workload_keys() -> BTreeSet<String> {
    keys_of(&sample().workload)
}
pub fn surge_keys() -> BTreeSet<String> {
    keys_of(&sample().workload.surge)
}
pub fn fault_keys() -> BTreeSet<String> {
    keys_of(&sample().faults[0])
}
pub fn calibration_keys() -> BTreeSet<String> {
    keys_of(&CalibrationOverrides::default())
}
pub fn metric_keys() -> BTreeSet<String> {
    keys_of(&Metrics::default())
}

/// Workload fields a control may address: those whose value in a fully populated sample is a
/// scalar (number, string or bool), so a new object-valued field is excluded automatically.
pub fn workload_scalar_keys() -> BTreeSet<String> {
    let v = serde_json::to_value(sample().workload).unwrap_or_default();
    v.as_object()
        .into_iter()
        .flatten()
        .filter(|(_, x)| !(x.is_object() || x.is_array() || x.is_null()))
        .map(|(k, _)| k.clone())
        .collect()
}

/// Config keys a node of `kind` accepts (its declared keys plus the per-node overrides), or
/// `None` when the engine does not know the kind. Read from `sim_core::capabilities()`.
pub fn config_keys(kind: &str) -> Option<BTreeSet<String>> {
    let caps = sim_core::capabilities();
    let mut k: BTreeSet<String> = caps.config_keys.get(kind)?.iter().cloned().collect();
    k.extend(caps.node_override_keys);
    Some(k)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_come_from_sim_core_types() {
        assert!(input_keys().contains("durationMs") && input_keys().contains("calibration"));
        assert!(workload_keys().contains("trafficEndMs") && workload_keys().contains("params"));
        assert!(
            !workload_scalar_keys().contains("surge") && workload_scalar_keys().contains("baseRps")
        );
        assert!(calibration_keys().contains("edgeDelayHttpMs"));
        assert!(metric_keys().contains("duplicateIds"));
        assert_eq!(fault_keys().len(), 3);
        assert!(config_keys("web-server")
            .unwrap()
            .contains("rpsPerInstance"));
        assert!(config_keys("redis").is_none());
    }

    #[test]
    fn workload_scalars_are_derived_from_value_types() {
        let k = workload_scalar_keys();
        // Object-valued fields cannot be a control target; string enums and numbers can.
        assert!(!k.contains("surge") && !k.contains("params"));
        for scalar in ["arrivals", "profile", "trafficEndMs", "baseRps", "clients"] {
            assert!(k.contains(scalar), "{scalar}");
        }
        assert_eq!(k.len(), workload_keys().len() - 2);
    }
}
