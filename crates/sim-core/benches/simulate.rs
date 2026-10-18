use criterion::{black_box, criterion_group, criterion_main, Criterion};
use sim_core::{simulate, SimInput};

fn ten_nodes() -> SimInput {
    let mut nodes = vec![
        serde_json::json!({"id": "users", "kind": "client"}),
        serde_json::json!({"id": "lb", "kind": "lb", "replicas": 2}),
    ];
    let mut edges = vec![serde_json::json!({"id": "e0", "from": "users", "to": "lb", "kind": "http"})];
    for k in 1..=4 {
        nodes.push(serde_json::json!({"id": format!("web{k}"), "kind": "web-server", "replicas": 2}));
        nodes.push(serde_json::json!({"id": format!("pg{k}"), "kind": "postgres", "config": {"readReplicas": 1}}));
        edges.push(serde_json::json!({"id": format!("a{k}"), "from": "lb", "to": format!("web{k}"), "kind": "http"}));
        edges.push(serde_json::json!({"id": format!("b{k}"), "from": format!("web{k}"), "to": format!("pg{k}"), "kind": "db"}));
    }
    serde_json::from_value(serde_json::json!({
        "graph": {"nodes": nodes, "edges": edges},
        "workload": {"baseRps": 20000},
        "seed": 7
    }))
    .unwrap()
}

fn bench(c: &mut Criterion) {
    let input = ten_nodes();
    c.bench_function("simulate 10 nodes x 10 s", |b| b.iter(|| simulate(black_box(&input)).unwrap()));
}

criterion_group!(benches, bench);
criterion_main!(benches);
