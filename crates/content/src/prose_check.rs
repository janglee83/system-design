//! Required sections and keys in vi.md / en.md (spec §5, rulings R10 and R11).

use crate::issue::{codes, ContentIssue};
use crate::prose::Prose;
use crate::structure::Item;
use crate::types::*;
use std::collections::BTreeSet;

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Experiment,
    Reading,
    Challenge,
}

#[derive(Clone, Copy)]
enum Sec {
    Misconceptions,
    Feedback,
    Questions,
    Hints,
}

fn heading(sec: Sec, vi: bool) -> &'static str {
    match (sec, vi) {
        (Sec::Misconceptions, true) => "Hiểu lầm thường gặp",
        (Sec::Misconceptions, false) => "Common misconceptions",
        (Sec::Feedback, true) => "Phản hồi",
        (Sec::Feedback, false) => "Feedback",
        (Sec::Questions, true) => "Câu hỏi",
        (Sec::Questions, false) => "Questions",
        (Sec::Hints, true) => "Gợi ý",
        (Sec::Hints, false) => "Hints",
    }
}

fn required(kind: Kind, vi: bool) -> Vec<&'static str> {
    let exp = kind == Kind::Experiment;
    match (kind, vi) {
        (Kind::Challenge, true) => vec!["Bối cảnh", "Mục tiêu", "Gợi ý"],
        (Kind::Challenge, false) => vec!["Scenario", "Outcome", "Hints"],
        (_, true) => vec![
            "Mục tiêu",
            "Hình dung trước",
            "Thuật ngữ",
            "Hiểu lầm thường gặp",
            if exp { "Thí nghiệm" } else { "Câu hỏi" },
            "Phản hồi",
            "Điều cần nhớ",
        ],
        (_, false) => vec![
            "Outcome",
            "Picture it first",
            "Terms",
            "Common misconceptions",
            if exp { "Experiment" } else { "Questions" },
            "Feedback",
            "Takeaways",
        ],
    }
}

fn sections(p: &Prose, kind: Kind, vi: bool, path: &str) -> Vec<ContentIssue> {
    let mut out = vec![];
    let mut last: Option<usize> = None;
    for h in required(kind, vi) {
        // keys_in reads every section with this heading, so a repeat would hide which one
        // holds a key; position() would pick the first. Report it instead of guessing.
        if p.sections.iter().filter(|s| s.heading == h).count() > 1 {
            out.push(
                ContentIssue::new(codes::PROSE_SECTION, path)
                    .field(h)
                    .detail("duplicate"),
            );
        }
        match p.position(h) {
            None => out.push(
                ContentIssue::new(codes::PROSE_SECTION, path)
                    .field(h)
                    .detail("missing"),
            ),
            Some(i) if last.is_some_and(|l| i < l) => out.push(
                ContentIssue::new(codes::PROSE_SECTION, path)
                    .field(h)
                    .detail("out of order"),
            ),
            Some(i) => last = Some(i),
        }
    }
    out
}

fn keys(
    p: &Prose,
    vi: bool,
    path: &str,
    needs: &[(Sec, String)],
    used: &BTreeSet<String>,
) -> Vec<ContentIssue> {
    let mut out = vec![];
    for (sec, key) in needs {
        let h = heading(*sec, vi);
        if !p.keys_in(h).contains(&key.as_str()) {
            out.push(
                ContentIssue::new(codes::PROSE_KEY, path)
                    .id(key.clone())
                    .field(h),
            );
        }
    }
    let feedback = p.keys_in(heading(Sec::Feedback, vi));
    for m in p.keys_in(heading(Sec::Misconceptions, vi)) {
        if !used.contains(m) && !feedback.contains(&m) {
            out.push(
                ContentIssue::new(codes::PROSE_KEY, path)
                    .id(m)
                    .field(heading(Sec::Feedback, vi))
                    .detail("misconception without feedback"),
            );
        }
    }
    for s in &p.sections {
        let mut seen = BTreeSet::new();
        for k in &s.keys {
            if !seen.insert(k) {
                out.push(
                    ContentIssue::new(codes::DUPLICATE_ID, path)
                        .id(k.clone())
                        .field(s.heading.clone()),
                );
            }
        }
    }
    out
}

fn both<T>(
    item: &Item<T>,
    kind: Kind,
    needs: &[(Sec, String)],
    used: &BTreeSet<String>,
) -> Vec<ContentIssue> {
    let mut out = vec![];
    for (name, prose, vi) in [("vi.md", &item.vi, true), ("en.md", &item.en, false)] {
        let Some(p) = prose else { continue };
        let path = item.file(name);
        out.extend(sections(p, kind, vi, &path));
        out.extend(keys(p, vi, &path, needs, used));
    }
    out
}

pub(crate) fn check_lesson_prose(item: &Item<Lesson>) -> Vec<ContentIssue> {
    let Some(l) = &item.doc else { return vec![] };
    let mut needs = vec![];
    let mut used = BTreeSet::new();
    if let Some(e) = &l.experiment {
        for c in e.choices.iter().filter(|c| !c.correct) {
            if let Some(m) = &c.misconception {
                needs.push((Sec::Misconceptions, m.clone()));
                used.insert(m.clone());
            }
            needs.push((Sec::Feedback, c.id.clone()));
        }
    }
    if let Some(c) = &l.check {
        for q in &c.questions {
            needs.push((Sec::Questions, q.id.clone()));
            for o in &q.options {
                needs.push((Sec::Questions, format!("{}.{o}", q.id)));
            }
            if let Some(m) = &q.misconception {
                needs.push((Sec::Misconceptions, m.clone()));
                needs.push((Sec::Feedback, q.id.clone()));
                used.insert(m.clone());
            }
        }
    }
    let kind = if l.kind == LessonKind::Experiment {
        Kind::Experiment
    } else {
        Kind::Reading
    };
    both(item, kind, &needs, &used)
}

