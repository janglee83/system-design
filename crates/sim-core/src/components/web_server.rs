use super::{meta, num, Capacity, ComponentMeta, ComponentModel, ConfigField, Role};
use crate::calibration::Calibration;
use crate::types::{EdgeKind, Node};

const DEFAULT_CPU: f64 = 1.0;
const DEFAULT_MEMORY_GB: f64 = 2.0;

pub struct WebServer;

impl ComponentModel for WebServer {
    fn kind(&self) -> &'static str {
        "web-server"
    }
    fn meta(&self) -> ComponentMeta {
        meta(
            "web-server",
            "compute",
            Role::Service,
            &[EdgeKind::Http],
            false,
            vec![
                ConfigField::number("cpu", DEFAULT_CPU, 1.0, 16.0),
                ConfigField::number("memoryGb", DEFAULT_MEMORY_GB, 1.0, 64.0),
            ],
        )
    }
    fn capacity_per_instance(&self, node: &Node, cal: &Calibration) -> Capacity {
        let cpu = num(node, "cpu", DEFAULT_CPU);
        let mem = num(node, "memoryGb", DEFAULT_MEMORY_GB);
        Capacity {
            rps: cal.web_rps_per_vcpu * cpu,
            service_ms: cal.web_service_ms,
            max_queue: cal.web_queue_per_gb * mem,
        }
    }
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64 {
        cal.web_cost_per_vcpu * num(node, "cpu", DEFAULT_CPU) * f64::from(self.instances(node))
    }
}
