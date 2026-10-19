//! The content format (spec §3, §4) plus `levels.json` (spec §2, ruling R8).
//! Engine-shaped parts stay raw JSON (ruling R3) and are typed only after the readiness scan.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sim_core::{ConfigValue, Goal, GoalOp, GraphLimits};
use std::collections::BTreeMap;

macro_rules! exported {
    ($item:item) => {
        #[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
        $item
    };
}

pub const FORMAT_VERSION: u64 = 1;

fn empty_array() -> Value {
    Value::Array(vec![])
}
fn empty_object() -> Value {
    Value::Object(Default::default())
}

/// sim-core's `Goal` ignores unknown fields, so a typo such as `valeu` would vanish. Goals in
/// content are read through this mirror instead (ruling R5); a test keeps it equal to `Goal`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StrictGoal {
    id: String,
    metric: String,
    op: GoalOp,
    value: f64,
}

impl From<StrictGoal> for Goal {
    fn from(g: StrictGoal) -> Goal {
        Goal {
            id: g.id,
            metric: g.metric,
            op: g.op,
            value: g.value,
        }
    }
}

fn strict_goals<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Vec<Goal>, D::Error> {
    let goals = Vec::<StrictGoal>::deserialize(d)?;
    Ok(goals.into_iter().map(Goal::from).collect())
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum LevelId { L0, L1, L2, L3, L4, L5, L6 }
}

