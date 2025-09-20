/* =============================================================================
   Ethics Testbed — UI glue for interactive pages (ESM)
   Safe to include on ALL pages:
   - It only initializes when a mount node exists:
       <div id="interactive-root"></div>
       or any element with [data-interactive-root]
   - On non-interactive pages (e.g., contact.html) it quietly no-ops.
   - On interactive pages it:
       • loads /src/data/scenarios.json (with path fallbacks)
       • binds controls for credences, virtue, and promise gates
       • normalizes credences live
       • renders admissibility, module scores, aggregate ranking, explanations
   ============================================================================= */

"use strict";

import { evaluateScenario } from "../engine/core.js";

/* ------------------------------ DOM Helpers ------------------------------ */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const val = el => (el?.type === "checkbox" ? !!el.checked : Number.isNaN(+el?.value) ? el?.value : +el.value);
const setVal = (el, v) => {
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!v; else el.value = v;
};
const fmt = n => (typeof n === "number" ? (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(3)).replace(/\.?0+$/,"") : String(n));

/* ------------------------------ State Model ------------------------------ */
const State = {
  scenarios: [],
  selectedScenarioId: null,
  settings: {
    credences: { p_cons: 0.5, p_rawls: 0.25, p_virtue: 0.25 },
    virtueWeights: { honesty: 1, compassion: 1, fairness: 1 },
    promise: { enabled: true, theta_lives: 1.5 }
  }
};

/* ------------------------------ Data Loading ----------------------------- */
async function fetchJSON(paths) {
  for (const p of paths) {
    try {
      const r = await fetch(p, { cache: "no-store" });
      if (r.ok) return await r.json();
    } catch { /* try next path */ }
  }
  throw new Error("Could not load scenarios.json from provided paths.");
}

async function loadScenarios() {
  // Primary: new structure; Fallback: legacy root/data
  const data = await fetchJSON([
    "/src/data/scenarios.json",
    "/data/scenarios.json",
    "./src/data/scenarios.json",
    "./data/scenarios.json"
  ]);
  if (!Array.isArray(data)) throw new Error("scenarios.json must be an array");

  // Ensure IDs exist for the three seed scenarios; keep original order
  const have = new Set(data.map(d => d.id));
  ["triage-vent-v1", "evac-promise-v1", "vax-allocation-v1"].forEach(id => {
    if (!have.has(id)) console.warn(`[interactive] Expected scenario missing: ${id}`);
  });

  State.scenarios = data;
  // Default selection: hash ?id=... or first
  const url = new URL(window.location.href);
  State.selectedScenarioId =
    url.searchParams.get("id") ||
    data.find(s => s.id === "triage-vent-v1")?.id ||
    data[0]?.id;

  return data;
}

/* ------------------------------ UI Bindings ------------------------------ */
// Supported controls (all optional):
// - Scenario chooser:   <select data-scn-select> … </select>
// - Credences sliders:  <input data-credence="p_cons">, p_rawls, p_virtue
// - Virtue weights:     <input data-virtue="honesty|compassion|fairness">
// - Promise toggle:     <input type="checkbox" data-promise="enabled">
// - Promise theta:      <input data-promise="theta_lives">
// - Evaluate button:    <button data-evaluate>
// - Reset button:       <button data-reset>
// Render targets (all optional):
// - Aggregate chart:    <div data-chart="aggregate"></div>
// - Ranking list:       <ol id="ranking-list"></ol>
// - Module tables:      <div id="module-cons"></div>, -rawls, -virtue
// - Admissibility:      <ul id="admissibility-list"></ul>
// - Explanations:       <div id="explanations"></div>
// - Scenario label:     <span data-scn-label></span>

function populateScenarioSelect() {
  const sel = $("[data-scn-select]");
  if (!sel) return;

  // Clear and populate options
  sel.innerHTML = "";
  for (const scn of State.scenarios) {
    const opt = document.createElement("option");
    opt.value = scn.id;
    opt.textContent = scn.title || scn.id;
    if (scn.id === State.selectedScenarioId) opt.selected = true;
    sel.appendChild(opt);
  }
  on(sel, "change", () => {
    State.selectedScenarioId = sel.value;
    renderScenarioLabel();
    evaluateAndRender();
    updateURLParam("id", sel.value);
  });
}

function renderScenarioLabel() {
  const label = $("[data-scn-label]");
  if (!label) return;
  const scn = getSelectedScenario();
  label.textContent = scn?.title || scn?.id || "—";
}

