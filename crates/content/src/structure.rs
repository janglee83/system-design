//! Stage 1: parse every file, then run checks that need the whole tree (ids, duplicates,
//! listing in levels.json; prerequisites, research and references in Task 7).

use crate::ids;
use crate::issue::{codes, ContentIssue};
use crate::prose::{parse_prose, Prose};
use crate::tree::{ContentTree, FileText, RawItem};
use crate::types::*;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

pub(crate) const LEVELS_ID: &str = "levels";
pub(crate) const LEVELS_PATH: &str = "levels.json";

pub(crate) struct Item<T> {
    /// Folder name; the report id.
    pub id: String,
    /// `lessons/<folder>` or `challenges/<folder>`.
    pub dir: String,
    pub doc: Option<T>,
    pub vi: Option<Prose>,
    pub en: Option<Prose>,
    pub issues: Vec<ContentIssue>,
}

impl<T> Item<T> {
    pub fn file(&self, name: &str) -> String {
        format!("{}/{name}", self.dir)
    }
}

pub(crate) struct Parsed {
    pub levels: Option<Levels>,
    /// Issues about levels.json and roadmap entries (report item `levels`).
    pub global: Vec<ContentIssue>,
    #[allow(dead_code)] // read by later checks (plan Tasks 7); remove then
    pub research: BTreeSet<String>,
    pub lessons: Vec<Item<Lesson>>,
    pub challenges: Vec<Item<Challenge>>,
}

fn parse_issue(path: &str) -> ContentIssue {
    ContentIssue::new(codes::PARSE, path)
}

/// JSON -> object -> formatVersion gate (ruling R6) -> typed document.
fn parse_doc<T: DeserializeOwned>(
    text: &FileText,
    path: &str,
    issues: &mut Vec<ContentIssue>,
) -> Option<T> {
    let text = match text {
        Ok(t) => t,
        Err(e) => {
            issues.push(parse_issue(path).detail(e.clone()));
            return None;
        }
    };
    let value: Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(e) => {
            issues.push(parse_issue(path).detail(e.to_string()));
            return None;
        }
    };
    if !value.is_object() {
        issues.push(parse_issue(path).detail("expected a JSON object"));
        return None;
    }
    match value.get("formatVersion") {
        Some(v) if v.as_u64() == Some(FORMAT_VERSION) => {}
        other => {
            let found = other.map_or("missing".to_string(), Value::to_string);
            issues.push(
                ContentIssue::new(codes::FORMAT_VERSION, path)
                    .field("formatVersion")
                    .detail(found),
            );
            return None;
        }
    }
    match serde_json::from_value(value) {
        Ok(doc) => Some(doc),
        Err(e) => {
            issues.push(parse_issue(path).detail(e.to_string()));
            None
        }
    }
}

fn parse_md(text: &FileText, path: &str, issues: &mut Vec<ContentIssue>) -> Option<Prose> {
    let result = match text {
        Ok(t) => parse_prose(t),
        Err(e) => Err(e.clone()),
    };
    result
        .map_err(|e| issues.push(parse_issue(path).detail(e)))
        .ok()
}

fn parse_item<T: DeserializeOwned>(raw: &RawItem, parent: &str, json_name: &str) -> Item<T> {
    let dir = format!("{parent}/{}", raw.folder);
    let mut issues = vec![];
    let doc = parse_doc(&raw.json, &format!("{dir}/{json_name}"), &mut issues);
    let vi = parse_md(&raw.vi, &format!("{dir}/vi.md"), &mut issues);
    let en = parse_md(&raw.en, &format!("{dir}/en.md"), &mut issues);
    Item {
        id: raw.folder.clone(),
        dir,
        doc,
        vi,
        en,
        issues,
    }
}

