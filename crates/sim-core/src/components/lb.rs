use super::{meta, Capacity, ComponentMeta, ComponentModel, ConfigField, Role};
use crate::calibration::Calibration;
use crate::types::{EdgeKind, Node};

pub struct LoadBalancer;

impl ComponentModel for LoadBalancer {
    fn kind(&self) -> &'static str {
        "lb"
    }
    fn meta(&self) -> ComponentMeta {
        meta(
            "lb",
            "general",
            Role::Balancer,
            &[EdgeKind::Http],
            true,
            vec![ConfigField::choice("algorithm", "round-robin", &["round-robin", "least-conn"])],
        )
    }
    fn capacity_per_instance(&self, _node: &Node, cal: &Calibration) -> Capacity {
        Capacity {
            rps: cal.lb_rps_per_replica,
            service_ms: cal.lb_service_ms,
            max_queue: cal.lb_rps_per_replica * cal.lb_queue_seconds,
            latency_knee: Some(cal.lb_max_utilization_for_latency),
        }
    }
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64 {
        cal.lb_cost_per_replica * f64::from(self.instances(node))
    }
}
