//! Fault injection. Faults fire at the first tick whose start time is >= atMs.

use crate::components::Role;
use crate::engine::Engine;
use crate::types::{Fault, FaultKind, SimEvent};
use std::collections::BTreeMap;

pub(crate) struct FaultQueue {
    /// Sorted descending so `due` can pop from the end.
    pending: Vec<Fault>,
}

impl FaultQueue {
    pub fn new(faults: &[Fault]) -> Self {
        let mut pending = faults.to_vec();
        pending.sort_by(|a, b| {
            (b.at_ms, b.kind, b.target.as_deref()).cmp(&(a.at_ms, a.kind, a.target.as_deref()))
        });
        FaultQueue { pending }
    }

    pub fn due(&mut self, now_ms: f64) -> Vec<Fault> {
        let mut out = Vec::new();
        while let Some(f) = self.pending.last() {
            if f64::from(f.at_ms) <= now_ms {
                out.push(self.pending.pop().expect("checked"));
            } else {
                break;
            }
        }
        out
    }
}

fn event(at_ms: f64, node: Option<&str>, code: &str, params: &[(&str, f64)]) -> SimEvent {
    SimEvent {
        at_ms: at_ms as u32,
        node: node.map(String::from),
        code: code.into(),
        params: params
            .iter()
            .map(|(k, v)| (k.to_string(), *v))
            .collect::<BTreeMap<_, _>>(),
    }
}

