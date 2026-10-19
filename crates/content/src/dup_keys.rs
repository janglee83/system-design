//! Duplicate object keys. `serde_json::Value` and `BTreeMap` keep the last of two equal keys
//! and drop the first without a word, so a typo-by-repetition would change content silently.
//! This walks the raw text once and reports the first repeated key with its path.

use serde::de::{self, DeserializeSeed, MapAccess, SeqAccess, Visitor};
use std::cell::RefCell;
use std::collections::BTreeSet;
use std::fmt;

struct Walk<'a> {
    path: String,
    found: &'a RefCell<Option<String>>,
}

fn join(path: &str, key: &str) -> String {
    if path.is_empty() {
        key.to_string()
    } else {
        format!("{path}.{key}")
    }
}

impl<'de> DeserializeSeed<'de> for Walk<'_> {
    type Value = ();
    fn deserialize<D: de::Deserializer<'de>>(self, d: D) -> Result<(), D::Error> {
        d.deserialize_any(self)
    }
}

impl<'de> Visitor<'de> for Walk<'_> {
    type Value = ();

    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("any JSON value")
    }
    fn visit_bool<E>(self, _: bool) -> Result<(), E> {
        Ok(())
    }
    fn visit_i64<E>(self, _: i64) -> Result<(), E> {
        Ok(())
    }
    fn visit_u64<E>(self, _: u64) -> Result<(), E> {
        Ok(())
    }
    fn visit_f64<E>(self, _: f64) -> Result<(), E> {
        Ok(())
    }
    fn visit_str<E>(self, _: &str) -> Result<(), E> {
        Ok(())
    }
    fn visit_unit<E>(self) -> Result<(), E> {
        Ok(())
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<(), A::Error> {
        let mut i = 0;
        loop {
            let path = format!("{}[{i}]", self.path);
            let seed = Walk {
                path,
                found: self.found,
            };
            if seq.next_element_seed(seed)?.is_none() {
                return Ok(());
            }
            i += 1;
        }
    }
    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<(), A::Error> {
        let mut seen = BTreeSet::new();
        while let Some(key) = map.next_key::<String>()? {
            let path = join(&self.path, &key);
            if !seen.insert(key) {
                *self.found.borrow_mut() = Some(path);
                return Err(de::Error::custom("duplicate key"));
            }
            map.next_value_seed(Walk {
                path,
                found: self.found,
            })?;
        }
        Ok(())
    }
}

/// The path of the first repeated object key (`experiment.choices[0].set.cpu`), if any.
/// Syntax errors are not this function's business and give `None`.
pub(crate) fn first_duplicate_key(text: &str) -> Option<String> {
    let found = RefCell::new(None);
    let mut de = serde_json::Deserializer::from_str(text);
    let _ = Walk {
        path: String::new(),
        found: &found,
    }
    .deserialize(&mut de);
    found.into_inner()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_the_first_repeat_with_its_path() {
        assert_eq!(
            first_duplicate_key(r#"{"a": 1, "b": [{"c": 1}, {"c": 2, "c": 3}]}"#),
            Some("b[1].c".into())
        );
        assert_eq!(first_duplicate_key(r#"{"a": 1, "a": 2}"#), Some("a".into()));
        assert_eq!(
            first_duplicate_key(r#"{"a": {"a": 1}, "b": {"a": 1}}"#),
            None
        );
        assert_eq!(first_duplicate_key("{"), None);
        assert_eq!(first_duplicate_key("[1, null, true, \"x\", -1.5]"), None);
    }
}
