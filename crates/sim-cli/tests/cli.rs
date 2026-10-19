use assert_cmd::Command;
use std::path::PathBuf;

fn golden_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/golden")
}

#[test]
fn check_passes_on_golden_fixtures() {
    let out = Command::cargo_bin("sim-cli").unwrap().arg("check").arg(golden_dir()).assert().success();
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("PASS web-tier-light"));
    assert!(stdout.contains("0 failed"));
}

#[test]
fn check_fails_with_exit_code_1() {
    let dir = tempfile::tempdir().unwrap();
    let bad = std::fs::read_to_string(golden_dir().join("web-tier-light.json"))
        .unwrap()
        .replace(r#""p95": {"<=": 20}"#, r#""p95": {"<=": 0.0001}"#);
    std::fs::write(dir.path().join("bad.json"), bad).unwrap();
    let out = Command::cargo_bin("sim-cli").unwrap().arg("check").arg(dir.path()).assert().code(1);
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("FAIL web-tier-light p95 <= 0.0001"));
}

#[test]
fn result_matches_library_output() {
    let file = golden_dir().join("web-tier-surge-scaled.json");
    let out = Command::cargo_bin("sim-cli").unwrap().arg("result").arg(&file).assert().success();
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    let fixture: sim_core::fixture::Fixture =
        serde_json::from_str(&std::fs::read_to_string(&file).unwrap()).unwrap();
    let expected = serde_json::to_string(&sim_core::simulate(&fixture.input).unwrap()).unwrap();
    assert_eq!(stdout.trim_end(), expected);
}

#[test]
fn run_accepts_bare_sim_input() {
    let dir = tempfile::tempdir().unwrap();
    let text = std::fs::read_to_string(golden_dir().join("web-tier-light.json")).unwrap();
    let v: serde_json::Value = serde_json::from_str(&text).unwrap();
    std::fs::write(dir.path().join("input.json"), v["input"].to_string()).unwrap();
    let out = Command::cargo_bin("sim-cli").unwrap().arg("run").arg(dir.path().join("input.json")).assert().success();
    let parsed: serde_json::Value = serde_json::from_slice(&out.get_output().stdout).unwrap();
    assert!(parsed[0]["metrics"]["availability"].as_f64().unwrap() > 0.999);
}

/// Spec budget: 100 golden-sized fixtures in under 2 s on 8 cores. Release build only:
/// `./dev cargo test -p sim-cli --release -- --ignored`
#[test]
#[ignore]
fn checks_100_fixtures_under_two_seconds() {
    let dir = tempfile::tempdir().unwrap();
    let text = std::fs::read_to_string(golden_dir().join("web-tier-surge-scaled.json")).unwrap();
    for k in 0..100 {
        std::fs::write(dir.path().join(format!("f{k:03}.json")), &text).unwrap();
    }
    let start = std::time::Instant::now();
    Command::cargo_bin("sim-cli").unwrap().arg("check").arg(dir.path()).assert().success();
    let elapsed = start.elapsed();
    assert!(elapsed.as_secs_f64() < 2.0, "took {elapsed:?}");
}

#[test]
fn parity_reports_every_reference_fixture() {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/parity");
    let out = Command::cargo_bin("sim-cli").unwrap().arg("parity").arg(dir).assert();
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("scale-web-tier-surge-pass"));
    assert!(stdout.contains("scale-web-tier-surge-direct"));
    // Goal pass/fail must already agree; numeric calibration is Step 5.
    assert!(!stdout.contains(" goal "), "goal verdicts must match the reference:\n{stdout}");
}

#[test]
fn parity_fails_when_no_fixture_files_are_found() {
    let dir = tempfile::tempdir().unwrap();
    let out = Command::cargo_bin("sim-cli").unwrap().arg("parity").arg(dir.path()).assert().code(1);
    let stderr = String::from_utf8(out.get_output().stderr.clone()).unwrap();
    assert!(stderr.contains("no parity fixtures found"), "{stderr}");
}

#[test]
fn parity_prints_validation_issue_codes() {
    let dir = tempfile::tempdir().unwrap();
    let src = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/parity/scale-web-tier-surge-pass.json");
    let mut fx: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(src).unwrap()).unwrap();
    fx["input"]["graph"]["edges"][0]["to"] = "nowhere".into();
    fx["tolerance"] = serde_json::json!({"p95": {"rel": -1.0}});
    std::fs::write(dir.path().join("bad.json"), fx.to_string()).unwrap();
    let out = Command::cargo_bin("sim-cli").unwrap().arg("parity").arg(dir.path()).assert().code(1);
    let stdout = String::from_utf8(out.get_output().stdout.clone()).unwrap();
    assert!(stdout.contains("FAIL scale-web-tier-surge-pass issue parity.invalid-tolerance p95"), "{stdout}");
    assert!(stdout.contains("issue edge."), "graph validation codes are printed too:\n{stdout}");
    assert!(stdout.contains("0 passed, 1 failed"));
}
