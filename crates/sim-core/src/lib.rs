#![forbid(unsafe_code)]

/// Crate version, reported by the CLI and the wasm wrapper alongside results.
pub fn engine_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    #[test]
    fn reports_version() {
        assert_eq!(super::engine_version(), "0.1.0");
    }
}
