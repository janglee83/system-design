//! curriculum.json (spec §7, ruling R19): the whole map, generated from levels.json and the
//! folders. Built only when validation has no blocking issue.

use crate::checks::Outcome;
use crate::report::{Readiness, Report};
use crate::structure::Item;
use crate::tree::ContentTree;
use crate::types::*;
use crate::Analysis;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sim_core::{Capabilities, FaultKind, Goal};
use std::collections::{BTreeMap, BTreeSet};

pub const CURRICULUM_VERSION: u32 = 2;

macro_rules! exported {
    ($item:item) => {
        #[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
        $item
    };
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableFeatures { pub components: Vec<String>, pub faults: Vec<String>, pub metrics: Vec<String> }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurriculumEngine { pub available: AvailableFeatures, pub planned: PlannedFeatures }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineSummary { pub needs: EngineNeeds, pub missing: Vec<String>, pub readiness: Readiness }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurriculumLesson {
    pub id: String,
    pub title_vi: String,
    pub title_en: String,
    pub kind: LessonKind,
    pub minutes: u32,
    pub difficulty: u8,
    pub prerequisites: Vec<String>,
    pub concepts: Vec<String>,
    pub research: Vec<String>,
    /// `None` for a roadmap stub.
    pub status: Option<Status>,
    /// Folder relative to the content dir; `None` for a roadmap stub.
    pub path: Option<String>,
    pub engine: EngineSummary,
    pub engine_gaps: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurriculumMode {
    pub id: String,
    pub budget_per_month: f64,
    #[cfg_attr(feature = "ts", ts(as = "Vec<sim_core::Fault>"))]
    pub faults: Value,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurriculumChallenge {
    pub id: String,
    pub title_vi: String,
    pub title_en: String,
    pub prerequisites: Vec<String>,
    pub allowed_kinds: Vec<String>,
    pub workload: Value,
    pub goals: Vec<Goal>,
    pub modes: Vec<CurriculumMode>,
    /// Roadmap stubs only; an authored challenge's brief is its prose.
    pub brief_vi: Option<String>,
    pub brief_en: Option<String>,
    pub status: Option<Status>,
    pub path: Option<String>,
    pub engine: EngineSummary,
    pub engine_gaps: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurriculumLevel {
    pub id: LevelId,
    pub title_vi: String,
    pub title_en: String,
    pub score: [u32; 2],
    pub entry_assumptions_vi: Vec<String>,
    pub entry_assumptions_en: Vec<String>,
    pub outcomes_vi: Vec<String>,
    pub outcomes_en: Vec<String>,
    pub exit_check: ExitCheck,
    pub lessons: Vec<CurriculumLesson>,
    pub challenges: Vec<CurriculumChallenge>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub levels: u32,
    pub lessons: u32,
    pub challenges: u32,
    pub engine_gaps: u32,
    pub lessons_by_level: BTreeMap<String, u32>,
    pub challenges_by_level: BTreeMap<String, u32>,
    pub lesson_readiness: BTreeMap<String, u32>,
    pub challenge_readiness: BTreeMap<String, u32>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Curriculum {
    pub version: u32,
    pub description: String,
    pub fields: BTreeMap<String, String>,
    pub engine: CurriculumEngine,
    pub engine_gaps: BTreeMap<String, EngineGap>,
    pub levels: Vec<CurriculumLevel>,
    pub counts: Counts,
}
}

/// The JSON name of a unit enum (`"not-needed"`, `"L0"`). Only called on such enums.
fn name_of<T: Serialize>(v: &T) -> String {
    let name = serde_json::to_value(v)
        .ok()
        .and_then(|v| v.as_str().map(String::from));
    debug_assert!(name.is_some(), "name_of on a value that is not a unit enum");
    name.unwrap_or_default()
}

/// What a roadmap stub needs that this engine build lacks.
fn roadmap_missing(n: &EngineNeeds, caps: &Capabilities, planned: &PlannedFeatures) -> Vec<String> {
    let mut m = BTreeSet::new();
    for c in n.components.iter().filter(|c| !caps.components.contains(c)) {
        m.insert(format!("component:{c}"));
    }
    for f in &n.faults {
        let ok = serde_json::from_value::<FaultKind>(Value::from(f.as_str()))
            .is_ok_and(|k| caps.faults.contains(&k));
        if !ok {
            m.insert(format!("fault:{f}"));
        }
    }
    for d in n.dynamic.iter().filter(|d| planned.dynamic.contains(d)) {
        m.insert(format!("dynamic:{d}"));
    }
    for b in n.behaviors.iter().filter(|b| planned.behaviors.contains(b)) {
        m.insert(format!("behavior:{b}"));
    }
    for x in n.metrics.iter().filter(|x| !caps.metrics.contains(x)) {
        m.insert(format!("metric:{x}"));
    }
    m.into_iter().collect()
}

/// Titles from the prose front matter. Without blocking issues both files parsed.
fn titles<T>(item: &Item<T>) -> (String, String) {
    let t = |p: &Option<crate::prose::Prose>| {
        debug_assert!(
            p.is_some(),
            "{}: prose did not parse but nothing blocked",
            item.id
        );
        p.as_ref().map(|p| p.title.clone()).unwrap_or_default()
    };
    (t(&item.vi), t(&item.en))
}

/// Every parsed item gets a readiness from its checks.
fn summary(o: &Outcome) -> EngineSummary {
    debug_assert!(o.readiness.is_some(), "a parsed item has no readiness");
    EngineSummary {
        needs: o.needs.clone(),
        missing: o.missing.clone(),
        readiness: o.readiness.unwrap_or(Readiness::Ready),
    }
}

fn sorted_set(items: impl IntoIterator<Item = String>) -> Vec<String> {
    items
        .into_iter()
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect()
}

fn build(levels: &Levels, a: &Analysis) -> Curriculum {
    let caps = crate::known::caps();
    let planned = &levels.engine.planned;
    let mut gaps: BTreeMap<&str, Vec<String>> = BTreeMap::new();
    for (gap, g) in &levels.engine_gaps {
        for id in &g.needed_by {
            gaps.entry(id.as_str()).or_default().push(gap.clone());
        }
    }
    let gaps_of = |id: &str| gaps.get(id).cloned().unwrap_or_default();
    let lessons: BTreeMap<&str, (&Item<Lesson>, &Outcome)> = a
        .parsed
        .lessons
        .iter()
        .zip(&a.lesson_outcomes)
        .filter_map(|(i, o)| i.doc.as_ref().map(|d| (d.id.as_str(), (i, o))))
        .collect();
    let challenges: BTreeMap<&str, (&Item<Challenge>, &Outcome)> = a
        .parsed
        .challenges
        .iter()
        .zip(&a.challenge_outcomes)
        .filter_map(|(i, o)| i.doc.as_ref().map(|d| (d.id.as_str(), (i, o))))
        .collect();
    let stub_lessons: BTreeMap<&str, &RoadmapLesson> = levels
        .roadmap
        .lessons
        .iter()
        .map(|s| (s.id.as_str(), s))
        .collect();
    let stub_challenges: BTreeMap<&str, &RoadmapChallenge> = levels
        .roadmap
        .challenges
        .iter()
        .map(|s| (s.id.as_str(), s))
        .collect();

    let lesson_entry = |id: &str| -> Option<CurriculumLesson> {
        if let Some((item, o)) = lessons.get(id) {
            let l = item.doc.as_ref()?;
            let (title_vi, title_en) = titles(item);
            return Some(CurriculumLesson {
                id: l.id.clone(),
                title_vi,
                title_en,
                kind: l.kind,
                minutes: l.minutes,
                difficulty: l.difficulty,
                prerequisites: l.prerequisites.clone(),
                concepts: l.concepts.clone(),
                research: l.research.clone(),
                status: Some(l.status),
                path: Some(item.dir.clone()),
                engine: summary(o),
                engine_gaps: gaps_of(id),
            });
        }
        let s = stub_lessons.get(id)?;
        Some(CurriculumLesson {
            id: s.id.clone(),
            title_vi: s.title_vi.clone(),
            title_en: s.title_en.clone(),
            kind: s.kind,
            minutes: s.minutes,
            difficulty: s.difficulty,
            prerequisites: s.prerequisites.clone(),
            concepts: s.concepts.clone(),
            research: s.research.clone(),
            status: None,
            path: None,
            engine: EngineSummary {
                needs: s.needs.clone(),
                missing: roadmap_missing(&s.needs, caps, planned),
                readiness: Readiness::Planned,
            },
            engine_gaps: gaps_of(id),
        })
    };
    let challenge_entry = |id: &str| -> Option<CurriculumChallenge> {
        if let Some((item, o)) = challenges.get(id) {
            let c = item.doc.as_ref()?;
            let (title_vi, title_en) = titles(item);
            return Some(CurriculumChallenge {
                id: c.id.clone(),
                title_vi,
                title_en,
                prerequisites: c.prerequisites.clone(),
                allowed_kinds: c.limits.allowed_kinds.clone().unwrap_or_default(),
                workload: c.start["workload"].clone(),
                goals: c.goals.clone(),
                modes: c
                    .modes
                    .iter()
                    .map(|m| CurriculumMode {
                        id: m.id.clone(),
                        budget_per_month: m.budget_per_month,
                        faults: m.faults.clone(),
                    })
                    .collect(),
                brief_vi: None,
                brief_en: None,
                status: Some(c.status),
                path: Some(item.dir.clone()),
                engine: summary(o),
                engine_gaps: gaps_of(id),
            });
        }
        let s = stub_challenges.get(id)?;
        let needs = EngineNeeds {
            components: s.allowed_kinds.clone(),
            faults: sorted_set(
                s.modes
                    .iter()
                    .flat_map(|m| m.faults.as_array().cloned().unwrap_or_default())
                    .filter_map(|f| f.get("kind").and_then(Value::as_str).map(String::from)),
            ),
            calibration: sorted_set(
                s.modes
                    .iter()
                    .filter_map(|m| m.calibration.as_ref()?.as_object().cloned())
                    .flat_map(|o| o.keys().cloned().collect::<Vec<_>>()),
            ),
            metrics: sorted_set(s.goals.iter().map(|g| g.metric.clone())),
            ..EngineNeeds::default()
        };
        Some(CurriculumChallenge {
            id: s.id.clone(),
            title_vi: s.title_vi.clone(),
            title_en: s.title_en.clone(),
            prerequisites: s.prerequisites.clone(),
            allowed_kinds: s.allowed_kinds.clone(),
            workload: s.workload.clone(),
            goals: s.goals.clone(),
            modes: s
                .modes
                .iter()
                .map(|m| CurriculumMode {
                    id: m.id.clone(),
                    budget_per_month: m.budget_per_month,
                    faults: m.faults.clone(),
                })
                .collect(),
            brief_vi: Some(s.brief_vi.clone()),
            brief_en: Some(s.brief_en.clone()),
            status: None,
            path: None,
            engine: EngineSummary {
                missing: roadmap_missing(&needs, caps, planned),
                needs,
                readiness: Readiness::Planned,
            },
            engine_gaps: gaps_of(id),
        })
    };

    let out_levels: Vec<CurriculumLevel> = levels
        .levels
        .iter()
        .map(|lv| CurriculumLevel {
            id: lv.id,
            title_vi: lv.title_vi.clone(),
            title_en: lv.title_en.clone(),
            score: lv.score,
            entry_assumptions_vi: lv.entry_assumptions_vi.clone(),
            entry_assumptions_en: lv.entry_assumptions_en.clone(),
            outcomes_vi: lv.outcomes_vi.clone(),
            outcomes_en: lv.outcomes_en.clone(),
            exit_check: lv.exit_check.clone(),
            lessons: lv
                .lessons
                .iter()
                .filter_map(|id| {
                    // Validation guarantees a folder or a stub for every listed id.
                    let e = lesson_entry(id);
                    debug_assert!(
                        e.is_some(),
                        "listed lesson {id} has neither folder nor stub"
                    );
                    e
                })
                .collect(),
            challenges: lv
                .challenges
                .iter()
                .filter_map(|id| {
                    let e = challenge_entry(id);
                    debug_assert!(
                        e.is_some(),
                        "listed challenge {id} has neither folder nor stub"
                    );
                    e
                })
                .collect(),
        })
        .collect();

    let zero = |keys: &[Readiness]| {
        keys.iter()
            .map(|r| (name_of(r), 0u32))
            .collect::<BTreeMap<_, _>>()
    };
    let mut counts = Counts {
        levels: out_levels.len() as u32,
        lessons: 0,
        challenges: 0,
        engine_gaps: levels.engine_gaps.len() as u32,
        lessons_by_level: BTreeMap::new(),
        challenges_by_level: BTreeMap::new(),
        lesson_readiness: zero(&[
            Readiness::Ready,
            Readiness::Blocked,
            Readiness::NotNeeded,
            Readiness::Planned,
        ]),
        challenge_readiness: zero(&[Readiness::Ready, Readiness::Blocked, Readiness::Planned]),
    };
    for lv in &out_levels {
        let key = name_of(&lv.id);
        counts.lessons += lv.lessons.len() as u32;
        counts.challenges += lv.challenges.len() as u32;
        counts
            .lessons_by_level
            .insert(key.clone(), lv.lessons.len() as u32);
        counts
            .challenges_by_level
            .insert(key, lv.challenges.len() as u32);
        for l in &lv.lessons {
            *counts
                .lesson_readiness
                .entry(name_of(&l.engine.readiness))
                .or_default() += 1;
        }
        for c in &lv.challenges {
            *counts
                .challenge_readiness
                .entry(name_of(&c.engine.readiness))
                .or_default() += 1;
        }
    }

    Curriculum {
        version: CURRICULUM_VERSION,
        description: levels.description.clone(),
        fields: levels.fields.clone(),
        engine: CurriculumEngine {
            available: AvailableFeatures {
                components: caps.components.clone(),
                faults: caps.faults.iter().map(name_of).collect(),
                metrics: caps.metrics.clone(),
            },
            planned: planned.clone(),
        },
        engine_gaps: levels.engine_gaps.clone(),
        levels: out_levels,
        counts,
    }
}

pub fn curriculum(tree: &ContentTree) -> Result<Curriculum, Report> {
    let a = crate::analyze(tree);
    if a.report.has_blocking() {
        return Err(a.report);
    }
    // No blocking issue means levels.json parsed; if not, the report is still the answer.
    let Some(levels) = a.parsed.levels.clone() else {
        return Err(a.report);
    };
    Ok(build(&levels, &a))
}

/// Pretty JSON with a trailing newline: the exact bytes of content/curriculum.json.
pub fn curriculum_json(tree: &ContentTree) -> Result<String, Report> {
    curriculum(tree).map(|c| serde_json::to_string_pretty(&c).expect("serializable") + "\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_util::*;

    #[test]
    fn good_tree_curriculum() {
        let c = curriculum(&good_tree()).unwrap();
        assert_eq!(c.version, 2);
        let lv = &c.levels[0];
        let ids: Vec<&str> = lv.lessons.iter().map(|l| l.id.as_str()).collect();
        assert_eq!(
            ids,
            vec!["l0-fx-capacity", "l0-fx-reading", "l0-fx-planned"]
        );
        let cap = &lv.lessons[0];
        assert_eq!(cap.title_en, "The capacity of one server (fixture)");
        assert_eq!(cap.engine.readiness, Readiness::Ready);
        assert_eq!(cap.engine.needs.components, vec!["client", "web-server"]);
        assert_eq!(cap.path.as_deref(), Some("lessons/l0-fx-capacity"));
        assert_eq!(lv.lessons[1].engine.readiness, Readiness::NotNeeded);
        let planned = &lv.lessons[2];
        assert_eq!(
            (planned.engine.readiness, planned.status),
            (Readiness::Planned, None)
        );
        assert_eq!(planned.engine.missing, vec!["component:redis"]);
        assert_eq!(planned.engine_gaps, vec!["fx-gap"]);
        assert_eq!(lv.challenges[0].modes.len(), 2);
        assert_eq!(c.counts.lesson_readiness["planned"], 1);
        assert_eq!(c.counts.lessons_by_level["L0"], 3);
    }

    #[test]
    fn json_is_stable_and_snapshotted() {
        let a = curriculum_json(&good_tree()).unwrap();
        assert_eq!(a, curriculum_json(&good_tree()).unwrap());
        assert!(a.ends_with("}\n"));
        insta::assert_snapshot!("good_curriculum", a);
    }

    #[test]
    fn refuses_to_build_with_blocking_issues() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["experiment"]["goals"][0]["value"] = 1.into()
        });
        let r = curriculum(&t).unwrap_err();
        assert!(r.has_blocking());
    }

    #[test]
    #[cfg(debug_assertions)]
    #[should_panic(expected = "listed lesson l0-ghost")]
    fn a_listed_id_without_folder_or_stub_is_never_dropped_silently() {
        // Validation rejects this tree; build() is called directly to prove the invariant holds.
        let a = crate::analyze(&good_tree());
        let mut levels = a.parsed.levels.clone().unwrap();
        levels.levels[0].lessons.push("l0-ghost".into());
        let _ = build(&levels, &a);
    }
}
