/* =============================================================================
   Ethics Testbed — Deontology module (ESM)
   Purpose: determine action admissibility under deontic rules ("gates")
   Current rules:
     - triage-vent-v1: no special gates (all admissible)
     - evac-promise-v1: credible promise-keeping with θ (lives) threshold
     - vax-allocation-v1: no special gates (all admissible)
   Notes:
     - This module is *purely* about admissibility, not scoring.
     - For evac-promise-v1, we compare expected lives between keeping vs breaking
       the promise using the consequentialist proxy (expected survivors).
   ============================================================================= */

'use strict'

// We import the specific consequentialist helper used by the evac gate.
// This avoids re-implementing the expected lives calc here.
import { evacExpectedLives } from './consequentialism.js'

/**
 * Compute deontic admissibility for a single action.
 * @param {object} scn - Scenario JSON object (already merged with any UI settings upstream)
 * @param {string} actionId - The action to evaluate (e.g., "b2_west_plus_one_east")
 * @returns {{admissible: boolean, reasons: string[]}}
 */
export function deonticAdmissible (scn, actionId) {
  if (!scn || !actionId) {
    return { admissible: true, reasons: ['No scenario/action provided; default allow.'] }
  }

  switch (scn.id) {
    case 'triage-vent-v1': {
      // No special deontic constraints in the seed triage scenario
      return { admissible: true, reasons: [] }
    }

    case 'evac-promise-v1': {
      // Rule: keep credible promises unless breaking yields ≥ θ more expected lives.
      // The "kept" action here is b1_east_now (rescue East now).
      const keep = scn.constraints?.keep_credible_promises
      if (!keep || keep.enabled === false) {
        return { admissible: true, reasons: ['Promise gate disabled.'] }
      }

      const breaksPromise = (actionId === 'b2_west_plus_one_east') // D1 not rescued first
      if (!breaksPromise) {
        return { admissible: true, reasons: [] }
      }

      // Compute ΔLives = E[lives | break] - E[lives | keep]
      // Use the same consequentialist proxy used elsewhere for consistency.
      const pairs = evacExpectedLives(scn) // [ [id, value], ... ]
      const map = new Map(pairs)
      const breakScore = map.get('b2_west_plus_one_east')
      const keepScore = map.get('b1_east_now')

      // If the scenario is malformed or actions missing, default allow with reason.
      if (typeof breakScore !== 'number' || typeof keepScore !== 'number') {
        return { admissible: true, reasons: ['Could not compute ΔLives; default allow.'] }
      }

      const theta = typeof keep.theta_lives === 'number' ? keep.theta_lives : 1.5
      const delta = breakScore - keepScore

      if (delta < theta) {
        return {
          admissible: false,
          reasons: [`Breaks credible promise; ΔLives=${delta.toFixed(2)} < θ=${theta}`]
        }
      }
      return {
        admissible: true,
        reasons: [`Promise overridden; ΔLives=${delta.toFixed(2)} ≥ θ=${theta}`]
      }
    }

    case 'vax-allocation-v1': {
      // No deontic gates in the seed vaccine scenario
      return { admissible: true, reasons: [] }
    }

    default: {
      // Unknown scenarios default to permissive
      return { admissible: true, reasons: [] }
    }
  }
}

/**
 * Build the full admissibility map for a scenario over its action set.
 * @param {object} scn - Scenario JSON with .actions array
 * @returns {Map<string, {admissible:boolean, reasons:string[]}>}
 */
export function admissibilityMap (scn) {
  const out = new Map()
  if (!scn?.actions?.length) return out
  for (const a of scn.actions) {
    const id = typeof a === 'string' ? a : a.id
    out.set(id, deonticAdmissible(scn, id))
  }
  return out
}

export default {
  deonticAdmissible,
  admissibilityMap
}
