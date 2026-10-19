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

#[test]
fn curriculum_json_flag_formats_the_refusal_report() {
    let tmp = tempfile::tempdir().unwrap();
    copy_tree(&fixtures("broken"), tmp.path());
    let out = cli()
        .args(["content", "curriculum", "--json"])
        .arg(tmp.path())
        .assert()
        .code(1);
    let v: serde_json::Value = serde_json::from_slice(&out.get_output().stdout).unwrap();
    assert!(v["failed"].as_u64().unwrap() > 0);
}

#[test]
fn curriculum_write_replaces_the_file_and_leaves_no_temp_file() {
    let tmp = good_copy();
    std::fs::write(tmp.path().join("curriculum.json"), "old").unwrap();
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
    let names: Vec<String> = std::fs::read_dir(tmp.path())
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .filter(|n| n.contains("curriculum"))
        .collect();
    assert_eq!(names, vec!["curriculum.json"]);
}

fn stdout_of(out: &assert_cmd::assert::Assert) -> String {
    String::from_utf8(out.get_output().stdout.clone()).unwrap()
}

fn stderr_of(out: &assert_cmd::assert::Assert) -> String {
    String::from_utf8(out.get_output().stderr.clone()).unwrap()
}

#[test]
fn validate_json_snapshots() {
    let good = cli()
        .args(["content", "validate", "--json"])
        .arg(fixtures("good"))
        .assert()
        .success();
    insta::assert_snapshot!("validate_good_json", stdout_of(&good));
    let broken = cli()
        .args(["content", "validate", "--json"])
        .arg(fixtures("broken"))
        .assert()
        .code(1);
    insta::assert_snapshot!("validate_broken_json", stdout_of(&broken));
}

#[test]
fn reports_go_to_stdout_and_stderr_stays_empty() {
    let ok = cli()
        .args(["content", "validate"])
        .arg(fixtures("good"))
        .assert()
        .success();
    assert_eq!(stderr_of(&ok), "");
    let fail = cli()
        .args(["content", "validate"])
        .arg(fixtures("broken"))
        .assert()
        .code(1);
    assert_eq!(stderr_of(&fail), "");
    let tmp = tempfile::tempdir().unwrap();
    copy_tree(&fixtures("broken"), tmp.path());
    let refused = cli()
        .args(["content", "curriculum"])
        .arg(tmp.path())
        .assert()
        .code(1);
    assert_eq!(stderr_of(&refused), "");
}

#[test]
fn curriculum_on_a_missing_dir_exits_two_with_empty_stdout() {
    let out = cli()
        .args(["content", "curriculum", "/no/such/dir"])
        .assert()
        .code(2);
    assert_eq!(stdout_of(&out), "");
    assert!(!stderr_of(&out).is_empty());
}

#[test]
fn curriculum_check_on_a_broken_tree_leaves_the_file_untouched() {
    let tmp = tempfile::tempdir().unwrap();
    copy_tree(&fixtures("broken"), tmp.path());
    let path = tmp.path().join("curriculum.json");
    std::fs::write(&path, "committed").unwrap();
    cli()
        .args(["content", "curriculum", "--check"])
        .arg(tmp.path())
        .assert()
        .code(1);
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "committed");
}
