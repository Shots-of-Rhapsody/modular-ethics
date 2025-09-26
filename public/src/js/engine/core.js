/* =============================================================================
   Ethics Testbed — core engine v0.5.0 (ESM)
   Scenarios: triage-vent-v1, evac-promise-v1, vax-allocation-v1
   Modules: Consequentialism, Rawls (maximin), Virtue; Deontic gates (promise)
   Aggregation: per-module min–max over admissible set A*; credences renormalize
   ============================================================================= */

'use strict'

// Bring in the evac calculator (fixes no-undef in deontic gate)
import { evacExpectedLives } from './modules/consequentialism.js'
import { consRawScores } from './modules/consequentialism.js'
import { admissibilityMap } from './modules/deontology.js'
import { virtueRawMap } from './modules/virtue.js'

const EPS = 1e-9

// ---------- Helpers ----------
const sqrt = x => Math.sqrt(Math.max(0, x))
const lin = x => x

function concaveFn (scn) {
  return scn?.params?.priority_fn === 'sqrt' ? sqrt : lin
}

function normalize (values) {
  if (!values || !values.length) return values || []
  const lo = Math.min(...values); const hi = Math.max(...values)
  const den = (hi - lo) + EPS
  return values.map(v => (v - lo) / den)
}

// Defensive deep copy
const deepCopy = obj => JSON.parse(JSON.stringify(obj))

// Merge UI settings into a working copy (e.g., promise rule tuning)
function mergeSettingsIntoScenario (scn, settings) {
  const copy = deepCopy(scn)
  if (copy.id === 'evac-promise-v1') {
    const keep = copy.constraints?.keep_credible_promises || {}
    const ui = settings.promise || {}
    keep.enabled = (ui.enabled ?? keep.enabled ?? true)
    if (typeof ui.theta_lives === 'number') keep.theta_lives = ui.theta_lives
    copy.constraints = copy.constraints || {}
    copy.constraints.keep_credible_promises = keep
  }
  return copy
}

// ===================================================================
// Rawlsian maximin (scalar)
// ===================================================================

// TRIAGE: min_i (P_survive_i × years_left_i)
function triageRawls (scn) {
  const A = scn.agents.find(x => x.id === 'A')
  const B = scn.agents.find(x => x.id === 'B')
  const yA = A.baseline.years_left; const yB = B.baseline.years_left

  const byAction = {
    a1_allocate_A: () => Math.min(A.survival.vent * yA, B.survival.no_vent * yB),
    a2_allocate_B: () => Math.min(A.survival.no_vent * yA, B.survival.vent * yB),
    a3_lottery: () => {
      const wA = 0.5 * (A.survival.vent * yA) + 0.5 * (A.survival.no_vent * yA)
      const wB = 0.5 * (B.survival.vent * yB) + 0.5 * (B.survival.no_vent * yB)
      return Math.min(wA, wB)
    }
  }
  return scn.actions.map(a => [a.id, byAction[a.id]()])
}

// EVAC: min over persons of expected survival probability
function evacRawls (scn) {
  const pNow = scn.prob_survive_if_rescued
  const pE = scn.prob_if_delayed.east
  const pW = scn.prob_if_delayed.west

  const perPerson = {
    b1_east_now: () => ({ D1: pNow, D2: pNow, D3: pNow, D4: pW, D5: pW }),
    b2_west_plus_one_east: () => ({
      D1: (1 / 3) * pNow + (2 / 3) * pE,
      D2: (1 / 3) * pNow + (2 / 3) * pE,
      D3: (1 / 3) * pNow + (2 / 3) * pE,
      D4: pNow,
      D5: pNow
    }),
    b3_mixed_break_promise: () => ({
      D1: pNow,
      D2: 0.5 * pNow + 0.5 * pE,
      D3: 0.5 * pNow + 0.5 * pE,
      D4: 0.5 * pNow + 0.5 * pW,
      D5: 0.5 * pNow + 0.5 * pW
    })
  }

  const scores = {}
  for (const a of scn.actions.map(x => x.id)) {
    const w = perPerson[a]()
    scores[a] = Math.min(w.D1, w.D2, w.D3, w.D4, w.D5)
  }
  return scn.actions.map(a => [a.id, scores[a.id]])
}

