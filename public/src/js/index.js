/* =============================================================================
   Ethics Testbed — index.js (ESM)
   - Side-effect load the engine and UI wiring.
   - Re-export engine + chart helpers for other modules/pages.
   ============================================================================= */

'use strict'

// Side-effect modules (engine bootstraps exports; interactive wires UI events)
import './engine/core.js'
import './ui/interactive.js'

// Re-export engine API for consumers
export { evaluateScenario } from './engine/core.js'

// Re-export chart utilities (explicit exports to avoid unused warnings)
export {
  renderBars,
  renderGroupedBars,
  renderRadar,
  barsFromAggregate,
  groupedBarsFromModules,
  radarFromCredences
} from './ui/charts.js'
