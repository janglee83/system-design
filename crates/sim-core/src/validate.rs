//! Structural checks run before every simulation. Issues carry codes, never prose.

use crate::components::{self, NODE_OVERRIDE_KEYS};
use crate::types::{Graph, GraphLimits, Node, ValidationIssue};
use std::collections::{BTreeMap, BTreeSet};

pub mod codes {
    pub const DUPLICATE_ID: &str = "node.duplicate-id";
    pub const UNKNOWN_KIND: &str = "node.unknown-kind";
    pub const EDGE_UNKNOWN_NODE: &str = "edge.unknown-node";
    pub const EDGE_NOT_ACCEPTED: &str = "edge.not-accepted";
    pub const NO_CLIENT: &str = "graph.no-client";
    pub const CLIENT_NO_PATH: &str = "client.no-path";
    pub const CYCLE: &str = "graph.cycle";
    pub const UNREACHABLE: &str = "node.unreachable";
    pub const CONFIG_INVALID: &str = "config.invalid";
    pub const CALIBRATION_INVALID: &str = "calibration.invalid";
    pub const TOO_MANY_NODES: &str = "limits.too-many-nodes";
    pub const TOO_MANY_INSTANCES: &str = "limits.too-many-instances";
    pub const KIND_NOT_ALLOWED: &str = "limits.kind-not-allowed";
}

/// Upper bound on `node.replicas` (inclusive; the lower bound is 1). Large enough for any
/// lesson design, small enough that instance counts and costs stay far from overflow.
pub const MAX_REPLICAS: u32 = 1000;

fn issue(code: &str, node: Option<&str>, edge: Option<&str>, blocking: bool) -> ValidationIssue {
    ValidationIssue {
        code: code.into(),
        node_id: node.map(String::from),
        edge_id: edge.map(String::from),
        field: None,
        blocking,
    }
}

pub(crate) fn field_issue(code: &str, node: Option<&str>, field: &str) -> ValidationIssue {
    ValidationIssue {
        code: code.into(),
        node_id: node.map(String::from),
        edge_id: None,
        field: Some(field.into()),
        blocking: true,
    }
}

/// `replicas` must be in 1..=MAX_REPLICAS, and every config key the component declares must
/// satisfy its `ConfigField` (range, integrality, options). Fields are checked in the order
/// the component lists them.
fn check_node_fields(n: &Node, issues: &mut Vec<ValidationIssue>) {
    if !(1..=MAX_REPLICAS).contains(&n.replicas) {
        issues.push(field_issue(codes::CONFIG_INVALID, Some(&n.id), "replicas"));
    }
    let Some(model) = components::get(&n.kind) else {
        return;
    };
    for field in model.meta().fields {
        if let Some(value) = n.config.get(&field.key) {
            if !field.accepts(value) {
                issues.push(field_issue(codes::CONFIG_INVALID, Some(&n.id), &field.key));
            }
        }
    }
}

/// Per-node overrides must be usable numbers. Keys are checked in sorted order.
fn check_node_overrides(n: &Node, issues: &mut Vec<ValidationIssue>) {
    let mut keys = NODE_OVERRIDE_KEYS;
    keys.sort_unstable();
    for key in keys {
        let Some(value) = n.config.get(key) else {
            continue;
        };
        let ok = match value.as_f64() {
            Some(v) if v.is_finite() => {
                if key == "rpsPerInstance" {
                    v > 0.0
                } else {
                    v >= 0.0
                }
            }
            _ => false,
        };
        if !ok {
            issues.push(field_issue(codes::CONFIG_INVALID, Some(&n.id), key));
        }
    }
}

pub fn has_blocking(issues: &[ValidationIssue]) -> bool {
    issues.iter().any(|i| i.blocking)
}

