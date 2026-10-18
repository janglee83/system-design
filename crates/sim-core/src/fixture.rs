//! Golden/parity fixture format shared by Rust tests, the CLI and the wasm build.

use crate::grade::{compare, metric_value};
use crate::simulate;
use crate::types::{GoalOp, Metrics, SimInput, ValidationIssue};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fixture {
    pub id: String,
    #[serde(default)]
    pub description: String,
    pub input: SimInput,
    #[serde(default)]
    pub expect: BTreeMap<String, BTreeMap<String, f64>>,
    #[serde(default)]
    pub expect_events: Vec<String>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureFailure {
    pub metric: String,
    pub op: String,
    pub expected: f64,
    pub measured: Option<f64>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureReport {
    pub id: String,
    pub passed: bool,
    pub failures: Vec<FixtureFailure>,
    pub validation: Vec<ValidationIssue>,
    pub metrics: Option<Metrics>,
}

pub fn parse_op(op: &str) -> Option<GoalOp> {
    match op {
        "<=" => Some(GoalOp::Le),
        ">=" => Some(GoalOp::Ge),
        "==" => Some(GoalOp::Eq),
        _ => None,
    }
}

pub fn check_fixture(f: &Fixture) -> FixtureReport {
    let result = match simulate(&f.input) {
        Ok(r) => r,
        Err(issues) => {
            return FixtureReport {
                id: f.id.clone(),
                passed: false,
                failures: vec![],
                validation: issues,
                metrics: None,
            }
        }
    };
    let mut failures = Vec::new();
    for (metric, conditions) in &f.expect {
        let measured = metric_value(&result.metrics, metric);
        for (op, expected) in conditions {
            let ok = match (parse_op(op), measured) {
                (Some(op), Some(v)) => compare(v, op, *expected),
                _ => false,
            };
            if !ok {
                failures.push(FixtureFailure { metric: metric.clone(), op: op.clone(), expected: *expected, measured });
            }
        }
    }
    for code in &f.expect_events {
        if !result.events.iter().any(|e| &e.code == code) {
            failures.push(FixtureFailure {
                metric: format!("event:{code}"),
                op: "present".into(),
                expected: 1.0,
                measured: None,
            });
        }
    }
    FixtureReport {
        id: f.id.clone(),
        passed: failures.is_empty(),
        failures,
        validation: vec![],
        metrics: Some(result.metrics),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::{input, web_tier};

    #[test]
    fn reports_each_failed_condition_and_missing_event() {
        let mut expect = BTreeMap::new();
        expect.insert("p95".to_string(), BTreeMap::from([("<=".to_string(), 0.001), (">=".to_string(), 0.0)]));
        expect.insert("nope".to_string(), BTreeMap::from([("==".to_string(), 1.0)]));
        let f = Fixture {
            id: "t".into(),
            description: String::new(),
            input: input(web_tier(1, 1), 1_000.0),
            expect,
            expect_events: vec!["db.promoted".into()],
        };
        let r = check_fixture(&f);
        assert!(!r.passed);
        let metrics: Vec<&str> = r.failures.iter().map(|x| x.metric.as_str()).collect();
        assert_eq!(metrics, vec!["nope", "p95", "event:db.promoted"]);
    }
}
