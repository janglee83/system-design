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

/// Allowed absolute difference for `metric` given the reference value. An override with
/// neither `rel` nor `abs` set falls back to the default rule.
pub fn allowed_difference(
    metric: &str,
    reference: f64,
    overrides: &BTreeMap<String, Tolerance>,
) -> f64 {
    if let Some(t) = overrides
        .get(metric)
        .filter(|t| t.rel.is_some() || t.abs.is_some())
    {
        let rel = t.rel.map_or(0.0, |r| r * reference.abs());
        return rel.max(t.abs.unwrap_or(0.0));
    }
    match metric {
        "spofCount" | "exposedBackends" | "costPerMonth" => 1e-9,
        "p50" | "p95" | "p99" => {
            (0.15 * reference.abs()).max(if reference < 13.0 { 2.0 } else { 0.0 })
        }
        "availability" => 0.005,
        "requestsTotal" | "throughputRps" => 0.02 * reference.abs(),
        _ => 0.10 * reference.abs(),
    }
}

fn issue(code: &str, field: &str) -> ValidationIssue {
    ValidationIssue {
        code: code.into(),
        node_id: None,
        edge_id: None,
        field: Some(field.into()),
        blocking: true,
    }
}

/// Problems in the fixture itself: goal ops we do not know and unusable tolerances.
/// `field` names the goal id or the tolerance's metric. Goals whose metric the run did not
/// measure are reported by `check_parity` as `parity.unknown-metric`.
pub fn fixture_issues(f: &ParityFixture) -> Vec<ValidationIssue> {
    let mut out = Vec::new();
    for g in &f.reference.goals {
        if parse_op(&g.op).is_none() {
            out.push(issue("parity.unknown-op", &g.id));
        }
    }
    for (metric, t) in &f.tolerance {
        let bad = |v: Option<f64>| v.is_some_and(|x| !x.is_finite() || x < 0.0);
        if bad(t.rel) || bad(t.abs) {
            out.push(issue("parity.invalid-tolerance", metric));
        }
    }
    out
}

pub fn check_parity(f: &ParityFixture) -> ParityReport {
    let mut issues = fixture_issues(f);
    let result = match simulate(&f.input) {
        Ok(r) => r,
        Err(sim_issues) => {
            return ParityReport {
                id: f.id.clone(),
                passed: false,
                goal_mismatches: vec![],
                metric_mismatches: vec![],
                validation: issues.into_iter().chain(sim_issues).collect(),
            }
        }
    };
    let m = &result.metrics;

    let mut goal_mismatches = Vec::new();
    for g in &f.reference.goals {
        let measured = metric_value(m, &g.metric);
        if measured.is_none() {
            issues.push(issue("parity.unknown-metric", &g.id));
        }
        // A goal we cannot evaluate never counts as agreement, even when the reference failed.
        let (ours, evaluable) = match (parse_op(&g.op), measured) {
            (Some(op), Some(v)) => (compare(v, op, g.value), true),
            _ => (false, false),
        };
        if !evaluable || ours != g.passed {
            goal_mismatches.push(GoalMismatch {
                id: g.id.clone(),
                reference_passed: g.passed,
                our_passed: ours,
                measured,
            });
        }
    }

    let metric_mismatches: Vec<MetricMismatch> = f
        .reference
        .metrics
        .iter()
        .filter_map(|(metric, &reference)| {
            let measured = metric_value(m, metric);
            let allowed = allowed_difference(metric, reference, &f.tolerance);
            let ok = measured.is_some_and(|v| (v - reference).abs() <= allowed);
            (!ok).then(|| MetricMismatch {
                metric: metric.clone(),
                reference,
                measured,
                allowed,
            })
        })
        .collect();

    ParityReport {
        id: f.id.clone(),
        passed: goal_mismatches.is_empty() && metric_mismatches.is_empty() && issues.is_empty(),
        goal_mismatches,
        metric_mismatches,
        validation: issues,
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
                metrics: reference_metrics
                    .iter()
                    .map(|(k, v)| (k.to_string(), *v))
                    .collect(),
                goals,
            },
            tolerance: BTreeMap::new(),
        }
    }

    fn goal(id: &str, metric: &str, op: &str, value: f64, passed: bool) -> ParityGoal {
        ParityGoal {
            id: id.into(),
            metric: metric.into(),
            op: op.into(),
            value,
            passed,
        }
    }

    #[test]
    fn matching_goals_and_close_metrics_pass() {
        let r = check_parity(&fixture(
            &[
                ("availability", 1.0),
                ("costPerMonth", 95.0),
                ("spofCount", 0.0),
            ],
            vec![
                goal("lat", "p95", "<=", 100.0, true),
                goal("spof", "spofCount", "==", 0.0, true),
            ],
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
        let r = check_parity(&fixture(
            &[("availability", 0.9), ("costPerMonth", 95.5)],
            vec![],
        ));
        let metrics: Vec<&str> = r
            .metric_mismatches
            .iter()
            .map(|m| m.metric.as_str())
            .collect();
        assert_eq!(metrics, vec!["availability", "costPerMonth"]);
    }

    #[test]
    fn an_unknown_op_or_metric_is_a_mismatch_even_when_the_reference_failed() {
        let r = check_parity(&fixture(
            &[],
            vec![
                goal("op", "p95", "<", 100.0, false),
                goal("metric", "p42", "<=", 100.0, false),
            ],
        ));
        assert!(!r.passed);
        let ids: Vec<&str> = r.goal_mismatches.iter().map(|g| g.id.as_str()).collect();
        assert_eq!(ids, vec!["op", "metric"]);
        assert_eq!(r.goal_mismatches[1].measured, None);
        let codes: Vec<&str> = r.validation.iter().map(|v| v.code.as_str()).collect();
        assert_eq!(codes, vec!["parity.unknown-op", "parity.unknown-metric"]);
    }

    #[test]
    fn negative_or_non_finite_tolerances_are_reported() {
        let mut f = fixture(&[("availability", 1.0)], vec![]);
        f.tolerance.insert(
            "availability".into(),
            Tolerance {
                rel: Some(-0.1),
                abs: None,
            },
        );
        f.tolerance.insert(
            "p95".into(),
            Tolerance {
                rel: None,
                abs: Some(f64::NAN),
            },
        );
        let r = check_parity(&f);
        assert!(!r.passed);
        let fields: Vec<_> = r
            .validation
            .iter()
            .map(|v| (v.code.as_str(), v.field.as_deref()))
            .collect();
        assert_eq!(
            fields,
            vec![
                ("parity.invalid-tolerance", Some("availability")),
                ("parity.invalid-tolerance", Some("p95"))
            ]
        );
    }

    #[test]
    fn an_empty_tolerance_override_uses_the_default_rule() {
        let mut o = BTreeMap::new();
        o.insert("availability".to_string(), Tolerance::default());
        assert_eq!(allowed_difference("availability", 0.9, &o), 0.005);
        o.insert(
            "availability".to_string(),
            Tolerance {
                rel: None,
                abs: Some(0.01),
            },
        );
        assert_eq!(allowed_difference("availability", 0.9, &o), 0.01);
    }

    #[test]
    fn small_latencies_use_an_absolute_window() {
        // Our p95 for this light load is a few ms; a 2 ms reference is within 2 ms abs.
        let ours = crate::simulate(&input(web_tier(2, 2), 2_000.0))
            .unwrap()
            .metrics
            .p95;
        let r = check_parity(&fixture(&[("p95", (ours - 1.5).max(0.0))], vec![]));
        assert!(r.metric_mismatches.is_empty(), "{r:?}");
    }
}