// VAX: worst-off person’s expected survival × years_left
function vaxRawls (scn) {
  const H = scn.groups.find(g => g.id === 'H')
  const E = scn.groups.find(g => g.id === 'E')
  const doses = scn.vaccine.doses
  const ve = scn.vaccine.ve_death

  function allocCounts (actionId) {
    if (actionId === 'c1_prioritize_high_risk') {
      const toH = Math.min(doses, H.population)
      const toE = Math.max(0, doses - toH)
      return { H: toH, E: Math.min(toE, E.population) }
    }
    if (actionId === 'c2_prioritize_essential') {
      const toE = Math.min(doses, E.population)
      const toH = Math.max(0, doses - toE)
      return { H: Math.min(toH, H.population), E: toE }
    }
    if (actionId === 'c3_split_even') {
      const half = Math.floor(doses / 2)
      const toH = Math.min(half, H.population)
      const toE = Math.min(doses - toH, E.population)
      return { H: toH, E: toE }
    }
    throw new Error('Unknown vax action: ' + actionId)
  }

  const survUnvax = g => (1 - g.p_infect * g.ifr) * g.years_left
  const survVax = g => (1 - g.p_infect * g.ifr * (1 - ve)) * g.years_left

  function worstOffScore (actionId) {
    const { H: vH, E: vE } = allocCounts(actionId)
    const remH = H.population - vH
    const remE = E.population - vE
    const candidates = []
    candidates.push(remH > 0 ? survUnvax(H) : survVax(H))
    candidates.push(remE > 0 ? survUnvax(E) : survVax(E))
    return Math.min(...candidates)
  }

  return scn.actions.map(a => [a.id, worstOffScore(a.id)])
}

function rawlsRawScores (scn) {
  if (scn.id === 'triage-vent-v1') return triageRawls(scn)
  if (scn.id === 'evac-promise-v1') return evacRawls(scn)
  if (scn.id === 'vax-allocation-v1') return vaxRawls(scn)
  throw new Error('Unknown scenario id (rawls): ' + scn.id)
}

// ===================================================================
// Deontic admissibility (gates)
// ===================================================================
function deonticAdmissible (scn, actionId) {
  if (scn.id === 'triage-vent-v1') {
    return { admissible: true, reasons: [] }
  }
  if (scn.id === 'evac-promise-v1') {
    const keep = scn.constraints?.keep_credible_promises
    if (!keep || !keep.enabled) return { admissible: true, reasons: [] }
    const breaks = (actionId === 'b2_west_plus_one_east') // D1 not first
    if (!breaks) return { admissible: true, reasons: [] }

    // Compare breaking vs keeping promise: Δ lives
    const scnCopy = deepCopy(scn)
    const getLives = id => evacExpectedLives(scnCopy).find(([aid]) => aid === id)[1]
    const delta = getLives('b2_west_plus_one_east') - getLives('b1_east_now')
    const theta = keep.theta_lives ?? 1.5

    if (delta < theta) {
      return { admissible: false, reasons: [`Breaks credible promise; ΔLives=${delta.toFixed(2)} < θ=${theta}`] }
    } else {
      return { admissible: true, reasons: [`Promise overridden; ΔLives=${delta.toFixed(2)} ≥ θ=${theta}`] }
    }
  }
  if (scn.id === 'vax-allocation-v1') {
    // No special deontic gates in seed vaccine scenario
    return { admissible: true, reasons: [] }
  }
  return { admissible: true, reasons: [] }
}

// ===================================================================
// Virtue (scalar proxy)
// ===================================================================
// Traits: honesty (promise-keeping), compassion (cons normalized over A*), fairness (lottery/split bonus when close)
function virtueScore (scn, actionId, consRawMap, traitWts) {
  const { honesty: wh = 1, compassion: wc = 1, fairness: wf = 1 } = traitWts || {}
  let honesty = 1; let compassion = 0; let fairness = 0

  // Honesty penalizes breaking credible promise
  if (scn.id === 'evac-promise-v1') {
    const keep = scn.constraints?.keep_credible_promises
    const breaks = (actionId === 'b2_west_plus_one_east')
    if (keep && keep.enabled && breaks) honesty = 0.35
  }

  // Compassion: normalized consequentialist value over A*
  const keysAstar = Array.from(consRawMap.keys())
  const consValsA = keysAstar.map(k => consRawMap.get(k))
  const consNormA = normalize(consValsA)
  const idx = keysAstar.indexOf(actionId)
  compassion = consNormA[idx] ?? 0.5

  // Fairness: "close" computed over A* too
  const sortedA = [...consValsA].sort((a, b) => b - a)
  const spread = (sortedA[0] - (sortedA[1] ?? sortedA[0]))
  const close = spread < 0.25

  if (scn.id === 'triage-vent-v1' && actionId === 'a3_lottery' && close) fairness = 1.0
  else if (scn.id === 'evac-promise-v1' && actionId === 'b3_mixed_break_promise' && close) fairness = 0.9
  else if (scn.id === 'vax-allocation-v1' && actionId === 'c3_split_even' && close) fairness = 0.9
  else fairness = 0.5

  const totalW = wh + wc + wf + EPS
  return (wh * honesty + wc * compassion + wf * fairness) / totalW
}

