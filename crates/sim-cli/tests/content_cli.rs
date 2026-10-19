use assert_cmd::Command;
use std::path::PathBuf;

fn fixtures(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../content/tests/fixtures")
        .join(name)
}

fn cli() -> Command {
    Command::cargo_bin("sim-cli").unwrap()
}

#[test]
fn validate_good_tree_exits_zero() {
    let out = cli()
        .args(["content", "validate"])
        .arg(fixtures("good"))
        .assert()
        .success();
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("PASS l0-fx-capacity\n"));
    assert!(stdout.ends_with("4 items: 4 passed, 0 failed, 0 warnings, 0 blocked\n"));
}

#[test]
fn validate_broken_tree_exits_one() {
    let out = cli()
        .args(["content", "validate"])
        .arg(fixtures("broken"))
        .assert()
        .code(1);
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("FAIL l0-bk-correct content.correct-fails"));
    assert!(stdout.contains("WARN l0-bk-blocked content.blocked"));
}

#[test]
fn unreadable_directories_exit_two() {
    cli()
        .args(["content", "validate", "/no/such/dir"])
        .assert()
        .code(2);
    let empty = tempfile::tempdir().unwrap();
    cli()
        .args(["content", "validate"])
        .arg(empty.path())
        .assert()
        .code(2);
}

#[test]
fn json_output_is_the_report() {
    let out = cli()
        .args(["content", "validate", "--json"])
        .arg(fixtures("good"))
        .assert()
        .success();
    let v: serde_json::Value = serde_json::from_slice(&out.get_output().stdout).unwrap();
    assert_eq!(v["items"].as_array().unwrap().len(), 4);
    assert_eq!(v["items"][2]["runs"][0]["label"], "choice:A");
}

#[test]
fn output_is_deterministic_across_thread_counts() {
    let run = |threads: &str| {
        let out = cli()
            .env("RAYON_NUM_THREADS", threads)
            .args(["content", "validate", "--json"])
            .arg(fixtures("broken"))
            .assert()
            .code(1);
        out.get_output().stdout.clone()
    };
    assert_eq!(run("1"), run("8"));
}

fn copy_tree(from: &std::path::Path, to: &std::path::Path) {
    for entry in std::fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            std::fs::create_dir_all(&target).unwrap();
            copy_tree(&entry.path(), &target);
        } else {
            std::fs::copy(entry.path(), target).unwrap();
        }
    }
}

#[test]
fn curriculum_write_then_check() {
    let tmp = tempfile::tempdir().unwrap();
    copy_tree(&fixtures("good"), tmp.path());
    cli()
        .args(["content", "curriculum", "--check"])
        .arg(tmp.path())
        .assert()
        .code(1); // no file yet
    cli()
        .args(["content", "curriculum"])
        .arg(tmp.path())
        .assert()
        .success();
    cli()
        .args(["content", "curriculum", "--check"])
        .arg(tmp.path())
        .assert()
        .success();
    let path = tmp.path().join("curriculum.json");
    let stale = std::fs::read_to_string(&path)
        .unwrap()
        .replace("\"version\": 2", "\"version\": 1");
    std::fs::write(&path, stale).unwrap();
    cli()
        .args(["content", "curriculum", "--check"])
        .arg(tmp.path())
        .assert()
        .code(1);
}

#[test]
fn curriculum_refuses_a_broken_tree() {
    let tmp = tempfile::tempdir().unwrap();
    copy_tree(&fixtures("broken"), tmp.path());
    let out = cli()
        .args(["content", "curriculum"])
        .arg(tmp.path())
        .assert()
        .code(1);
    assert!(String::from_utf8_lossy(&out.get_output().stdout).contains("FAIL"));
    assert!(!tmp.path().join("curriculum.json").exists());
}

fn good_copy() -> tempfile::TempDir {
    let tmp = tempfile::tempdir().unwrap();
    copy_tree(&fixtures("good"), tmp.path());
    tmp
}

#[test]
fn curriculum_check_treats_crlf_as_stale() {
    let tmp = good_copy();
    cli()
        .args(["content", "curriculum"])
        .arg(tmp.path())
        .assert()
        .success();
    let path = tmp.path().join("curriculum.json");
    let crlf = std::fs::read_to_string(&path)
        .unwrap()
        .replace('\n', "\r\n");
    std::fs::write(&path, crlf).unwrap();
    cli()
        .args(["content", "curriculum", "--check"])
        .arg(tmp.path())
        .assert()
        .code(1);
}

#[test]
fn curriculum_check_read_error_exits_two_with_the_reason() {
    let tmp = good_copy();
    std::fs::create_dir(tmp.path().join("curriculum.json")).unwrap();
    let out = cli()
        .args(["content", "curriculum", "--check"])
        .arg(tmp.path())
        .assert()
        .code(2);
    let stderr = String::from_utf8_lossy(&out.get_output().stderr).to_string();
    assert!(stderr.contains("curriculum.json"), "{stderr}");
}
