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
    /// Validate lessons and challenges, or regenerate the curriculum.
    Content {
        #[command(subcommand)]
        cmd: ContentCmd,
    },
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

#[derive(Subcommand)]
enum ContentCmd {
    /// Validate every lesson and challenge in a content directory on the engine.
    Validate {
        dir: PathBuf,
        #[arg(long)]
        json: bool,
    },
    /// Write <dir>/curriculum.json; with --check, fail if the committed file is out of date.
    Curriculum {
        dir: PathBuf,
        #[arg(long)]
        check: bool,
        /// Print the validation report as JSON when blocking issues refuse the build.
        #[arg(long)]
        json: bool,
    },
}

fn print_report(r: &content::Report, json: bool) {
    if json {
        println!("{}", serde_json::to_string_pretty(r).expect("serializable"));
    } else {
        print!("{}", r.to_text());
    }
}

/// Exit codes: 0 no blocking issue, 1 any blocking issue, 2 unusable directory.
fn content_cmd(cmd: ContentCmd) -> ExitCode {
    match cmd {
        ContentCmd::Validate { dir, json } => match content::validate_dir(&dir) {
            Err(e) => {
                eprintln!("{e}");
                ExitCode::from(2)
            }
            Ok(r) => {
                print_report(&r, json);
                if r.has_blocking() {
                    ExitCode::from(1)
                } else {
                    ExitCode::SUCCESS
                }
            }
        },
        ContentCmd::Curriculum { dir, check, json } => {
            let tree = match content::load_dir(&dir) {
                Ok(t) => t,
                Err(e) => {
                    eprintln!("{e}");
                    return ExitCode::from(2);
                }
            };
            let text = match content::curriculum_json(&tree) {
                Ok(t) => t,
                Err(report) => {
                    print_report(&report, json);
                    return ExitCode::from(1);
                }
            };
            let target = dir.join("curriculum.json");
            if check {
                // A missing file is stale (exit 1); any other read failure is an unusable
                // directory (exit 2). The comparison is byte-exact, so CRLF is stale too.
                let committed = match std::fs::read(&target) {
                    Ok(bytes) => Some(bytes),
                    Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
                    Err(e) => {
                        eprintln!("{}: {e}", target.display());
                        return ExitCode::from(2);
                    }
                };
                if committed.as_deref() == Some(text.as_bytes()) {
                    println!("curriculum.json is up to date");
                    ExitCode::SUCCESS
                } else {
                    eprintln!(
                        "curriculum.json is STALE: run sim-cli content curriculum {}",
                        dir.display()
                    );
                    ExitCode::from(1)
                }
            } else {
                // Write next to the target, then rename: a reader never sees a half-written file.
                let tmp = dir.join(".curriculum.json.tmp");
                let written =
                    std::fs::write(&tmp, &text).and_then(|()| std::fs::rename(&tmp, &target));
                if written.is_err() {
                    let _ = std::fs::remove_file(&tmp);
                }
                match written {
                    Ok(()) => {
                        println!("wrote {}", target.display());
                        ExitCode::SUCCESS
                    }
                    Err(e) => {
                        eprintln!("{}: {e}", target.display());
                        ExitCode::from(2)
                    }
                }
            }
        }
    }
}

fn main() -> ExitCode {
    match Cli::parse().command {
        Cmd::Content { cmd } => content_cmd(cmd),
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
