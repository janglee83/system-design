//! Every type that crosses the engine boundary. JSON uses camelCase fields and kebab-case enums.
//! With feature `ts`, `cargo test export_bindings` writes matching TypeScript files.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

macro_rules! exported {
    ($item:item) => {
        #[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
        $item
    };
}

// ---------- graph ----------

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EdgeKind { Http, Db, Cache, Msg }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConfigValue { Bool(bool), Num(f64), Str(String) }
}

impl ConfigValue {
    pub fn as_f64(&self) -> Option<f64> {
        match self { ConfigValue::Num(v) => Some(*v), _ => None }
    }
    pub fn as_str(&self) -> Option<&str> {
        match self { ConfigValue::Str(v) => Some(v), _ => None }
    }
    pub fn as_bool(&self) -> Option<bool> {
        match self { ConfigValue::Bool(v) => Some(*v), _ => None }
    }
}

pub type Config = BTreeMap<String, ConfigValue>;

fn default_replicas() -> u32 { 1 }

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: String,
    pub kind: String,
    #[serde(default)]
    pub label: String,
    #[serde(default = "default_replicas")]
    pub replicas: u32,
    #[serde(default)]
    pub config: Config,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Edge { pub id: String, pub from: String, pub to: String, pub kind: EdgeKind }
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Graph { pub nodes: Vec<Node>, pub edges: Vec<Edge> }
}

// ---------- workload and faults ----------

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Profile { ReadHeavy, WriteHeavy, Mixed, Chat, Feed, Jobs }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Surge { pub factor: f64, pub at_ms: u32, pub duration_ms: u32 }
}

exported! {
/// How many requests a client sends per tick: `poisson` draws from the seeded RNG around the
/// rate; `uniform` sends exactly rate x tick (no noise), as the parity reference runs do.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Arrivals {
    #[default]
    Poisson,
    Uniform,
}
}

fn default_profile() -> Profile { Profile::Mixed }
fn default_write_ratio() -> f64 { 0.2 }
fn default_clients() -> u32 { 1000 }
fn default_timeout() -> f64 { 1000.0 }

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workload {
    #[serde(default = "default_profile")]
    pub profile: Profile,
    pub base_rps: f64,
    #[serde(default = "default_write_ratio")]
    pub write_ratio: f64,
    #[serde(default = "default_clients")]
    pub clients: u32,
    #[serde(default = "default_timeout")]
    pub client_timeout_ms: f64,
    #[serde(default)]
    pub surge: Option<Surge>,
    #[serde(default)]
    pub params: BTreeMap<String, f64>,
    /// No new requests at or after this time; the rest of the run drains. Absent: traffic
    /// runs for the whole duration.
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub traffic_end_ms: Option<u32>,
    /// Absent means `poisson`.
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub arrivals: Option<Arrivals>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FaultKind {
    #[serde(rename = "traffic-surge-3x")]
    TrafficSurge3x,
    InstanceDown,
    InstanceSlow,
    LbNodeDown,
    CacheDown,
    DbOverloaded,
    DbPrimaryDown,
    DbReplicaDown,
    DbStalled,
    BrokerDown,
    ObjectStorageDown,
    KvNodeDown,
    ThirdPartyDown,
    ThirdPartySlow,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fault {
    pub kind: FaultKind,
    #[serde(default)]
    pub target: Option<String>,
    pub at_ms: u32,
}
}

// Each field overrides the same-named field of `calibration::Calibration` for one run.
// Missing fields keep the defaults. Validation rejects unusable values (see Task 4).
exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalibrationOverrides {
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_rps_per_vcpu: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_service_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_queue_per_gb: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub web_cost_per_vcpu: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_rps_per_replica: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_service_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_queue_seconds: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub lb_cost_per_replica: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_qps_per_instance: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_service_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_queue_seconds: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_cost_per_instance: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub pg_failover_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_http_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_db_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_cache_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub edge_delay_msg_ms: Option<f64>,
    #[serde(default)] #[cfg_attr(feature = "ts", ts(optional))] pub max_utilization_for_latency: Option<f64>,
}
}