/// Ruling R5: ranges and kind/body consistency of a lesson.
fn lesson_shape(item: &Item<Lesson>) -> Vec<ContentIssue> {
    let Some(l) = &item.doc else { return vec![] };
    let path = item.file("lesson.json");
    let mut out = vec![];
    if !(1..=60).contains(&l.minutes) {
        out.push(parse_issue(&path).field("minutes").detail("must be 1-60"));
    }
    if !(1..=3).contains(&l.difficulty) {
        out.push(parse_issue(&path).field("difficulty").detail("must be 1-3"));
    }
    let body_ok = match l.kind {
        LessonKind::Experiment => l.experiment.is_some() && l.check.is_none(),
        LessonKind::Reading => l.check.is_some() && l.experiment.is_none(),
    };
    if !body_ok {
        out.push(
            parse_issue(&path)
                .field("kind")
                .detail("experiment needs `experiment`, reading needs `check`, not both"),
        );
    }
    if let Some(e) = &l.experiment {
        if !e.base.is_object() {
            out.push(
                parse_issue(&path)
                    .field("experiment.base")
                    .detail("must be an object"),
            );
        }
    }
    out
}

fn challenge_shape(item: &Item<Challenge>) -> Vec<ContentIssue> {
    let Some(c) = &item.doc else { return vec![] };
    if c.start.is_object() {
        vec![]
    } else {
        vec![parse_issue(&item.file("challenge.json"))
            .field("start")
            .detail("must be an object")]
    }
}

/// Pattern, folder name, level digit and prose front matter ids.
fn id_issues<T>(
    item: &Item<T>,
    doc_id: &str,
    level: LevelId,
    json_name: &str,
    valid: fn(&str) -> bool,
) -> Vec<ContentIssue> {
    let path = item.file(json_name);
    let mut out = vec![];
    if !valid(doc_id) {
        out.push(
            ContentIssue::new(codes::ID, &path)
                .id(doc_id)
                .field("id")
                .detail("bad id"),
        );
    }
    if doc_id != item.id {
        out.push(
            ContentIssue::new(codes::ID, &path)
                .id(doc_id)
                .field("id")
                .detail("folder name differs"),
        );
    }
    if ids::level_digit(doc_id) != Some(level.digit()) {
        out.push(
            ContentIssue::new(codes::ID, &path)
                .id(doc_id)
                .field("level"),
        );
    }
    for (name, prose) in [("vi.md", &item.vi), ("en.md", &item.en)] {
        if let Some(p) = prose {
            if p.id != item.id {
                out.push(
                    ContentIssue::new(codes::ID, item.file(name))
                        .id(p.id.clone())
                        .field("id"),
                );
            }
        }
    }
    out
}

pub(crate) fn parse_tree(tree: &ContentTree) -> Parsed {
    let mut global = vec![];
    let levels = parse_doc::<Levels>(&tree.levels, LEVELS_PATH, &mut global);
    let mut lessons: Vec<Item<Lesson>> = tree
        .lessons
        .iter()
        .map(|r| parse_item(r, "lessons", "lesson.json"))
        .collect();
    let mut challenges: Vec<Item<Challenge>> = tree
        .challenges
        .iter()
        .map(|r| parse_item(r, "challenges", "challenge.json"))
        .collect();
    for item in &mut lessons {
        let mut more = lesson_shape(item);
        if let Some(l) = &item.doc {
            more.extend(id_issues(
                item,
                &l.id,
                l.level,
                "lesson.json",
                ids::is_lesson_id,
            ));
        }
        item.issues.extend(more);
    }
    for item in &mut challenges {
        let mut more = challenge_shape(item);
        if let Some(c) = &item.doc {
            more.extend(id_issues(
                item,
                &c.id,
                c.level,
                "challenge.json",
                ids::is_challenge_id,
            ));
        }
        item.issues.extend(more);
    }
    Parsed {
        levels,
        global,
        research: tree.research.clone(),
        lessons,
        challenges,
    }
}

/// What levels.json lists: id -> (level, is_lesson), plus the global lesson order.
pub(crate) struct Listing {
    pub listed: BTreeMap<String, (LevelId, bool)>,
    #[allow(dead_code)] // read by later checks (plan Tasks 7); remove then
    pub lesson_order: Vec<String>,
}

