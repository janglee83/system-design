//! Weighted latency histogram with fixed log-scale buckets (5% wide), so percentiles are
//! deterministic and cheap. Bucket i >= 1 covers (MIN * R^(i-1), MIN * R^i].

const MIN_MS: f64 = 0.01;
const RATIO: f64 = 1.05;
const BUCKETS: usize = 400; // upper bound ~ 0.01 * 1.05^399 ≈ 2.9e6 ms

pub struct Histogram {
    counts: Vec<f64>,
    total: f64,
}

impl Default for Histogram {
    fn default() -> Self {
        Self::new()
    }
}

impl Histogram {
    pub fn new() -> Self {
        Histogram { counts: vec![0.0; BUCKETS], total: 0.0 }
    }

    fn bucket(value_ms: f64) -> usize {
        if value_ms <= MIN_MS {
            return 0;
        }
        let i = libm::ceil(libm::log(value_ms / MIN_MS) / libm::log(RATIO));
        (i as usize).min(BUCKETS - 1)
    }

    fn upper(i: usize) -> f64 {
        MIN_MS * libm::pow(RATIO, i as f64)
    }

    pub fn record(&mut self, value_ms: f64, weight: f64) {
        if !value_ms.is_finite() || !weight.is_finite() || weight <= 0.0 {
            return;
        }
        self.counts[Self::bucket(value_ms.max(0.0))] += weight;
        self.total += weight;
    }

    pub fn total(&self) -> f64 {
        self.total
    }

    pub fn percentile(&self, p: f64) -> f64 {
        let total: f64 = self.counts.iter().sum();
        if total <= 0.0 {
            return 0.0;
        }
        let target = p.clamp(0.0, 1.0) * total;
        let mut cumulative = 0.0;
        for (i, c) in self.counts.iter().enumerate() {
            cumulative += c;
            if *c > 0.0 && cumulative >= target {
                return Self::upper(i);
            }
        }
        Self::upper(BUCKETS - 1)
    }
}

#[cfg(test)]
mod tests {
    use super::Histogram;

    fn close(actual: f64, expected: f64) -> bool {
        (actual - expected).abs() <= expected * 0.051
    }

    #[test]
    fn empty_histogram_returns_zero() {
        let h = Histogram::new();
        assert_eq!(h.percentile(0.95), 0.0);
        assert_eq!(h.total(), 0.0);
    }

    #[test]
    fn uniform_values_give_expected_percentiles() {
        let mut h = Histogram::new();
        for v in 1..=100 {
            h.record(f64::from(v), 1.0);
        }
        assert!(close(h.percentile(0.50), 50.0), "{}", h.percentile(0.50));
        assert!(close(h.percentile(0.95), 95.0), "{}", h.percentile(0.95));
        assert!(close(h.percentile(0.99), 99.0), "{}", h.percentile(0.99));
    }

    #[test]
    fn weights_are_respected() {
        let mut h = Histogram::new();
        h.record(10.0, 99.0);
        h.record(1000.0, 1.0);
        assert!(close(h.percentile(0.95), 10.0));
        assert!(close(h.percentile(1.0), 1000.0));
    }

    #[test]
    fn ignores_bad_samples() {
        let mut h = Histogram::new();
        h.record(f64::NAN, 1.0);
        h.record(5.0, 0.0);
        h.record(5.0, -1.0);
        h.record(f64::INFINITY, 1.0);
        assert_eq!(h.total(), 0.0);
    }

    #[test]
    fn huge_and_tiny_values_are_clamped_into_range() {
        let mut h = Histogram::new();
        h.record(0.0, 1.0);
        h.record(1e12, 1.0);
        assert!(h.percentile(0.0) > 0.0);
        assert!(h.percentile(1.0).is_finite());
    }

    #[test]
    fn fractional_weights_reach_the_last_bucket_at_p100() {
        let mut h = Histogram::new();
        for k in 0..1000 {
            let value = (k % 50 + 1) as f64;
            let weight = 0.1 + (k % 7) as f64 * 0.013;
            h.record(value, weight);
        }
        let p100 = h.percentile(1.0);
        assert!(close(p100, 50.0), "p100={}, expected ~50.0", p100);
    }
}