// ===================================================================
// Aggregation
// ===================================================================
function aggregate (moduleScores, credences) {
  let { p_cons = 0.5, p_rawls = 0.25, p_virtue = 0.25 } = credences || {}
  const s = p_cons + p_rawls + p_virtue
  // renormalize
  p_cons = s > 0 ? p_cons / s : 1 / 3
  p_rawls = s > 0 ? p_rawls / s : 1 / 3
  p_virtue = s > 0 ? p_virtue / s : 1 / 3

  // Local camelCase aliases for linting/readability; keep originals for API compat
  /* eslint-disable camelcase */
  const pCons = p_cons
  const pRawls = p_rawls
  const pVirtue = p_virtue
  /* eslint-enable camelcase */

  const actions = [...moduleScores.cons.keys()]
  const out = new Map()
  for (const a of actions) {
    const c = moduleScores.cons.get(a) ?? 0
    const r = moduleScores.rawls.get(a) ?? 0
    const v = moduleScores.virtue.get(a) ?? 0
    out.set(a, pCons * c + pRawls * r + pVirtue * v)
  }
  return out
}

// ===================================================================
// Public API
// ===================================================================
/**
 * Evaluate a scenario with optional settings.
 * @param {object} scnOriginal - Scenario JSON.
 * @param {object} [settings]
 * @param {object} [settings.promise] - { enabled?: boolean, theta_lives?: number }
 * @param {object} [settings.credences] - { p_cons?: number, p_rawls?: number, p_virtue?: number }
 * @param {object} [settings.virtueWeights] - { honesty?: number, compassion?: number, fairness?: number }
 */
export function evaluateScenario (scnOriginal, settings = {}) {
  const scn = mergeSettingsIntoScenario(scnOriginal, settings)
  const traitWts = settings?.virtueWeights || { honesty: 1, compassion: 1, fairness: 1 }

  // Raw module outputs (unnormalized)
  const consPairs = consRawScores(scn)
  const consMapRaw = new Map(consPairs)
  const rawlsPairs = rawlsRawScores(scn)
  const rawlsMapRaw = new Map(rawlsPairs)

  // Deontic admissibility and admissible set A*
  const adm = admissibilityMap(scn)
  const allowed = [...adm.entries()].filter(([, v]) => v.admissible).map(([k]) => k)
  const gatingFallback = allowed.length === 0
  const allowedUse = gatingFallback ? scn.actions.map(a => a.id) : allowed

  // helper: normalize map values over the key set (A*)
  function normalizeMapOverKeys (mapRaw, keys) {
    const vals = keys.map(k => mapRaw.get(k))
    const normVals = normalize(vals)
    const out = new Map()
    keys.forEach((k, i) => out.set(k, normVals[i]))
    return out
  }

  // Normalize each module over A*
  const consNorm = normalizeMapOverKeys(consMapRaw, allowedUse)
  const rawlsNorm = normalizeMapOverKeys(rawlsMapRaw, allowedUse)

  // Virtue — compute only for A* and normalize over A*
  const virtueMapRaw = virtueRawMap(scn, allowedUse, consMapRaw, traitWts)
  const virtueNorm = normalizeMapOverKeys(virtueMapRaw, allowedUse)

  // Prepare gated maps for aggregation
  const consG = new Map(allowedUse.map(k => [k, consNorm.get(k)]))
  const rawlsG = new Map(allowedUse.map(k => [k, rawlsNorm.get(k)]))
  const virtueG = new Map(allowedUse.map(k => [k, virtueNorm.get(k)]))

  // Aggregate & rank
  const agg = aggregate({ cons: consG, rawls: rawlsG, virtue: virtueG }, settings?.credences || {})
  const ranking = [...agg.entries()].sort((a, b) => b[1] - a[1])

  // Explanations
  const explanations = []
  if (scn.id === 'triage-vent-v1') explanations.push('E1: Prognosis delta material; no hard constraints triggered.')
  if (scn.id === 'evac-promise-v1') {
    const pr = scn.constraints?.keep_credible_promises
    explanations.push(`E1: Promise ${pr?.enabled ? 'enabled' : 'disabled'}; θ=${pr?.theta_lives ?? '—'}.`)
  }
  if (scn.id === 'vax-allocation-v1') {
    explanations.push('E1: Cons = deaths averted × years; Rawls = min(personal survival × years).')
  }
  if (gatingFallback) explanations.push('E2: All actions inadmissible under gates; ranking shown without gating.')

  return {
    scenarioId: scn.id,
    admissibility: adm,
    consRaw: consMapRaw,
    consNorm,
    rawlsRaw: rawlsMapRaw,
    rawlsNorm,
    virtueRaw: virtueMapRaw,
    virtueNorm,
    aggregate: agg,
    ranking,
    explanations
  }
}

// Default export & browser global (for legacy inline <script> usage)
const EthicsEngine = { evaluateScenario }
export default EthicsEngine
if (typeof window !== 'undefined') {
  window.EthicsEngine = EthicsEngine
}
