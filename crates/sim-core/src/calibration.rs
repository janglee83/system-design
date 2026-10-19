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
    pub web_cost_per_extra_vcpu: f64,
    pub lb_rps_per_replica: f64,
    pub lb_service_ms: f64,
    pub lb_queue_seconds: f64,
    pub lb_cost_per_replica: f64,
    pub lb_max_utilization_for_latency: f64,
    pub pg_qps_per_instance: f64,
    pub pg_service_ms: f64,
    pub pg_queue_seconds: f64,
    pub pg_cost_per_instance: f64,
    pub pg_failover_ms: f64,
    pub pg_max_utilization_for_latency: f64,
    pub edge_delay_http_ms: f64,
    pub edge_delay_db_ms: f64,
    pub edge_delay_cache_ms: f64,
    pub edge_delay_msg_ms: f64,
}

impl Default for Calibration {
    fn default() -> Self {
        Calibration {
            // Parity (all fixtures in fixtures/parity): 9,000 rps per vCPU = 36 workers x 4 ms.
            // Run 807734e1 (scale-web-tier-surge-pass) showed 53.33% CPU at 4,800 rps per
            // instance; scale-web-tier-surge-direct-2cpu-2gb rejects exactly the surge excess
            // over 18,000 rps.
            web_rps_per_vcpu: 9_000.0,
            // Parity: every fixture; latency = 4 ms of service + queue wait.
            web_service_ms: 4.0,
            // Requests one GB of memory holds in the server, waiting or in service. Waiting room
            // = this x GB - workers (rps x service). Parity: 1 vCPU/2 GB waits up to 906 ms and
            // rejects 21,844 (scale-web-tier-surge-direct), 1 vCPU/4 GB waits up to 1,816 ms
            // (scale-web-tier-surge-direct-1cpu-4gb), 2 vCPU/2 GB rejects 3,880.
            web_queue_per_gb: 4_096.0,
            // Parity: one 1-vCPU instance costs $22.5/month (scale-web-tier-surge-pass:
            // 5 x 22.5 + 2 LB x 25 = 162.5).
            web_cost_per_vcpu: 22.5,
            // Parity: a 2-vCPU instance costs $50/month (scale-web-tier-surge-direct-2cpu-2gb),
            // so each vCPU after the first adds 27.5.
            web_cost_per_extra_vcpu: 27.5,
            lb_rps_per_replica: 60_000.0,
            // Parity: a balancer hop adds 3 ms in total (scale-web-tier-surge-lb5-1cpu-2gb 913.25
            // vs scale-web-tier-surge-direct-1cpu-2gb-noretry 910.25; scale-web-tier-surge-pass
            // p95 7 = 4 ms service + 3): 2 ms here plus one more 0.5 ms HTTP edge.
            lb_service_ms: 2.0,
            lb_queue_seconds: 0.05,
            lb_cost_per_replica: 25.0,
            // Balancer latency = lbServiceMs / (1 - min(utilization, this)) + queue wait, so a
            // balancer near saturation slows down before it rejects. No reference evidence (the
            // captures never load a balancer past 40%); 0.95 caps the knee at 20x service time.
            lb_max_utilization_for_latency: 0.95,
            pg_qps_per_instance: 5_000.0,
            pg_service_ms: 3.0,
            pg_queue_seconds: 0.5,
            pg_cost_per_instance: 180.0,
            // Time from losing the primary to a replica accepting writes.
            pg_failover_ms: 600.0,
            // Database latency = pgServiceMs / (1 - min(utilization, this)) + queue wait: the
            // warning knee before overload. No reference evidence; 0.95 caps it at 20x service.
            pg_max_utilization_for_latency: 0.95,
            // Same-region, same-AZ network delay per hop.
            edge_delay_http_ms: 0.5,
            edge_delay_db_ms: 0.8,
            edge_delay_cache_ms: 0.3,
            edge_delay_msg_ms: 1.0,
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
                web_cost_per_extra_vcpu,
                lb_rps_per_replica, lb_service_ms, lb_queue_seconds, lb_cost_per_replica,
                lb_max_utilization_for_latency,
                pg_qps_per_instance, pg_service_ms, pg_queue_seconds, pg_cost_per_instance,
                pg_failover_ms, pg_max_utilization_for_latency, edge_delay_http_ms, edge_delay_db_ms, edge_delay_cache_ms,
                edge_delay_msg_ms,
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
/// not positive, times/costs/queues that are negative, latency knees outside (0, 1).
/// Order: positive-only fields, then non-negative fields, then knees, each in declaration order.
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
        ("webCostPerExtraVcpu", o.web_cost_per_extra_vcpu),
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
    let unit_open = [
        ("lbMaxUtilizationForLatency", o.lb_max_utilization_for_latency),
        ("pgMaxUtilizationForLatency", o.pg_max_utilization_for_latency),
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
    for (name, value) in unit_open {
        if let Some(v) = value {
            if !(v.is_finite() && v > 0.0 && v < 1.0) {
                bad.push(name);
            }
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
            web_cost_per_extra_vcpu: Some(f64::INFINITY),
            edge_delay_db_ms: Some(0.0), // zero delay is allowed
            lb_max_utilization_for_latency: Some(1.0),
            pg_max_utilization_for_latency: Some(0.0),
            ..Default::default()
        };
        assert_eq!(
            invalid_overrides(&o),
            vec![
                "webRpsPerVcpu",
                "webCostPerExtraVcpu",
                "lbServiceMs",
                "pgCostPerInstance",
                "lbMaxUtilizationForLatency",
                "pgMaxUtilizationForLatency",
            ]
        );
        for bad in [f64::NAN, f64::INFINITY, -0.5, 1.5] {
            let o = CalibrationOverrides { pg_max_utilization_for_latency: Some(bad), ..Default::default() };
            assert_eq!(invalid_overrides(&o), vec!["pgMaxUtilizationForLatency"], "{bad}");
        }
        let ok = CalibrationOverrides {
            lb_max_utilization_for_latency: Some(0.5),
            pg_max_utilization_for_latency: Some(0.99),
            ..Default::default()
        };
        assert!(invalid_overrides(&ok).is_empty());
        assert!(invalid_overrides(&CalibrationOverrides::default()).is_empty());
    }
}
