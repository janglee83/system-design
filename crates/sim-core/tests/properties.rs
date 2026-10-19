use proptest::prelude::*;
use sim_core::{simulate, Metrics, SimInput};

/// Traffic shape shared by every property: rate, seed, an optional surge, the arrival process
/// (missing, poisson or uniform) and an optional time at which traffic stops.
#[derive(Debug, Clone)]
struct Load {
    rps: f64,
    seed: u32,
    surge: bool,
    arrivals: Option<&'static str>,
    traffic_end_ms: Option<u32>,
}

fn load() -> impl Strategy<Value = Load> {
    (
        0.0f64..60_000.0,
        any::<u32>(),
        any::<bool>(),
        prop_oneof![Just(None), Just(Some("poisson")), Just(Some("uniform"))],
        proptest::option::of(0u32..4_000),
    )
        .prop_map(|(rps, seed, surge, arrivals, traffic_end_ms)| Load { rps, seed, surge, arrivals, traffic_end_ms })
}

fn build(lb: u32, web: u32, cpu: u32, pg: Option<u32>, load: &Load) -> SimInput {
    let mut nodes = vec![
        serde_json::json!({"id": "users", "kind": "client"}),
        serde_json::json!({"id": "lb", "kind": "lb", "replicas": lb}),
        serde_json::json!({"id": "web", "kind": "web-server", "replicas": web, "config": {"cpu": cpu}}),
    ];
    let mut edges = vec![
        serde_json::json!({"id": "e1", "from": "users", "to": "lb", "kind": "http"}),
        serde_json::json!({"id": "e2", "from": "lb", "to": "web", "kind": "http"}),
    ];
    if let Some(replicas) = pg {
        nodes.push(serde_json::json!({"id": "pg", "kind": "postgres", "config": {"readReplicas": replicas}}));
        edges.push(serde_json::json!({"id": "e3", "from": "web", "to": "pg", "kind": "db"}));
    }
    let surge = if load.surge {
        serde_json::json!({"factor": 3, "atMs": 2000, "durationMs": 3000})
    } else {
        serde_json::Value::Null
    };
    let mut workload = serde_json::json!({"baseRps": load.rps, "surge": surge});
    if let Some(a) = load.arrivals {
        workload["arrivals"] = serde_json::json!(a);
    }
    if let Some(end) = load.traffic_end_ms {
        workload["trafficEndMs"] = serde_json::json!(end);
    }
    serde_json::from_value(serde_json::json!({
        "graph": {"nodes": nodes, "edges": edges},
        "workload": workload,
        "durationMs": 3000,
        "seed": load.seed
    }))
    .unwrap()
}

fn finite(m: &Metrics) -> bool {
    [m.p50, m.p95, m.p99, m.availability, m.throughput_rps, m.cost_per_month, m.peak_busy, m.requests_total]
        .iter()
        .all(|v| v.is_finite())
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(48))]

    #[test]
    fn deterministic(lb in 1u32..4, web in 1u32..8, cpu in 1u32..4, pg in proptest::option::of(0u32..3),
                     load in load()) {
        let i = build(lb, web, cpu, pg, &load);
        prop_assert_eq!(simulate(&i).unwrap(), simulate(&i).unwrap());
    }

    #[test]
    fn bounded_ordered_and_conserved(lb in 1u32..4, web in 1u32..8, cpu in 1u32..4, pg in proptest::option::of(0u32..3),
                                     load in load()) {
        let m = simulate(&build(lb, web, cpu, pg, &load)).unwrap().metrics;
        prop_assert!(finite(&m));
        prop_assert!((0.0..=1.0).contains(&m.availability));
        prop_assert!(m.p50 <= m.p95 && m.p95 <= m.p99);
        let sum = m.requests_ok + m.requests_rejected + m.requests_timed_out + m.requests_unreachable;
        prop_assert!((sum - m.requests_total).abs() <= 1e-6 * m.requests_total.max(1.0));
    }

    // Spec §7.2 monotonicity, refined: with no database behind the web tier, adding a web
    // replica never lowers availability; when the smaller design already answered everything,
    // it never raises p95 either. (With a database, extra web capacity can legitimately push
    // more load into the database and time requests out there.)
    #[test]
    fn more_web_replicas_never_hurt(lb in 1u32..4, web in 1u32..6, cpu in 1u32..3, load in load()) {
        let a = simulate(&build(lb, web, cpu, None, &load)).unwrap().metrics;
        let b = simulate(&build(lb, web + 1, cpu, None, &load)).unwrap().metrics;
        prop_assert!(b.availability >= a.availability - 1e-9, "{a:?} vs {b:?}");
        if a.requests_rejected == 0.0 && a.requests_timed_out == 0.0 && a.requests_unreachable == 0.0 {
            prop_assert!(b.p95 <= a.p95 + 1e-9, "{a:?} vs {b:?}");
        }
    }
}
