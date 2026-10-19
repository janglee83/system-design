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
        match key.trim() {
            "id" => id = Some(value),
            "title" => title = Some(value),
            other => {
                return Err(format!(
                    "line {}: unknown front matter key `{other}`",
                    n + 1
                ))
            }
        }
    }
    if !closed {
        return Err("front matter is not closed with ---".into());
    }
    let id = id.ok_or("front matter needs `id`")?;
    let title = title
        .filter(|t| !t.trim().is_empty())
        .ok_or("front matter needs a non-empty `title`")?;

    let mut sections: Vec<Section> = Vec::new();
    let mut in_fence = false;
    for (_, line) in lines {
        if line.trim_start().starts_with("```") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }
        if let Some(h) = line.strip_prefix("## ") {
            sections.push(Section {
                heading: h.trim().to_string(),
                keys: vec![],
            });
        } else if let Some(key) = list_key(line) {
            if let Some(s) = sections.last_mut() {
                s.keys.push(key);
            }
        }
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
}
