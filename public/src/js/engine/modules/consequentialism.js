/* =============================================================================
   Ethics Testbed — Consequentialism module (ESM)
   Scenarios: triage-vent-v1, evac-promise-v1, vax-allocation-v1
   Metric: scalar utility per action (unnormalized), ready for downstream normalization
   ============================================================================= */

'use strict'

const _EPS = 1e-9 // reserved for potential numeric stability tweaks

// Concavity helper: optionally apply sqrt concavity to utilities
const sqrt = x => Math.sqrt(Math.max(0, x))
const lin = x => x
function concaveFn (scn) {
  return scn?.params?.priority_fn === 'sqrt' ? sqrt : lin
}

/* ============================================================================
   TRIAGE — expected life-years (optionally concave)
   - Agents A and B have baseline years_left and survival probabilities
   - Actions:
       a1_allocate_A, a2_allocate_B, a3_lottery
   ========================================================================== */
export function triageExpectedYears (scn) {
  const A = scn.agents.find(x => x.id === 'A')
  const B = scn.agents.find(x => x.id === 'B')
  if (!A || !B) throw new Error('triageExpectedYears: missing agents A/B')

  const yA = A.baseline.years_left
  const yB = B.baseline.years_left
  const v = concaveFn(scn)

  const actions = {
    a1_allocate_A: () => v(A.survival.vent * yA) + v(B.survival.no_vent * yB),
    a2_allocate_B: () => v(A.survival.no_vent * yA) + v(B.survival.vent * yB),
    a3_lottery: () =>
      0.5 * (v(A.survival.vent * yA) + v(B.survival.no_vent * yB)) +
      0.5 * (v(A.survival.no_vent * yA) + v(B.survival.vent * yB))
  }

  return scn.actions.map(a => [a.id, actions[a.id]()])
}

/* ============================================================================
   EVAC — expected survivors (proxy utility)
   - Five people (D1..D5); actions affect immediate vs delayed rescue odds
   - Actions:
       b1_east_now, b2_west_plus_one_east, b3_mixed_break_promise
   ========================================================================== */
export function evacExpectedLives (scn) {
  const pNow = scn.prob_survive_if_rescued
  const pE = scn.prob_if_delayed.east
  const pW = scn.prob_if_delayed.west
  const v = concaveFn(scn)

  // Sum of survival probabilities across D1..D5 per action
  const actions = {
    b1_east_now: () => v(3 * pNow + 2 * pW),
    b2_west_plus_one_east: () => v(3 * pNow + 2 * pE),
    b3_mixed_break_promise: () => v(3 * pNow + (pE + pW))
  }

  return scn.actions.map(a => [a.id, actions[a.id]()])
}

/* ============================================================================
   VAX — expected life-years saved
   - Two groups: High-risk (H) and Essential (E)
   - deaths averted = doses * p_infect * IFR * VE
   - life-years saved = deaths averted * years_left
   - Actions:
       c1_prioritize_high_risk, c2_prioritize_essential, c3_split_even
   ========================================================================== */
export function vaxExpectedLifeYearsSaved (scn) {
  const H = scn.groups.find(g => g.id === 'H')
  const E = scn.groups.find(g => g.id === 'E')
  if (!H || !E) throw new Error('vaxExpectedLifeYearsSaved: missing groups H/E')

  const doses = scn.vaccine.doses
  const ve = scn.vaccine.ve_death // efficacy vs death
  const v = concaveFn(scn)

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

  const deathsAverted = (g, n) => n * g.p_infect * g.ifr * ve

  function lySaved (actionId) {
    const { H: vH, E: vE } = allocCounts(actionId)
    const lyH = deathsAverted(H, vH) * H.years_left
    const lyE = deathsAverted(E, vE) * E.years_left
    return v(lyH + lyE)
  }

  return scn.actions.map(a => [a.id, lySaved(a.id)])
}

/* ============================================================================
   Public API — scenario router
   ========================================================================== */
export function consRawScores (scn) {
  switch (scn?.id) {
    case 'triage-vent-v1': return triageExpectedYears(scn)
    case 'evac-promise-v1': return evacExpectedLives(scn)
    case 'vax-allocation-v1': return vaxExpectedLifeYearsSaved(scn)
    default:
      throw new Error('Unknown scenario id (cons): ' + scn?.id)
  }
}

export default {
  consRawScores,
  triageExpectedYears,
  evacExpectedLives,
  vaxExpectedLifeYearsSaved
}
