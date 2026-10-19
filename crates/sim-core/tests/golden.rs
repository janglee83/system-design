use sim_core::fixture::{check_fixture, Fixture};
use std::path::PathBuf;

fn fixtures() -> Vec<Fixture> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/golden");
    let mut paths: Vec<PathBuf> = std::fs::read_dir(&dir)
        .expect("fixtures/golden exists")
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    paths.sort();
    paths
        .iter()
        .map(|p| {
            let text = std::fs::read_to_string(p).unwrap();
            serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", p.display()))
        })
        .collect()
}

#[test]
fn all_golden_fixtures_pass() {
    let all = fixtures();
    assert!(
        all.len() >= 10,
        "expected at least 10 golden fixtures, found {}",
        all.len()
    );
    let failures: Vec<String> = all
        .iter()
        .map(check_fixture)
        .filter(|r| !r.passed)
        .map(|r| {
            format!(
                "{}: failures={:?} validation={:?} metrics={:?}",
                r.id, r.failures, r.validation, r.metrics
            )
        })
        .collect();
    assert!(failures.is_empty(), "{failures:#?}");
}

#[test]
fn golden_metrics_snapshots() {
    for f in fixtures() {
        let result = sim_core::simulate(&f.input).expect("golden inputs are valid");
        insta::assert_json_snapshot!(f.id.clone(), result.metrics);
    }
}