pub fn validate_graph(graph: &Graph, limits: Option<&GraphLimits>) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    let mut by_id: BTreeMap<&str, &Node> = BTreeMap::new();
    for n in &graph.nodes {
        if by_id.insert(n.id.as_str(), n).is_some() {
            issues.push(issue(codes::DUPLICATE_ID, Some(&n.id), None, true));
        }
        if components::get(&n.kind).is_none() {
            issues.push(issue(codes::UNKNOWN_KIND, Some(&n.id), None, true));
        }
        check_node_fields(n, &mut issues);
        check_node_overrides(n, &mut issues);
    }

    // Adjacency over edges whose endpoints exist.
    let mut adj: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
    for e in &graph.edges {
        match (by_id.get(e.from.as_str()), by_id.get(e.to.as_str())) {
            (Some(_), Some(target)) => {
                if let Some(model) = components::get(&target.kind) {
                    if !model.meta().accepts.contains(&e.kind) {
                        issues.push(issue(codes::EDGE_NOT_ACCEPTED, None, Some(&e.id), true));
                    }
                }
                adj.entry(e.from.as_str()).or_default().push(e.to.as_str());
            }
            _ => issues.push(issue(codes::EDGE_UNKNOWN_NODE, None, Some(&e.id), true)),
        }
    }

    let clients: Vec<&str> = graph
        .nodes
        .iter()
        .filter(|n| n.kind == "client")
        .map(|n| n.id.as_str())
        .collect();
    if clients.is_empty() {
        issues.push(issue(codes::NO_CLIENT, None, None, true));
    }
    for c in &clients {
        if adj.get(c).is_none_or(|v| v.is_empty()) {
            issues.push(issue(codes::CLIENT_NO_PATH, Some(c), None, true));
        }
    }

    if let Some(at) = find_cycle(&by_id, &adj) {
        issues.push(issue(codes::CYCLE, Some(at), None, true));
    }

    // Reachability from clients (warning only).
    let mut seen: BTreeSet<&str> = clients.iter().copied().collect();
    let mut stack: Vec<&str> = clients.clone();
    while let Some(id) = stack.pop() {
        for next in adj.get(id).into_iter().flatten() {
            if seen.insert(next) {
                stack.push(next);
            }
        }
    }
    for n in &graph.nodes {
        if !seen.contains(n.id.as_str()) && n.kind != "client" && !clients.is_empty() {
            issues.push(issue(codes::UNREACHABLE, Some(&n.id), None, false));
        }
    }

    if let Some(l) = limits {
        check_limits(graph, l, &mut issues);
    }
    issues
}

/// Iterative DFS with colors; returns a node on a cycle, if any.
fn find_cycle<'a>(
    by_id: &BTreeMap<&'a str, &Node>,
    adj: &BTreeMap<&'a str, Vec<&'a str>>,
) -> Option<&'a str> {
    #[derive(Clone, Copy, PartialEq)]
    enum Color {
        White,
        Grey,
        Black,
    }
    let mut color: BTreeMap<&str, Color> = by_id.keys().map(|k| (*k, Color::White)).collect();
    for &start in by_id.keys() {
        if color[start] != Color::White {
            continue;
        }
        let mut stack: Vec<(&str, usize)> = vec![(start, 0)];
        color.insert(start, Color::Grey);
        while let Some((id, idx)) = stack.pop() {
            let children = adj.get(id).map(Vec::as_slice).unwrap_or(&[]);
            if idx < children.len() {
                stack.push((id, idx + 1));
                let next = children[idx];
                match color[next] {
                    Color::Grey => return Some(next),
                    Color::White => {
                        color.insert(next, Color::Grey);
                        stack.push((next, 0));
                    }
                    Color::Black => {}
                }
            } else {
                color.insert(id, Color::Black);
            }
        }
    }
    None
}

