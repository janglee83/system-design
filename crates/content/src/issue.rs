//! Validation issues. Codes are fixed by the spec (§6); messages are never prose.

use serde::{Deserialize, Serialize};
use sim_core::ValidationIssue;

pub mod codes {
    pub const PARSE: &str = "content.parse";
    pub const FORMAT_VERSION: &str = "content.format-version";
    pub const ID: &str = "content.id";
    pub const DUPLICATE_ID: &str = "content.duplicate-id";
    pub const PREREQUISITE_MISSING: &str = "content.prerequisite-missing";
    pub const PREREQUISITE_CYCLE: &str = "content.prerequisite-cycle";
    pub const RESEARCH_MISSING: &str = "content.research-missing";
    pub const PROSE_SECTION: &str = "content.prose-section";
    pub const PROSE_KEY: &str = "content.prose-key";
    pub const CONTROL: &str = "content.control";
    pub const CHOICE: &str = "content.choice";
    pub const ENGINE_INVALID: &str = "content.engine-invalid";
    pub const CORRECT_FAILS: &str = "content.correct-fails";
    pub const WRONG_PASSES: &str = "content.wrong-passes";
    pub const WRONG_EXTRA_FAIL: &str = "content.wrong-extra-fail";
    pub const EXPECT: &str = "content.expect";
    pub const REFERENCE_FAILS: &str = "content.reference-fails";
    pub const NAIVE_PASSES: &str = "content.naive-passes";
    pub const LIMITS: &str = "content.limits";
    pub const BLOCKED: &str = "content.blocked";

    pub const ALL: [&str; 20] = [
        PARSE,
        FORMAT_VERSION,
        ID,
        DUPLICATE_ID,
        PREREQUISITE_MISSING,
        PREREQUISITE_CYCLE,
        RESEARCH_MISSING,
        PROSE_SECTION,
        PROSE_KEY,
        CONTROL,
        CHOICE,
        ENGINE_INVALID,
        CORRECT_FAILS,
        WRONG_PASSES,
        WRONG_EXTRA_FAIL,
        EXPECT,
        REFERENCE_FAILS,
        NAIVE_PASSES,
        LIMITS,
        BLOCKED,
    ];

    /// The only non-blocking codes.
    pub const WARNINGS: [&str; 2] = [WRONG_EXTRA_FAIL, BLOCKED];
}

#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentIssue {
    pub code: String,
    /// File the issue is about, relative to the content dir (e.g. `lessons/l0-x/vi.md`).
    pub path: String,
    /// Sub-item id: choice, goal, control, question, mode, key or referenced item.
    pub id: Option<String>,
    /// Field, goal id, metric or section heading the issue is about.
    pub field: Option<String>,
    pub blocking: bool,
    pub measured: Option<f64>,
    /// Short fixed detail (`"listed after"`, `"unknown field"`) or a serde error message.
    pub detail: Option<String>,
    /// Engine validation issues behind `content.engine-invalid`, `content.control`, `content.limits`.
    pub engine: Vec<ValidationIssue>,
    /// Engine features a blocked item needs (`component:redis`, `fault:instance-slow`, ...).
    pub missing: Vec<String>,
}

impl ContentIssue {
    pub fn new(code: &str, path: impl Into<String>) -> Self {
        ContentIssue {
            code: code.into(),
            path: path.into(),
            id: None,
            field: None,
            blocking: !codes::WARNINGS.contains(&code),
            measured: None,
            detail: None,
            engine: vec![],
            missing: vec![],
        }
    }
    pub fn id(mut self, id: impl Into<String>) -> Self {
        self.id = Some(id.into());
        self
    }
    pub fn field(mut self, field: impl Into<String>) -> Self {
        self.field = Some(field.into());
        self
    }
    pub fn measured(mut self, measured: Option<f64>) -> Self {
        self.measured = measured;
        self
    }
    pub fn detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }
    pub fn engine(mut self, engine: Vec<ValidationIssue>) -> Self {
        self.engine = engine;
        self
    }
    pub fn missing(mut self, missing: Vec<String>) -> Self {
        self.missing = missing;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn there_are_exactly_twenty_unique_codes_and_two_warnings() {
        let mut all = codes::ALL.to_vec();
        all.sort_unstable();
        all.dedup();
        assert_eq!(all.len(), 20);
        assert!(all.iter().all(|c| c.starts_with("content.")));
        for w in codes::WARNINGS {
            assert!(codes::ALL.contains(&w));
        }
    }

    #[test]
    fn blocking_follows_the_code() {
        assert!(ContentIssue::new(codes::CHOICE, "lessons/x/lesson.json").blocking);
        assert!(!ContentIssue::new(codes::BLOCKED, "lessons/x/lesson.json").blocking);
        assert!(!ContentIssue::new(codes::WRONG_EXTRA_FAIL, "x").blocking);
    }

    #[test]
    fn serializes_camel_case_with_empty_lists() {
        let i = ContentIssue::new(codes::EXPECT, "lessons/a/lesson.json")
            .id("A")
            .field("p95")
            .measured(Some(4.5));
        let v = serde_json::to_value(&i).unwrap();
        assert_eq!(v["code"], "content.expect");
        assert_eq!(v["measured"], 4.5);
        assert_eq!(v["engine"], serde_json::json!([]));
    }
}
