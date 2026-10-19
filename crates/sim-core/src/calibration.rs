//! World parameters of the simulation. Defaults are teaching-scale estimates; values marked
//! "Parity" were fitted to reference runs captured during development (fixtures/parity).
//! Every run may override any field through `SimInput.calibration`, and nodes may override
//! capacity and price through their config. Engine mechanics below are fixed.

use crate::types::{CalibrationOverrides, EdgeKind};
use serde::{Deserialize, Serialize};

/// Virtual time step. 1,000 ticks simulate 10 s.
pub const TICK_MS: f64 = 10.0;
/// One timeline frame every 10 ticks (100 ms).
pub const FRAME_EVERY_TICKS: u32 = 10;
/// Target number of sampled request traces per run.
pub const TRACE_TARGET: u32 = 300;

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Calibration {
    pub web_rps_per_vcpu: f64,
    pub web_service_ms: f64,
    pub web_queue_per_gb: f64,
    pub web_cost_per_vcpu: f64,
    pub lb_rps_per_replica: f64,
    pub lb_service_ms: f64,
    pub lb_queue_seconds: f64,
    pub lb_cost_per_replica: f64,
    pub pg_qps_per_instance: f64,
    pub pg_service_ms: f64,
    pub pg_queue_seconds: f64,
    pub pg_cost_per_instance: f64,
    pub pg_failover_ms: f64,
    pub edge_delay_http_ms: f64,
    pub edge_delay_db_ms: f64,
    pub edge_delay_cache_ms: f64,
    pub edge_delay_msg_ms: f64,
    pub max_utilization_for_latency: f64,
}

impl Default for Calibration {
    fn default() -> Self {
        Calibration {
            // Parity: run 807734e1 showed 53.33% CPU at 4,800 rps per 1-vCPU instance.
            web_rps_per_vcpu: 9_000.0,
            web_service_ms: 2.0,
            // Queued requests one GB of memory holds before the process rejects work.
            // Parity: scale-web-tier-surge-direct (one 2 GB web server, 8,000 -> 24,000 rps)
            // reached 80.5% availability with p95 near the 1 s timeout; 4,440/GB fits both.
            web_queue_per_gb: 4_440.0,
            // Parity: 5 x 1-vCPU web servers + 2 LB replicas cost $162.5/month.
            web_cost_per_vcpu: 22.5,
            lb_rps_per_replica: 60_000.0,
            lb_service_ms: 0.2,
            lb_queue_seconds: 0.05,
            lb_cost_per_replica: 25.0,
            pg_qps_per_instance: 5_000.0,
            pg_service_ms: 3.0,
            pg_queue_seconds: 0.5,
            pg_cost_per_instance: 180.0,
            // Time from losing the primary to a replica accepting writes.
            pg_failover_ms: 600.0,
            // Same-region, same-AZ network delay per hop.
            edge_delay_http_ms: 0.5,
            edge_delay_db_ms: 0.8,
            edge_delay_cache_ms: 0.3,
            edge_delay_msg_ms: 1.0,
            // Latency uses service / (1 - utilization); capped so latency stays finite and the
            // queue itself carries the overload.
            // Parity: scale-web-tier-surge-direct; with 0.95 the saturated server adds 40 ms on
            // top of a full queue and times out sooner than the reference (availability 0.789).
            max_utilization_for_latency: 0.85,
        }
    }
}

macro_rules! apply_overrides {
    ($cal:ident, $o:ident, $($field:ident),* $(,)?) => {
        $( if let Some(v) = $o.$field { $cal.$field = v; } )*
    };
}

impl Calibration {
    /// Defaults with the given overrides applied. Call `invalid_overrides` first.
    pub fn resolve(overrides: Option<&CalibrationOverrides>) -> Calibration {
        let mut c = Calibration::default();
        if let Some(o) = overrides {
            apply_overrides!(
                c, o,
                web_rps_per_vcpu, web_service_ms, web_queue_per_gb, web_cost_per_vcpu,
                lb_rps_per_replica, lb_service_ms, lb_queue_seconds, lb_cost_per_replica,
                pg_qps_per_instance, pg_service_ms, pg_queue_seconds, pg_cost_per_instance,
                pg_failover_ms, edge_delay_http_ms, edge_delay_db_ms, edge_delay_cache_ms,
                edge_delay_msg_ms, max_utilization_for_latency,
            );
        }
        c
    }

