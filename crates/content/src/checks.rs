//! Stage 2: checks on one item. Pure; runs in parallel from Task 18 on.

use crate::issue::ContentIssue;
use crate::report::{Readiness, RunSummary};
use crate::structure::Item;
use crate::types::*;
use sim_core::Capabilities;

pub(crate) struct Ctx {
    #[allow(dead_code)] // read by later checks (plan Tasks 11-12); remove then
    pub planned: PlannedFeatures,
    #[allow(dead_code)] // read by later checks (plan Tasks 11-12); remove then
    pub caps: Capabilities,
}

impl Ctx {
    pub fn new(levels: Option<&Levels>) -> Ctx {
        Ctx {
            planned: levels.map(|l| l.engine.planned.clone()).unwrap_or_default(),
            caps: sim_core::capabilities(),
        }
    }
}

#[derive(Debug, Default)]
pub(crate) struct Outcome {
    pub issues: Vec<ContentIssue>,
    pub runs: Vec<RunSummary>,
    pub readiness: Option<Readiness>,
    /// What the item's engine inputs use (for curriculum.json).
    #[allow(dead_code)] // read by later checks (plan Tasks 12, 22); remove then
    pub needs: EngineNeeds,
    /// Engine features a blocked item lacks.
    #[allow(dead_code)] // read by later checks (plan Tasks 12, 22); remove then
    pub missing: Vec<String>,
}

pub(crate) fn check_lesson(item: &Item<Lesson>, _ctx: &Ctx) -> Outcome {
    let mut out = Outcome::default();
    let Some(l) = &item.doc else { return out };
    out.issues
        .extend(crate::prose_check::check_lesson_prose(item));
    let path = item.file("lesson.json");
    if let Some(e) = &l.experiment {
        let (issues, _paths) = crate::controls::check_controls(&path, e);
        out.issues.extend(issues);
    }
    out.readiness = Some(match l.kind {
        LessonKind::Reading => Readiness::NotNeeded,
        LessonKind::Experiment => Readiness::Ready,
    });
    out
}

pub(crate) fn check_challenge(item: &Item<Challenge>, _ctx: &Ctx) -> Outcome {
    let mut out = Outcome::default();
    out.issues
        .extend(crate::prose_check::check_challenge_prose(item));
    if item.doc.is_some() {
        out.readiness = Some(Readiness::Ready);
    }
    out
}
