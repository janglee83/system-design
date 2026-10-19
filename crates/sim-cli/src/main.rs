use clap::{Parser, Subcommand};
use rayon::prelude::*;
use sim_core::fixture::{check_fixture, Fixture, FixtureReport};
use sim_core::parity::{check_parity, ParityFixture, ParityReport};
use sim_core::{simulate, SimInput};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

#[derive(Parser)]
#[command(
    name = "sim-cli",
    version,
    about = "Run and check system design simulations"
)]
struct Cli {
    #[command(subcommand)]
    command: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Run inputs or fixtures and print metrics and events.
    Run { files: Vec<PathBuf> },
    /// Print the full result of one input or fixture as compact JSON.
    Result { file: PathBuf },
    /// Check fixtures (files or directories) and report pass/fail.
    Check {
        paths: Vec<PathBuf>,
        #[arg(long)]
        json: bool,
    },
    /// Compare against reference results (offline) and report mismatches.
    Parity {
        paths: Vec<PathBuf>,
        #[arg(long)]
        json: bool,
    },
}

/// A file holds either a Fixture (has an "input" key) or a bare SimInput.
fn load_input(path: &Path) -> Result<SimInput, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    let input = if value.get("input").is_some() {
        value["input"].clone()
    } else {
        value
    };
    serde_json::from_value(input).map_err(|e| format!("{}: {e}", path.display()))
}

fn load_fixture(path: &Path) -> Result<Fixture, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
}

fn expand(paths: &[PathBuf]) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for p in paths {
        if p.is_dir() {
            if let Ok(entries) = std::fs::read_dir(p) {
                out.extend(
                    entries
                        .filter_map(|e| e.ok().map(|e| e.path()))
                        .filter(|f| f.extension().is_some_and(|x| x == "json")),
                );
            }
        } else {
            out.push(p.clone());
        }
    }
    out.sort();
    out
}

fn main() -> ExitCode {
    match Cli::parse().command {
        Cmd::Run { files } => {
            let mut rows = Vec::new();
            for f in &files {
                let input = match load_input(f) {
                    Ok(i) => i,
                    Err(e) => {
                        eprintln!("{e}");
                        return ExitCode::from(2);
                    }
                };
                match simulate(&input) {
                    Ok(r) => rows.push(
                        serde_json::json!({"file": f, "metrics": r.metrics, "events": r.events}),
                    ),
                    Err(issues) => rows.push(serde_json::json!({"file": f, "validation": issues})),
                }
            }
            println!(
                "{}",
                serde_json::to_string_pretty(&rows).expect("serializable")
            );
            ExitCode::SUCCESS
        }
        Cmd::Result { file } => match load_input(&file).map(|i| simulate(&i)) {
            Ok(Ok(r)) => {
                println!("{}", serde_json::to_string(&r).expect("serializable"));
                ExitCode::SUCCESS
            }
            Ok(Err(issues)) => {
                println!("{}", serde_json::to_string(&issues).expect("serializable"));
                ExitCode::from(1)
            }
            Err(e) => {
                eprintln!("{e}");
                ExitCode::from(2)
            }
        },
        Cmd::Check { paths, json } => {
            let files = expand(&paths);
            let mut reports: Vec<FixtureReport> = files
                .par_iter()
                .map(|f| match load_fixture(f) {
                    Ok(fx) => check_fixture(&fx),
                    Err(e) => FixtureReport {
                        id: e,
                        passed: false,
                        failures: vec![],
                        validation: vec![],
                        metrics: None,
                    },
                })
                .collect();
            reports.sort_by(|a, b| a.id.cmp(&b.id));
            let failed = reports.iter().filter(|r| !r.passed).count();
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&reports).expect("serializable")
                );
            } else {
                for r in &reports {
                    if r.passed {
                        println!("PASS {}", r.id);
                    } else if !r.validation.is_empty() {
                        let codes: Vec<&str> =
                            r.validation.iter().map(|i| i.code.as_str()).collect();
                        println!("FAIL {} validation {}", r.id, codes.join(","));
                    } else if r.failures.is_empty() {
                        println!("FAIL {} unreadable", r.id);
                    } else {
                        for f in &r.failures {
                            let measured = f.measured.map_or("null".to_string(), |v| v.to_string());
                            println!(
                                "FAIL {} {} {} {} measured={}",
                                r.id, f.metric, f.op, f.expected, measured
                            );
                        }
                    }
                }
                println!("{} passed, {} failed", reports.len() - failed, failed);
            }
            if failed > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Cmd::Parity { paths, json } => {
            let files = expand(&paths);
            if files.is_empty() {
                eprintln!("no parity fixtures found");
                return ExitCode::from(1);
            }
            let mut reports: Vec<ParityReport> = files
                .par_iter()
                .map(|f| {
                    let parsed = std::fs::read_to_string(f)
                        .map_err(|e| e.to_string())
                        .and_then(|t| {
                            serde_json::from_str::<ParityFixture>(&t).map_err(|e| e.to_string())
                        });
                    match parsed {
                        Ok(fx) => check_parity(&fx),
                        Err(e) => ParityReport {
                            id: format!("{}: {e}", f.display()),
                            passed: false,
                            goal_mismatches: vec![],
                            metric_mismatches: vec![],
                            validation: vec![],
                        },
                    }
                })
                .collect();
            reports.sort_by(|a, b| a.id.cmp(&b.id));
            let failed = reports.iter().filter(|r| !r.passed).count();
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&reports).expect("serializable")
                );
            } else {
                for r in &reports {
                    if r.passed {
                        println!("PASS {}", r.id);
                        continue;
                    }
                    for g in &r.goal_mismatches {
                        println!(
                            "FAIL {} goal {} reference={} ours={} measured={:?}",
                            r.id, g.id, g.reference_passed, g.our_passed, g.measured
                        );
                    }
                    for m in &r.metric_mismatches {
                        println!(
                            "FAIL {} metric {} reference={} measured={:?} allowed=±{}",
                            r.id, m.metric, m.reference, m.measured, m.allowed
                        );
                    }
                    for v in &r.validation {
                        let at = v
                            .field
                            .as_deref()
                            .or(v.node_id.as_deref())
                            .or(v.edge_id.as_deref());
                        println!(
                            "FAIL {} issue {}{}",
                            r.id,
                            v.code,
                            at.map(|a| format!(" {a}")).unwrap_or_default()
                        );
                    }
                    if r.validation.is_empty()
                        && r.goal_mismatches.is_empty()
                        && r.metric_mismatches.is_empty()
                    {
                        println!("FAIL {} unreadable", r.id);
                    }
                }
                println!("{} passed, {} failed", reports.len() - failed, failed);
            }
            if failed > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
    }
}
