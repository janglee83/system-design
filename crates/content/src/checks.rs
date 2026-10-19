//! Stage 2: checks on one item. Pure; runs in parallel from Task 18 on.

use crate::issue::ContentIssue;
use crate::report::{Readiness, RunSummary};
use crate::structure::Item;
use crate::types::*;
use sim_core::Capabilities;

pub(crate) struct Ctx {
    pub planned: PlannedFeatures,
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
    pub needs: EngineNeeds,
    /// Engine features a blocked item lacks.
    pub missing: Vec<String>,
}

pub(crate) fn check_lesson(item: &Item<Lesson>, ctx: &Ctx) -> Outcome {
    let mut out = Outcome::default();
    let Some(l) = &item.doc else { return out };
    out.issues
        .extend(crate::prose_check::check_lesson_prose(item));
    let path = item.file("lesson.json");
    if let Some(e) = &l.experiment {
        let (control_issues, paths) = crate::controls::check_controls(&path, e);
        let choice_issues = crate::choices::check_choices(&path, e);
        let structural_ok = e.base.is_object()
            && !control_issues
                .iter()
                .chain(&choice_issues)
                .any(|i| i.blocking);
        out.issues.extend(control_issues);
        out.issues.extend(choice_issues);

        let mut scan = crate::readiness::Scan::default();
        scan.input(&crate::engine_input::normalized(&e.base), ctx);
        for p in paths.iter().flatten() {
            match p {
                crate::controls::ControlPath::Calibration(f) => {
                    scan.calibration.insert(f.clone());
                }
                crate::controls::ControlPath::NodeConfig(_, k)
                    if sim_core::components::NODE_OVERRIDE_KEYS.contains(&k.as_str()) =>
                {
                    scan.node_overrides.insert(k.clone());
                }
                _ => {}
            }
        }
        for g in &e.goals {
            scan.metric(&g.metric, ctx);
        }
        for m in e.choices.iter().flat_map(|c| c.expect.keys()) {
            scan.metric(m, ctx);
        }
        out.issues.extend(scan.issues(&path));
        out.needs = scan.needs();
        out.missing = scan.missing.iter().cloned().collect();
        if !scan.missing.is_empty() {
            out.readiness = Some(Readiness::Blocked);
        }
        if structural_ok && !scan.stops_engine() {
            let paths: Vec<_> = paths.into_iter().flatten().collect();
            crate::experiment::check_engine(&path, e, &paths, &mut out);
        }
    }
    if let Some(c) = &l.check {
        out.issues.extend(crate::choices::check_questions(&path, c));
    }
    // Blocked (set by the readiness scan) wins over the default for the kind.
    out.readiness.get_or_insert(match l.kind {
        LessonKind::Reading => Readiness::NotNeeded,
        LessonKind::Experiment => Readiness::Ready,
    });
    out
}

pub(crate) fn check_challenge(item: &Item<Challenge>, ctx: &Ctx) -> Outcome {
    let mut out = Outcome::default();
    let Some(c) = &item.doc else { return out };
    out.readiness = Some(Readiness::Ready);
    out.issues
        .extend(crate::prose_check::check_challenge_prose(item));
    let path = item.file("challenge.json");
    let structure = crate::challenge::check_structure(&path, c);
    let structural_ok = c.start.is_object() && !structure.iter().any(|i| i.blocking);
    out.issues.extend(structure);
    let _ = (ctx, structural_ok); // used from Task 16
    out
}
