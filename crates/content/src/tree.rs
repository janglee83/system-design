//! Reads a content directory into memory. The only module that touches the file system; every
//! check works on `ContentTree`, so unit tests build trees without files.

use std::collections::BTreeSet;
use std::fmt;
use std::path::{Path, PathBuf};

/// File contents, or why they are not available. Reasons are fixed strings, so OS error text
/// never reaches a report.
#[derive(Debug, Clone, PartialEq)]
pub enum FileText {
    Text(String),
    Missing,
    /// `"not UTF-8"`, `"not a file"`, `"too large"` or `"io error"`.
    Unreadable(&'static str),
}

impl FileText {
    /// The text, or the fixed reason (`"missing"` or the unreadable reason) it is unavailable.
    pub fn text(&self) -> Result<&str, &'static str> {
        match self {
            FileText::Text(t) => Ok(t),
            FileText::Missing => Err("missing"),
            FileText::Unreadable(why) => Err(why),
        }
    }
}

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
    /// Entries under `lessons/` or `challenges/` that are not item folders, and entries with
    /// non-UTF-8 names (shown lossily), relative to the content dir. Dot-entries are ignored.
    pub stray: Vec<String>,
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

/// Larger files are `Unreadable("too large")`; content files are a few KB.
pub const MAX_FILE_BYTES: u64 = 4 * 1024 * 1024;

fn read_text(path: &Path) -> FileText {
    use std::io::Read;
    match std::fs::metadata(path) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return FileText::Missing,
        Err(_) => return FileText::Unreadable("io error"),
        Ok(m) if !m.is_file() => return FileText::Unreadable("not a file"),
        Ok(_) => {}
    }
    let mut bytes = vec![];
    let read =
        std::fs::File::open(path).and_then(|f| f.take(MAX_FILE_BYTES + 1).read_to_end(&mut bytes));
    if read.is_err() {
        return FileText::Unreadable("io error");
    }
    if bytes.len() as u64 > MAX_FILE_BYTES {
        return FileText::Unreadable("too large");
    }
    match String::from_utf8(bytes) {
        Ok(text) => match text.strip_prefix('\u{feff}') {
            Some(rest) => FileText::Text(rest.to_string()),
            None => FileText::Text(text),
        },
        Err(_) => FileText::Unreadable("not UTF-8"),
    }
}

fn io(path: &Path) -> impl Fn(std::io::Error) -> LoadError + '_ {
    move |e| LoadError::Io(path.into(), e.to_string())
}

/// A directory entry name (`Err` holds a lossy non-UTF-8 name) and its path.
type Entry = (Result<String, String>, PathBuf);

/// Visible (non-dot) entries of `dir` as (name, path), or `None` when `dir` does not exist.
/// Any other failure is a load error, so an unreadable directory never looks empty.
/// Names that are not UTF-8 are returned lossily in `Err` for the caller to report.
fn entries(dir: &Path) -> Result<Option<Vec<Entry>>, LoadError> {
    let read = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(io(dir)(e)),
    };
    let mut out = vec![];
    for e in read {
        let e = e.map_err(io(dir))?;
        let name = e.file_name();
        if name.as_encoded_bytes().starts_with(b".") {
            continue;
        }
        let name = name
            .into_string()
            .map_err(|n| n.to_string_lossy().into_owned());
        out.push((name, e.path()));
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(Some(out))
}

fn is_dir(path: &Path) -> Result<bool, LoadError> {
    std::fs::metadata(path)
        .map(|m| m.is_dir())
        .map_err(io(path))
}

/// Item folders under `<parent>/`; everything else there goes to `stray`.
fn items(
    root: &Path,
    parent: &str,
    json_name: &str,
    stray: &mut Vec<String>,
) -> Result<Vec<RawItem>, LoadError> {
    let mut out = vec![];
    for (name, path) in entries(&root.join(parent))?.unwrap_or_default() {
        match name {
            Ok(folder) if is_dir(&path)? => out.push(RawItem {
                json: read_text(&path.join(json_name)),
                vi: read_text(&path.join("vi.md")),
                en: read_text(&path.join("en.md")),
                folder,
            }),
            Ok(n) | Err(n) => stray.push(format!("{parent}/{n}")),
        }
    }
    Ok(out)
}

