//! Field names the engine reads, taken from sim-core's own types by serializing a sample.
//! sim-core serializes `None` as `null` (no `skip_serializing_if`), so every key appears.
//! A field added to sim-core shows up here with no change.

use serde::Serialize;
use sim_core::*;
use std::collections::{BTreeMap, BTreeSet};
use std::sync::OnceLock;

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

/// Every name set, built once per process from sim-core's types and capabilities.
struct Known {
    caps: Capabilities,
    input: BTreeSet<String>,
    graph: BTreeSet<String>,
    node: BTreeSet<String>,
    edge: BTreeSet<String>,
    workload: BTreeSet<String>,
    workload_scalar: BTreeSet<String>,
    surge: BTreeSet<String>,
    fault: BTreeSet<String>,
    calibration: BTreeSet<String>,
    metric: BTreeSet<String>,
    /// Component kind -> declared config keys plus the per-node override keys.
    config: BTreeMap<String, BTreeSet<String>>,
}

fn known() -> &'static Known {
    static KNOWN: OnceLock<Known> = OnceLock::new();
    KNOWN.get_or_init(|| {
        let caps = sim_core::capabilities();
        let s = sample();
        let config = caps
            .config_keys
            .iter()
            .map(|(kind, keys)| {
                let all = keys
                    .iter()
                    .chain(&caps.node_override_keys)
                    .cloned()
                    .collect();
                (kind.clone(), all)
            })
            .collect();
        Known {
            input: keys_of(&s),
            graph: keys_of(&s.graph),
            node: keys_of(&s.graph.nodes[0]),
            edge: keys_of(&s.graph.edges[0]),
            workload: keys_of(&s.workload),
            workload_scalar: scalar_keys_of(&s.workload),
            surge: keys_of(&s.workload.surge),
            fault: keys_of(&s.faults[0]),
            // One source: sim-core's capability list (its own test pins it to the type).
            calibration: caps.calibration_fields.iter().cloned().collect(),
            metric: keys_of(&Metrics::default()),
            config,
            caps,
        }
    })
}

/// What this engine build supports, computed once.
pub fn caps() -> &'static Capabilities {
    &known().caps
}
pub fn input_keys() -> &'static BTreeSet<String> {
    &known().input
}
pub fn graph_keys() -> &'static BTreeSet<String> {
    &known().graph
}
pub fn node_keys() -> &'static BTreeSet<String> {
    &known().node
}
pub fn edge_keys() -> &'static BTreeSet<String> {
    &known().edge
}
pub fn workload_keys() -> &'static BTreeSet<String> {
    &known().workload
}
pub fn surge_keys() -> &'static BTreeSet<String> {
    &known().surge
}
pub fn fault_keys() -> &'static BTreeSet<String> {
    &known().fault
}
pub fn calibration_keys() -> &'static BTreeSet<String> {
    &known().calibration
}
pub fn metric_keys() -> &'static BTreeSet<String> {
    &known().metric
}

/// Keys whose value in a fully populated sample is a scalar (number, string or bool), so a
/// new object-valued field is excluded automatically.
fn scalar_keys_of<T: Serialize>(v: &T) -> BTreeSet<String> {
    let v = serde_json::to_value(v).unwrap_or_default();
    v.as_object()
        .into_iter()
        .flatten()
        .filter(|(_, x)| !(x.is_object() || x.is_array() || x.is_null()))
        .map(|(k, _)| k.clone())
        .collect()
}

/// Workload fields a control may address: the scalar ones.
pub fn workload_scalar_keys() -> &'static BTreeSet<String> {
    &known().workload_scalar
}

/// Config keys a node of `kind` accepts (its declared keys plus the per-node overrides), or
/// `None` when the engine does not know the kind.
pub fn config_keys(kind: &str) -> Option<&'static BTreeSet<String>> {
    known().config.get(kind)
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

    #[test]
    fn sets_are_built_once_and_calibration_keys_come_from_capabilities() {
        assert!(std::ptr::eq(input_keys(), input_keys()));
        assert!(std::ptr::eq(caps(), caps()));
        let from_caps: BTreeSet<String> = caps().calibration_fields.iter().cloned().collect();
        assert_eq!(calibration_keys(), &from_caps);
        assert!(std::ptr::eq(
            config_keys("lb").unwrap(),
            config_keys("lb").unwrap()
        ));
    }
}
