/* =============================================================================
   Ethics Testbed — Virtue module (ESM)
   Traits:
     - honesty: penalize breaking credible promises (evac scenario)
     - compassion: normalized cons utility over admissible set A*
     - fairness: bonus for fair-split actions when options are close
   Output: raw virtue scores per action (not yet normalized across A*)
   ============================================================================= */

'use strict'

/* ------------------------------ Helpers --------------------------------- */
const EPS = 1e-9

function normalize (values) {
  if (!values || !values.length) return values || []
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const den = (hi - lo) + EPS
  return values.map(v => (v - lo) / den)
}

/* --------------------------- Core calculation --------------------------- */
/**
 * Compute the raw (unnormalized) virtue score for a single action.
 * @param {object} scn - scenario JSON
 * @param {string} actionId - action to evaluate
 * @param {Map<string, number>} consRawOnA - Map of consequentialist *raw* scores, restricted to A*
 * @param {{honesty?:number, compassion?:number, fairness?:number}} traitWts
 * @returns {number} raw virtue score for this action
 */
export function virtueScore (scn, actionId, consRawOnA, traitWts = {}) {
  const { honesty: wh = 1, compassion: wc = 1, fairness: wf = 1 } = traitWts

  // --- Honesty: penalize breaking credible promise when gate enabled
  let honesty = 1
  if (scn.id === 'evac-promise-v1') {
    const keep = scn.constraints?.keep_credible_promises
    const breaks = (actionId === 'b2_west_plus_one_east') // D1 not first
    if (keep && keep.enabled && breaks) honesty = 0.35
  }

  // --- Compassion: normalized cons utility over A*
  const keysAstar = Array.from(consRawOnA.keys())
  const consValsA = keysAstar.map(k => consRawOnA.get(k))
  const consNormA = normalize(consValsA)
  const idx = keysAstar.indexOf(actionId)
  const compassion = consNormA[idx] ?? 0.5

  // --- Fairness: bonus for “fair” actions when options are close
  // “close” = top spread among consRawOnA less than 0.25 (after sorting)
  const sortedA = [...consValsA].sort((a, b) => b - a)
  const spread = (sortedA[0] - (sortedA[1] ?? sortedA[0]))
  const close = spread < 0.25

  let fairness = 0.5
  if (scn.id === 'triage-vent-v1' && actionId === 'a3_lottery' && close) fairness = 1.0
  else if (scn.id === 'evac-promise-v1' && actionId === 'b3_mixed_break_promise' && close) fairness = 0.9
  else if (scn.id === 'vax-allocation-v1' && actionId === 'c3_split_even' && close) fairness = 0.9

  const totalW = wh + wc + wf + EPS
  return (wh * honesty + wc * compassion + wf * fairness) / totalW
}

/**
 * Build a Map<actionId, rawVirtueScore> for the admissible set A*.
 * @param {object} scn - scenario JSON
 * @param {string[]} allowedKeys - admissible actions (A*)
 * @param {Map<string, number>} consMapRaw - Map of *raw* consequentialist scores over all actions
 * @param {{honesty?:number, compassion?:number, fairness?:number}} traitWts
 * @returns {Map<string, number>} Map of raw virtue scores (not yet normalized across A*)
 */
export function virtueRawMap (scn, allowedKeys, consMapRaw, traitWts = {}) {
  const consRawOnA = new Map(allowedKeys.map(k => [k, consMapRaw.get(k)]))
  const out = new Map()
  for (const a of allowedKeys) {
    out.set(a, virtueScore(scn, a, consRawOnA, traitWts))
  }
  return out
}

export default { virtueScore, virtueRawMap }
