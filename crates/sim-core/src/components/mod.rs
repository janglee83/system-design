//! Component registry. Each kind lives in its own file; adding a kind means one new file and
//! one line in REGISTRY. Components read world parameters from `Calibration`, never from
//! constants, so every number is overridable per run.

mod client;
mod lb;
pub mod postgres;
mod web_server;

use crate::calibration::Calibration;
use crate::types::{ConfigValue, EdgeKind, Node};
use serde::{Deserialize, Serialize};

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Role {
    Client,
    Balancer,
    Service,
    Database,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FieldKind {
    Number,
    Choice,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigField {
    pub key: String,
    pub kind: FieldKind,
    pub default: ConfigValue,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub options: Vec<String>,
}

impl ConfigField {
    pub fn number(key: &str, default: f64, min: f64, max: f64) -> Self {
        ConfigField {
            key: key.into(),
            kind: FieldKind::Number,
            default: ConfigValue::Num(default),
            min: Some(min),
            max: Some(max),
            options: vec![],
        }
    }
    pub fn choice(key: &str, default: &str, options: &[&str]) -> Self {
        ConfigField {
            key: key.into(),
            kind: FieldKind::Choice,
            default: ConfigValue::Str(default.into()),
            min: None,
            max: None,
            options: options.iter().map(|s| s.to_string()).collect(),
        }
    }
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentMeta {
    pub kind: String,
    /// i18n key for the display name, resolved by the UI (engine never emits prose).
    pub label_key: String,
    pub category: String,
    pub role: Role,
    pub accepts: Vec<EdgeKind>,
    pub is_entry: bool,
    pub fields: Vec<ConfigField>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Capacity {
    /// Requests per second one instance completes at 100% busy.
    pub rps: f64,
    /// Service time of one request on an idle instance.
    pub service_ms: f64,
    /// Requests one instance can hold waiting before it rejects new work.
    pub max_queue: f64,
}

pub trait ComponentModel: Sync {
    fn kind(&self) -> &'static str;
    fn meta(&self) -> ComponentMeta;
    fn instances(&self, node: &Node) -> u32 {
        node.replicas.max(1)
    }
    fn capacity_per_instance(&self, node: &Node, cal: &Calibration) -> Capacity;
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64;
}

/// Sorted by kind so listings are stable.
static REGISTRY: [&dyn ComponentModel; 4] =
    [&client::Client, &lb::LoadBalancer, &postgres::Postgres, &web_server::WebServer];

pub fn get(kind: &str) -> Option<&'static dyn ComponentModel> {
    REGISTRY.iter().copied().find(|c| c.kind() == kind)
}

pub fn list_components() -> Vec<ComponentMeta> {
    REGISTRY.iter().map(|c| c.meta()).collect()
}

/// Positive numeric config value, or `default` when missing, non-numeric or not positive.
pub fn num(node: &Node, key: &str, default: f64) -> f64 {
    match node.config.get(key).and_then(ConfigValue::as_f64) {
        Some(v) if v.is_finite() && v > 0.0 => v,
        _ => default,
    }
}

/// Non-negative numeric config value (0 allowed), or `default`.
pub fn num_or_zero(node: &Node, key: &str, default: f64) -> f64 {
    match node.config.get(key).and_then(ConfigValue::as_f64) {
        Some(v) if v.is_finite() && v >= 0.0 => v,
        _ => default,
    }
}

/// Config keys any node may set to override its own capacity and price.
pub const NODE_OVERRIDE_KEYS: [&str; 3] = ["rpsPerInstance", "serviceMs", "costPerMonth"];

/// Capacity after per-node overrides `rpsPerInstance` (> 0) and `serviceMs` (>= 0).
/// Invalid values are rejected by validation before a run, so they are ignored here.
pub fn effective_capacity(model: &dyn ComponentModel, node: &Node, cal: &Calibration) -> Capacity {
    let mut cap = model.capacity_per_instance(node, cal);
    if let Some(v) = node.config.get("rpsPerInstance").and_then(ConfigValue::as_f64) {
        if v.is_finite() && v > 0.0 {
            cap.rps = v;
        }
    }
    if let Some(v) = node.config.get("serviceMs").and_then(ConfigValue::as_f64) {
        if v.is_finite() && v >= 0.0 {
            cap.service_ms = v;
        }
    }
    cap
}

/// Monthly cost after the per-node override `costPerMonth` (price of ONE instance).
pub fn effective_cost(model: &dyn ComponentModel, node: &Node, cal: &Calibration) -> f64 {
    match node.config.get("costPerMonth").and_then(ConfigValue::as_f64) {
        Some(v) if v.is_finite() && v >= 0.0 => v * f64::from(model.instances(node)),
        _ => model.cost_per_month(node, cal),
    }
}

pub(crate) fn meta(
    kind: &str,
    category: &str,
    role: Role,
    accepts: &[EdgeKind],
    is_entry: bool,
    fields: Vec<ConfigField>,
) -> ComponentMeta {
    ComponentMeta {
        kind: kind.into(),
        label_key: format!("component.{kind}"),
        category: category.into(),
        role,
        accepts: accepts.to_vec(),
        is_entry,
        fields,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::calibration::Calibration;
    use crate::types::{ConfigValue, EdgeKind, Node};

    fn node(kind: &str, replicas: u32, config: &[(&str, f64)]) -> Node {
        Node {
            id: "n".into(),
            kind: kind.into(),
            label: String::new(),
            replicas,
            config: config.iter().map(|(k, v)| (k.to_string(), ConfigValue::Num(*v))).collect(),
        }
    }

    fn cal() -> Calibration {
        Calibration::default()
    }

    #[test]
    fn registry_lists_the_four_v1a_kinds_in_order() {
        let kinds: Vec<String> = list_components().into_iter().map(|m| m.kind).collect();
        assert_eq!(kinds, vec!["client", "lb", "postgres", "web-server"]);
        assert!(get("nope").is_none());
    }

    #[test]
    fn web_server_cost_and_capacity_scale_with_cpu_and_memory() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 3, &[("cpu", 2.0), ("memoryGb", 4.0)]);
        assert_eq!(web.instances(&n), 3);
        assert_eq!(web.cost_per_month(&n, &cal()), 135.0);
        let cap = web.capacity_per_instance(&n, &cal());
        assert_eq!(cap.rps, 18_000.0);
        assert_eq!(cap.max_queue, 20_000.0, "4 GB x webQueuePerGb 5,000");
        assert_eq!(web.meta().accepts, vec![EdgeKind::Http]);
    }

    #[test]
    fn web_server_defaults_to_one_cpu_two_gb() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 1, &[]);
        assert_eq!(web.capacity_per_instance(&n, &cal()).rps, 9_000.0);
        assert_eq!(web.cost_per_month(&n, &cal()), 22.5);
    }

    #[test]
    fn run_level_calibration_changes_capacity_and_cost() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 2, &[]);
        let slow = Calibration { web_rps_per_vcpu: 3_000.0, web_cost_per_vcpu: 40.0, ..Calibration::default() };
        assert_eq!(web.capacity_per_instance(&n, &slow).rps, 3_000.0);
        assert_eq!(web.cost_per_month(&n, &slow), 80.0);
    }

    #[test]
    fn node_level_overrides_win_over_calibration() {
        let web = get("web-server").unwrap();
        let n = node("web-server", 3, &[("rpsPerInstance", 1_234.0), ("serviceMs", 7.0), ("costPerMonth", 10.0)]);
        let cap = effective_capacity(web, &n, &cal());
        assert_eq!((cap.rps, cap.service_ms), (1_234.0, 7.0));
        assert_eq!(effective_cost(web, &n, &cal()), 30.0, "price of one instance x 3");
        let plain = node("web-server", 3, &[]);
        assert_eq!(effective_cost(web, &plain, &cal()), 67.5);
    }

    #[test]
    fn postgres_instances_include_read_replicas() {
        let pg = get("postgres").unwrap();
        let n = node("postgres", 1, &[("readReplicas", 2.0)]);
        assert_eq!(pg.instances(&n), 3);
        assert_eq!(pg.cost_per_month(&n, &cal()), 540.0);
        assert_eq!(pg.meta().role, Role::Database);
        assert_eq!(pg.meta().accepts, vec![EdgeKind::Db]);
    }

    #[test]
    fn lb_is_an_entry_point_and_client_accepts_nothing() {
        let lb = get("lb").unwrap();
        assert!(lb.meta().is_entry);
        assert_eq!(lb.cost_per_month(&node("lb", 2, &[]), &cal()), 50.0);
        let client = get("client").unwrap();
        assert!(client.meta().accepts.is_empty());
        assert_eq!(client.meta().role, Role::Client);
        assert_eq!(client.cost_per_month(&node("client", 1, &[]), &cal()), 0.0);
    }

    #[test]
    fn num_falls_back_to_default_for_missing_or_non_numeric() {
        let mut n = node("web-server", 1, &[]);
        assert_eq!(num(&n, "cpu", 1.0), 1.0);
        n.config.insert("cpu".into(), ConfigValue::Str("two".into()));
        assert_eq!(num(&n, "cpu", 1.0), 1.0);
        n.config.insert("cpu".into(), ConfigValue::Num(-3.0));
        assert_eq!(num(&n, "cpu", 1.0), 1.0, "non-positive values fall back too");
    }
}