pub(crate) fn check_challenge_prose(item: &Item<Challenge>) -> Vec<ContentIssue> {
    let Some(c) = &item.doc else { return vec![] };
    let needs: Vec<(Sec, String)> = c.hints.iter().map(|h| (Sec::Hints, h.clone())).collect();
    both(item, Kind::Challenge, &needs, &BTreeSet::new())
}

#[cfg(test)]
mod tests {
    use crate::issue::codes;
    use crate::test_util::*;
    use crate::validate_tree;

    #[test]
    fn missing_and_out_of_order_sections() {
        let mut t = good_tree();
        edit_prose(&mut t, "l0-fx-capacity", "en", |s| {
            s.replace("## Takeaways\n- Capacity comes from CPU.\n", "")
        });
        edit_prose(&mut t, "l0-fx-reading", "vi", |s| {
            s.replace("## Mục tiêu", "## TMP")
                .replace("## Điều cần nhớ", "## Mục tiêu")
                .replace("## TMP", "## Điều cần nhớ")
        });
        let r = validate_tree(&t);
        let cap = issues_of(&r, "l0-fx-capacity");
        assert!(cap.iter().any(|i| i.code == codes::PROSE_SECTION
            && i.field.as_deref() == Some("Takeaways")
            && i.path.ends_with("en.md")));
        assert!(has(&r, "l0-fx-reading", codes::PROSE_SECTION));
    }

    #[test]
    fn challenge_sections() {
        let mut t = good_tree();
        edit_prose(&mut t, "c-l0-fx-shop", "vi", |s| {
            s.replace("## Bối cảnh", "## Bối cảnh chung")
        });
        assert!(has(
            &validate_tree(&t),
            "c-l0-fx-shop",
            codes::PROSE_SECTION
        ));
    }

    #[test]
    fn missing_keys_in_one_language() {
        let mut t = good_tree();
        edit_prose(&mut t, "l0-fx-capacity", "vi", |s| {
            s.replace("- **M2**: Vượt sức chứa một chút cũng không sao.\n", "")
        });
        edit_prose(&mut t, "l0-fx-reading", "en", |s| {
            s.replace("- **q1.c**: A week.\n", "")
        });
        edit_prose(&mut t, "c-l0-fx-shop", "en", |s| {
            s.replace("- **h2**", "- **h3**")
        });
        let r = validate_tree(&t);
        assert!(issues_of(&r, "l0-fx-capacity")
            .iter()
            .any(|i| i.code == codes::PROSE_KEY
                && i.id.as_deref() == Some("M2")
                && i.path.ends_with("vi.md")));
        assert!(issues_of(&r, "l0-fx-reading")
            .iter()
            .any(|i| i.id.as_deref() == Some("q1.c")));
        assert!(issues_of(&r, "c-l0-fx-shop")
            .iter()
            .any(|i| i.id.as_deref() == Some("h2")));
    }

    #[test]
    fn every_misconception_needs_feedback_and_keys_are_unique() {
        let mut t = good_tree();
        edit_prose(&mut t, "l0-fx-capacity", "en", |s| {
            s.replace("- **M2**: Going a little over capacity is fine.\n",
                      "- **M2**: Going a little over capacity is fine.\n- **M3**: An extra one.\n- **M3**: Twice.\n")
        });
        let k = issues_of(&validate_tree(&t), "l0-fx-capacity");
        assert!(k
            .iter()
            .any(|i| i.code == codes::PROSE_KEY && i.id.as_deref() == Some("M3")));
        assert!(k
            .iter()
            .any(|i| i.code == codes::DUPLICATE_ID && i.id.as_deref() == Some("M3")));
    }

    #[test]
    fn misconception_with_its_own_feedback_item_is_fine() {
        let mut t = good_tree();
        for (lang, sec) in [("en", "## Feedback\n"), ("vi", "## Phản hồi\n")] {
            edit_prose(&mut t, "l0-fx-capacity", lang, |s| {
                s.replace("- **M2**:", "- **M3**: extra.\n- **M2**:")
                    .replace(sec, &format!("{sec}- **M3**: feedback for M3.\n"))
            });
        }
        assert!(codes_of(&validate_tree(&t), "l0-fx-capacity").is_empty());
    }

    #[test]
    fn a_repeated_required_heading_is_a_section_issue() {
        let mut t = good_tree();
        edit_prose(&mut t, "l0-fx-capacity", "en", |s| {
            format!("{s}\n## Terms\n- **Extra**: again.\n")
        });
        let i = issues_of(&validate_tree(&t), "l0-fx-capacity");
        assert!(i.iter().any(|i| i.code == codes::PROSE_SECTION
            && i.field.as_deref() == Some("Terms")
            && i.detail.as_deref() == Some("duplicate")));
    }
}
