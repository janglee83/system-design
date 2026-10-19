//! Golden reports over committed fixture trees (spec §12).

use content::{codes, validate_dir, Report};
use std::collections::BTreeSet;
use std::path::PathBuf;

fn fixture(name: &str) -> Report {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(name);
    validate_dir(&dir).unwrap()
}

#[test]
fn good_tree_passes_without_issues() {
    let r = fixture("good");
    assert!(!r.has_blocking());
    assert_eq!(r.warnings, 0);
    insta::assert_snapshot!("good", r.to_text());
}

#[test]
fn broken_tree_covers_every_issue_code() {
    let r = fixture("broken");
    let seen: BTreeSet<&str> = r
        .items
        .iter()
        .flat_map(|i| &i.issues)
        .map(|i| i.code.as_str())
        .collect();
    for code in codes::ALL {
        assert!(seen.contains(code), "no fixture produces {code}");
    }
    insta::assert_snapshot!("broken", r.to_text());
}

#[test]
fn each_broken_item_reports_its_own_code() {
    let r = fixture("broken");
    let expect = [
        ("l0-bk-parse", codes::PARSE),
        ("l0-bk-version", codes::FORMAT_VERSION),
        ("l0-bk-folder", codes::ID),
        ("l0-bk-dup-goal", codes::DUPLICATE_ID),
        ("l0-bk-prereq", codes::PREREQUISITE_MISSING),
        ("l0-bk-cycle-a", codes::PREREQUISITE_CYCLE),
        ("l0-bk-cycle-b", codes::PREREQUISITE_CYCLE),
        ("l0-bk-research", codes::RESEARCH_MISSING),
        ("l0-bk-section", codes::PROSE_SECTION),
        ("l0-bk-key", codes::PROSE_KEY),
        ("l0-bk-control", codes::CONTROL),
        ("l0-bk-choice", codes::CHOICE),
        ("l0-bk-engine", codes::ENGINE_INVALID),
        ("l0-bk-correct", codes::CORRECT_FAILS),
        ("l0-bk-wrong-passes", codes::WRONG_PASSES),
        ("l0-bk-extra-fail", codes::WRONG_EXTRA_FAIL),
        ("l0-bk-expect", codes::EXPECT),
        ("l0-bk-blocked", codes::BLOCKED),
        ("c-l0-bk-ref", codes::REFERENCE_FAILS),
        ("c-l0-bk-naive", codes::NAIVE_PASSES),
        ("c-l0-bk-limits", codes::LIMITS),
    ];
    for (id, code) in expect {
        let item = r
            .items
            .iter()
            .find(|i| i.id == id)
            .unwrap_or_else(|| panic!("no item {id}"));
        assert!(
            item.issues.iter().any(|i| i.code == code),
            "{id} lacks {code}: {:#?}",
            item.issues
        );
    }
    // Warnings alone do not fail an item.
    for id in ["l0-bk-extra-fail", "l0-bk-blocked"] {
        assert!(r.items.iter().find(|i| i.id == id).unwrap().passed, "{id}");
    }
}
