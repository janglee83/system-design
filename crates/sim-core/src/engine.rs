//! Fixed-tick fluid queueing model. Read the "Model summary" in the plan before changing it.

use crate::calibration::*;
use crate::components::{self, effective_capacity, effective_cost, Capacity, Role};
use crate::faults::FaultQueue;
use crate::histogram::Histogram;
use crate::rng::Pcg32;
use crate::types::*;
use std::collections::{BTreeMap, BTreeSet};

pub(crate) struct NodeRt {
    pub id: String,
    #[allow(dead_code)] // Read by fault handling (Task 7).
    pub kind: String,
    pub role: Role,
    pub is_entry: bool,
    pub cap: Capacity,
    pub cost: f64,
    pub instances_total: u32,
    pub instances_up: u32,
    /// Databases only: false while the primary is lost (writes fail).
    pub primary_up: bool,
    /// Databases only: when a replica will be promoted after losing the primary.
    pub promote_at_ms: Option<f64>,
    pub children: Vec<(usize, EdgeKind)>,
    pub queue: f64,
    // Forward pass, reset every tick.
    pub in_read: f64,
    pub in_write: f64,
    pub served_read: f64,
    pub served_write: f64,
    pub rejected: f64,
    pub busy: f64,
    pub wait_ms: f64,
    pub lat_ms: f64,
    pub fail_reject_r: f64,
    pub fail_reject_w: f64,
    pub fail_down_r: f64,
    pub fail_down_w: f64,
    // Reverse pass, recomputed every tick.
    pub ok_r: f64,
    pub ok_w: f64,
    pub okd_r: f64,
    pub okd_w: f64,
    pub path_lat_ms: f64,
    overload_reported: bool,
}

impl NodeRt {
    fn new(n: &Node, cal: &Calibration) -> NodeRt {
        let model = components::get(&n.kind).expect("graph was validated");
        let meta = model.meta();
        let instances = model.instances(n);
        NodeRt {
            id: n.id.clone(),
            kind: n.kind.clone(),
            role: meta.role,
            is_entry: meta.is_entry,
            cap: effective_capacity(model, n, cal),
            cost: effective_cost(model, n, cal),
            instances_total: instances,
            instances_up: instances,
            primary_up: true,
            promote_at_ms: None,
            children: Vec::new(),
            queue: 0.0,
            in_read: 0.0,
            in_write: 0.0,
            served_read: 0.0,
            served_write: 0.0,
            rejected: 0.0,
            busy: 0.0,
            wait_ms: 0.0,
            lat_ms: 0.0,
            fail_reject_r: 0.0,
            fail_reject_w: 0.0,
            fail_down_r: 0.0,
            fail_down_w: 0.0,
            ok_r: 0.0,
            ok_w: 0.0,
            okd_r: 0.0,
            okd_w: 0.0,
            path_lat_ms: 0.0,
            overload_reported: false,
        }
    }
}

#[derive(Default)]
struct Totals {
    total: f64,
    ok: f64,
    rejected: f64,
    timed_out: f64,
    unreachable: f64,
}

pub(crate) struct Engine<'a> {
    pub input: &'a SimInput,
    /// Resolved world parameters (defaults + input.calibration).
    pub(crate) cal: Calibration,
    pub nodes: Vec<NodeRt>,
    pub events: Vec<SimEvent>,
    /// Multiplies client traffic; faults such as traffic-surge-3x change it.
    pub rate_multiplier: f64,
    pub now_ms: f64,
    pub(crate) fault_queue: FaultQueue,
    pub(crate) fault_rng: Pcg32,
    pub(crate) trace_rng: Pcg32,
    pub(crate) traces: Vec<Trace>,
    trace_every: u32,
    order: Vec<usize>,
    clients: Vec<usize>,
    ticks: u32,
    traffic_rng: Pcg32,
    hist: Histogram,
    totals: Totals,
    timeline: Vec<f32>,
    peak_busy: f64,
    peak_db_connections: f64,
}

/// Kahn's algorithm; ties broken by index (= node id order) for determinism.
fn topo_order(nodes: &[NodeRt]) -> Vec<usize> {
    let mut indeg = vec![0usize; nodes.len()];
    for n in nodes {
        for &(c, _) in &n.children {
            indeg[c] += 1;
        }
    }
    let mut ready: BTreeSet<usize> = (0..nodes.len()).filter(|&i| indeg[i] == 0).collect();
    let mut order = Vec::with_capacity(nodes.len());
    while let Some(i) = ready.pop_first() {
        order.push(i);
        for &(c, _) in &nodes[i].children {
            indeg[c] -= 1;
            if indeg[c] == 0 {
                ready.insert(c);
            }
        }
    }
    order
}

