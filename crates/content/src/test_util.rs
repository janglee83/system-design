#![allow(dead_code)]

//! Unit-test helpers: the good fixture tree in memory, and editors that change one thing.

use crate::tree::{ContentTree, RawItem};
use serde_json::Value;

macro_rules! fx {
    ($p:literal) => {
        include_str!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/tests/fixtures/good/",
            $p
        ))
        .to_string()
    };
}

fn item(folder: &str, json: String, vi: String, en: String) -> RawItem {
    RawItem {
        folder: folder.into(),
        json: Ok(json),
        vi: Ok(vi),
        en: Ok(en),
    }
}

pub fn good_tree() -> ContentTree {
    ContentTree {
        levels: Ok(fx!("levels.json")),
        research: ["fx-capacity".to_string()].into_iter().collect(),
        lessons: vec![
            item(
                "l0-fx-capacity",
                fx!("lessons/l0-fx-capacity/lesson.json"),
                fx!("lessons/l0-fx-capacity/vi.md"),
                fx!("lessons/l0-fx-capacity/en.md"),
            ),
            item(
                "l0-fx-reading",
                fx!("lessons/l0-fx-reading/lesson.json"),
                fx!("lessons/l0-fx-reading/vi.md"),
                fx!("lessons/l0-fx-reading/en.md"),
            ),
        ],
        challenges: vec![item(
            "c-l0-fx-shop",
            fx!("challenges/c-l0-fx-shop/challenge.json"),
            fx!("challenges/c-l0-fx-shop/vi.md"),
            fx!("challenges/c-l0-fx-shop/en.md"),
        )],
    }
}

fn find<'a>(tree: &'a mut ContentTree, folder: &str) -> &'a mut RawItem {
    tree.lessons
        .iter_mut()
        .chain(tree.challenges.iter_mut())
        .find(|i| i.folder == folder)
        .unwrap_or_else(|| panic!("no fixture item {folder}"))
}

pub fn edit_json(tree: &mut ContentTree, folder: &str, f: impl FnOnce(&mut Value)) {
    let it = find(tree, folder);
    let mut v: Value = serde_json::from_str(it.json.as_ref().unwrap()).unwrap();
    f(&mut v);
    it.json = Ok(serde_json::to_string_pretty(&v).unwrap());
}

pub fn edit_levels(tree: &mut ContentTree, f: impl FnOnce(&mut Value)) {
    let mut v: Value = serde_json::from_str(tree.levels.as_ref().unwrap()).unwrap();
    f(&mut v);
    tree.levels = Ok(serde_json::to_string_pretty(&v).unwrap());
}

pub fn edit_prose(
    tree: &mut ContentTree,
    folder: &str,
    lang: &str,
    f: impl FnOnce(&str) -> String,
) {
    let it = find(tree, folder);
    let slot = if lang == "vi" { &mut it.vi } else { &mut it.en };
    *slot = Ok(f(slot.as_ref().unwrap()));
}
use crate::issue::ContentIssue;
use crate::report::Report;

pub fn issues_of(report: &Report, id: &str) -> Vec<ContentIssue> {
    report
        .items
        .iter()
        .filter(|i| i.id == id)
        .flat_map(|i| i.issues.clone())
        .collect()
}

pub fn codes_of(report: &Report, id: &str) -> Vec<String> {
    issues_of(report, id).into_iter().map(|i| i.code).collect()
}

pub fn has(report: &Report, id: &str, code: &str) -> bool {
    codes_of(report, id).iter().any(|c| c == code)
}
