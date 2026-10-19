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
                ConfigField::integer("cpu", DEFAULT_CPU, 1.0, 16.0),
                ConfigField::number("memoryGb", DEFAULT_MEMORY_GB, 1.0, 64.0),
            ],
        )
    }
    fn capacity_per_instance(&self, node: &Node, cal: &Calibration) -> Capacity {
        let cpu = num(node, "cpu", DEFAULT_CPU);
        let mem = num(node, "memoryGb", DEFAULT_MEMORY_GB);
        let rps = cal.web_rps_per_vcpu * cpu;
        // Memory bounds everything in the server; requests being served occupy workers.
        let workers = rps * cal.web_service_ms / 1000.0;
        Capacity {
            rps,
            service_ms: cal.web_service_ms,
            max_queue: (cal.web_queue_per_gb * mem - workers).max(0.0),
            latency_knee: None,
        }
    }
    fn cost_per_month(&self, node: &Node, cal: &Calibration) -> f64 {
        let extra = (num(node, "cpu", DEFAULT_CPU) - 1.0).max(0.0);
        (cal.web_cost_per_vcpu + cal.web_cost_per_extra_vcpu * extra)
            * f64::from(self.instances(node))
    }
}
