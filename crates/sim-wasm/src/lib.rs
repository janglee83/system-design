//! JS boundary. Crossed once per run: small parts (metrics, events, verdicts) as JS objects,
//! the timeline as a Float32Array, traces only on demand.

use serde::Serialize;
use sim_core::fixture::{check_fixture as core_check, Fixture};
use sim_core::{Goal, Graph, GraphLimits, SimInput, SimResult};
use wasm_bindgen::prelude::*;

fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

fn input_error(message: String) -> JsValue {
    to_js(&serde_json::json!({"kind": "input", "message": message})).unwrap_or(JsValue::NULL)
}

/// A JSON document is a Fixture (has "input") or a bare SimInput. Same rule as sim-cli.
fn parse_input_json(json: &str) -> Result<SimInput, String> {
    let value: serde_json::Value = serde_json::from_str(json).map_err(|e| e.to_string())?;
    let input = if value.get("input").is_some() {
        value["input"].clone()
    } else {
        value
    };
    serde_json::from_value(input).map_err(|e| e.to_string())
}

#[wasm_bindgen]
pub struct SimRun {
    result: SimResult,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TimelineHeader<'a> {
    frame_ms: u32,
    frames: usize,
    node_ids: &'a [String],
    fields: &'a [String],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TraceSummary<'a> {
    id: u32,
    class: &'a sim_core::RequestClass,
    outcome: &'a sim_core::TraceOutcome,
    latency_ms: f64,
}

/// `sim_core::Capabilities` as JS sees it. Kept here so sim-core needs no Serialize derive.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CapabilitiesJs<'a> {
    components: &'a [String],
    faults: &'a [sim_core::FaultKind],
    metrics: &'a [String],
    workload_params: &'a [String],
    calibration_fields: &'a [String],
    config_keys: &'a std::collections::BTreeMap<String, Vec<String>>,
    node_override_keys: &'a [String],
}

#[wasm_bindgen]
impl SimRun {
    pub fn metrics(&self) -> Result<JsValue, JsValue> {
        to_js(&self.result.metrics)
    }

    pub fn events(&self) -> Result<JsValue, JsValue> {
        to_js(&self.result.events)
    }

    #[wasm_bindgen(js_name = timelineHeader)]
    pub fn timeline_header(&self) -> Result<JsValue, JsValue> {
        let t = &self.result.timeline;
        let cell = t.node_ids.len() * t.fields.len();
        let frames = if cell == 0 { 0 } else { t.data.len() / cell };
        to_js(&TimelineHeader {
            frame_ms: t.frame_ms,
            frames,
            node_ids: &t.node_ids,
            fields: &t.fields,
        })
    }

    /// Copied into a JS-owned Float32Array, so it stays valid after free().
    #[wasm_bindgen(js_name = timelineData)]
    pub fn timeline_data(&self) -> Vec<f32> {
        self.result.timeline.data.clone()
    }

    #[wasm_bindgen(js_name = traceCount)]
    pub fn trace_count(&self) -> u32 {
        self.result.traces.len() as u32
    }

    pub fn trace(&self, index: u32) -> Result<JsValue, JsValue> {
        match self.result.traces.get(index as usize) {
            Some(t) => to_js(t),
            None => Err(JsValue::from_str("trace index out of range")),
        }
    }

    #[wasm_bindgen(js_name = traceSummaries)]
    pub fn trace_summaries(&self) -> Result<JsValue, JsValue> {
        let rows: Vec<TraceSummary> = self
            .result
            .traces
            .iter()
            .map(|t| TraceSummary {
                id: t.id,
                class: &t.class,
                outcome: &t.outcome,
                latency_ms: t.latency_ms,
            })
            .collect();
        to_js(&rows)
    }

    #[wasm_bindgen(js_name = resultJson)]
    pub fn result_json(&self) -> String {
        serde_json::to_string(&self.result).expect("serializable")
    }
}

#[wasm_bindgen]
pub fn simulate(input: JsValue) -> Result<SimRun, JsValue> {
    let input: SimInput =
        serde_wasm_bindgen::from_value(input).map_err(|e| input_error(e.to_string()))?;
    match sim_core::simulate(&input) {
        Ok(result) => Ok(SimRun { result }),
        Err(issues) => Err(to_js(
            &serde_json::json!({"kind": "validation", "issues": issues}),
        )?),
    }
}

#[wasm_bindgen(js_name = simulateJson)]
pub fn simulate_json(json: &str) -> Result<String, JsValue> {
    let input = parse_input_json(json).map_err(input_error)?;
    match sim_core::simulate(&input) {
        Ok(result) => Ok(serde_json::to_string(&result).expect("serializable")),
        Err(issues) => Ok(serde_json::to_string(&issues).expect("serializable")),
    }
}

#[wasm_bindgen(js_name = validateGraph)]
pub fn validate_graph(graph: JsValue, limits: JsValue) -> Result<JsValue, JsValue> {
    let graph: Graph =
        serde_wasm_bindgen::from_value(graph).map_err(|e| input_error(e.to_string()))?;
    let limits: Option<GraphLimits> = if limits.is_undefined() || limits.is_null() {
        None
    } else {
        Some(serde_wasm_bindgen::from_value(limits).map_err(|e| input_error(e.to_string()))?)
    };
    to_js(&sim_core::validate_graph(&graph, limits.as_ref()))
}

#[wasm_bindgen]
pub fn grade(run: &SimRun, goals: JsValue) -> Result<JsValue, JsValue> {
    let goals: Vec<Goal> =
        serde_wasm_bindgen::from_value(goals).map_err(|e| input_error(e.to_string()))?;
    to_js(&sim_core::grade(&run.result, &goals))
}

#[wasm_bindgen(js_name = listComponents)]
pub fn list_components() -> Result<JsValue, JsValue> {
    to_js(&sim_core::list_components())
}

#[wasm_bindgen(js_name = defaultCalibration)]
pub fn default_calibration() -> Result<JsValue, JsValue> {
    to_js(&sim_core::Calibration::default())
}

#[wasm_bindgen(js_name = checkFixture)]
pub fn check_fixture(json: &str) -> Result<JsValue, JsValue> {
    let fixture: Fixture = serde_json::from_str(json).map_err(|e| input_error(e.to_string()))?;
    to_js(&core_check(&fixture))
}

#[wasm_bindgen(js_name = engineVersion)]
pub fn engine_version() -> String {
    sim_core::engine_version().to_string()
}

/// What this engine build supports. The UI disables what is not built yet (fault kinds,
/// workload params) instead of letting a run fail.
#[wasm_bindgen]
pub fn capabilities() -> Result<JsValue, JsValue> {
    let c = sim_core::capabilities();
    to_js(&CapabilitiesJs {
        components: &c.components,
        faults: &c.faults,
        metrics: &c.metrics,
        workload_params: &c.workload_params,
        calibration_fields: &c.calibration_fields,
        config_keys: &c.config_keys,
        node_override_keys: &c.node_override_keys,
    })
}
