//! Content format (lessons, challenges, levels) and its validator. See
//! docs/superpowers/specs/2026-10-20-content-format-design.md.

pub mod issue;
pub use issue::{codes, ContentIssue};

pub mod types;
pub use types::{
    Answer, Challenge, Check, Choice, Control, ControlType, Design, EngineCatalog, EngineGap,
    EngineNeeds, ExitCheck, Experiment, Lesson, LessonKind, Level, LevelId, Levels, Limits, Mode,
    NaiveDesign, PlannedFeatures, Question, QuestionType, Roadmap, RoadmapChallenge, RoadmapLesson,
    RoadmapMode, Status, FORMAT_VERSION,
};

pub mod tree;
pub use tree::{load_dir, ContentTree, FileText, LoadError, RawItem};

pub(crate) mod challenge;
pub(crate) mod checks;
pub(crate) mod choices;
pub mod controls;
pub mod curriculum;
pub(crate) mod dup_keys;
pub(crate) mod engine_input;
pub(crate) mod experiment;
pub mod ids;
pub mod known;
pub mod prose;
pub(crate) mod prose_check;
pub(crate) mod readiness;
pub mod report;
pub(crate) mod structure;

pub use curriculum::{curriculum, curriculum_json, Curriculum};
pub use report::{ItemKind, ItemReport, Readiness, Report, RunSummary};

use structure::{Item, LEVELS_ID, LEVELS_PATH};

#[cfg(test)]
pub(crate) mod test_util;

use rayon::prelude::*;
use std::path::Path;

pub(crate) struct Analysis {
    pub parsed: structure::Parsed,
    pub lesson_outcomes: Vec<checks::Outcome>,
    pub challenge_outcomes: Vec<checks::Outcome>,
    pub report: Report,
}

fn item_report<T>(kind: ItemKind, item: &Item<T>, o: &checks::Outcome) -> ItemReport {
    let mut issues = item.issues.clone();
    issues.extend(o.issues.iter().cloned());
    ItemReport {
        id: item.id.clone(),
        kind,
        path: item.dir.clone(),
        readiness: o.readiness,
        passed: true,
        issues,
        runs: o.runs.clone(),
    }
}

/// Parse and cross-check sequentially, check items in parallel, then build a sorted report.
/// `par_iter().map().collect()` keeps input order, so thread count never changes the output.
pub(crate) fn analyze(tree: &ContentTree) -> Analysis {
    let mut parsed = structure::parse_tree(tree);
    structure::check_cross(&mut parsed);
    let ctx = checks::Ctx::new(parsed.levels.as_ref());
    let lesson_outcomes: Vec<checks::Outcome> = parsed
        .lessons
        .par_iter()
        .map(|l| checks::check_lesson(l, &ctx))
        .collect();
    let challenge_outcomes: Vec<checks::Outcome> = parsed
        .challenges
        .par_iter()
        .map(|c| checks::check_challenge(c, &ctx))
        .collect();
    let mut items = vec![ItemReport {
        id: LEVELS_ID.into(),
        kind: ItemKind::Levels,
        path: LEVELS_PATH.into(),
        readiness: None,
        passed: true,
        issues: parsed.global.clone(),
        runs: vec![],
    }];
    items.extend(
        parsed
            .lessons
            .iter()
            .zip(&lesson_outcomes)
            .map(|(l, o)| item_report(ItemKind::Lesson, l, o)),
    );
    items.extend(
        parsed
            .challenges
            .iter()
            .zip(&challenge_outcomes)
            .map(|(c, o)| item_report(ItemKind::Challenge, c, o)),
    );
    let report = Report::new(items);
    Analysis {
        parsed,
        lesson_outcomes,
        challenge_outcomes,
        report,
    }
}

/// Validate an in-memory tree. Deterministic: same tree, same report.
pub fn validate_tree(tree: &ContentTree) -> Report {
    analyze(tree).report
}

/// Load `dir` and validate it. `Err` means the directory itself is unusable (exit code 2).
pub fn validate_dir(dir: &Path) -> Result<Report, LoadError> {
    Ok(validate_tree(&load_dir(dir)?))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;
    use serde_json::json;

    #[test]
    fn same_report_with_one_thread_or_many() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["choices"][2]["failsGoals"] = json!(["fast"])
        });
        let pool = |n| {
            rayon::ThreadPoolBuilder::new()
                .num_threads(n)
                .build()
                .unwrap()
        };
        let one = pool(1).install(|| validate_tree(&t));
        let many = pool(4).install(|| validate_tree(&t));
        assert_eq!(
            serde_json::to_string(&one).unwrap(),
            serde_json::to_string(&many).unwrap()
        );
        assert_eq!(one.to_text(), validate_tree(&t).to_text());
    }

    #[test]
    fn text_output() {
        assert_eq!(
            validate_tree(&good_tree()).to_text(),
            "PASS levels\nPASS c-l0-fx-shop\nPASS l0-fx-capacity\nPASS l0-fx-reading\n4 items: 4 passed, 0 failed, 0 warnings, 0 blocked\n"
        );
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["choices"][2]["failsGoals"] = json!(["fast"]);
            v["experiment"]["goals"][0]["value"] = 1.into();
        });
        let text = validate_tree(&t).to_text();
        assert!(text.contains("\nFAIL l0-fx-capacity content.correct-fails lessons/l0-fx-capacity/lesson.json id=A field=fast measured=4."), "{text}");
        assert!(text.contains("\nWARN l0-fx-capacity content.wrong-extra-fail lessons/l0-fx-capacity/lesson.json id=C field=no-drops measured="), "{text}");
        assert!(!text.contains("PASS l0-fx-capacity"));
        assert!(
            text.ends_with("4 items: 3 passed, 1 failed, 1 warnings, 0 blocked\n"),
            "{text}"
        );
    }

    #[test]
    fn engine_codes_and_details_print_on_one_line() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["base"]["graph"]["edges"][0]["kind"] = "db".into()
        });
        let text = validate_tree(&t).to_text();
        assert!(text.contains("FAIL l0-fx-capacity content.engine-invalid lessons/l0-fx-capacity/lesson.json field=base engine=edge.not-accepted@e1\n"), "{text}");
    }

    #[test]
    fn validate_dir_reads_the_good_fixture() {
        let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/good");
        let r = validate_dir(&dir).unwrap();
        assert_eq!(r, validate_tree(&good_tree()));
    }
}
