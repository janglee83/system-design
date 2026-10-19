//! Public entry point: validate, run the tick engine, return the result.

use crate::calibration::invalid_overrides;
use crate::engine::Engine;
use crate::types::{SimInput, SimResult, ValidationIssue};
use crate::validate::{codes, field_issue, has_blocking, validate_graph};

pub fn simulate(input: &SimInput) -> Result<SimResult, Vec<ValidationIssue>> {
    let mut issues = validate_graph(&input.graph, None);
    if let Some(o) = &input.calibration {
        for field in invalid_overrides(o) {
            issues.push(field_issue(codes::CALIBRATION_INVALID, None, field));
        }
    }
    if has_blocking(&issues) {
        return Err(issues.into_iter().filter(|i| i.blocking).collect());
    }
    let mut engine = Engine::new(input);
    engine.run();
    Ok(engine.finish())
}

#[cfg(test)]
mod tests {
    use super::simulate;
    use crate::test_util::{edge, graph, input, node, web_tier};
    use crate::types::*;

    fn surge(mut i: SimInput) -> SimInput {
        i.workload.surge = Some(Surge { factor: 3.0, at_ms: 2_000, duration_ms: 6_000 });
        i
    }

    fn conserved(m: &Metrics) -> bool {
        let sum = m.requests_ok + m.requests_rejected + m.requests_timed_out + m.requests_unreachable;
        (sum - m.requests_total).abs() <= 1e-6 * m.requests_total.max(1.0)
    }

    #[test]
    fn uniform_arrivals_send_exactly_rate_times_time_until_traffic_ends() {
        let mut i = input(web_tier(2, 5), 8_000.0);
        i.duration_ms = 11_000;
        i.workload.traffic_end_ms = Some(10_000);
        i.workload.arrivals = Some(Arrivals::Uniform);
        i.workload.surge = Some(Surge { factor: 3.0, at_ms: 4_000, duration_ms: 2_000 });
        let m = simulate(&i).unwrap().metrics;
        // 8,000 rps for 10 s plus 16,000 extra for 2 s; nothing after 10 s.
        assert!((m.requests_total - 112_000.0).abs() < 1e-6, "{}", m.requests_total);
        assert!(conserved(&m));
        assert_eq!(simulate(&i).unwrap(), simulate(&i).unwrap(), "deterministic");
    }

    #[test]
    fn traffic_end_also_stops_poisson_arrivals() {
        let mut i = input(web_tier(2, 2), 2_000.0);
        i.workload.traffic_end_ms = Some(5_000);
        let m = simulate(&i).unwrap().metrics;
        assert!((m.requests_total - 10_000.0).abs() < 400.0, "{}", m.requests_total);
    }