fn listing(levels: &Levels, global: &mut Vec<ContentIssue>) -> Listing {
    let mut listed = BTreeMap::new();
    let mut lesson_order = vec![];
    let mut seen_levels = BTreeSet::new();
    for lv in &levels.levels {
        if !seen_levels.insert(lv.id) {
            global.push(
                ContentIssue::new(codes::DUPLICATE_ID, LEVELS_PATH)
                    .id(format!("{:?}", lv.id))
                    .field("levels"),
            );
        }
        for (list, is_lesson) in [(&lv.lessons, true), (&lv.challenges, false)] {
            for id in list {
                if listed.insert(id.clone(), (lv.id, is_lesson)).is_some() {
                    global.push(
                        ContentIssue::new(codes::DUPLICATE_ID, LEVELS_PATH)
                            .id(id.clone())
                            .field("levels"),
                    );
                } else if is_lesson {
                    lesson_order.push(id.clone());
                }
            }
        }
    }
    Listing {
        listed,
        lesson_order,
    }
}

fn listing_issue(
    l: &Listing,
    id: &str,
    level: LevelId,
    is_lesson: bool,
    path: &str,
) -> Option<ContentIssue> {
    match l.listed.get(id) {
        None => Some(
            ContentIssue::new(codes::ID, path)
                .id(id)
                .field("levels")
                .detail("not listed in levels.json"),
        ),
        Some(&(lv, lesson)) if lv != level || lesson != is_lesson => Some(
            ContentIssue::new(codes::ID, path)
                .id(id)
                .field("level")
                .detail("listed under another level or kind"),
        ),
        Some(_) => None,
    }
}

/// Stage 1b: checks across items. Without a readable levels.json there is nothing to check
/// against; its parse issue already fails the run.
pub(crate) fn check_cross(p: &mut Parsed) {
    let Some(levels) = p.levels.clone() else {
        return;
    };
    let listing = listing(&levels, &mut p.global);

    // A second folder declaring an id already seen is a duplicate (items are in folder order).
    let mut authored: BTreeSet<String> = BTreeSet::new();
    for item in &mut p.lessons {
        if let Some(id) = item.doc.as_ref().map(|d| d.id.clone()) {
            if !authored.insert(id.clone()) {
                item.issues.push(
                    ContentIssue::new(codes::DUPLICATE_ID, item.file("lesson.json"))
                        .id(id)
                        .field("id"),
                );
            }
        }
    }
    for item in &mut p.challenges {
        if let Some(id) = item.doc.as_ref().map(|d| d.id.clone()) {
            if !authored.insert(id.clone()) {
                item.issues.push(
                    ContentIssue::new(codes::DUPLICATE_ID, item.file("challenge.json"))
                        .id(id)
                        .field("id"),
                );
            }
        }
    }
    let mut roadmap: BTreeSet<String> = BTreeSet::new();
    let stubs = levels
        .roadmap
        .lessons
        .iter()
        .map(|s| &s.id)
        .chain(levels.roadmap.challenges.iter().map(|s| &s.id));
    for id in stubs {
        if authored.contains(id) || !roadmap.insert(id.clone()) {
            p.global.push(
                ContentIssue::new(codes::DUPLICATE_ID, LEVELS_PATH)
                    .id(id.clone())
                    .field("roadmap"),
            );
        }
    }

    // Every authored item is listed under its own level and kind.
    for item in &mut p.lessons {
        let Some(l) = &item.doc else { continue };
        if let Some(issue) =
            listing_issue(&listing, &l.id, l.level, true, &item.file("lesson.json"))
        {
            item.issues.push(issue);
        }
    }
    for item in &mut p.challenges {
        let Some(c) = &item.doc else { continue };
        if let Some(issue) = listing_issue(
            &listing,
            &c.id,
            c.level,
            false,
            &item.file("challenge.json"),
        ) {
            item.issues.push(issue);
        }
    }
    // Every listed id exists; every roadmap stub is listed.
    for id in listing.listed.keys() {
        if !authored.contains(id) && !roadmap.contains(id) {
            p.global.push(
                ContentIssue::new(codes::ID, LEVELS_PATH)
                    .id(id.clone())
                    .detail("listed but has no folder or roadmap entry"),
            );
        }
    }
    for id in &roadmap {
        if !listing.listed.contains_key(id) {
            p.global.push(
                ContentIssue::new(codes::ID, LEVELS_PATH)
                    .id(id.clone())
                    .detail("roadmap entry is not listed in any level"),
            );
        }
    }

    check_references(p, &levels, &listing);
}

/// Prerequisites, research and references from levels.json. Replaced in Task 7.
fn check_references(_p: &mut Parsed, _levels: &Levels, _listing: &Listing) {}

