use super::{meta, Capacity, ComponentMeta, ComponentModel, Role};
use crate::calibration::Calibration;
use crate::types::Node;

pub struct Client;

impl ComponentModel for Client {
    fn kind(&self) -> &'static str {
        "client"
    }
    fn meta(&self) -> ComponentMeta {
        meta("client", "general", Role::Client, &[], false, vec![])
    }
    fn capacity_per_instance(&self, _node: &Node, _cal: &Calibration) -> Capacity {
        Capacity { rps: f64::INFINITY, service_ms: 0.0, max_queue: 0.0 }
    }
    fn cost_per_month(&self, _node: &Node, _cal: &Calibration) -> f64 {
        0.0
    }
}
