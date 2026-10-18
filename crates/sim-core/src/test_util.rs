use crate::types::*;

pub fn node(id: &str, kind: &str, replicas: u32, config: &[(&str, f64)]) -> Node {
    Node {
        id: id.into(),
        kind: kind.into(),
        label: String::new(),
        replicas,
        config: config.iter().map(|(k, v)| (k.to_string(), ConfigValue::Num(*v))).collect(),
    }
}

pub fn edge(from: &str, to: &str, kind: EdgeKind) -> Edge {
    Edge { id: format!("{from}->{to}"), from: from.into(), to: to.into(), kind }
}

pub fn graph(nodes: Vec<Node>, edges: Vec<Edge>) -> Graph {
    Graph { nodes, edges }
}

/// users -> lb(lb_replicas) -> web(web_replicas); used by many tests.
pub fn web_tier(lb_replicas: u32, web_replicas: u32) -> Graph {
    graph(
        vec![
            node("users", "client", 1, &[]),
            node("lb", "lb", lb_replicas, &[]),
            node("web", "web-server", web_replicas, &[]),
        ],
        vec![edge("users", "lb", EdgeKind::Http), edge("lb", "web", EdgeKind::Http)],
    )
}

#[allow(dead_code)]
pub fn input(graph: Graph, base_rps: f64) -> SimInput {
    SimInput {
        graph,
        workload: Workload {
            profile: Profile::Mixed,
            base_rps,
            write_ratio: 0.2,
            clients: 1000,
            client_timeout_ms: 1000.0,
            surge: None,
            params: Default::default(),
        },
        faults: vec![],
        duration_ms: 10_000,
        seed: 1,
        calibration: None,
    }
}
