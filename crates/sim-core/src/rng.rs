//! PCG32 (O'Neill, XSH-RR variant). The only source of randomness in the engine.
//! All math goes through libm so native and wasm builds produce identical bits.

pub struct Pcg32 {
    state: u64,
    inc: u64,
}

const MULTIPLIER: u64 = 6_364_136_223_846_793_005;
const STREAM: u64 = 0xda3e_39cb_94b9_5bdb;

impl Pcg32 {
    pub fn new(seed: u32) -> Self {
        let mut rng = Pcg32 {
            state: 0,
            inc: (STREAM << 1) | 1,
        };
        rng.next_u32();
        rng.state = rng
            .state
            .wrapping_add(u64::from(seed) ^ 0x853c_49e6_748f_ea9b);
        rng.next_u32();
        rng
    }

    pub fn next_u32(&mut self) -> u32 {
        let old = self.state;
        self.state = old.wrapping_mul(MULTIPLIER).wrapping_add(self.inc);
        let xorshifted = (((old >> 18) ^ old) >> 27) as u32;
        let rot = (old >> 59) as u32;
        xorshifted.rotate_right(rot)
    }

    /// Uniform in [0, 1).
    pub fn next_f64(&mut self) -> f64 {
        f64::from(self.next_u32()) / 4_294_967_296.0
    }

    /// Standard normal via Box-Muller.
    pub fn normal(&mut self) -> f64 {
        let u1 = 1.0 - self.next_f64(); // (0, 1], safe for log
        let u2 = self.next_f64();
        libm::sqrt(-2.0 * libm::log(u1)) * libm::cos(2.0 * core::f64::consts::PI * u2)
    }

    /// Poisson sample. Exact (Knuth) for small lambda, normal approximation above 30.
    pub fn poisson(&mut self, lambda: f64) -> f64 {
        if lambda <= 0.0 || !lambda.is_finite() {
            return 0.0;
        }
        if lambda < 30.0 {
            let limit = libm::exp(-lambda);
            let mut k = 0.0;
            let mut p = 1.0;
            loop {
                p *= self.next_f64();
                if p <= limit {
                    return k;
                }
                k += 1.0;
            }
        }
        let x = lambda + libm::sqrt(lambda) * self.normal();
        libm::round(x).max(0.0)
    }
}

#[cfg(test)]
mod tests {
    use super::Pcg32;

    #[test]
    fn same_seed_same_sequence() {
        let mut a = Pcg32::new(42);
        let mut b = Pcg32::new(42);
        for _ in 0..1000 {
            assert_eq!(a.next_u32(), b.next_u32());
        }
    }

    #[test]
    fn different_seeds_differ() {
        let mut a = Pcg32::new(1);
        let mut b = Pcg32::new(2);
        let same = (0..100).filter(|_| a.next_u32() == b.next_u32()).count();
        assert!(same < 5);
    }

    #[test]
    fn unit_floats_are_in_range() {
        let mut r = Pcg32::new(7);
        for _ in 0..10_000 {
            let x = r.next_f64();
            assert!((0.0..1.0).contains(&x));
        }
    }

    #[test]
    fn poisson_mean_matches_lambda() {
        for &(lambda, lo, hi) in &[(5.0, 4.85, 5.15), (240.0, 238.0, 242.0)] {
            let mut r = Pcg32::new(3);
            let n = 20_000;
            let sum: f64 = (0..n).map(|_| r.poisson(lambda)).sum();
            let mean = sum / n as f64;
            assert!(mean > lo && mean < hi, "lambda {lambda}: mean {mean}");
        }
    }

    #[test]
    fn poisson_handles_zero_and_negative() {
        let mut r = Pcg32::new(3);
        assert_eq!(r.poisson(0.0), 0.0);
        assert_eq!(r.poisson(-1.0), 0.0);
    }
}
