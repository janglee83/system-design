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
    let text = match text.text() {
        Ok(t) => t,
        Err(why) => {
            issues.push(parse_issue(path).detail(why));
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
    if let Some(key) = crate::dup_keys::first_duplicate_key(text) {
        issues.push(parse_issue(path).field(key).detail("duplicate key"));
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
    // From the text, not from `value`: nothing was merged or dropped on the way.
    match serde_json::from_str(text) {
        Ok(doc) => Some(doc),
        Err(e) => {
            issues.push(parse_issue(path).detail(e.to_string()));
            None
        }
    }
}

fn parse_md(text: &FileText, path: &str, issues: &mut Vec<ContentIssue>) -> Option<Prose> {
    let result = match text.text() {
        Ok(t) => parse_prose(t),
        Err(why) => Err(why.to_string()),
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
    for path in &tree.stray {
        global.push(parse_issue(path).detail("not an item folder"));
    }
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
                    .id(lv.id.as_str())
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
    // Every listed id exists; every roadmap stub is listed. A folder whose JSON did not parse
    // still exists (its parse issue says what is wrong), so folder names count too.
    let folders: BTreeSet<&str> = p
        .lessons
        .iter()
        .map(|i| i.id.as_str())
        .chain(p.challenges.iter().map(|i| i.id.as_str()))
        .collect();
    for id in listing.listed.keys() {
        if !authored.contains(id) && !roadmap.contains(id) && !folders.contains(id.as_str()) {
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

/// True when `start` can reach itself through prerequisite edges.
fn on_cycle(start: &str, edges: &BTreeMap<String, Vec<String>>) -> bool {
    let mut seen = BTreeSet::new();
    let mut stack: Vec<&str> = edges
        .get(start)
        .map(|v| v.iter().map(String::as_str).collect())
        .unwrap_or_default();
    while let Some(id) = stack.pop() {
        if id == start {
            return true;
        }
        if seen.insert(id) {
            stack.extend(edges.get(id).into_iter().flatten().map(String::as_str));
        }
    }
    false
}

fn check_references(p: &mut Parsed, levels: &Levels, listing: &Listing) {
    let mut lesson_ids: BTreeSet<String> = levels
        .roadmap
        .lessons
        .iter()
        .map(|s| s.id.clone())
        .collect();
    lesson_ids.extend(
        p.lessons
            .iter()
            .filter_map(|i| i.doc.as_ref().map(|d| d.id.clone())),
    );
    // Folders whose JSON did not parse still exist; their parse issue is the only report.
    lesson_ids.extend(
        p.lessons
            .iter()
            .filter(|i| i.doc.is_none())
            .map(|i| i.id.clone()),
    );
    let unparsed_challenges: BTreeSet<&str> = p
        .challenges
        .iter()
        .filter(|i| i.doc.is_none())
        .map(|i| i.id.as_str())
        .collect();
    // Challenge id -> its mode ids (authored or roadmap).
    let mut modes: BTreeMap<String, Vec<String>> = levels
        .roadmap
        .challenges
        .iter()
        .map(|s| (s.id.clone(), s.modes.iter().map(|m| m.id.clone()).collect()))
        .collect();
    for c in p.challenges.iter().filter_map(|i| i.doc.as_ref()) {
        modes.insert(c.id.clone(), c.modes.iter().map(|m| m.id.clone()).collect());
    }
    let pos: BTreeMap<&str, usize> = listing
        .lesson_order
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();
    let mut edges: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for s in &levels.roadmap.lessons {
        edges.insert(s.id.clone(), s.prerequisites.clone());
    }
    for l in p.lessons.iter().filter_map(|i| i.doc.as_ref()) {
        edges.insert(l.id.clone(), l.prerequisites.clone());
    }

    let prereq_issues =
        |id: &str, prereqs: &[String], path: &str, field: &str| -> Vec<ContentIssue> {
            let mut out = vec![];
            for pr in prereqs {
                if !lesson_ids.contains(pr) {
                    out.push(
                        ContentIssue::new(codes::PREREQUISITE_MISSING, path)
                            .id(pr.clone())
                            .field(field),
                    );
                } else if let (Some(a), Some(b)) = (pos.get(pr.as_str()), pos.get(id)) {
                    if a >= b {
                        out.push(
                            ContentIssue::new(codes::PREREQUISITE_CYCLE, path)
                                .id(pr.clone())
                                .field(field)
                                .detail("listed after"),
                        );
                    }
                }
            }
            if on_cycle(id, &edges) {
                out.push(
                    ContentIssue::new(codes::PREREQUISITE_CYCLE, path)
                        .id(id)
                        .field(field)
                        .detail("cycle"),
                );
            }
            out
        };
    let research_issues = |notes: &[String], path: &str, field: &str| -> Vec<ContentIssue> {
        notes
            .iter()
            .filter(|n| !p.research.contains(*n))
            .map(|n| {
                ContentIssue::new(codes::RESEARCH_MISSING, path)
                    .id(n.clone())
                    .field(field)
            })
            .collect()
    };

    let mut lesson_issues = vec![];
    for (k, item) in p.lessons.iter().enumerate() {
        let Some(l) = &item.doc else { continue };
        let path = item.file("lesson.json");
        let mut out = prereq_issues(&l.id, &l.prerequisites, &path, "prerequisites");
        out.extend(research_issues(&l.research, &path, "research"));
        lesson_issues.push((k, out));
    }
    let mut challenge_issues = vec![];
    for (k, item) in p.challenges.iter().enumerate() {
        let Some(c) = &item.doc else { continue };
        let path = item.file("challenge.json");
        let out: Vec<ContentIssue> = c
            .prerequisites
            .iter()
            .filter(|pr| !lesson_ids.contains(*pr))
            .map(|pr| {
                ContentIssue::new(codes::PREREQUISITE_MISSING, &path)
                    .id(pr.clone())
                    .field("prerequisites")
            })
            .collect();
        challenge_issues.push((k, out));
    }

    let mut global = vec![];
    for s in &levels.roadmap.lessons {
        let field = format!("roadmap.lessons[{}]", s.id);
        global.extend(prereq_issues(&s.id, &s.prerequisites, LEVELS_PATH, &field));
        global.extend(research_issues(&s.research, LEVELS_PATH, &field));
    }
    for s in &levels.roadmap.challenges {
        for pr in s
            .prerequisites
            .iter()
            .filter(|pr| !lesson_ids.contains(*pr))
        {
            global.push(
                ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH)
                    .id(pr.clone())
                    .field(format!("roadmap.challenges[{}]", s.id)),
            );
        }
    }
    for lv in &levels.levels {
        let ec = &lv.exit_check;
        let field = format!("levels[{}].exitCheck", lv.id.as_str());
        match modes.get(&ec.challenge) {
            _ if unparsed_challenges.contains(ec.challenge.as_str())
                && lv.challenges.contains(&ec.challenge) => {}
            Some(ms) if lv.challenges.contains(&ec.challenge) => {
                if !ms.contains(&ec.mode) {
                    global.push(
                        ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH)
                            .id(ec.mode.clone())
                            .field(format!("{field}.mode")),
                    );
                }
            }
            _ => global.push(
                ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH)
                    .id(ec.challenge.clone())
                    .field(format!("{field}.challenge")),
            ),
        }
    }
    for (gap, g) in &levels.engine_gaps {
        for n in &g.needed_by {
            if !lesson_ids.contains(n)
                && !modes.contains_key(n)
                && !unparsed_challenges.contains(n.as_str())
            {
                global.push(
                    ContentIssue::new(codes::PREREQUISITE_MISSING, LEVELS_PATH)
                        .id(n.clone())
                        .field(format!("engineGaps.{gap}.neededBy")),
                );
            }
        }
    }

    for (k, out) in lesson_issues {
        p.lessons[k].issues.extend(out);
    }
    for (k, out) in challenge_issues {
        p.challenges[k].issues.extend(out);
    }
    p.global.extend(global);
}

#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::tree::FileText;
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
        t.lessons[0].json = FileText::Text("{".into());
        t.lessons[1].vi = FileText::Missing;
        t.levels = FileText::Text("[]".into());
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::PARSE));
        let vi = issues_of(&r, "l0-fx-reading");
        assert_eq!(vi[0].path, "lessons/l0-fx-reading/vi.md");
        assert_eq!(vi[0].detail.as_deref(), Some("missing"));
        assert!(has(&r, "levels", codes::PARSE));
    }

    #[test]
    fn stray_entries_are_parse_issues_on_levels() {
        let mut t = good_tree();
        t.stray = vec!["lessons/notes.txt".into()];
        let r = validate_tree(&t);
        let i: Vec<_> = issues_of(&r, "levels");
        assert_eq!(i.len(), 1, "{i:#?}");
        assert_eq!(i[0].code, codes::PARSE);
        assert_eq!(i[0].path, "lessons/notes.txt");
    }

    fn raw_edit(t: &mut crate::tree::ContentTree, folder: &str, from: &str, to: &str) {
        let it = t
            .lessons
            .iter_mut()
            .chain(t.challenges.iter_mut())
            .find(|i| i.folder == folder)
            .unwrap();
        let text = it.json.text().unwrap();
        assert!(text.contains(from), "{from}");
        it.json = FileText::Text(text.replacen(from, to, 1));
    }

    #[test]
    fn duplicate_json_keys_are_parse_issues_with_their_path() {
        let cases = [
            (
                "l0-fx-capacity",
                "\"baseRps\": 12000",
                "\"baseRps\": 12000, \"baseRps\": 1",
                "experiment.base.workload.baseRps",
            ),
            (
                "l0-fx-capacity",
                "\"set\": { \"cpu\": 2 }",
                "\"set\": { \"cpu\": 2, \"cpu\": 4 }",
                "experiment.choices[0].set.cpu",
            ),
            (
                "l0-fx-capacity",
                "\"minutes\": 12,",
                "\"minutes\": 12, \"minutes\": 13,",
                "minutes",
            ),
            (
                "c-l0-fx-shop",
                "\"budgetPerMonth\": 60,",
                "\"budgetPerMonth\": 60, \"budgetPerMonth\": 6,",
                "modes[0].budgetPerMonth",
            ),
        ];
        for (folder, from, to, field) in cases {
            let mut t = good_tree();
            raw_edit(&mut t, folder, from, to);
            let i = issues_of(&validate_tree(&t), folder);
            assert!(
                i.iter().any(|i| i.code == codes::PARSE
                    && i.detail.as_deref() == Some("duplicate key")
                    && i.field.as_deref() == Some(field)),
                "{field}: {i:#?}"
            );
        }
    }

    #[test]
    fn an_unparseable_item_is_not_also_reported_as_missing_its_folder() {
        let mut t = good_tree();
        t.lessons[0].json = FileText::Text("{".into());
        t.challenges[0].json = FileText::Text("{".into());
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::PARSE));
        assert!(has(&r, "c-l0-fx-shop", codes::PARSE));
        assert!(
            codes_of(&r, "levels").is_empty(),
            "{:#?}",
            issues_of(&r, "levels")
        );
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

    #[test]
    fn missing_prerequisites_and_references() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["prerequisites"] = json!(["l0-nope"])
        });
        edit_json(&mut t, "c-l0-fx-shop", |v| {
            v["prerequisites"] = json!(["c-l0-fx-shop"])
        });
        edit_levels(&mut t, |v| {
            v["levels"][0]["exitCheck"]["mode"] = "nightmare".into();
            v["engineGaps"]["fx-gap"]["neededBy"] = json!(["l0-ghost"]);
            v["roadmap"]["lessons"][0]["prerequisites"] = json!(["l0-gone"]);
        });
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-capacity", codes::PREREQUISITE_MISSING));
        assert!(has(&r, "c-l0-fx-shop", codes::PREREQUISITE_MISSING)); // a challenge is not a lesson
        let g: Vec<_> = issues_of(&r, "levels")
            .into_iter()
            .filter(|i| i.code == codes::PREREQUISITE_MISSING)
            .filter_map(|i| i.id)
            .collect();
        // Fixed check order: roadmap entries, then exit checks, then gaps.
        assert_eq!(g, vec!["l0-gone", "nightmare", "l0-ghost"]);
    }

    #[test]
    fn prerequisite_listed_later_is_a_cycle_in_the_path() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-capacity", |v| {
            v["prerequisites"] = json!(["l0-fx-reading"])
        });
        let r = validate_tree(&t);
        let i: Vec<_> = issues_of(&r, "l0-fx-capacity")
            .into_iter()
            .filter(|i| i.code == codes::PREREQUISITE_CYCLE)
            .collect();
        assert!(i
            .iter()
            .any(|i| i.detail.as_deref() == Some("listed after")));
        assert!(i.iter().any(|i| i.detail.as_deref() == Some("cycle")));
        assert!(has(&r, "l0-fx-reading", codes::PREREQUISITE_CYCLE)); // reading <-> capacity
    }

    #[test]
    fn missing_research_notes() {
        let mut t = good_tree();
        edit_json(&mut t, "l0-fx-reading", |v| {
            v["research"] = json!(["no-such-note"])
        });
        edit_levels(&mut t, |v| {
            v["roadmap"]["lessons"][0]["research"] = json!(["also-missing"])
        });
        let r = validate_tree(&t);
        assert!(has(&r, "l0-fx-reading", codes::RESEARCH_MISSING));
        assert!(has(&r, "levels", codes::RESEARCH_MISSING));
    }

    fn levels_issues(edit: impl FnOnce(&mut serde_json::Value)) -> Vec<crate::ContentIssue> {
        let mut t = good_tree();
        edit_levels(&mut t, edit);
        issues_of(&validate_tree(&t), "levels")
    }

    fn level(id: &str, challenge: &str) -> serde_json::Value {
        json!({"id": id, "titleVi": "t", "titleEn": "t", "score": [0, 1],
               "entryAssumptionsVi": [], "entryAssumptionsEn": [], "outcomesVi": [], "outcomesEn": [],
               "exitCheck": {"challenge": challenge, "mode": "standard", "reviewMinScore": 0.5,
                             "descriptionVi": "d", "descriptionEn": "d"},
               "lessons": [], "challenges": []})
    }

    #[test]
    fn listed_under_another_kind() {
        let mut t = good_tree();
        edit_levels(&mut t, |v| {
            v["levels"][0]["lessons"] = json!(["l0-fx-capacity", "l0-fx-planned"]);
            v["levels"][0]["challenges"] = json!(["c-l0-fx-shop", "l0-fx-reading"]);
        });
        let i = issues_of(&validate_tree(&t), "l0-fx-reading");
        assert!(
            i.iter()
                .any(|i| i.code == codes::ID && i.field.as_deref() == Some("level")),
            "{i:#?}"
        );
    }

    #[test]
    fn listed_without_folder_and_roadmap_not_listed() {
        let i = levels_issues(|v| {
            v["levels"][0]["lessons"] = json!(["l0-fx-capacity", "l0-fx-reading", "l0-ghost"])
        });
        assert!(i
            .iter()
            .any(|i| i.code == codes::ID && i.id.as_deref() == Some("l0-ghost")));
        let i = levels_issues(|v| {
            v["levels"][0]["lessons"] = json!(["l0-fx-capacity", "l0-fx-reading"])
        });
        assert!(i.iter().any(|i| i.code == codes::ID
            && i.id.as_deref() == Some("l0-fx-planned")
            && i.detail.as_deref() == Some("roadmap entry is not listed in any level")));
    }

    #[test]
    fn duplicate_level_ids() {
        let i = levels_issues(|v| {
            v["levels"]
                .as_array_mut()
                .unwrap()
                .push(level("L0", "c-l0-fx-shop"))
        });
        assert!(i.iter().any(|i| i.code == codes::DUPLICATE_ID
            && i.id.as_deref() == Some("L0")
            && i.field.as_deref() == Some("levels")));
    }

    #[test]
    fn exit_check_challenge_outside_its_level() {
        let i = levels_issues(|v| {
            v["levels"]
                .as_array_mut()
                .unwrap()
                .push(level("L1", "c-l0-fx-shop"))
        });
        assert!(
            i.iter().any(|i| i.code == codes::PREREQUISITE_MISSING
                && i.field.as_deref() == Some("levels[L1].exitCheck.challenge")),
            "{i:#?}"
        );
    }

    #[test]
    fn roadmap_challenge_prerequisites() {
        let i = levels_issues(|v| {
            v["roadmap"]["challenges"] = json!([{"id": "c-l0-fx-later", "titleVi": "t", "titleEn": "t",
                "prerequisites": ["l0-nope"], "workload": {"baseRps": 1},
                "goals": [{"id": "fast", "metric": "p95", "op": "<=", "value": 1}],
                "modes": [{"id": "standard", "budgetPerMonth": 10}], "briefVi": "b", "briefEn": "b"}]);
            v["levels"][0]["challenges"] = json!(["c-l0-fx-shop", "c-l0-fx-later"]);
        });
        assert!(
            i.iter().any(|i| i.code == codes::PREREQUISITE_MISSING
                && i.id.as_deref() == Some("l0-nope")
                && i.field.as_deref() == Some("roadmap.challenges[c-l0-fx-later]")),
            "{i:#?}"
        );
        assert_eq!(i.len(), 1, "{i:#?}");
    }
}