impl LevelId {
    /// The JSON name (`"L0"`), for paths and report text.
    pub fn as_str(self) -> &'static str {
        ["L0", "L1", "L2", "L3", "L4", "L5", "L6"][self as usize]
    }
    /// The digit used in ids (`l0-…`, `c-l0-…`).
    pub fn digit(self) -> char {
        (b'0' + self as u8) as char
    }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LessonKind { Experiment, Reading }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Status { Draft, Review, Published }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Lesson {
    pub format_version: u64,
    pub id: String,
    pub level: LevelId,
    pub kind: LessonKind,
    pub minutes: u32,
    pub difficulty: u8,
    #[serde(default)]
    pub prerequisites: Vec<String>,
    #[serde(default)]
    pub concepts: Vec<String>,
    #[serde(default)]
    pub research: Vec<String>,
    pub status: Status,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub experiment: Option<Experiment>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub check: Option<Check>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Experiment {
    #[cfg_attr(feature = "ts", ts(as = "sim_core::SimInput"))]
    pub base: Value,
    pub controls: Vec<Control>,
    #[serde(deserialize_with = "strict_goals")]
    pub goals: Vec<Goal>,
    pub choices: Vec<Choice>,
}
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ControlType { Stepper, Select, Toggle }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Control {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: ControlType,
    pub path: String,
    pub options: Vec<ConfigValue>,
    pub default: ConfigValue,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Choice {
    pub id: String,
    #[serde(default)]
    pub correct: bool,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub misconception: Option<String>,
    #[serde(default)]
    pub set: BTreeMap<String, ConfigValue>,
    #[serde(default)]
    pub fails_goals: Vec<String>,
    /// Golden-fixture shape: metric -> { op -> value }.
    #[serde(default)]
    pub expect: BTreeMap<String, BTreeMap<String, f64>>,
    #[serde(default)]
    pub expect_events: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Check { pub pass_mark: u32, pub questions: Vec<Question> }
}

exported! {
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum QuestionType { Single, Numeric }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Answer { Number(f64), Text(String) }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Question {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: QuestionType,
    #[serde(default)]
    pub options: Vec<String>,
    pub answer: Answer,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub tolerance: Option<f64>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub unit: Option<String>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub misconception: Option<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Challenge {
    pub format_version: u64,
    pub id: String,
    pub level: LevelId,
    #[serde(default)]
    pub prerequisites: Vec<String>,
    pub status: Status,
    #[cfg_attr(feature = "ts", ts(as = "sim_core::SimInput"))]
    pub start: Value,
    #[serde(default)]
    pub locked_nodes: Vec<String>,
    #[serde(default)]
    pub limits: Limits,
    #[serde(deserialize_with = "strict_goals")]
    pub goals: Vec<Goal>,
    pub modes: Vec<Mode>,
    #[serde(default)]
    pub hints: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Mode {
    pub id: String,
    pub budget_per_month: f64,
    #[serde(default = "empty_array")]
    #[cfg_attr(feature = "ts", ts(as = "Vec<sim_core::Fault>"))]
    pub faults: Value,
    #[serde(default = "empty_object")]
    pub workload_override: Value,
    pub reference: Design,
    pub naive: NaiveDesign,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Design {
    #[cfg_attr(feature = "ts", ts(as = "sim_core::Graph"))]
    pub graph: Value,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NaiveDesign {
    #[cfg_attr(feature = "ts", ts(as = "sim_core::Graph"))]
    pub graph: Value,
    #[serde(default)]
    pub fails_goals: Vec<String>,
}
}

exported! {
/// Same fields as sim-core's `GraphLimits`, but a typo is an error here.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Limits {
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub max_nodes: Option<u32>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub max_instances: Option<u32>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub allowed_kinds: Option<Vec<String>>,
}
}

impl Limits {
    pub fn graph_limits(&self) -> GraphLimits {
        GraphLimits {
            max_nodes: self.max_nodes,
            max_instances: self.max_instances,
            allowed_kinds: self.allowed_kinds.clone(),
        }
    }
}

// ---------- levels.json ----------

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlannedFeatures {
    #[serde(default)] pub components: Vec<String>,
    #[serde(default)] pub faults: Vec<String>,
    /// Input fields the engine will read later: `workload.<k>`, `workload.params.<k>`,
    /// `calibration.<k>`, `config.<kind>.<k>`.
    #[serde(default)] pub fields: Vec<String>,
    #[serde(default)] pub dynamic: Vec<String>,
    #[serde(default)] pub behaviors: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EngineCatalog { #[serde(default)] pub planned: PlannedFeatures }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EngineGap { pub description: String, #[serde(default)] pub needed_by: Vec<String> }
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExitCheck {
    pub challenge: String,
    pub mode: String,
    pub review_min_score: f64,
    pub description_vi: String,
    pub description_en: String,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Level {
    pub id: LevelId,
    pub title_vi: String,
    pub title_en: String,
    pub score: [u32; 2],
    pub entry_assumptions_vi: Vec<String>,
    pub entry_assumptions_en: Vec<String>,
    pub outcomes_vi: Vec<String>,
    pub outcomes_en: Vec<String>,
    pub exit_check: ExitCheck,
    pub lessons: Vec<String>,
    pub challenges: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EngineNeeds {
    #[serde(default)] pub components: Vec<String>,
    #[serde(default)] pub faults: Vec<String>,
    #[serde(default)] pub dynamic: Vec<String>,
    #[serde(default)] pub behaviors: Vec<String>,
    #[serde(default)] pub calibration: Vec<String>,
    #[serde(default)] pub node_overrides: Vec<String>,
    #[serde(default)] pub metrics: Vec<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoadmapLesson {
    pub id: String,
    pub title_vi: String,
    pub title_en: String,
    pub kind: LessonKind,
    pub minutes: u32,
    pub difficulty: u8,
    #[serde(default)] pub prerequisites: Vec<String>,
    #[serde(default)] pub concepts: Vec<String>,
    #[serde(default)] pub research: Vec<String>,
    #[serde(default)] pub needs: EngineNeeds,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoadmapMode {
    pub id: String,
    pub budget_per_month: f64,
    #[serde(default = "empty_array")]
    pub faults: Value,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub calibration: Option<Value>,
    #[serde(default)]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub note: Option<String>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoadmapChallenge {
    pub id: String,
    pub title_vi: String,
    pub title_en: String,
    #[serde(default)] pub prerequisites: Vec<String>,
    #[serde(default)] pub allowed_kinds: Vec<String>,
    pub workload: Value,
    #[serde(deserialize_with = "strict_goals")]
    pub goals: Vec<Goal>,
    pub modes: Vec<RoadmapMode>,
    pub brief_vi: String,
    pub brief_en: String,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Roadmap {
    #[serde(default)] pub lessons: Vec<RoadmapLesson>,
    #[serde(default)] pub challenges: Vec<RoadmapChallenge>,
}
}

exported! {
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Levels {
    pub format_version: u64,
    pub description: String,
    #[serde(default)]
    pub fields: BTreeMap<String, String>,
    #[serde(default)]
    pub engine: EngineCatalog,
    #[serde(default)]
    pub engine_gaps: BTreeMap<String, EngineGap>,
    pub levels: Vec<Level>,
    #[serde(default)]
    pub roadmap: Roadmap,
}
}

#[cfg(test)]
mod tests {
    use super::*;

    const GOOD: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/good/");

    fn read(rel: &str) -> String {
        std::fs::read_to_string(format!("{GOOD}{rel}")).unwrap()
    }

    #[test]
    fn good_fixture_items_parse() {
        let l: Lesson = serde_json::from_str(&read("lessons/l0-fx-capacity/lesson.json")).unwrap();
        assert_eq!(l.kind, LessonKind::Experiment);
        let e = l.experiment.unwrap();
        assert_eq!(e.controls[0].kind, ControlType::Stepper);
        assert_eq!(e.choices[1].fails_goals, vec!["fast", "no-drops"]);
        let r: Lesson = serde_json::from_str(&read("lessons/l0-fx-reading/lesson.json")).unwrap();
        assert_eq!(r.check.unwrap().questions[1].answer, Answer::Number(525.6));
        let c: Challenge =
            serde_json::from_str(&read("challenges/c-l0-fx-shop/challenge.json")).unwrap();
        assert_eq!(c.modes[0].faults, serde_json::json!([]));
        assert_eq!(c.modes[1].naive.fails_goals, vec!["up"]);
        let lv: Levels = serde_json::from_str(&read("levels.json")).unwrap();
        assert_eq!(lv.levels[0].id, LevelId::L0);
        assert_eq!(
            lv.roadmap.lessons[0].needs.components,
            vec!["client", "redis"]
        );
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let mut v: serde_json::Value =
            serde_json::from_str(&read("lessons/l0-fx-capacity/lesson.json")).unwrap();
        v["minuets"] = 3.into();
        assert!(serde_json::from_value::<Lesson>(v).is_err());
    }

    #[test]
    fn goal_typos_are_rejected_everywhere_goals_appear() {
        let mut v: serde_json::Value =
            serde_json::from_str(&read("lessons/l0-fx-capacity/lesson.json")).unwrap();
        v["experiment"]["goals"][0]["valeu"] = 1.into();
        let e = serde_json::from_value::<Lesson>(v).unwrap_err().to_string();
        assert!(e.contains("valeu"), "{e}");
        let mut v: serde_json::Value =
            serde_json::from_str(&read("challenges/c-l0-fx-shop/challenge.json")).unwrap();
        v["goals"][1]["metrc"] = "p95".into();
        assert!(serde_json::from_value::<Challenge>(v).is_err());
    }

    #[test]
    fn the_strict_goal_mirror_has_exactly_the_engine_goal_fields() {
        let g = Goal {
            id: "a".into(),
            metric: "p95".into(),
            op: sim_core::GoalOp::Le,
            value: 1.0,
        };
        let engine = serde_json::to_value(&g).unwrap();
        let strict: StrictGoal = serde_json::from_value(engine.clone()).unwrap();
        assert_eq!(Goal::from(strict), g);
    }

    #[test]
    fn level_ids_have_a_stable_name_matching_json() {
        for (l, s) in [(LevelId::L0, "L0"), (LevelId::L6, "L6")] {
            assert_eq!(l.as_str(), s);
            assert_eq!(serde_json::to_value(l).unwrap(), serde_json::Value::from(s));
            assert_eq!(l.digit(), s.chars().nth(1).unwrap());
        }
    }
}