#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;
    use serde_json::json;

    #[test]
    fn good_tree_has_no_issues() {
        let r = validate_tree(&good_tree());
        let all: Vec<_> = r.items.iter().flat_map(|i| i.issues.clone()).collect();
        assert!(all.is_empty(), "{all:#?}");
        let ids: Vec<&str> = r.items.iter().map(|i| i.id.as_str()).collect();
        assert_eq!(
            ids,
            vec!["levels", "c-l0-fx-shop", "l0-fx-capacity", "l0-fx-reading"]
        );
    }

    #[test]
    fn unreadable_json_and_prose_are_parse_issues() {
        let mut t = good_tree();
        t.lessons[0].json = Ok("{".into());
        t.lessons[1].vi = Err("missing".into());
        t.levels = Ok("[]".into());
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::PARSE));
        let vi = issues_of(&r, "l0-fx-reading");
        assert_eq!(vi[0].path, "lessons/l0-fx-reading/vi.md");
        assert!(has(&r, "levels", codes::PARSE));
    }

    #[test]
    fn shape_errors_are_parse_issues_with_a_field() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["minutes"] = 0.into());
        edit_json(&mut t, "l0-fx-reading", |v| v["kind"] = "experiment".into());
        edit_json(&mut t, "c-l0-fx-shop", |v| v["start"] = json!([]));
        let r = validate_tree(&t);
        let f: Vec<_> = issues_of(&r, "l0-fx-capacity")
            .into_iter()
            .filter_map(|i| i.field)
            .collect();
        assert!(f.contains(&"minutes".to_string()));
        assert!(has(&r, "l0-fx-reading", codes::PARSE));
        assert!(has(&r, "c-l0-fx-shop", codes::PARSE));
    }

    #[test]
    fn unknown_or_missing_format_version() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["formatVersion"] = 2.into());
        edit_json(&mut t, "c-l0-fx-shop", |v| {
            v.as_object_mut().unwrap().remove("formatVersion");
        });
        let r = validate_tree(&t);
        assert_eq!(codes_of(&r, "l0-fx-capacity")[0], codes::FORMAT_VERSION);
        assert!(has(&r, "c-l0-fx-shop", codes::FORMAT_VERSION));
    }

    #[test]
    fn id_rules() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| v["id"] = "l0-fx-other".into());
        edit_json(&mut t, "l0-fx-reading", |v| v["level"] = "L1".into());
        edit_prose(&mut t, "c-l0-fx-shop", "en", |s| {
            s.replace("id: c-l0-fx-shop", "id: c-l0-fx-shopp")
        });
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::ID)); // folder name differs
        assert!(has(&r, "l0-fx-reading", codes::ID)); // level digit differs
        let shop = issues_of(&r, "c-l0-fx-shop");
        assert!(shop
            .iter()
            .any(|i| i.code == codes::ID && i.path.ends_with("en.md")));
    }

    #[test]
    fn bad_id_pattern_and_unlisted_item() {
        let mut t = good_tree();
        edit_levels(&mut t, |v| {
            v["levels"][0]["lessons"] = json!(["l0-fx-capacity", "l0-fx-planned"])
        });
        edit_json(&mut t, "l0-fx-capacity", |v| v["id"] = "L0-Bad".into());
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::ID));
        assert!(has(&r, "l0-fx-reading", codes::ID)); // not listed in levels.json
    }

    #[test]
    fn duplicates_at_item_level() {
        let mut t = good_tree();
        let mut copy = t.lessons[0].clone();
        copy.folder = "l0-fx-capacity2".into();
        t.lessons.push(copy);
        edit_levels(&mut t, |v| {
            v["levels"][0]["lessons"]
                .as_array_mut()
                .unwrap()
                .push("l0-fx-reading".into());
            v["roadmap"]["lessons"][0]["id"] = "l0-fx-reading".into();
        });
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity2", codes::DUPLICATE_ID));
        let dup: Vec<_> = issues_of(&r, "levels")
            .into_iter()
            .filter(|i| i.code == codes::DUPLICATE_ID)
            .collect();
        assert_eq!(dup.len(), 2, "{dup:#?}"); // listed twice, and a roadmap entry that has a folder
    }
}