pub fn load_dir(dir: &Path) -> Result<ContentTree, LoadError> {
    if !dir.is_dir() {
        return Err(LoadError::NotADirectory(dir.into()));
    }
    let levels_path = dir.join("levels.json");
    if !levels_path.is_file() {
        return Err(LoadError::MissingLevels(dir.into()));
    }
    let mut stray = vec![];
    let mut research = BTreeSet::new();
    for (name, path) in entries(&dir.join("research"))?.unwrap_or_default() {
        let is_file = std::fs::metadata(&path).map_err(io(&path))?.is_file();
        match name {
            Ok(n) if is_file => {
                if let Some(stem) = n.strip_suffix(".md") {
                    research.insert(stem.to_string());
                }
            }
            Ok(_) => {}
            Err(n) => stray.push(format!("research/{n}")),
        }
    }
    let lessons = items(dir, "lessons", "lesson.json", &mut stray)?;
    let challenges = items(dir, "challenges", "challenge.json", &mut stray)?;
    stray.sort();
    Ok(ContentTree {
        levels: read_text(&levels_path),
        research,
        lessons,
        challenges,
        stray,
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
        assert!(t.levels.text().is_ok());
        assert!(t.research.contains("fx-capacity"));
        let folders: Vec<&str> = t.lessons.iter().map(|i| i.folder.as_str()).collect();
        assert_eq!(folders, vec!["l0-fx-capacity", "l0-fx-reading"]);
        assert_eq!(t.challenges[0].folder, "c-l0-fx-shop");
        assert!(t.challenges[0].json.text().unwrap().contains("\"modes\""));
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
        fs::create_dir_all(tmp.path().join("lessons/l0-x/en.md")).unwrap();
        fs::write(tmp.path().join("lessons/.DS_Store"), "").unwrap();
        let t = load_dir(tmp.path()).unwrap();
        assert_eq!(t.lessons.len(), 1);
        assert_eq!(t.lessons[0].json, FileText::Missing);
        assert_eq!(t.lessons[0].vi, FileText::Unreadable("not UTF-8"));
        assert_eq!(t.lessons[0].en, FileText::Unreadable("not a file"));
        assert_eq!(t.lessons[0].en.text(), Err("not a file"));
        assert!(t.challenges.is_empty());
    }

    fn content_dir() -> tempfile::TempDir {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("levels.json"), "{}").unwrap();
        tmp
    }

    #[test]
    fn stray_entries_are_listed_not_dropped() {
        let tmp = content_dir();
        fs::create_dir_all(tmp.path().join("lessons/l0-x")).unwrap();
        fs::write(tmp.path().join("lessons/notes.txt"), "").unwrap();
        fs::create_dir_all(tmp.path().join("challenges")).unwrap();
        fs::write(tmp.path().join("challenges/c.json"), "").unwrap();
        let t = load_dir(tmp.path()).unwrap();
        assert_eq!(t.stray, vec!["challenges/c.json", "lessons/notes.txt"]);
        assert_eq!(t.lessons.len(), 1);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn non_utf8_names_are_stray() {
        use std::ffi::OsStr;
        use std::os::unix::ffi::OsStrExt;
        let tmp = content_dir();
        let bad = tmp
            .path()
            .join("lessons")
            .join(OsStr::from_bytes(b"l0-\xff"));
        fs::create_dir_all(&bad).unwrap();
        let t = load_dir(tmp.path()).unwrap();
        assert!(t.lessons.is_empty());
        assert_eq!(t.stray, vec!["lessons/l0-\u{fffd}"]);
    }

    #[test]
    fn research_notes_are_visible_md_files() {
        let tmp = content_dir();
        fs::create_dir_all(tmp.path().join("research/folder.md")).unwrap();
        fs::write(tmp.path().join("research/.hidden.md"), "").unwrap();
        fs::write(tmp.path().join("research/note.md"), "").unwrap();
        fs::write(tmp.path().join("research/readme.txt"), "").unwrap();
        let t = load_dir(tmp.path()).unwrap();
        assert_eq!(t.research.iter().collect::<Vec<_>>(), vec!["note"]);
    }

    #[cfg(unix)]
    #[test]
    fn an_unreadable_lessons_dir_is_a_load_error_not_empty() {
        use std::os::unix::fs::PermissionsExt;
        let tmp = content_dir();
        let lessons = tmp.path().join("lessons");
        fs::create_dir_all(lessons.join("l0-x")).unwrap();
        fs::set_permissions(tmp.path(), fs::Permissions::from_mode(0o300)).unwrap();
        // Root ignores permissions (the dev container runs as root); nothing to test then.
        let enforced = fs::read_dir(tmp.path()).is_err();
        let result = load_dir(tmp.path());
        fs::set_permissions(tmp.path(), fs::Permissions::from_mode(0o700)).unwrap();
        if enforced {
            assert!(result.is_err());
        }
        // A lessons path that is a file cannot be listed either.
        fs::remove_dir_all(&lessons).unwrap();
        fs::write(&lessons, "").unwrap();
        assert!(matches!(load_dir(tmp.path()), Err(LoadError::Io(..))));
    }

    #[test]
    fn a_bom_is_stripped_and_oversized_files_are_unreadable() {
        let tmp = content_dir();
        fs::create_dir_all(tmp.path().join("lessons/l0-x")).unwrap();
        fs::write(tmp.path().join("lessons/l0-x/lesson.json"), "\u{feff}{}").unwrap();
        let big = vec![b' '; MAX_FILE_BYTES as usize + 1];
        fs::write(tmp.path().join("lessons/l0-x/vi.md"), big).unwrap();
        let t = load_dir(tmp.path()).unwrap();
        assert_eq!(t.lessons[0].json, FileText::Text("{}".into()));
        assert_eq!(t.lessons[0].vi, FileText::Unreadable("too large"));
    }
}