impl<'a> Engine<'a> {
    pub fn new(input: &'a SimInput) -> Self {
        let mut sorted: Vec<&Node> = input.graph.nodes.iter().collect();
        sorted.sort_by(|a, b| a.id.cmp(&b.id));
        let index: BTreeMap<&str, usize> =
            sorted.iter().enumerate().map(|(i, n)| (n.id.as_str(), i)).collect();
        let cal = Calibration::resolve(input.calibration.as_ref());
        let mut nodes: Vec<NodeRt> = sorted.iter().map(|n| NodeRt::new(n, &cal)).collect();

        let mut edges: Vec<&Edge> = input.graph.edges.iter().collect();
        edges.sort_by(|a, b| (&a.from, &a.to, &a.id).cmp(&(&b.from, &b.to, &b.id)));
        for e in edges {
            let (from, to) = (index[e.from.as_str()], index[e.to.as_str()]);
            nodes[from].children.push((to, e.kind));
        }

        let order = topo_order(&nodes);
        let clients = (0..nodes.len()).filter(|&i| nodes[i].role == Role::Client).collect();
        let ticks = (libm::ceil(f64::from(input.duration_ms) / TICK_MS) as u32).max(1);

        Engine {
            input,
            cal,
            nodes,
            events: Vec::new(),
            rate_multiplier: 1.0,
            now_ms: 0.0,
            fault_queue: FaultQueue::new(&input.faults),
            fault_rng: Pcg32::new(input.seed ^ 0x5bd1_e995),
            trace_rng: Pcg32::new(input.seed ^ 0x9e37_79b9),
            traces: Vec::new(),
            trace_every: (ticks / TRACE_TARGET).max(1),
            order,
            clients,
            ticks,
            traffic_rng: Pcg32::new(input.seed),
            hist: Histogram::new(),
            totals: Totals::default(),
            timeline: Vec::new(),
            peak_busy: 0.0,
            peak_db_connections: 0.0,
        }
    }

    pub(crate) fn clients_slice(&self) -> &[usize] {
        &self.clients
    }

    pub fn timeout_ms(&self) -> f64 {
        let t = self.input.workload.client_timeout_ms;
        if t.is_finite() && t > 0.0 { t } else { 1000.0 }
    }

    fn write_ratio(&self) -> f64 {
        let w = self.input.workload.write_ratio;
        if w.is_finite() { w.clamp(0.0, 1.0) } else { 0.2 }
    }

    fn rate_at(&self, t_ms: f64) -> f64 {
        let w = &self.input.workload;
        let mut rate = w.base_rps.max(0.0);
        if let Some(s) = &w.surge {
            let start = f64::from(s.at_ms);
            if t_ms >= start && t_ms < start + f64::from(s.duration_ms) {
                rate *= s.factor.max(0.0);
            }
        }
        rate * self.rate_multiplier
    }

    pub fn run(&mut self) {
        for k in 0..self.ticks {
            self.now_ms = f64::from(k) * TICK_MS;
            self.tick();
            if k % self.trace_every == 0 {
                self.sample_trace();
            }
            if (k + 1) % FRAME_EVERY_TICKS == 0 || k + 1 == self.ticks {
                self.record_frame();
            }
        }
    }

    fn tick(&mut self) {
        self.apply_due_faults();
        let timeout_s = self.timeout_ms() / 1000.0;
        let lambda = self.rate_at(self.now_ms) * TICK_MS / 1000.0;
        let generated = self.traffic_rng.poisson(lambda);
        let write_ratio = self.write_ratio();

        for n in &mut self.nodes {
            n.in_read = 0.0;
            n.in_write = 0.0;
        }
        let share = generated / self.clients.len() as f64;
        for &c in &self.clients {
            self.nodes[c].in_write = share * write_ratio;
            self.nodes[c].in_read = share * (1.0 - write_ratio);
        }

        for k in 0..self.order.len() {
            let i = self.order[k];
            self.serve(i, timeout_s);
            self.forward(i);
        }
        self.track_peaks();
        for k in (0..self.order.len()).rev() {
            let i = self.order[k];
            self.resolve(i);
        }
        self.book_clients();
    }

    /// Where node i sends traffic this tick. Balancers skip children with nothing up;
    /// databases are terminal.
    pub fn targets(&self, i: usize) -> Vec<(usize, EdgeKind)> {
        let n = &self.nodes[i];
        match n.role {
            Role::Database => Vec::new(),
            Role::Balancer => n
                .children
                .iter()
                .copied()
                .filter(|&(c, _)| self.nodes[c].instances_up > 0)
                .collect(),
            Role::Client | Role::Service => n.children.clone(),
        }
    }

