//! Reads a content directory into memory. The only module that touches the file system; every
//! check works on `ContentTree`, so unit tests build trees without files.

use std::collections::BTreeSet;
use std::fmt;
use std::path::{Path, PathBuf};

/// File contents, or why they are not available (`"missing"` or the I/O error).
pub type FileText = Result<String, String>;

#[derive(Debug, Clone, PartialEq)]
pub struct RawItem {
    /// Folder name under `lessons/` or `challenges/`.
    pub folder: String,
    /// `lesson.json` or `challenge.json`.
    pub json: FileText,
    pub vi: FileText,
    pub en: FileText,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ContentTree {
    pub levels: FileText,
    /// Research note ids: `research/<id>.md` file stems.
    pub research: BTreeSet<String>,
    pub lessons: Vec<RawItem>,
    pub challenges: Vec<RawItem>,
}

#[derive(Debug)]
pub enum LoadError {
    NotADirectory(PathBuf),
    MissingLevels(PathBuf),
    Io(PathBuf, String),
}

impl fmt::Display for LoadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LoadError::NotADirectory(p) => write!(f, "{}: not a readable directory", p.display()),
            LoadError::MissingLevels(p) => write!(
                f,
                "{}: no levels.json, not a content directory",
                p.display()
            ),
            LoadError::Io(p, e) => write!(f, "{}: {e}", p.display()),
        }
    }
}

impl std::error::Error for LoadError {}

fn read_text(path: &Path) -> FileText {
    match std::fs::read(path) {
        Ok(bytes) => String::from_utf8(bytes).map_err(|_| "not UTF-8".to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Err("missing".into()),
        Err(e) => Err(e.to_string()),
    }
}

/// Visible sub-directory names, sorted. A missing parent is an empty list.
fn folders(dir: &Path) -> Result<Vec<String>, LoadError> {
    if !dir.exists() {
        return Ok(vec![]);
    }
    let entries = std::fs::read_dir(dir).map_err(|e| LoadError::Io(dir.into(), e.to_string()))?;
    let mut out: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| !n.starts_with('.'))
        .collect();
    out.sort();
    Ok(out)
}

fn items(dir: &Path, json_name: &str) -> Result<Vec<RawItem>, LoadError> {
    Ok(folders(dir)?
        .into_iter()
        .map(|folder| {
            let d = dir.join(&folder);
            RawItem {
                json: read_text(&d.join(json_name)),
                vi: read_text(&d.join("vi.md")),
                en: read_text(&d.join("en.md")),
                folder,
            }
        })
        .collect())
}

pub fn load_dir(dir: &Path) -> Result<ContentTree, LoadError> {
    if !dir.is_dir() {
        return Err(LoadError::NotADirectory(dir.into()));
    }
    let levels_path = dir.join("levels.json");
    if !levels_path.is_file() {
        return Err(LoadError::MissingLevels(dir.into()));
    }
    let mut research = BTreeSet::new();
    let research_dir = dir.join("research");
    if research_dir.is_dir() {
        let entries = std::fs::read_dir(&research_dir)
            .map_err(|e| LoadError::Io(research_dir.clone(), e.to_string()))?;
        for e in entries.filter_map(|e| e.ok()) {
            if let Some(stem) = e.file_name().to_str().and_then(|n| n.strip_suffix(".md")) {
                research.insert(stem.to_string());
            }
        }
    }
    Ok(ContentTree {
        levels: read_text(&levels_path),
        research,
        lessons: items(&dir.join("lessons"), "lesson.json")?,
        challenges: items(&dir.join("challenges"), "challenge.json")?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn good_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/good")
    }

    #[test]
    fn loads_the_good_tree_sorted() {
        let t = load_dir(&good_dir()).unwrap();
        assert!(t.levels.is_ok());
        assert!(t.research.contains("fx-capacity"));
        let folders: Vec<&str> = t.lessons.iter().map(|i| i.folder.as_str()).collect();
        assert_eq!(folders, vec!["l0-fx-capacity", "l0-fx-reading"]);
        assert_eq!(t.challenges[0].folder, "c-l0-fx-shop");
        assert!(t.challenges[0].json.as_ref().unwrap().contains("\"modes\""));
    }

    #[test]
    fn missing_dir_and_missing_levels_are_load_errors() {
        assert!(matches!(
            load_dir(Path::new("/no/such/dir")),
            Err(LoadError::NotADirectory(_))
        ));
        let tmp = tempfile::tempdir().unwrap();
        assert!(matches!(
            load_dir(tmp.path()),
            Err(LoadError::MissingLevels(_))
        ));
    }

    #[test]
    fn missing_files_and_bad_utf8_become_file_errors_not_load_errors() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("levels.json"), "{}").unwrap();
        fs::create_dir_all(tmp.path().join("lessons/l0-x")).unwrap();
        fs::write(tmp.path().join("lessons/l0-x/vi.md"), [0xff, 0xfe, 0x00]).unwrap();
        fs::write(tmp.path().join("lessons/.DS_Store"), "").unwrap();
        let t = load_dir(tmp.path()).unwrap();
        assert_eq!(t.lessons.len(), 1);
        assert_eq!(t.lessons[0].json, Err("missing".to_string()));
        assert!(t.lessons[0].vi.is_err());
        assert!(t.challenges.is_empty());
    }
}
