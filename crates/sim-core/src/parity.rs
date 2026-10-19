//! Offline parity against reference results captured during development.
//! Goals must agree on pass/fail exactly; numbers must agree within tolerance.

use crate::fixture::parse_op;
use crate::grade::{compare, metric_value};
use crate::simulate;
use crate::types::{SimInput, ValidationIssue};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParitySource {
    #[serde(default)]
    pub site: String,
    #[serde(default)]
    pub run_id: String,
    #[serde(default)]
    pub engine_version: String,
    #[serde(default)]
    pub captured_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityGoal {
    pub id: String,
    pub metric: String,
    pub op: String,
    pub value: f64,
    pub passed: bool,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityReference {
    #[serde(default)]
    pub metrics: BTreeMap<String, f64>,
    #[serde(default)]
    pub goals: Vec<ParityGoal>,
}

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct Tolerance {
    #[serde(default)]
    pub rel: Option<f64>,
    #[serde(default)]
    pub abs: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityFixture {
    pub id: String,
    #[serde(default)]
    pub source: ParitySource,
    pub input: SimInput,
    pub reference: ParityReference,
    #[serde(default)]
    pub tolerance: BTreeMap<String, Tolerance>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalMismatch {
    pub id: String,
    pub reference_passed: bool,
    pub our_passed: bool,
    pub measured: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricMismatch {
    pub metric: String,
    pub reference: f64,
    pub measured: Option<f64>,
    pub allowed: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityReport {
    pub id: String,
    pub passed: bool,
    pub goal_mismatches: Vec<GoalMismatch>,
    pub metric_mismatches: Vec<MetricMismatch>,
    pub validation: Vec<ValidationIssue>,
}

/// Allowed absolute difference for `metric` given the reference value.
pub fn allowed_difference(metric: &str, reference: f64, overrides: &BTreeMap<String, Tolerance>) -> f64 {
    if let Some(t) = overrides.get(metric) {
        let rel = t.rel.map_or(0.0, |r| r * reference.abs());
        return rel.max(t.abs.unwrap_or(0.0));
    }
    match metric {
        "spofCount" | "exposedBackends" | "costPerMonth" => 1e-9,
        "p50" | "p95" | "p99" => (0.15 * reference.abs()).max(if reference < 13.0 { 2.0 } else { 0.0 }),
        "availability" => 0.005,
        "requestsTotal" | "throughputRps" => 0.02 * reference.abs(),
        _ => 0.10 * reference.abs(),
    }
}

pub fn check_parity(f: &ParityFixture) -> ParityReport {
    let result = match simulate(&f.input) {
        Ok(r) => r,
        Err(issues) => {
            return ParityReport {
                id: f.id.clone(),
                passed: false,
                goal_mismatches: vec![],
                metric_mismatches: vec![],
                validation: issues,
            }
        }
    };
    let m = &result.metrics;

    let goal_mismatches: Vec<GoalMismatch> = f
        .reference
        .goals
        .iter()
        .filter_map(|g| {
            let measured = metric_value(m, &g.metric);
            let ours = match (parse_op(&g.op), measured) {
                (Some(op), Some(v)) => compare(v, op, g.value),
                _ => false,
            };
            (ours != g.passed).then(|| GoalMismatch {
                id: g.id.clone(),
                reference_passed: g.passed,
                our_passed: ours,
                measured,
            })
        })
        .collect();

    let metric_mismatches: Vec<MetricMismatch> = f
        .reference
        .metrics
        .iter()
        .filter_map(|(metric, &reference)| {
            let measured = metric_value(m, metric);
            let allowed = allowed_difference(metric, reference, &f.tolerance);
            let ok = measured.is_some_and(|v| (v - reference).abs() <= allowed);
            (!ok).then(|| MetricMismatch { metric: metric.clone(), reference, measured, allowed })
        })
        .collect();

    ParityReport {
        id: f.id.clone(),
        passed: goal_mismatches.is_empty() && metric_mismatches.is_empty(),
        goal_mismatches,
        metric_mismatches,
        validation: vec![],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::{input, web_tier};

    fn fixture(reference_metrics: &[(&str, f64)], goals: Vec<ParityGoal>) -> ParityFixture {
        ParityFixture {
            id: "t".into(),
            source: ParitySource::default(),
            input: input(web_tier(2, 2), 2_000.0),
            reference: ParityReference {
                metrics: reference_metrics.iter().map(|(k, v)| (k.to_string(), *v)).collect(),
                goals,
            },
            tolerance: BTreeMap::new(),
        }
    }

    fn goal(id: &str, metric: &str, op: &str, value: f64, passed: bool) -> ParityGoal {
        ParityGoal { id: id.into(), metric: metric.into(), op: op.into(), value, passed }
    }

    #[test]
    fn matching_goals_and_close_metrics_pass() {
        let r = check_parity(&fixture(
            &[("availability", 1.0), ("costPerMonth", 95.0), ("spofCount", 0.0)],
            vec![goal("lat", "p95", "<=", 100.0, true), goal("spof", "spofCount", "==", 0.0, true)],
        ));
        assert!(r.passed, "{r:?}");
    }

    #[test]
    fn a_different_verdict_on_any_goal_fails() {
        let r = check_parity(&fixture(&[], vec![goal("lat", "p95", "<=", 100.0, false)]));
        assert!(!r.passed);
        assert_eq!(r.goal_mismatches.len(), 1);
        assert!(r.goal_mismatches[0].our_passed);
    }

    #[test]
    fn numbers_outside_tolerance_fail_and_structural_numbers_must_be_exact() {
        let r = check_parity(&fixture(&[("availability", 0.9), ("costPerMonth", 95.5)], vec![]));
        let metrics: Vec<&str> = r.metric_mismatches.iter().map(|m| m.metric.as_str()).collect();
        assert_eq!(metrics, vec!["availability", "costPerMonth"]);
    }

    #[test]
    fn small_latencies_use_an_absolute_window() {
        // Our p95 for this light load is a few ms; a 2 ms reference is within 2 ms abs.
        let ours = crate::simulate(&input(web_tier(2, 2), 2_000.0)).unwrap().metrics.p95;
        let r = check_parity(&fixture(&[("p95", (ours - 1.5).max(0.0))], vec![]));
        assert!(r.metric_mismatches.is_empty(), "{r:?}");
    }
}
