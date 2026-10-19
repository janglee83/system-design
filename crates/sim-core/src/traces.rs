//! Sampled request traces: every Nth tick one virtual request walks the graph using that
//! tick's queue state. Uses its own PRNG stream so traffic numbers never depend on sampling.

use crate::components::Role;
use crate::engine::Engine;
use crate::types::{RequestClass, Trace, TraceAction, TraceOutcome, TraceStep};

impl Engine<'_> {
    pub(crate) fn sample_trace(&mut self) {
        let Some(&client) = self.clients_slice().first() else {
            return;
        };
        let generated = self.nodes[client].in_read + self.nodes[client].in_write;
        if generated <= 0.0 {
            return;
        }
        let start = self.now_ms;
        let write_ratio = self.input.workload.write_ratio;
        let class = if self.trace_rng.next_f64() < write_ratio {
            RequestClass::Write
        } else {
            RequestClass::Read
        };

        let mut t = start;
        let mut steps = vec![TraceStep {
            t_ms: t,
            node_id: self.nodes[client].id.clone(),
            action: TraceAction::Send,
            wait_ms: 0.0,
            service_ms: 0.0,
        }];
        let mut current = client;
        let outcome = loop {
            let targets = self.targets(current);
            if targets.is_empty() {
                break match self.nodes[current].role {
                    Role::Client | Role::Balancer => TraceOutcome::Unreachable,
                    Role::Service | Role::Database => TraceOutcome::Delivered,
                };
            }
            let pick = self.trace_rng.next_u32() as usize % targets.len();
            let (next, kind) = targets[pick];
            t += self.cal.edge_delay_ms(kind);
            let n = &self.nodes[next];
            let (down, reject) = match class {
                RequestClass::Read => (n.fail_down_r, n.fail_reject_r),
                RequestClass::Write => (n.fail_down_w, n.fail_reject_w),
            };
            let roll_down = self.trace_rng.next_f64();
            let roll_reject = self.trace_rng.next_f64();
            if roll_down < down {
                steps.push(TraceStep {
                    t_ms: t,
                    node_id: n.id.clone(),
                    action: TraceAction::Down,
                    wait_ms: 0.0,
                    service_ms: 0.0,
                });
                break TraceOutcome::Unreachable;
            }
            if roll_reject < reject {
                steps.push(TraceStep {
                    t_ms: t,
                    node_id: n.id.clone(),
                    action: TraceAction::Reject,
                    wait_ms: 0.0,
                    service_ms: 0.0,
                });
                break TraceOutcome::Rejected;
            }
            let service = (n.lat_ms - n.wait_ms).max(0.0);
            steps.push(TraceStep {
                t_ms: t,
                node_id: n.id.clone(),
                action: TraceAction::Serve,
                wait_ms: n.wait_ms,
                service_ms: service,
            });
            t += n.lat_ms;
            current = next;
        };

        let latency = t - start;
        let outcome = if outcome == TraceOutcome::Delivered && latency > self.timeout_ms() {
            TraceOutcome::Timeout
        } else {
            outcome
        };
        let id = self.traces.len() as u32;
        self.traces.push(Trace {
            id,
            class,
            start_ms: start,
            latency_ms: latency,
            outcome,
            steps,
        });
    }
}
#[cfg(test)]
mod tests {
    use crate::simulate;
    use crate::test_util::{edge, graph, input, node, web_tier};
    use crate::types::*;

    #[test]
    fn about_300_traces_starting_at_the_client() {
        let r = simulate(&input(web_tier(2, 2), 2_000.0)).unwrap();
        assert!((250..=350).contains(&r.traces.len()), "{}", r.traces.len());
        for (k, t) in r.traces.iter().enumerate() {
            assert_eq!(t.id, k as u32);
            assert_eq!(t.steps[0].node_id, "users");
            assert_eq!(t.steps[0].action, TraceAction::Send);
            assert!(t.latency_ms >= 0.0);
        }
        assert!(r
            .traces
            .iter()
            .all(|t| t.outcome == TraceOutcome::Delivered));
        let last = r.traces[0].steps.last().unwrap();
        assert_eq!(last.node_id, "web");
        assert_eq!(last.action, TraceAction::Serve);
    }

    #[test]
    fn overloaded_server_produces_rejected_traces_with_waiting_time() {
        let g = graph(
            vec![
                node("users", "client", 1, &[]),
                node("web", "web-server", 1, &[]),
            ],
            vec![edge("users", "web", EdgeKind::Http)],
        );
        let mut i = input(g, 8_000.0);
        i.workload.surge = Some(Surge {
            factor: 3.0,
            at_ms: 2_000,
            duration_ms: 6_000,
        });
        let r = simulate(&i).unwrap();
        assert!(r.traces.iter().any(|t| t.outcome == TraceOutcome::Rejected));
        let slow = r
            .traces
            .iter()
            .filter(|t| t.outcome == TraceOutcome::Delivered)
            .map(|t| t.latency_ms);
        assert!(
            slow.fold(0.0_f64, f64::max) > 100.0,
            "some delivered request waited in the queue"
        );
        let waited = r
            .traces
            .iter()
            .flat_map(|t| &t.steps)
            .any(|s| s.wait_ms > 50.0);
        assert!(waited);
    }

    #[test]
    fn balancer_with_no_children_gives_unreachable_traces() {
        let g = graph(
            vec![node("users", "client", 1, &[]), node("lb", "lb", 2, &[])],
            vec![edge("users", "lb", EdgeKind::Http)],
        );
        let r = simulate(&input(g, 1_000.0)).unwrap();
        assert!(!r.traces.is_empty());
        assert!(r
            .traces
            .iter()
            .all(|t| t.outcome == TraceOutcome::Unreachable));
    }

    #[test]
    fn no_traffic_means_no_traces() {
        assert!(simulate(&input(web_tier(1, 1), 0.0))
            .unwrap()
            .traces
            .is_empty());
    }

    #[test]
    fn traces_do_not_change_traffic_metrics_between_runs() {
        let i = input(web_tier(2, 3), 5_000.0);
        let a = simulate(&i).unwrap();
        let b = simulate(&i).unwrap();
        assert_eq!(a.traces, b.traces);
        assert_eq!(a.metrics, b.metrics);
    }
}
