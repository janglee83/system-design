//! Prose files: a two-key front matter (`id`, `title`), `## ` sections, and keyed list items
//! of the exact form `- **KEY**: text` (ruling R10). Wording is never inspected.

#[derive(Debug, Clone, PartialEq)]
pub struct Section {
    pub heading: String,
    pub keys: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Prose {
    pub id: String,
    pub title: String,
    pub sections: Vec<Section>,
}

impl Prose {
    /// Keys of every section with this heading, in file order.
    pub fn keys_in(&self, heading: &str) -> Vec<&str> {
        self.sections
            .iter()
            .filter(|s| s.heading == heading)
            .flat_map(|s| s.keys.iter().map(String::as_str))
            .collect()
    }
    pub fn position(&self, heading: &str) -> Option<usize> {
        self.sections.iter().position(|s| s.heading == heading)
    }
}

fn unquote(v: &str) -> String {
    v.strip_prefix('"')
        .and_then(|s| s.strip_suffix('"'))
        .unwrap_or(v)
        .to_string()
}

/// `- **M1**: text` -> `M1`. Column 0 only; the key is ASCII letters, digits, `.` or `-`.
fn list_key(line: &str) -> Option<String> {
    let rest = line.strip_prefix("- **")?;
    let (key, after) = rest.split_once("**")?;
    let valid = !key.is_empty()
        && key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-');
    (valid && after.starts_with(':')).then(|| key.to_string())
}

/// A code fence run: up to 3 leading spaces, then 3 or more of one fence char (`` ` `` or `~`).
/// Returns the char, the run length and the text after the run.
fn fence_run(line: &str) -> Option<(char, usize, &str)> {
    let body = line.trim_start_matches(' ');
    if line.len() - body.len() > 3 {
        return None;
    }
    let c = body.chars().next().filter(|c| *c == '`' || *c == '~')?;
    let n = body.chars().take_while(|x| *x == c).count();
    (n >= 3).then(|| (c, n, &body[n..]))
}

/// The text of a `## ` heading with an optional closing `#` run removed, or `None` when the
/// line is not a level-2 heading.
fn h2_text(line: &str) -> Option<&str> {
    let rest = if line.trim_end() == "##" {
        ""
    } else {
        line.strip_prefix("## ")?
    };
    let rest = rest.trim();
    let without = rest.trim_end_matches('#');
    if without.is_empty() || without.ends_with(' ') {
        Some(without.trim_end())
    } else {
        Some(rest)
    }
}

pub fn parse_prose(text: &str) -> Result<Prose, String> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut lines = text.lines().map(|l| l.trim_end_matches('\r')).enumerate();
    match lines.next() {
        Some((_, l)) if l.trim_end() == "---" => {}
        _ => return Err("front matter must start on line 1 with ---".into()),
    }
    let (mut id, mut title) = (None, None);
    let mut closed = false;
    for (n, line) in lines.by_ref() {
        let line = line.trim_end();
        if line == "---" {
            closed = true;
            break;
        }
        if line.trim().is_empty() {
            continue;
        }
        let Some((key, value)) = line.split_once(':') else {
            return Err(format!("line {}: expected `key: value`", n + 1));
        };
        let value = unquote(value.trim());
        let slot = match key.trim() {
            "id" => &mut id,
            "title" => &mut title,
            other => {
                return Err(format!(
                    "line {}: unknown front matter key `{other}`",
                    n + 1
                ))
            }
        };
        if slot.replace(value).is_some() {
            return Err(format!("line {}: duplicate key", n + 1));
        }
    }
    if !closed {
        return Err("front matter is not closed with ---".into());
    }
    let id = id
        .filter(|i| !i.trim().is_empty())
        .ok_or("front matter needs a non-empty `id`")?;
    let title = title
        .filter(|t| !t.trim().is_empty())
        .ok_or("front matter needs a non-empty `title`")?;