    pub fn edge_delay_ms(&self, kind: EdgeKind) -> f64 {
        match kind {
            EdgeKind::Http => self.edge_delay_http_ms,
            EdgeKind::Db => self.edge_delay_db_ms,
            EdgeKind::Cache => self.edge_delay_cache_ms,
            EdgeKind::Msg => self.edge_delay_msg_ms,
        }
    }
}

/// camelCase names of overrides that cannot be used: non-finite values, capacities that are
/// not positive, times/costs/queues that are negative, a utilization cap outside (0, 1).
/// Order: positive-only fields, then non-negative fields in declaration order, then the cap.
pub fn invalid_overrides(o: &CalibrationOverrides) -> Vec<&'static str> {
    let positive = [
        ("webRpsPerVcpu", o.web_rps_per_vcpu),
        ("lbRpsPerReplica", o.lb_rps_per_replica),
        ("pgQpsPerInstance", o.pg_qps_per_instance),
    ];
    let non_negative = [
        ("webServiceMs", o.web_service_ms),
        ("webQueuePerGb", o.web_queue_per_gb),
        ("webCostPerVcpu", o.web_cost_per_vcpu),
        ("lbServiceMs", o.lb_service_ms),
        ("lbQueueSeconds", o.lb_queue_seconds),
        ("lbCostPerReplica", o.lb_cost_per_replica),
        ("pgServiceMs", o.pg_service_ms),
        ("pgQueueSeconds", o.pg_queue_seconds),
        ("pgCostPerInstance", o.pg_cost_per_instance),
        ("pgFailoverMs", o.pg_failover_ms),
        ("edgeDelayHttpMs", o.edge_delay_http_ms),
        ("edgeDelayDbMs", o.edge_delay_db_ms),
        ("edgeDelayCacheMs", o.edge_delay_cache_ms),
        ("edgeDelayMsgMs", o.edge_delay_msg_ms),
    ];
    let mut bad = Vec::new();
    for (name, value) in positive {
        if let Some(v) = value {
            if !(v.is_finite() && v > 0.0) {
                bad.push(name);
            }
        }
    }
    for (name, value) in non_negative {
        if let Some(v) = value {
            if !(v.is_finite() && v >= 0.0) {
                bad.push(name);
            }
        }
    }
    if let Some(v) = o.max_utilization_for_latency {
        if !(v.is_finite() && v > 0.0 && v < 1.0) {
            bad.push("maxUtilizationForLatency");
        }
    }
    bad
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{CalibrationOverrides, EdgeKind};

    #[test]
    fn defaults_are_the_parity_fitted_values() {
        let c = Calibration::default();
        assert_eq!(c.web_rps_per_vcpu, 9_000.0);
        assert_eq!(c.web_cost_per_vcpu, 22.5);
        assert_eq!(c.edge_delay_ms(EdgeKind::Db), 0.8);
    }

    #[test]
    fn resolve_applies_only_the_given_fields() {
        let o = CalibrationOverrides { web_rps_per_vcpu: Some(3_000.0), edge_delay_http_ms: Some(40.0), ..Default::default() };
        let c = Calibration::resolve(Some(&o));
        assert_eq!(c.web_rps_per_vcpu, 3_000.0);
        assert_eq!(c.edge_delay_ms(EdgeKind::Http), 40.0);
        assert_eq!(c.web_cost_per_vcpu, 22.5);
        assert_eq!(Calibration::resolve(None), Calibration::default());
    }

    #[test]
    fn invalid_overrides_are_named() {
        let o = CalibrationOverrides {
            web_rps_per_vcpu: Some(0.0),
            pg_cost_per_instance: Some(-1.0),
            lb_service_ms: Some(f64::NAN),
            max_utilization_for_latency: Some(1.0),
            edge_delay_db_ms: Some(0.0), // zero delay is allowed
            ..Default::default()
        };
        assert_eq!(
            invalid_overrides(&o),
            vec!["webRpsPerVcpu", "lbServiceMs", "pgCostPerInstance", "maxUtilizationForLatency"]
        );
        assert!(invalid_overrides(&CalibrationOverrides::default()).is_empty());
    }
}