    fn serve(&mut self, i: usize, timeout_s: f64) {
        let now = self.now_ms;
        let max_util = self.cal.max_utilization_for_latency;
        let n = &mut self.nodes[i];
        n.served_read = 0.0;
        n.served_write = 0.0;
        n.rejected = 0.0;
        n.busy = 0.0;
        n.wait_ms = 0.0;
        n.lat_ms = 0.0;
        n.fail_reject_r = 0.0;
        n.fail_reject_w = 0.0;
        n.fail_down_r = 0.0;
        n.fail_down_w = 0.0;

        if n.role == Role::Client {
            n.served_read = n.in_read;
            n.served_write = n.in_write;
            return;
        }
        if n.instances_up == 0 {
            n.fail_down_r = 1.0;
            n.fail_down_w = 1.0;
            n.queue = 0.0;
            return;
        }

        let writes_down = n.role == Role::Database && !n.primary_up;
        if writes_down {
            n.fail_down_w = 1.0;
        }
        let in_write = if writes_down { 0.0 } else { n.in_write };
        let arriving = n.in_read + in_write;

        let instances = f64::from(n.instances_up);
        let cap_rps = n.cap.rps * instances;
        let per_tick = cap_rps * TICK_MS / 1000.0;
        let queue_limit = (n.cap.max_queue * instances).min(cap_rps * timeout_s);

        let total = n.queue + arriving;
        let served = total.min(per_tick);
        let remaining = total - served;
        let rejected = (remaining - queue_limit).max(0.0);
        n.queue = remaining - rejected;
        n.rejected = rejected;
        n.busy = if per_tick > 0.0 { served / per_tick } else { 0.0 };

        let rho = if per_tick > 0.0 { (arriving / per_tick).min(max_util) } else { max_util };
        n.wait_ms = if cap_rps > 0.0 { n.queue / cap_rps * 1000.0 } else { 0.0 };
        n.lat_ms = n.cap.service_ms / (1.0 - rho) + n.wait_ms;

        // Overflow rejects newly arriving requests (queued ones were already admitted), so the
        // fraction is taken over arrivals, not queue + arrivals. Capped at 1 in case the queue
        // limit shrank (instances lost) and also dropped previously queued work.
        let reject_frac = if arriving > 0.0 { (rejected / arriving).min(1.0) } else { 0.0 };
        n.fail_reject_r = reject_frac;
        n.fail_reject_w = if writes_down { 0.0 } else { reject_frac };

        let read_share = if arriving > 0.0 { n.in_read / arriving } else { 1.0 };
        n.served_read = served * read_share;
        n.served_write = served - n.served_read;

        if rejected > 0.0 && !n.overload_reported {
            n.overload_reported = true;
            let mut params = BTreeMap::new();
            params.insert("busy".to_string(), n.busy);
            self.events.push(SimEvent {
                at_ms: now as u32,
                node: Some(n.id.clone()),
                code: "node.overloaded".into(),
                params,
            });
        }
    }

    fn forward(&mut self, i: usize) {
        let targets = self.targets(i);
        if targets.is_empty() {
            return;
        }
        let w = 1.0 / targets.len() as f64;
        let read = self.nodes[i].served_read * w;
        let write = self.nodes[i].served_write * w;
        for (c, _) in targets {
            self.nodes[c].in_read += read;
            self.nodes[c].in_write += write;
        }
    }

    fn track_peaks(&mut self) {
        for n in &self.nodes {
            if n.role == Role::Client {
                continue;
            }
            self.peak_busy = self.peak_busy.max(n.busy);
            if n.role == Role::Database {
                let conns = (n.served_read + n.served_write) * n.lat_ms / TICK_MS + n.queue;
                self.peak_db_connections = self.peak_db_connections.max(conns);
            }
        }
    }