fn check_limits(graph: &Graph, limits: &GraphLimits, issues: &mut Vec<ValidationIssue>) {
    if let Some(max) = limits.max_nodes {
        if graph.nodes.len() as u32 > max {
            issues.push(issue(codes::TOO_MANY_NODES, None, None, true));
        }
    }
    if let Some(max) = limits.max_instances {
        // Summed in u64: u32 replicas from many nodes must not wrap around under the limit.
        let total: u64 = graph
            .nodes
            .iter()
            .filter(|n| n.kind != "client")
            .filter_map(|n| components::get(&n.kind).map(|m| u64::from(m.instances(n))))
            .sum();
        if total > u64::from(max) {
            issues.push(issue(codes::TOO_MANY_INSTANCES, None, None, true));
        }
    }
    if let Some(allowed) = &limits.allowed_kinds {
        for n in &graph.nodes {
            if !allowed.iter().any(|k| k == &n.kind) {
                issues.push(issue(codes::KIND_NOT_ALLOWED, Some(&n.id), None, true));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::{edge, graph, node, web_tier};
    use crate::types::{EdgeKind, GraphLimits};

    fn codes_of(issues: &[ValidationIssue]) -> Vec<&str> {
        issues.iter().map(|i| i.code.as_str()).collect()
    }

    #[test]
    fn valid_web_tier_has_no_issues() {
        assert!(validate_graph(&web_tier(2, 3), None).is_empty());
    }

    #[test]
    fn duplicate_ids_and_unknown_kinds_are_blocking() {
        let g = graph(
            vec![
                node("a", "client", 1, &[]),
                node("a", "client", 1, &[]),
                node("x", "mainframe", 1, &[]),
            ],
            vec![edge("a", "x", EdgeKind::Http)],
        );
        let issues = validate_graph(&g, None);
        assert!(codes_of(&issues).contains(&codes::DUPLICATE_ID));
        assert!(codes_of(&issues).contains(&codes::UNKNOWN_KIND));
        assert!(has_blocking(&issues));
    }

    #[test]
    fn edge_to_missing_node_is_reported() {
        let g = graph(
            vec![node("users", "client", 1, &[])],
            vec![edge("users", "ghost", EdgeKind::Http)],
        );
        let issues = validate_graph(&g, None);
        assert_eq!(issues[0].code, codes::EDGE_UNKNOWN_NODE);
        assert_eq!(issues[0].edge_id.as_deref(), Some("users->ghost"));
    }

    #[test]
    fn edge_kind_must_be_accepted_by_target() {
        let mut g = web_tier(1, 1);
        g.nodes.push(node("pg", "postgres", 1, &[]));
        g.edges.push(edge("web", "pg", EdgeKind::Http)); // postgres only accepts db edges
        let issues = validate_graph(&g, None);
        assert_eq!(codes_of(&issues), vec![codes::EDGE_NOT_ACCEPTED]);
        assert_eq!(issues[0].edge_id.as_deref(), Some("web->pg"));
    }

    #[test]
    fn graph_needs_a_client_with_a_path() {
        let g = graph(vec![node("web", "web-server", 1, &[])], vec![]);
        assert!(codes_of(&validate_graph(&g, None)).contains(&codes::NO_CLIENT));

        let g = graph(vec![node("users", "client", 1, &[])], vec![]);
        assert_eq!(
            codes_of(&validate_graph(&g, None)),
            vec![codes::CLIENT_NO_PATH]
        );
    }

    #[test]
    fn cycles_are_blocking() {
        let mut g = web_tier(1, 1);
        g.nodes.push(node("lb2", "lb", 1, &[]));
        g.edges.push(edge("web", "lb2", EdgeKind::Http));
        g.edges.push(edge("lb2", "lb", EdgeKind::Http));
        let issues = validate_graph(&g, None);
        assert!(codes_of(&issues).contains(&codes::CYCLE));
        assert!(has_blocking(&issues));
    }

    #[test]
    fn unreachable_nodes_are_a_warning_only() {
        let mut g = web_tier(1, 1);
        g.nodes.push(node("orphan", "web-server", 1, &[]));
        let issues = validate_graph(&g, None);
        assert_eq!(codes_of(&issues), vec![codes::UNREACHABLE]);
        assert!(!has_blocking(&issues));
    }

    #[test]
    fn invalid_per_node_overrides_are_blocking_and_name_the_field() {
        let mut g = web_tier(1, 1);
        g.nodes[2]
            .config
            .insert("rpsPerInstance".into(), crate::types::ConfigValue::Num(0.0));
        g.nodes[2].config.insert(
            "costPerMonth".into(),
            crate::types::ConfigValue::Str("cheap".into()),
        );
        g.nodes[2]
            .config
            .insert("serviceMs".into(), crate::types::ConfigValue::Num(4.0)); // valid
        let issues = validate_graph(&g, None);
        let fields: Vec<&str> = issues
            .iter()
            .filter(|i| i.code == codes::CONFIG_INVALID)
            .map(|i| i.field.as_deref().unwrap())
            .collect();
        assert_eq!(fields, vec!["costPerMonth", "rpsPerInstance"]);
        assert!(issues.iter().all(|i| i.node_id.as_deref() == Some("web")));
        assert!(has_blocking(&issues));
    }

    fn issue_fields(issues: &[ValidationIssue], code: &str) -> Vec<(String, String)> {
        issues
            .iter()
            .filter(|i| i.code == code)
            .map(|i| {
                (
                    i.node_id.clone().unwrap_or_default(),
                    i.field.clone().unwrap_or_default(),
                )
            })
            .collect()
    }

    #[test]
    fn huge_read_replicas_are_blocking_not_a_panic() {
        let mut g = web_tier(1, 1);
        g.nodes
            .push(node("pg", "postgres", 1, &[("readReplicas", 1e12)]));
        g.edges.push(edge("web", "pg", EdgeKind::Db));
        let issues = validate_graph(&g, None);
        assert_eq!(
            issue_fields(&issues, codes::CONFIG_INVALID),
            vec![("pg".to_string(), "readReplicas".to_string())]
        );
        assert!(has_blocking(&issues));
        // The model itself saturates instead of overflowing.
        let pg = components::get("postgres").unwrap();
        assert_eq!(pg.instances(&g.nodes[3]), u32::MAX);
    }

    #[test]
    fn component_fields_are_checked_against_their_range_and_integrality() {
        let mut g = web_tier(1, 1);
        g.nodes
            .push(node("pg", "postgres", 1, &[("readReplicas", 1.5)]));
        g.edges.push(edge("web", "pg", EdgeKind::Db));
        g.nodes[2] = node("web", "web-server", 1, &[("cpu", 1.5), ("memoryGb", 65.0)]);
        g.nodes[1].config.insert(
            "algorithm".into(),
            crate::types::ConfigValue::Str("random".into()),
        );
        let issues = validate_graph(&g, None);
        assert_eq!(
            issue_fields(&issues, codes::CONFIG_INVALID),
            vec![
                ("lb".to_string(), "algorithm".to_string()),
                ("web".to_string(), "cpu".to_string()),
                ("web".to_string(), "memoryGb".to_string()),
                ("pg".to_string(), "readReplicas".to_string()),
            ]
        );

        let mut ok = web_tier(1, 1);
        ok.nodes
            .push(node("pg", "postgres", 1, &[("readReplicas", 5.0)]));
        ok.edges.push(edge("web", "pg", EdgeKind::Db));
        ok.nodes[2] = node(
            "web",
            "web-server",
            1,
            &[("cpu", 16.0), ("memoryGb", 0.5 + 1.0)],
        );
        ok.nodes[1].config.insert(
            "algorithm".into(),
            crate::types::ConfigValue::Str("least-conn".into()),
        );
        assert!(validate_graph(&ok, None).is_empty());
    }

    #[test]
    fn replicas_must_be_between_one_and_the_cap() {
        let g = web_tier(0, MAX_REPLICAS + 1);
        let issues = validate_graph(&g, None);
        assert_eq!(
            issue_fields(&issues, codes::CONFIG_INVALID),
            vec![
                ("lb".to_string(), "replicas".to_string()),
                ("web".to_string(), "replicas".to_string()),
            ]
        );
        assert!(validate_graph(&web_tier(1, MAX_REPLICAS), None).is_empty());
    }

    #[test]
    fn instance_limit_counts_without_overflow() {
        let g = web_tier(u32::MAX, u32::MAX);
        let limits = GraphLimits {
            max_nodes: None,
            max_instances: Some(10),
            allowed_kinds: None,
        };
        let issues = validate_graph(&g, Some(&limits));
        assert!(codes_of(&issues).contains(&codes::TOO_MANY_INSTANCES));
        // Even an unlimited-looking cap is not bypassed by wrap-around.
        let limits = GraphLimits {
            max_instances: Some(u32::MAX),
            ..limits
        };
        let issues = validate_graph(&g, Some(&limits));
        assert!(codes_of(&issues).contains(&codes::TOO_MANY_INSTANCES));
    }

    #[test]
    fn limits_are_enforced() {
        let g = web_tier(2, 5); // 3 nodes, 7 instances (client not counted)
        let limits = GraphLimits {
            max_nodes: Some(2),
            max_instances: Some(6),
            allowed_kinds: Some(vec!["client".into(), "web-server".into()]),
        };
        let codes = validate_graph(&g, Some(&limits))
            .into_iter()
            .map(|i| i.code)
            .collect::<Vec<_>>();
        assert!(codes.contains(&codes::TOO_MANY_NODES.to_string()));
        assert!(codes.contains(&codes::TOO_MANY_INSTANCES.to_string()));
        assert!(codes.contains(&codes::KIND_NOT_ALLOWED.to_string()));

        let ok = GraphLimits {
            max_nodes: Some(3),
            max_instances: Some(7),
            allowed_kinds: None,
        };
        assert!(validate_graph(&g, Some(&ok)).is_empty());
    }
}
