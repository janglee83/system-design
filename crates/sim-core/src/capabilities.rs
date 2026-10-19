//! What this engine build can simulate. Content tooling uses it to tell "not built yet" apart
//! from "broken": a lesson needing anything outside these lists is `blocked`, not failing.

use crate::types::FaultKind;
use std::collections::BTreeMap;

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

/// Top-level `calibration` override keys (`CalibrationOverrides`, camelCase), sorted.
pub const CALIBRATION_FIELDS: [&str; 20] = [
    "edgeDelayCacheMs",
    "edgeDelayDbMs",
    "edgeDelayHttpMs",
    "edgeDelayMsgMs",
    "lbCostPerReplica",
    "lbMaxUtilizationForLatency",
    "lbQueueSeconds",
    "lbRpsPerReplica",
    "lbServiceMs",
    "pgCostPerInstance",
    "pgFailoverMs",
    "pgMaxUtilizationForLatency",
    "pgQpsPerInstance",
    "pgQueueSeconds",
    "pgServiceMs",
    "webCostPerExtraVcpu",
    "webCostPerVcpu",
    "webQueuePerGb",
    "webRpsPerVcpu",
    "webServiceMs",
];

/// Everything this engine build reads, for telling "not built yet" from "broken".
/// Every list is sorted, so output built from it is stable.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Capabilities {
    /// Component kinds in the registry.
    pub components: Vec<String>,
    /// Fault kinds the engine applies (sorted by enum order).
    pub faults: Vec<FaultKind>,
    /// Metric keys every run reports (`grade::metric_value` names).
    pub metrics: Vec<String>,
    /// `workload.params` keys the engine reads.
    pub workload_params: Vec<String>,
    /// `calibration` override keys.
    pub calibration_fields: Vec<String>,
    /// Component kind -> the `config` keys it declares.
    pub config_keys: BTreeMap<String, Vec<String>>,
    /// `config` keys every node accepts as per-node overrides.
    pub node_override_keys: Vec<String>,
}

impl Capabilities {
    /// Supported fault kinds by their kebab-case names, sorted.
    pub fn fault_names(&self) -> Vec<&'static str> {
        let mut v: Vec<&'static str> = self.faults.iter().map(|f| f.as_str()).collect();
        v.sort_unstable();
        v
    }
}

fn sorted_strings<'a>(items: impl IntoIterator<Item = &'a str>) -> Vec<String> {
    let mut v: Vec<String> = items.into_iter().map(str::to_string).collect();
    v.sort();
    v.dedup();
    v
}

pub fn capabilities() -> Capabilities {
    let metas = crate::components::list_components();
    let config_keys = metas
        .iter()
        .map(|m| {
            let keys = sorted_strings(m.fields.iter().map(|f| f.key.as_str()));
            (m.kind.clone(), keys)
        })
        .collect();
    let mut faults = SUPPORTED_FAULTS.to_vec();
    faults.sort();
    Capabilities {
        components: sorted_strings(metas.iter().map(|m| m.kind.as_str())),
        faults,
        metrics: sorted_strings(MEASURED_METRICS),
        workload_params: sorted_strings(WORKLOAD_PARAMS),
        calibration_fields: sorted_strings(CALIBRATION_FIELDS),
        config_keys,
        node_override_keys: sorted_strings(crate::components::NODE_OVERRIDE_KEYS),
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

    fn sorted(v: &[String]) -> bool {
        v.windows(2).all(|w| w[0] < w[1])
    }

    #[test]
    fn calibration_fields_are_every_override_key() {
        let keys = serde_json::to_value(crate::types::CalibrationOverrides::default()).unwrap();
        let mut expected: Vec<String> = keys.as_object().unwrap().keys().cloned().collect();
        expected.sort();
        assert_eq!(capabilities().calibration_fields, expected);
    }

    #[test]
    fn config_keys_come_from_component_fields_and_overrides_are_listed() {
        let c = capabilities();
        assert_eq!(
            c.config_keys.keys().cloned().collect::<Vec<_>>(),
            c.components
        );
        assert_eq!(c.config_keys["web-server"], vec!["cpu", "memoryGb"]);
        for keys in c.config_keys.values() {
            assert!(sorted(keys));
        }
        assert_eq!(
            c.node_override_keys,
            vec!["costPerMonth", "rpsPerInstance", "serviceMs"]
        );
    }

    #[test]
    fn every_list_is_sorted_and_fault_names_are_kebab_case() {
        let c = capabilities();
        for list in [
            &c.components,
            &c.metrics,
            &c.workload_params,
            &c.calibration_fields,
        ] {
            assert!(sorted(list), "{list:?}");
        }
        assert!(c.faults.windows(2).all(|w| w[0] < w[1]));
        for kind in ALL_FAULTS {
            assert_eq!(
                serde_json::to_value(kind).unwrap(),
                serde_json::Value::String(kind.as_str().into())
            );
        }
        assert_eq!(
            c.fault_names(),
            vec![
                "db-primary-down",
                "instance-down",
                "lb-node-down",
                "traffic-surge-3x"
            ]
        );
    }
}