fn default_duration() -> u32 { 10_000 }

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimInput {
    pub graph: Graph,
    pub workload: Workload,
    #[serde(default)]
    pub faults: Vec<Fault>,
    #[serde(default = "default_duration")]
    pub duration_ms: u32,
    #[serde(default)]
    pub seed: u32,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub calibration: Option<CalibrationOverrides>,
}
}

// ---------- results ----------

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Metrics {
    pub p50: f64,
    pub p95: f64,
    pub p99: f64,
    pub availability: f64,
    pub throughput_rps: f64,
    pub cost_per_month: f64,
    pub spof_count: u32,
    /// Client edges that point at something other than a public entry point (lb, gateway, cdn).
    pub exposed_backends: u32,
    pub peak_busy: f64,
    pub peak_db_connections: f64,
    pub cache_ops: f64,
    pub requests_total: f64,
    pub requests_ok: f64,
    pub requests_rejected: f64,
    pub requests_timed_out: f64,
    pub requests_unreachable: f64,
    pub duplicate_ids: Option<f64>,
    pub out_of_order_ids: Option<f64>,
    pub lost_updates: Option<f64>,
    pub write_conflicts: Option<f64>,
    pub duplicate_writes: Option<f64>,
    pub stale_reads: Option<f64>,
    pub peak_queue_depth: Option<f64>,
    pub lost_messages: Option<f64>,
    pub status_flaps: Option<f64>,
    pub stale_online: Option<f64>,
    pub inbox_writes_per_sec: Option<f64>,
}
}

/// Field order inside each timeline cell.
pub const TIMELINE_FIELDS: [&str; 5] = ["inFlight", "queued", "busy", "rejected", "up"];

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Timeline {
    pub frame_ms: u32,
    pub node_ids: Vec<String>,
    pub fields: Vec<String>,
    /// Flat: data[(frame * node_ids.len() + node) * fields.len() + field]
    pub data: Vec<f32>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RequestClass { Read, Write }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TraceAction { Send, Serve, Reject, Down }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TraceOutcome { Delivered, Rejected, Timeout, Unreachable }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceStep {
    pub t_ms: f64,
    pub node_id: String,
    pub action: TraceAction,
    pub wait_ms: f64,
    pub service_ms: f64,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Trace {
    pub id: u32,
    pub class: RequestClass,
    pub start_ms: f64,
    pub latency_ms: f64,
    pub outcome: TraceOutcome,
    pub steps: Vec<TraceStep>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimEvent {
    pub at_ms: u32,
    pub node: Option<String>,
    pub code: String,
    #[serde(default)]
    pub params: BTreeMap<String, f64>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimResult {
    pub engine_version: String,
    pub metrics: Metrics,
    pub timeline: Timeline,
    pub traces: Vec<Trace>,
    pub events: Vec<SimEvent>,
}
}

// ---------- validation and grading ----------

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub code: String,
    pub node_id: Option<String>,
    pub edge_id: Option<String>,
    /// Config or calibration field the issue is about, when relevant.
    #[serde(default)]
    pub field: Option<String>,
    pub blocking: bool,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLimits {
    #[serde(default)]
    pub max_nodes: Option<u32>,
    #[serde(default)]
    pub max_instances: Option<u32>,
    #[serde(default)]
    pub allowed_kinds: Option<Vec<String>>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GoalOp {
    #[serde(rename = "<=")] Le,
    #[serde(rename = ">=")] Ge,
    #[serde(rename = "==")] Eq,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal { pub id: String, pub metric: String, pub op: GoalOp, pub value: f64 }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalResult { pub id: String, pub passed: bool, pub measured: Option<f64> }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Verdict { pub passed: bool, pub score: u32, pub stars: u8, pub goals: Vec<GoalResult> }
}
