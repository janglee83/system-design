//! Id patterns (spec §2, ruling R7). Plain byte checks, no regex dependency.

fn slug(s: &str, min: usize, max: usize) -> bool {
    (min..=max).contains(&s.len())
        && s.bytes()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}

/// `^l[0-6]-[a-z0-9-]{2,60}$`
pub fn is_lesson_id(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() > 3
        && b[0] == b'l'
        && (b'0'..=b'6').contains(&b[1])
        && b[2] == b'-'
        && slug(&s[3..], 2, 60)
}

/// `^c-l[0-6]-[a-z0-9-]{2,60}$`
pub fn is_challenge_id(s: &str) -> bool {
    s.strip_prefix("c-").is_some_and(is_lesson_id)
}

/// The level digit of a lesson or challenge id.
pub fn level_digit(s: &str) -> Option<char> {
    s.strip_prefix("c-").unwrap_or(s).chars().nth(1)
}

/// `A`..`F`
pub fn is_choice_id(s: &str) -> bool {
    s.len() == 1 && (b'A'..=b'F').contains(&s.as_bytes()[0])
}

/// `^<prefix>[0-9]+$`, for `M1`, `q1`, `h1`.
pub fn numbered(s: &str, prefix: char) -> bool {
    s.strip_prefix(prefix)
        .is_some_and(|d| !d.is_empty() && d.bytes().all(|c| c.is_ascii_digit()))
}

/// `^[a-z]$`
pub fn is_option_id(s: &str) -> bool {
    s.len() == 1 && s.as_bytes()[0].is_ascii_lowercase()
}

/// `^[a-z0-9-]{2,40}$`
pub fn is_mode_id(s: &str) -> bool {
    slug(s, 2, 40)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn patterns() {
        assert!(is_lesson_id("l0-client-server"));
        assert!(!is_lesson_id("l7-x1"));
        assert!(!is_lesson_id("l0-x"));
        assert!(!is_lesson_id("l0-Upper"));
        assert!(is_challenge_id("c-l0-first-launch"));
        assert!(!is_challenge_id("l0-first-launch"));
        assert_eq!(level_digit("c-l3-x1"), Some('3'));
        assert!(is_choice_id("F") && !is_choice_id("G") && !is_choice_id("a"));
        assert!(numbered("M12", 'M') && !numbered("M", 'M') && !numbered("Mx", 'M'));
        assert!(is_mode_id("tight-budget") && !is_mode_id("x"));
    }
}