function bindControls() {
  // Credences — normalize live to sum=1
  const credInputs = $$("[data-credence]");
  credInputs.forEach(inp => {
    on(inp, "input", () => {
      applyCredencesFromUI();
      normalizeCredences();
      reflectCredencesToUI();
      evaluateAndRender();
    });
  });

  // Virtue weights
  const virtueInputs = $$("[data-virtue]");
  virtueInputs.forEach(inp => {
    on(inp, "input", () => {
      applyVirtuesFromUI();
      evaluateAndRender();
    });
  });

  // Promise gate controls
  const promEnabled = $("[data-promise='enabled']");
  const promTheta   = $("[data-promise='theta_lives']");
  on(promEnabled, "change", () => {
    State.settings.promise.enabled = !!promEnabled.checked;
    evaluateAndRender();
  });
  on(promTheta, "input", () => {
    const t = +promTheta.value;
    if (!Number.isNaN(t)) State.settings.promise.theta_lives = t;
    evaluateAndRender();
  });

  // Evaluate / Reset
  const evalBtn = $("[data-evaluate]");
  const resetBtn = $("[data-reset]");
  on(evalBtn, "click", evaluateAndRender);
  on(resetBtn, "click", resetAllToDefaults);
}

function applyCredencesFromUI() {
  $$("[data-credence]").forEach(inp => {
    const k = inp.getAttribute("data-credence");
    const v = +inp.value;
    if (!Number.isNaN(v) && k in State.settings.credences) {
      State.settings.credences[k] = Math.max(0, v);
    }
  });
}

function reflectCredencesToUI() {
  $$("[data-credence]").forEach(inp => {
    const k = inp.getAttribute("data-credence");
    if (k in State.settings.credences) {
      setVal(inp, +State.settings.credences[k]);
      // Optional live % label: data-outlet="#id"
      const outSel = inp.getAttribute("data-outlet");
      if (outSel) {
        const out = $(outSel);
        if (out) out.textContent = fmt(State.settings.credences[k]);
      }
    }
  });
}

function normalizeCredences() {
  const c = State.settings.credences;
  const s = (c.p_cons + c.p_rawls + c.p_virtue) || 1;
  c.p_cons   = c.p_cons   / s;
  c.p_rawls  = c.p_rawls  / s;
  c.p_virtue = c.p_virtue / s;
}

function applyVirtuesFromUI() {
  $$("[data-virtue]").forEach(inp => {
    const k = inp.getAttribute("data-virtue");
    const v = +inp.value;
    if (!Number.isNaN(v) && k in State.settings.virtueWeights) {
      State.settings.virtueWeights[k] = Math.max(0, v);
    }
  });
}

function reflectVirtuesToUI() {
  $$("[data-virtue]").forEach(inp => {
    const k = inp.getAttribute("data-virtue");
    if (k in State.settings.virtueWeights) {
      setVal(inp, +State.settings.virtueWeights[k]);
      const outSel = inp.getAttribute("data-outlet");
      if (outSel) {
        const out = $(outSel);
        if (out) out.textContent = fmt(State.settings.virtueWeights[k]);
      }
    }
  });
}

function reflectPromiseToUI() {
  const promEnabled = $("[data-promise='enabled']");
  const promTheta   = $("[data-promise='theta_lives']");
  setVal(promEnabled, !!State.settings.promise.enabled);
  setVal(promTheta, State.settings.promise.theta_lives);
}

/* ------------------------------ Rendering ------------------------------- */
function getSelectedScenario() {
  return State.scenarios.find(s => s.id === State.selectedScenarioId);
}

function evaluateAndRender() {
  const scn = getSelectedScenario();
  if (!scn) return;

  const res = evaluateScenario(scn, State.settings);

  renderAggregateChart(res);
  renderRanking(res, scn);
  renderModuleTable("#module-cons",  "Consequentialism (normalized over A*)", res.consNorm, scn);
  renderModuleTable("#module-rawls", "Rawls (normalized over A*)",            res.rawlsNorm, scn);
  renderModuleTable("#module-virtue","Virtue (normalized over A*)",           res.virtueNorm, scn);
  renderAdmissibility(res, scn);
  renderExplanations(res);
}

function renderAggregateChart(res) {
  const host = $('[data-chart="aggregate"]');
  if (!host) return;

  host.innerHTML = "";
  host.classList.add("agg-chart");

  const entries = [...res.aggregate.entries()].sort((a,b)=>b[1]-a[1]);
  const maxVal = entries.reduce((m, [,v]) => Math.max(m, v), 0) || 1;

  for (const [actionId, score] of entries) {
    const bar = document.createElement("div");
    bar.className = "bar-row";
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = actionLabel(actionId);
    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = fmt(score);

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(score / maxVal) * 100}%`;
    track.appendChild(fill);

    bar.appendChild(label);
    bar.appendChild(track);
    bar.appendChild(value);
    host.appendChild(bar);
  }
}

function renderRanking(res, scn) {
  const list = $("#ranking-list");
  if (!list) return;
  list.innerHTML = "";

  for (const [actionId, score] of res.ranking) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${actionLabel(actionId)}</strong> — ${fmt(score)}`;
    li.title = [
      `Cons=${fmt(res.consNorm.get(actionId) ?? NaN)}`,
      `Rawls=${fmt(res.rawlsNorm.get(actionId) ?? NaN)}`,
      `Virtue=${fmt(res.virtueNorm.get(actionId) ?? NaN)}`
    ].join(" | ");
    list.appendChild(li);
  }
}

