use super::{meta, num_or_zero, Capacity, ComponentMeta, ComponentModel, ConfigField, Role};
use crate::calibration::Calibration;
use crate::types::{EdgeKind, Node};

/// One primary (takes writes and reads) plus `readReplicas` read-only replicas.
/// `node.replicas` is ignored for this kind; use `readReplicas`.
pub struct Postgres;

impl Postgres {
    pub fn read_replicas(node: &Node) -> u32 {
        num_or_zero(node, "readReplicas", 0.0) as u32
    }
}

impl ComponentModel for Postgres {
    fn kind(&self) -> &'static str {
        "postgres"
    }
    fn meta(&self) -> ComponentMeta {
        meta(
            "postgres",
            "data",
            Role::Database,
            &[EdgeKind::Db],
            false,
            vec![ConfigField::number("readReplicas", 0.0, 0.0, 5.0)],
        )
    }
    fn instances(&self, node: &Node) -> u32 {
        1 + Self::read_replicas(node)
    }
    fn capacity_per_instance(&self, _node: &Node, cal: &Calibration) -> Capacity {
        Capacity {
            rps: cal.pg_qps_per_instance,
            service_ms: cal.pg_service_ms,
            max_queue: cal.pg_qps_per_instance * cal.pg_queue_seconds,
            latency_knee: Some(cal.pg_max_utilization_for_latency),
        }
    }
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64 {
        cal.pg_cost_per_instance * f64::from(self.instances(node))
    }
}