    #[test]
    fn missing_arrivals_means_poisson() {
        let mut i = input(web_tier(2, 2), 2_000.0);
        let poisson = simulate(&i).unwrap();
        i.workload.arrivals = Some(Arrivals::Poisson);
        assert_eq!(simulate(&i).unwrap(), poisson);
        let w: Workload = serde_json::from_str(r#"{"baseRps": 1, "arrivals": "uniform", "trafficEndMs": 10}"#).unwrap();
        assert_eq!((w.arrivals, w.traffic_end_ms), (Some(Arrivals::Uniform), Some(10)));
    }

    #[test]
    fn light_load_is_fast_and_available() {
        let r = simulate(&input(web_tier(2, 2), 2_000.0)).unwrap();
        let m = &r.metrics;
        assert!(m.availability > 0.999, "{m:?}");
        assert!(m.p95 < 20.0, "{m:?}");
        assert_eq!(m.spof_count, 0);
        assert_eq!(m.exposed_backends, 0);
        assert_eq!(m.cost_per_month, 2.0 * 25.0 + 2.0 * 22.5);
        assert!((m.requests_total - 20_000.0).abs() < 600.0, "{}", m.requests_total);
        assert!(conserved(m));
    }

    #[test]
    fn single_web_server_falls_over_under_3x_surge() {
        let g = graph(
            vec![node("users", "client", 1, &[]), node("web", "web-server", 1, &[])],
            vec![edge("users", "web", EdgeKind::Http)],
        );
        let r = simulate(&surge(input(g, 8_000.0))).unwrap();
        let m = &r.metrics;
        assert!(m.p95 >= 300.0, "{m:?}");
        assert!(m.availability < 0.95, "{m:?}");
        assert_eq!(m.spof_count, 1);
        assert_eq!(m.exposed_backends, 1);
        assert!(m.requests_rejected > 0.0);
        assert!(r.events.iter().any(|e| e.code == "node.overloaded" && e.node.as_deref() == Some("web")));
        assert!(conserved(m));
    }

    #[test]
    fn lb_plus_five_web_servers_survive_the_surge() {
        let r = simulate(&surge(input(web_tier(2, 5), 8_000.0))).unwrap();
        let m = &r.metrics;
        assert!(m.p95 <= 100.0, "{m:?}");
        assert!(m.availability >= 0.999, "{m:?}");
        assert_eq!(m.spof_count, 0);
        assert!(m.cost_per_month <= 200.0);
    }

    #[test]
    fn postgres_behind_web_tier_reports_db_connections() {
        let mut g = web_tier(2, 2);
        g.nodes.push(node("pg", "postgres", 1, &[("readReplicas", 1.0)]));
        g.edges.push(edge("web", "pg", EdgeKind::Db));
        let r = simulate(&input(g, 2_000.0)).unwrap();
        assert!(r.metrics.availability > 0.999, "{:?}", r.metrics);
        assert!(r.metrics.peak_db_connections > 0.0);
        assert_eq!(r.metrics.cost_per_month, 50.0 + 45.0 + 360.0);
    }

    #[test]
    fn timeline_has_one_frame_per_100ms() {
        let r = simulate(&input(web_tier(1, 1), 1_000.0)).unwrap();
        let t = &r.timeline;
        assert_eq!(t.frame_ms, 100);
        assert_eq!(t.node_ids, vec!["lb", "users", "web"]);
        assert_eq!(t.fields, vec!["inFlight", "queued", "busy", "rejected", "up"]);
        assert_eq!(t.data.len(), 100 * 3 * 5);
    }

    #[test]
    fn same_input_gives_identical_result() {
        let i = surge(input(web_tier(2, 3), 9_000.0));
        assert_eq!(simulate(&i).unwrap(), simulate(&i).unwrap());
        let mut other = i.clone();
        other.seed = 99;
        assert_ne!(simulate(&i).unwrap().metrics, simulate(&other).unwrap().metrics);
    }

    #[test]
    fn invalid_graph_returns_blocking_issues() {
        let g = graph(vec![node("web", "web-server", 1, &[])], vec![]);
        let err = simulate(&input(g, 100.0)).unwrap_err();
        assert!(err.iter().all(|i| i.blocking));
        assert!(err.iter().any(|i| i.code == "graph.no-client"));
    }

    // Review focus 1: balancer with nowhere to send traffic.
    #[test]
    fn balancer_without_children_makes_requests_unreachable() {
        let g = graph(
            vec![node("users", "client", 1, &[]), node("lb", "lb", 2, &[])],
            vec![edge("users", "lb", EdgeKind::Http)],
        );
        let m = simulate(&input(g, 1_000.0)).unwrap().metrics;
        assert_eq!(m.availability, 0.0);
        assert!((m.requests_unreachable - m.requests_total).abs() < 1e-6);
        assert!(m.p95.is_finite());
    }

    // Review focus 2: no traffic, or a run shorter than one tick.
    #[test]
    fn zero_traffic_and_tiny_duration_stay_finite() {
        let mut i = input(web_tier(1, 1), 0.0);
        i.duration_ms = 5;
        let r = simulate(&i).unwrap();
        let m = &r.metrics;
        assert_eq!(m.requests_total, 0.0);
        assert_eq!(m.availability, 1.0);
        assert_eq!(m.p95, 0.0);
        assert_eq!(m.throughput_rps, 0.0);
        assert_eq!(r.timeline.data.len(), 3 * 5, "exactly one frame");
    }

    #[test]
    fn slower_hardware_override_makes_the_scaled_design_fail() {
        let mut i = surge(input(web_tier(2, 5), 8_000.0));
        i.calibration = Some(CalibrationOverrides { web_rps_per_vcpu: Some(3_000.0), ..Default::default() });
        let m = simulate(&i).unwrap().metrics;
        assert!(m.availability < 0.95, "{m:?}");
    }

    #[test]
    fn empty_overrides_equal_defaults() {
        let base = input(web_tier(2, 3), 5_000.0);
        let mut with_empty = base.clone();
        with_empty.calibration = Some(CalibrationOverrides::default());
        assert_eq!(simulate(&base).unwrap().metrics, simulate(&with_empty).unwrap().metrics);
    }

    #[test]
    fn per_node_overrides_change_only_that_node() {
        let mut g = web_tier(2, 2);
        g.nodes[2].config.insert("costPerMonth".into(), ConfigValue::Num(100.0));
        g.nodes[2].config.insert("rpsPerInstance".into(), ConfigValue::Num(500.0));
        let m = simulate(&input(g, 2_000.0)).unwrap().metrics;
        assert_eq!(m.cost_per_month, 50.0 + 200.0);
        assert!(m.availability < 0.9, "2 x 500 rps cannot serve 2,000 rps: {m:?}");
    }

    #[test]
    fn invalid_calibration_is_rejected_with_field_names() {
        let mut i = input(web_tier(1, 1), 100.0);
        i.calibration = Some(CalibrationOverrides {
            web_rps_per_vcpu: Some(-5.0),
            web_cost_per_extra_vcpu: Some(-2.0),
            ..Default::default()
        });
        let err = simulate(&i).unwrap_err();
        let fields: Vec<&str> = err.iter().map(|e| e.field.as_deref().unwrap()).collect();
        assert_eq!(fields, vec!["webRpsPerVcpu", "webCostPerExtraVcpu"]);
        assert!(err.iter().all(|e| e.code == "calibration.invalid" && e.blocking));
    }

    // Review focus 3: very large numbers.
    #[test]
    fn huge_numbers_finish_with_finite_metrics() {
        let r = simulate(&input(web_tier(1000, 1000), 1e7)).unwrap();
        let m = &r.metrics;
        for v in [m.p50, m.p95, m.p99, m.availability, m.throughput_rps, m.cost_per_month, m.peak_busy] {
            assert!(v.is_finite(), "{m:?}");
        }
    }
}