function renderModuleTable(sel, title, map, scn) {
  const host = $(sel);
  if (!host) return;
  const rows = [...map.entries()].sort((a,b)=>b[1]-a[1]);

  const table = document.createElement("table");
  table.className = "module-table";
  table.innerHTML = `
    <caption>${title}</caption>
    <thead><tr><th>Action</th><th>Score</th></tr></thead>
    <tbody></tbody>
  `;
  const tb = $("tbody", table);
  rows.forEach(([a, v]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${actionLabel(a)}</td><td>${fmt(v)}</td>`;
    tb.appendChild(tr);
  });
  host.innerHTML = "";
  host.appendChild(table);
}

function renderAdmissibility(res, scn) {
  const ul = $("#admissibility-list");
  if (!ul) return;
  ul.innerHTML = "";

  for (const [a, info] of res.admissibility.entries()) {
    const li = document.createElement("li");
    const status = info.admissible ? "admissible ✅" : "blocked 🚫";
    const reasons = (info.reasons || []).join("; ");
    li.textContent = `${actionLabel(a)} — ${status}${reasons ? ` (${reasons})` : ""}`;
    ul.appendChild(li);
  }
}

function renderExplanations(res) {
  const box = $("#explanations");
  if (!box) return;
  box.innerHTML = "";
  res.explanations.forEach(e => {
    const p = document.createElement("p");
    p.textContent = e;
    box.appendChild(p);
  });
}

/* ------------------------------ Actions/Labels --------------------------- */
function actionLabel(actionId) {
  const map = {
    // triage
    a1_allocate_A: "Allocate ventilator to A",
    a2_allocate_B: "Allocate ventilator to B",
    a3_lottery: "Lottery",
    // evac
    b1_east_now: "Rescue East now (keep promise)",
    b2_west_plus_one_east: "Rescue West (break promise)",
    b3_mixed_break_promise: "Mixed: 1 East then split",
    // vax
    c1_prioritize_high_risk: "Prioritize high-risk",
    c2_prioritize_essential: "Prioritize essential workers",
    c3_split_even: "Split evenly"
  };
  return map[actionId] || actionId;
}

/* ------------------------------ URL Utils -------------------------------- */
function updateURLParam(k, v) {
  const url = new URL(window.location.href);
  url.searchParams.set(k, v);
  history.replaceState({}, "", url.toString());
}

/* ------------------------------ Reset ------------------------------------ */
function resetAllToDefaults() {
  State.settings = {
    credences: { p_cons: 0.5, p_rawls: 0.25, p_virtue: 0.25 },
    virtueWeights: { honesty: 1, compassion: 1, fairness: 1 },
    promise: { enabled: true, theta_lives: 1.5 }
  };
  reflectCredencesToUI();
  reflectVirtuesToUI();
  reflectPromiseToUI();
  evaluateAndRender();
}

/* ------------------------------ Init ------------------------------------- */
/**
 * Only boot when the page declares an interactive root:
 *   <div id="interactive-root"></div>
 *   or any element with [data-interactive-root]
 * This prevents errors on non-interactive pages (e.g., contact.html).
 */
async function initInteractive() {
  const mount = document.querySelector("#interactive-root, [data-interactive-root]");
  if (!mount) {
    // Not an interactive page — do nothing.
    console.debug("[interactive] No mount node; skipping init.");
    return;
  }

  try {
    await loadScenarios();
    populateScenarioSelect();
    renderScenarioLabel();
    bindControls();
    // Reflect defaults to any present inputs
    reflectCredencesToUI();
    reflectVirtuesToUI();
    reflectPromiseToUI();
    // First render
    evaluateAndRender();
  } catch (err) {
    console.error("[interactive] init failed:", err);
    const box = $("#explanations") || mount || document.body;
    const p = document.createElement("p");
    p.style.color = "crimson";
    p.textContent = `Could not initialize interactive UI: ${err.message}`;
    box.appendChild(p);
  }
}

// Run on DOM ready (safe to import from index.js)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInteractive);
} else {
  initInteractive();
}

/* ------------------------------ Minimal Styles (optional) -----------------
   You can move these into site.css; left here as a guide for class names.
   .agg-chart { display: grid; gap: 10px; }
   .bar-row { display: grid; grid-template-columns: 1fr 3fr auto; align-items: center; gap: 8px; }
   .bar-track { height: 10px; background: var(--fog,#f0f3f7); border-radius: 999px; overflow: hidden; }
   .bar-fill { height: 100%; background: var(--jade,#00A86B); }
   .module-table { width: 100%; border-collapse: collapse; }
   .module-table th, .module-table td { padding: 8px 10px; border-bottom: 1px solid rgba(0,0,0,0.06); }
-------------------------------------------------------------------------- */
