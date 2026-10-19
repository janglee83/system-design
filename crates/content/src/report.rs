//! Per-item results and the whole report. Text output is added in Task 18.

use crate::issue::ContentIssue;
use serde::{Deserialize, Serialize};
use sim_core::Metrics;

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Readiness {
    Ready,
    Blocked,
    NotNeeded,
    Planned,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ItemKind {
    Levels,
    Challenge,
    Lesson,
}

/// One engine run made while validating: `choice:B` or `mode:chaos/reference`.
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunSummary {
    pub label: String,
    pub metrics: Metrics,
    /// Distinct event codes, sorted.
    pub events: Vec<String>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemReport {
    pub id: String,
    pub kind: ItemKind,
    /// Folder (or `levels.json`) relative to the content dir.
    pub path: String,
    pub readiness: Option<Readiness>,
    pub passed: bool,
    pub issues: Vec<ContentIssue>,
    pub runs: Vec<RunSummary>,
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub items: Vec<ItemReport>,
    pub passed: u32,
    pub failed: u32,
    pub warnings: u32,
    pub blocked: u32,
}

impl Report {
    /// Sorts items (`levels` first, then by id) and counts. Issue order inside an item is the
    /// fixed check order and is kept, never sorted.
    pub fn new(mut items: Vec<ItemReport>) -> Report {
        for it in &mut items {
            it.passed = !it.issues.iter().any(|i| i.blocking);
        }
        items.sort_by(|a, b| {
            (a.kind != ItemKind::Levels, &a.id).cmp(&(b.kind != ItemKind::Levels, &b.id))
        });
        let count = |f: &dyn Fn(&ItemReport) -> bool| items.iter().filter(|i| f(i)).count() as u32;
        Report {
            passed: count(&|i| i.passed),
            failed: count(&|i| !i.passed),
            warnings: items
                .iter()
                .flat_map(|i| &i.issues)
                .filter(|i| !i.blocking)
                .count() as u32,
            blocked: count(&|i| i.readiness == Some(Readiness::Blocked)),
            items,
        }
    }

    pub fn has_blocking(&self) -> bool {
        self.failed > 0
    }
}

impl RunSummary {
    pub fn of(label: impl Into<String>, r: &sim_core::SimResult) -> RunSummary {
        let events: std::collections::BTreeSet<String> =
            r.events.iter().map(|e| e.code.clone()).collect();
        RunSummary {
            label: label.into(),
            metrics: r.metrics.clone(),
            events: events.into_iter().collect(),
        }
    }
}
