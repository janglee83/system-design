//! Parity must not hang on a knife edge: every fitted default can move by ±2% (one at a time)
//! and every reference fixture in fixtures/parity still passes (see PINNED for the exception).

use sim_core::parity::{check_parity, ParityFixture};
use sim_core::{Calibration, CalibrationOverrides};
use std::path::PathBuf;

fn fixtures() -> Vec<ParityFixture> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/parity");
    let mut paths: Vec<PathBuf> = std::fs::read_dir(&dir)
        .expect("fixtures/parity exists")
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    paths.sort();
    let all: Vec<ParityFixture> = paths
        .iter()
        .map(|p| {
            let text = std::fs::read_to_string(p).unwrap();
            serde_json::from_str(&text).unwrap_or_else(|e| panic!("{}: {e}", p.display()))
        })
        .collect();
    assert!(all.len() >= 2, "expected the reference fixtures, found {}", all.len());
    all
}

type Setter = fn(&mut CalibrationOverrides, f64);

/// Defaults fitted to the parity fixtures (cost is exact by construction and excluded).
fn fitted() -> Vec<(&'static str, f64, Setter)> {
    let d = Calibration::default();
    vec![
        ("webRpsPerVcpu", d.web_rps_per_vcpu, |o, v| o.web_rps_per_vcpu = Some(v)),
        ("webServiceMs", d.web_service_ms, |o, v| o.web_service_ms = Some(v)),
        ("webQueuePerGb", d.web_queue_per_gb, |o, v| o.web_queue_per_gb = Some(v)),
        ("lbServiceMs", d.lb_service_ms, |o, v| o.lb_service_ms = Some(v)),
    ]
}

/// Fixture/field pairs the capture pins tighter than ±2%, checked at the smaller step instead.
/// scale-web-tier-surge-direct-2cpu-2gb rejects exactly the surge excess over 18,000 rps, so
/// availability moves ~0.0032 per 1% of webRpsPerVcpu: ±2% (±0.0065) exceeds the ±0.005
/// tolerance while ±1% (±0.0033) does not. The capture fixes capacity to about ±1.5%.
const PINNED: [(&str, &str, f64); 1] = [("scale-web-tier-surge-direct-2cpu-2gb", "webRpsPerVcpu", 0.01)];

fn step(fixture: &str, field: &str) -> f64 {
    PINNED.iter().find(|(f, n, _)| *f == fixture && *n == field).map_or(0.02, |p| p.2)
}

#[test]
fn parity_holds_with_each_fitted_default_moved_two_percent() {
    let all = fixtures();
    for (fixture, field, _) in PINNED {
        assert!(all.iter().any(|f| f.id == fixture), "pinned fixture {fixture} is missing");
        assert!(fitted().iter().any(|(n, _, _)| *n == field), "pinned field {field} is not fitted");
    }
    let mut failures = Vec::new();
    for f in all {
        assert!(check_parity(&f).passed, "{} fails at the defaults", f.id);
        for (name, value, set) in fitted() {
            let d = step(&f.id, name);
            for factor in [1.0 - d, 1.0 + d] {
                let mut fx = f.clone();
                let mut o = fx.input.calibration.clone().unwrap_or_default();
                set(&mut o, value * factor);
                fx.input.calibration = Some(o);
                let r = check_parity(&fx);
                if !r.passed {
                    failures.push(format!("{} {name} x{factor}: {r:?}", f.id));
                }
            }
        }
    }
    assert!(failures.is_empty(), "{failures:#?}");
}