impl Engine<'_> {
    pub(crate) fn apply_due_faults(&mut self) {
        let now = self.now_ms;

        // Finish pending database promotions first.
        for n in &mut self.nodes {
            if let Some(at) = n.promote_at_ms {
                if at <= now {
                    n.promote_at_ms = None;
                    n.primary_up = true;
                    self.events.push(event(at, Some(&n.id), "db.promoted", &[]));
                }
            }
        }

        for f in self.fault_queue.due(now) {
            self.apply_fault(&f);
        }
    }

    fn pick_target(&mut self, f: &Fault, role: Role) -> Option<usize> {
        let eligible = |n: &crate::engine::NodeRt| {
            n.role == role && n.instances_up > 0 && (role != Role::Database || n.primary_up)
        };
        match &f.target {
            Some(id) => self.nodes.iter().position(|n| &n.id == id && eligible(n)),
            None => {
                let candidates: Vec<usize> = (0..self.nodes.len())
                    .filter(|&i| eligible(&self.nodes[i]))
                    .collect();
                if candidates.is_empty() {
                    None
                } else {
                    Some(candidates[self.fault_rng.next_u32() as usize % candidates.len()])
                }
            }
        }
    }

    fn apply_fault(&mut self, f: &Fault) {
        let now = self.now_ms;
        let failover_ms = self.cal.pg_failover_ms;
        let role = match f.kind {
            FaultKind::TrafficSurge3x => {
                self.rate_multiplier *= 3.0;
                self.events
                    .push(event(now, None, "fault.traffic-surge", &[("factor", 3.0)]));
                return;
            }
            FaultKind::InstanceDown => Role::Service,
            FaultKind::LbNodeDown => Role::Balancer,
            FaultKind::DbPrimaryDown => Role::Database,
            _ => {
                self.events
                    .push(event(now, f.target.as_deref(), "fault.unsupported", &[]));
                return;
            }
        };

        let Some(i) = self.pick_target(f, role) else {
            self.events
                .push(event(now, f.target.as_deref(), "fault.no-target", &[]));
            return;
        };

        let n = &mut self.nodes[i];
        n.instances_up -= 1;
        let remaining = f64::from(n.instances_up);
        match f.kind {
            FaultKind::InstanceDown => {
                self.events.push(event(
                    now,
                    Some(&n.id),
                    "instance.down",
                    &[("remaining", remaining)],
                ));
            }
            FaultKind::LbNodeDown => {
                self.events.push(event(
                    now,
                    Some(&n.id),
                    "lb.node-down",
                    &[("remaining", remaining)],
                ));
            }
            FaultKind::DbPrimaryDown => {
                n.primary_up = false;
                self.events.push(event(
                    now,
                    Some(&n.id),
                    "db.primary-down",
                    &[("replicas", remaining)],
                ));
                if n.instances_up > 0 {
                    n.promote_at_ms = Some(now + failover_ms);
                } else {
                    self.events
                        .push(event(now, Some(&n.id), "db.no-replica", &[]));
                }
            }
            _ => unreachable!("filtered above"),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::simulate;
    use crate::test_util::{edge, input, node, web_tier};
    use crate::types::*;

    fn with_pg(read_replicas: f64) -> Graph {
        let mut g = web_tier(2, 3);
        g.nodes.push(node(
            "pg",
            "postgres",
            1,
            &[("readReplicas", read_replicas)],
        ));
        g.edges.push(edge("web", "pg", EdgeKind::Db));
        g
    }

    fn fault(kind: FaultKind, target: Option<&str>, at_ms: u32) -> Fault {
        Fault {
            kind,
            target: target.map(String::from),
            at_ms,
        }
    }

    fn codes(r: &SimResult) -> Vec<&str> {
        r.events.iter().map(|e| e.code.as_str()).collect()
    }

    #[test]
    fn losing_the_only_database_breaks_most_requests() {
        let mut i = input(with_pg(0.0), 2_000.0);
        i.faults = vec![fault(FaultKind::DbPrimaryDown, Some("pg"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(r.metrics.availability < 0.75, "{:?}", r.metrics);
        assert!(codes(&r).contains(&"db.primary-down"));
        assert!(codes(&r).contains(&"db.no-replica"));
    }

    #[test]
    fn a_read_replica_is_promoted_after_failover() {
        let mut i = input(with_pg(1.0), 2_000.0);
        i.faults = vec![fault(FaultKind::DbPrimaryDown, Some("pg"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(r.metrics.availability > 0.95, "{:?}", r.metrics);
        let promoted = r
            .events
            .iter()
            .find(|e| e.code == "db.promoted")
            .expect("promotion event");
        assert_eq!(promoted.at_ms, 3_600);
    }

    #[test]
    fn redundant_web_tier_survives_losing_one_instance() {
        let mut i = input(web_tier(2, 2), 2_000.0);
        i.faults = vec![fault(FaultKind::InstanceDown, Some("web"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(r.metrics.availability > 0.99, "{:?}", r.metrics);
        assert!(codes(&r).contains(&"instance.down"));
    }

    #[test]
    fn single_web_instance_down_makes_requests_unreachable() {
        let mut i = input(web_tier(2, 1), 2_000.0);
        i.faults = vec![fault(FaultKind::InstanceDown, None, 3_000)]; // auto-picks "web"
        let m = simulate(&i).unwrap().metrics;
        assert!(m.availability < 0.75, "{m:?}");
        assert!(m.requests_unreachable > 0.0);
    }

    #[test]
    fn traffic_surge_fault_triples_load_from_its_start() {
        let mut i = input(web_tier(2, 5), 1_000.0);
        i.faults = vec![fault(FaultKind::TrafficSurge3x, None, 3_000)];
        let m = simulate(&i).unwrap().metrics;
        // 3 s at 1,000 rps + 7 s at 3,000 rps = 24,000 requests.
        assert!(
            (m.requests_total - 24_000.0).abs() < 800.0,
            "{}",
            m.requests_total
        );
    }

    #[test]
    fn lb_node_down_reduces_balancer_instances() {
        let mut i = input(web_tier(1, 2), 2_000.0);
        i.faults = vec![fault(FaultKind::LbNodeDown, Some("lb"), 3_000)];
        let r = simulate(&i).unwrap();
        assert!(codes(&r).contains(&"lb.node-down"));
        assert!(r.metrics.availability < 0.75, "single LB replica lost");
    }

    // Review focus 4: bad targets never panic.
    #[test]
    fn missing_or_mismatched_targets_are_ignored_with_an_event() {
        let mut i = input(with_pg(0.0), 1_000.0);
        i.faults = vec![
            fault(FaultKind::InstanceDown, Some("ghost"), 1_000),
            fault(FaultKind::DbPrimaryDown, Some("web"), 1_000),
        ];
        let r = simulate(&i).unwrap();
        assert_eq!(
            codes(&r)
                .iter()
                .filter(|c| **c == "fault.no-target")
                .count(),
            2
        );
        assert!(r.metrics.availability > 0.999);
    }

    #[test]
    fn unsupported_kinds_are_reported_not_applied() {
        let mut i = input(web_tier(2, 2), 1_000.0);
        i.faults = vec![fault(FaultKind::CacheDown, None, 1_000)];
        let r = simulate(&i).unwrap();
        assert!(codes(&r).contains(&"fault.unsupported"));
        assert!(r.metrics.availability > 0.999);
    }

    #[test]
    fn fault_order_in_input_does_not_matter() {
        let a = fault(FaultKind::InstanceDown, None, 2_000);
        let b = fault(FaultKind::DbPrimaryDown, None, 2_000);
        let mut i1 = input(with_pg(1.0), 2_000.0);
        i1.faults = vec![a.clone(), b.clone()];
        let mut i2 = i1.clone();
        i2.faults = vec![b, a];
        assert_eq!(simulate(&i1).unwrap(), simulate(&i2).unwrap());
    }
}
