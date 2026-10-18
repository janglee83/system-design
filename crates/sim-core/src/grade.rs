//! Goals -> verdict. Grading is separate from simulation so one run can be scored against
//! several challenge modes, and Lab runs are not scored at all.

use crate::types::{GoalOp, GoalResult, Goal, Metrics, SimResult, Verdict};

pub fn metric_value(m: &Metrics, key: &str) -> Option<f64> {
    Some(match key {
        "p50" => m.p50,
        "p95" => m.p95,
        "p99" => m.p99,
        "availability" => m.availability,
        "throughputRps" => m.throughput_rps,
        "costPerMonth" => m.cost_per_month,
        "spofCount" => f64::from(m.spof_count),
        "exposedBackends" => f64::from(m.exposed_backends),
        "peakBusy" => m.peak_busy,
        "peakDbConnections" => m.peak_db_connections,
        "cacheOps" => m.cache_ops,
        "requestsTotal" => m.requests_total,
        "requestsOk" => m.requests_ok,
        "requestsRejected" => m.requests_rejected,
        "requestsTimedOut" => m.requests_timed_out,
        "requestsUnreachable" => m.requests_unreachable,
        "duplicateIds" => return m.duplicate_ids,
        "outOfOrderIds" => return m.out_of_order_ids,
        "lostUpdates" => return m.lost_updates,
        "writeConflicts" => return m.write_conflicts,
        "duplicateWrites" => return m.duplicate_writes,
        "staleReads" => return m.stale_reads,
        "peakQueueDepth" => return m.peak_queue_depth,
        "lostMessages" => return m.lost_messages,
        "statusFlaps" => return m.status_flaps,
        "staleOnline" => return m.stale_online,
        "inboxWritesPerSec" => return m.inbox_writes_per_sec,
        _ => return None,
    })
}

pub fn compare(measured: f64, op: GoalOp, value: f64) -> bool {
    match op {
        GoalOp::Le => measured <= value,
        GoalOp::Ge => measured >= value,
        GoalOp::Eq => (measured - value).abs() <= 1e-9 * value.abs().max(1.0),
    }
}

pub fn grade(result: &SimResult, goals: &[Goal]) -> Verdict {
    let results: Vec<GoalResult> = goals
        .iter()
        .map(|g| {
            let measured = metric_value(&result.metrics, &g.metric);
            GoalResult {
                id: g.id.clone(),
                passed: measured.is_some_and(|v| compare(v, g.op, g.value)),
                measured,
            }
        })
        .collect();
    let total = results.len() as u32;
    let passed = results.iter().filter(|r| r.passed).count() as u32;
    if total == 0 {
        return Verdict { passed: true, score: 100, stars: 5, goals: results };
    }
    let all = passed == total;
    Verdict {
        passed: all,
        score: libm::round(100.0 * f64::from(passed) / f64::from(total)) as u32,
        stars: if all { 5 } else { (4 * passed / total) as u8 },
        goals: results,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn result(m: Metrics) -> SimResult {
        SimResult {
            engine_version: "test".into(),
            metrics: m,
            timeline: Timeline::default(),
            traces: vec![],
            events: vec![],
        }
    }

    fn goal(id: &str, metric: &str, op: GoalOp, value: f64) -> Goal {
        Goal { id: id.into(), metric: metric.into(), op, value }
    }

    fn sample() -> Metrics {
        Metrics { p95: 37.0, availability: 0.8031, cost_per_month: 163.0, spof_count: 1, ..Metrics::default() }
    }

    #[test]
    fn all_goals_passing_gives_five_stars() {
        let v = grade(
            &result(sample()),
            &[goal("lat", "p95", GoalOp::Le, 100.0), goal("cost", "costPerMonth", GoalOp::Le, 200.0)],
        );
        assert!(v.passed);
        assert_eq!((v.score, v.stars), (100, 5));
        assert_eq!(v.goals[0].measured, Some(37.0));
    }

    #[test]
    fn two_of_five_gives_score_40_and_one_star() {
        let goals = [
            goal("lat", "p95", GoalOp::Le, 100.0),
            goal("avail", "availability", GoalOp::Ge, 0.999),
            goal("spof", "spofCount", GoalOp::Eq, 0.0),
            goal("cost", "costPerMonth", GoalOp::Le, 200.0),
            goal("exposed", "exposedBackends", GoalOp::Eq, 1.0),
        ];
        let v = grade(&result(sample()), &goals);
        assert!(!v.passed);
        assert_eq!(v.goals.iter().filter(|g| g.passed).count(), 2);
        assert_eq!((v.score, v.stars), (40, 1));
    }

    #[test]
    fn unknown_and_null_metrics_fail_with_no_measurement() {
        let v = grade(
            &result(sample()),
            &[goal("x", "noSuchMetric", GoalOp::Le, 1.0), goal("ids", "duplicateIds", GoalOp::Eq, 0.0)],
        );
        assert!(v.goals.iter().all(|g| !g.passed && g.measured.is_none()));
    }

    #[test]
    fn equality_has_a_tiny_tolerance() {
        assert!(compare(0.1 + 0.2, GoalOp::Eq, 0.3));
        assert!(!compare(0.31, GoalOp::Eq, 0.3));
        assert!(compare(5.0, GoalOp::Ge, 5.0));
        assert!(compare(5.0, GoalOp::Le, 5.0));
    }

    #[test]
    fn no_goals_passes() {
        let v = grade(&result(sample()), &[]);
        assert!(v.passed);
        assert_eq!((v.score, v.stars), (100, 5));
    }

    #[test]
    fn every_metrics_field_has_a_key() {
        // Keep metric_value in sync with Metrics: serialize Metrics and look up each key.
        let json = serde_json::to_value(Metrics::default()).unwrap();
        for key in json.as_object().unwrap().keys() {
            let known = metric_value(&Metrics { duplicate_ids: Some(0.0), out_of_order_ids: Some(0.0), lost_updates: Some(0.0), write_conflicts: Some(0.0), duplicate_writes: Some(0.0), stale_reads: Some(0.0), peak_queue_depth: Some(0.0), lost_messages: Some(0.0), status_flaps: Some(0.0), stale_online: Some(0.0), inbox_writes_per_sec: Some(0.0), ..Metrics::default() }, key);
            assert!(known.is_some(), "metric_value does not know {key}");
        }
    }
}
