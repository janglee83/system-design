//! Content format (lessons, challenges, levels) and its validator. See
//! docs/superpowers/specs/2026-10-20-content-format-design.md.

pub mod issue;
pub use issue::{codes, ContentIssue};

pub mod types;
pub use types::{
    Answer, Challenge, Check, Choice, Control, ControlType, Design, EngineCatalog, EngineGap,
    EngineNeeds, ExitCheck, Experiment, Lesson, LessonKind, Level, LevelId, Levels, Mode,
    NaiveDesign, PlannedFeatures, Question, QuestionType, Roadmap, RoadmapChallenge, RoadmapLesson,
    RoadmapMode, Status, FORMAT_VERSION,
};

pub mod tree;
pub use tree::{load_dir, ContentTree, FileText, LoadError, RawItem};

pub(crate) mod checks;
pub(crate) mod choices;
pub mod controls;
pub(crate) mod engine_input;
pub(crate) mod experiment;
pub mod ids;
pub mod known;
pub mod prose;
pub(crate) mod prose_check;
pub(crate) mod readiness;
pub mod report;
pub(crate) mod structure;

pub use report::{ItemKind, ItemReport, Readiness, Report, RunSummary};

use structure::{Item, LEVELS_ID, LEVELS_PATH};

#[cfg(test)]
pub(crate) mod test_util;

fn item_report<T>(kind: ItemKind, item: &Item<T>, o: checks::Outcome) -> ItemReport {
    let mut issues = item.issues.clone();
    issues.extend(o.issues);
    ItemReport {
        id: item.id.clone(),
        kind,
        path: item.dir.clone(),
        readiness: o.readiness,
        passed: true,
        issues,
        runs: o.runs,
    }
}

/// Validate an in-memory tree. Deterministic: same tree, same report.
pub fn validate_tree(tree: &ContentTree) -> Report {
    let mut parsed = structure::parse_tree(tree);
    structure::check_cross(&mut parsed);
    let ctx = checks::Ctx::new(parsed.levels.as_ref());
    let mut items = vec![ItemReport {
        id: LEVELS_ID.into(),
        kind: ItemKind::Levels,
        path: LEVELS_PATH.into(),
        readiness: None,
        passed: true,
        issues: parsed.global.clone(),
        runs: vec![],
    }];
    for l in &parsed.lessons {
        items.push(item_report(
            ItemKind::Lesson,
            l,
            checks::check_lesson(l, &ctx),
        ));
    }
    for c in &parsed.challenges {
        items.push(item_report(
            ItemKind::Challenge,
            c,
            checks::check_challenge(c, &ctx),
        ));
    }
    Report::new(items)
}