    fn resolve(&mut self, i: usize) {
        let targets = self.targets(i);
        let role = self.nodes[i].role;
        let (cr, cw, cdr, cdw, clat) = if targets.is_empty() {
            match role {
                // Nowhere to send the request: it cannot complete.
                Role::Client | Role::Balancer => (0.0, 0.0, 0.0, 0.0, 0.0),
                // Services without downstream and databases answer by themselves.
                Role::Service | Role::Database => (1.0, 1.0, 1.0, 1.0, 0.0),
            }
        } else {
            let w = 1.0 / targets.len() as f64;
            let mut acc = (0.0, 0.0, 0.0, 0.0, 0.0);
            for (c, kind) in targets {
                let ch = &self.nodes[c];
                acc.0 += w * ch.ok_r;
                acc.1 += w * ch.ok_w;
                acc.2 += w * ch.okd_r;
                acc.3 += w * ch.okd_w;
                acc.4 += w * (self.cal.edge_delay_ms(kind) + ch.path_lat_ms);
            }
            acc
        };
        let n = &mut self.nodes[i];
        n.ok_r = (1.0 - n.fail_down_r) * (1.0 - n.fail_reject_r) * cr;
        n.ok_w = (1.0 - n.fail_down_w) * (1.0 - n.fail_reject_w) * cw;
        n.okd_r = (1.0 - n.fail_down_r) * cdr;
        n.okd_w = (1.0 - n.fail_down_w) * cdw;
        n.path_lat_ms = n.lat_ms + clat;
    }

    fn book_clients(&mut self) {
        let timeout = self.timeout_ms();
        for &c in &self.clients {
            let n = &self.nodes[c];
            let (gr, gw) = (n.in_read, n.in_write);
            let generated = gr + gw;
            if generated <= 0.0 {
                continue;
            }
            let unreachable = gr * (1.0 - n.okd_r) + gw * (1.0 - n.okd_w);
            let rejected = gr * (n.okd_r - n.ok_r) + gw * (n.okd_w - n.ok_w);
            // Computed as the remainder so the four buckets always add up to the total.
            let good = generated - unreachable - rejected;
            self.totals.total += generated;
            self.totals.unreachable += unreachable;
            self.totals.rejected += rejected;
            if n.path_lat_ms > timeout {
                self.totals.timed_out += good;
                self.hist.record(timeout, good);
            } else {
                self.totals.ok += good;
                self.hist.record(n.path_lat_ms, good);
            }
        }
    }

    fn record_frame(&mut self) {
        for n in &self.nodes {
            let in_flight = (n.served_read + n.served_write) * n.lat_ms / TICK_MS + n.queue;
            let up = if n.instances_up > 0 { 1.0 } else { 0.0 };
            self.timeline
                .extend_from_slice(&[in_flight as f32, n.queue as f32, n.busy as f32, n.rejected as f32, up]);
        }
    }

    fn reachable(&self) -> BTreeSet<usize> {
        let mut seen: BTreeSet<usize> = self.clients.iter().copied().collect();
        let mut stack: Vec<usize> = self.clients.clone();
        while let Some(i) = stack.pop() {
            for &(c, _) in &self.nodes[i].children {
                if seen.insert(c) {
                    stack.push(c);
                }
            }
        }
        seen
    }

    pub fn finish(self) -> SimResult {
        let t = &self.totals;
        let duration_s = f64::from(self.input.duration_ms.max(1)) / 1000.0;
        let spof_count = self
            .reachable()
            .into_iter()
            .filter(|&i| self.nodes[i].role != Role::Client && self.nodes[i].instances_total == 1)
            .count() as u32;
        let exposed_backends = self
            .clients
            .iter()
            .flat_map(|&c| self.nodes[c].children.iter())
            .filter(|&&(target, _)| !self.nodes[target].is_entry)
            .count() as u32;
        let cost_per_month = self.nodes.iter().map(|n| n.cost).sum();

        let metrics = Metrics {
            p50: self.hist.percentile(0.50),
            p95: self.hist.percentile(0.95),
            p99: self.hist.percentile(0.99),
            availability: if t.total > 0.0 { t.ok / t.total } else { 1.0 },
            throughput_rps: t.ok / duration_s,
            cost_per_month,
            spof_count,
            exposed_backends,
            peak_busy: self.peak_busy,
            peak_db_connections: self.peak_db_connections,
            cache_ops: 0.0,
            requests_total: t.total,
            requests_ok: t.ok,
            requests_rejected: t.rejected,
            requests_timed_out: t.timed_out,
            requests_unreachable: t.unreachable,
            ..Metrics::default()
        };

        SimResult {
            engine_version: crate::engine_version().to_string(),
            metrics,
            timeline: Timeline {
                frame_ms: (TICK_MS as u32) * FRAME_EVERY_TICKS,
                node_ids: self.nodes.iter().map(|n| n.id.clone()).collect(),
                fields: TIMELINE_FIELDS.iter().map(|s| s.to_string()).collect(),
                data: self.timeline,
            },
            traces: self.traces,
            events: self.events,
        }
    }
}
