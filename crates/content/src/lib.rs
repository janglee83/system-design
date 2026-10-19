//! Content format (lessons, challenges, levels) and its validator. See
//! docs/superpowers/specs/2026-10-20-content-format-design.md.

pub mod issue;
pub use issue::{codes, ContentIssue};

pub mod types;
pub use types::*;