    let mut sections: Vec<Section> = Vec::new();
    let mut fence: Option<(char, usize)> = None;
    for (n, line) in lines {
        let run = fence_run(line);
        match (fence, run) {
            (None, Some((c, n, _))) => {
                fence = Some((c, n));
                continue;
            }
            (Some((c, n)), Some((rc, rn, rest)))
                if rc == c && rn >= n && rest.trim().is_empty() =>
            {
                fence = None;
                continue;
            }
            (Some(_), _) => continue,
            (None, None) => {}
        }
        if let Some(h) = h2_text(line) {
            if h.is_empty() {
                return Err(format!("line {}: empty heading", n + 1));
            }
            sections.push(Section {
                heading: h.to_string(),
                keys: vec![],
            });
        } else if let Some(key) = list_key(line) {
            if let Some(s) = sections.last_mut() {
                s.keys.push(key);
            }
        }
    }
    if fence.is_some() {
        return Err("unclosed code fence".into());
    }
    Ok(Prose {
        id,
        title,
        sections,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const DOC: &str = "---\nid: l0-a\ntitle: \"A: title\"\n---\n\n## Outcome\ntext\n\n## Common misconceptions\n- **M1**: one\n- **M2**: two\n  - **M9**: nested, ignored\n- **Capacity** (x): not a key\n\n```json\n## not a heading\n- **M7**: in a fence\n```\n\n## Feedback\n- **B**: fb\n- **q1.a**: option key\n";

    #[test]
    fn parses_front_matter_sections_and_keys() {
        let p = parse_prose(DOC).unwrap();
        assert_eq!(p.id, "l0-a");
        assert_eq!(p.title, "A: title");
        let headings: Vec<&str> = p.sections.iter().map(|s| s.heading.as_str()).collect();
        assert_eq!(
            headings,
            vec!["Outcome", "Common misconceptions", "Feedback"]
        );
        assert_eq!(p.keys_in("Common misconceptions"), vec!["M1", "M2"]);
        assert_eq!(p.keys_in("Feedback"), vec!["B", "q1.a"]);
        assert_eq!(p.position("Feedback"), Some(2));
    }

    #[test]
    fn bom_and_crlf_are_accepted() {
        let doc = format!("\u{feff}{}", DOC.replace('\n', "\r\n"));
        assert_eq!(
            parse_prose(&doc).unwrap().keys_in("Feedback"),
            vec!["B", "q1.a"]
        );
    }

    #[test]
    fn front_matter_errors() {
        assert!(parse_prose("").is_err());
        assert!(parse_prose("## Outcome\n").is_err());
        assert!(parse_prose("---\nid: a\ntitle: t\n").is_err()); // not closed
        assert!(parse_prose("---\nid: a\n---\n").is_err()); // no title
        assert!(parse_prose("---\nid: a\ntitle: \"\"\n---\n").is_err()); // empty title
        assert!(parse_prose("---\nid: a\ntitle: t\nlevel: L0\n---\n").is_err()); // unknown key
        assert!(parse_prose("---\nid a\ntitle: t\n---\n").is_err()); // no colon
    }

    const HEAD: &str = "---\nid: a\ntitle: t\n---\n";

    fn keys(body: &str) -> Vec<String> {
        let p = parse_prose(&format!("{HEAD}## S\n{body}")).unwrap();
        p.keys_in("S").iter().map(|k| k.to_string()).collect()
    }

    #[test]
    fn a_longer_fence_is_closed_only_by_an_equal_or_longer_one() {
        let body = "````md\n```\n- **M1**: inside\n```\n````\n- **M2**: after\n";
        assert_eq!(keys(body), vec!["M2"]);
    }

    #[test]
    fn tilde_fences_are_skipped_and_backticks_do_not_close_them() {
        let body = "~~~\n```\n- **M1**: inside\n~~~\n- **M2**: after\n";
        assert_eq!(keys(body), vec!["M2"]);
        // Indented up to 3 spaces still opens; a closer with trailing text does not close.
        let body = "   ```\n- **M1**: inside\n``` not a closer\n```\n- **M3**: after\n";
        assert_eq!(keys(body), vec!["M3"]);
    }

    #[test]
    fn an_unclosed_fence_is_an_error() {
        let doc = format!("{HEAD}## S\n```\n- **M1**: x\n");
        assert_eq!(parse_prose(&doc).unwrap_err(), "unclosed code fence");
        // Four spaces is an indented code line, not a fence.
        assert_eq!(keys("    ```\n- **M1**: x\n"), vec!["M1"]);
    }

    #[test]
    fn duplicate_front_matter_keys_and_an_empty_id_are_errors() {
        assert_eq!(
            parse_prose("---\nid: a\nid: b\ntitle: t\n---\n").unwrap_err(),
            "line 3: duplicate key"
        );
        assert_eq!(
            parse_prose("---\nid: a\ntitle: t\ntitle: u\n---\n").unwrap_err(),
            "line 4: duplicate key"
        );
        assert!(parse_prose("---\nid:   \ntitle: t\n---\n").is_err());
        assert!(parse_prose("---\nid: \"\"\ntitle: t\n---\n").is_err());
    }

    fn headings(body: &str) -> Vec<String> {
        let p = parse_prose(&format!("{HEAD}{body}")).unwrap();
        p.sections.into_iter().map(|s| s.heading).collect()
    }

    #[test]
    fn closing_hashes_are_trimmed_from_headings() {
        assert_eq!(
            headings("## Outcome ##\n## C# basics\n## Terms #\n"),
            vec!["Outcome", "C# basics", "Terms"]
        );
    }

    #[test]
    fn an_empty_heading_is_an_error() {
        assert_eq!(
            parse_prose(&format!("{HEAD}## Outcome\n## \n")).unwrap_err(),
            "line 6: empty heading"
        );
        assert!(parse_prose(&format!("{HEAD}##\n")).is_err());
        assert!(parse_prose(&format!("{HEAD}## ##\n")).is_err());
    }
}
