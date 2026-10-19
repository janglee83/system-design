//! What this engine build can simulate. Content tooling uses it to tell "not built yet" apart
//! from "broken": a lesson needing anything outside these lists is `blocked`, not failing.

use crate::types::FaultKind;

/// Fault kinds the engine applies. Every other kind parses but only emits `fault.unsupported`.
pub const SUPPORTED_FAULTS: [FaultKind; 4] = [
    FaultKind::TrafficSurge3x,
    FaultKind::InstanceDown,
    FaultKind::LbNodeDown,
    FaultKind::DbPrimaryDown,
];

/// Metric keys (as in `grade::metric_value`) every run reports. The optional metrics
/// (`duplicateIds`, `staleReads`, ...) need components that are not built yet and stay null.
pub const MEASURED_METRICS: [&str; 16] = [
    "p50",
    "p95",
    "p99",
    "availability",
    "throughputRps",
    "costPerMonth",
    "spofCount",
    "exposedBackends",
    "peakBusy",
    "peakDbConnections",
    "cacheOps",
    "requestsTotal",
    "requestsOk",
    "requestsRejected",
    "requestsTimedOut",
    "requestsUnreachable",
];

/// `workload.params` keys the engine reads. None yet; every key is ignored.
pub const WORKLOAD_PARAMS: [&str; 0] = [];

#[derive(Debug, Clone, PartialEq)]
pub struct Capabilities {
    pub components: Vec<String>,
    pub faults: Vec<FaultKind>,
    pub metrics: Vec<String>,
    pub workload_params: Vec<String>,
}

pub fn capabilities() -> Capabilities {
    Capabilities {
        components: crate::components::list_components()
            .into_iter()
            .map(|m| m.kind)
            .collect(),
        faults: SUPPORTED_FAULTS.to_vec(),
        metrics: MEASURED_METRICS.iter().map(|s| s.to_string()).collect(),
        workload_params: WORKLOAD_PARAMS.iter().map(|s| s.to_string()).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::grade::metric_value;
    use crate::simulate;
    use crate::test_util::{input, web_tier};
    use crate::types::{Fault, FaultKind, Metrics};

    const ALL_FAULTS: [FaultKind; 14] = [
        FaultKind::TrafficSurge3x,
        FaultKind::InstanceDown,
        FaultKind::InstanceSlow,
        FaultKind::LbNodeDown,
        FaultKind::CacheDown,
        FaultKind::DbOverloaded,
        FaultKind::DbPrimaryDown,
        FaultKind::DbReplicaDown,
        FaultKind::DbStalled,
        FaultKind::BrokerDown,
        FaultKind::ObjectStorageDown,
        FaultKind::KvNodeDown,
        FaultKind::ThirdPartyDown,
        FaultKind::ThirdPartySlow,
    ];

    #[test]
    fn supported_faults_are_exactly_the_ones_the_engine_applies() {
        for kind in ALL_FAULTS {
            let mut i = input(web_tier(2, 3), 1_000.0);
            i.faults = vec![Fault {
                kind,
                target: None,
                at_ms: 1_000,
            }];
            let r = simulate(&i).unwrap();
            let unsupported = r.events.iter().any(|e| e.code == "fault.unsupported");
            assert_eq!(
                unsupported,
                !SUPPORTED_FAULTS.contains(&kind),
                "{kind:?}: capabilities and faults.rs disagree"
            );
        }
    }

    #[test]
    fn measured_metrics_are_present_and_the_rest_are_null() {
        let r = simulate(&input(web_tier(1, 1), 1_000.0)).unwrap();
        let keys = serde_json::to_value(Metrics::default()).unwrap();
        for key in keys.as_object().unwrap().keys() {
            let measured = metric_value(&r.metrics, key).is_some();
            assert_eq!(measured, MEASURED_METRICS.contains(&key.as_str()), "{key}");
        }
    }

    #[test]
    fn capabilities_list_registry_kinds() {
        let c = capabilities();
        assert_eq!(c.components, vec!["client", "lb", "postgres", "web-server"]);
        assert_eq!(c.faults.len(), 4);
        assert!(c.workload_params.is_empty());
    }
}
