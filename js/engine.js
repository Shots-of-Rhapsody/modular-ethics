/* Ethics Testbed — minimal engine v0.1
   Modules: consequentialism, deontic constraints, virtue distance
   Aggregation: normalized min–max per module, credences p
*/
const Engine = (() => {
  const EPS = 1e-9;

  // Helpers
  const sqrt = x => Math.sqrt(Math.max(0, x));
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const sum = arr => arr.reduce((a,b)=>a+b,0);
  const mean = arr => arr.length ? sum(arr)/arr.length : 0;

  function normalize(values) {
    const lo = Math.min(...values), hi = Math.max(...values);
    return values.map(v => (v - lo) / (hi - lo + EPS));
  }

  // --- Scenario calculators ---------------------------------------------------

  // TRIAGE: expected life-years for each action under consequentialism
  function triageExpectedYears(scn) {
    const A = scn.agents.find(x=>x.id==="A");
    const B = scn.agents.find(x=>x.id==="B");
    const yearsA = A.baseline.years_left;
    const yearsB = B.baseline.years_left;
    const v = scn.params.priority_fn === "sqrt" ? sqrt : (x=>x);

    const actions = {
      a1_allocate_A: () => {
        const pA = A.survival.vent;
        const pB = B.survival.no_vent;
        return v(pA*yearsA) + v(pB*yearsB);
      },
      a2_allocate_B: () => {
        const pA = A.survival.no_vent;
        const pB = B.survival.vent;
        return v(pA*yearsA) + v(pB*yearsB);
      },
      a3_lottery: () => 0.5*actions.a1_allocate_A()+0.5*actions.a2_allocate_B()
    };
    return scn.actions.map(a => [a.id, actions[a.id]()]);
  }

  // EVAC: expected survivors for each action (proxy utility)
  function evacExpectedLives(scn) {
    const pNow = scn.prob_survive_if_rescued;
    const pEastLater = scn.prob_if_delayed.east;
    const pWestLater = scn.prob_if_delayed.west;

    const east = scn.docks.east;
    const west = scn.docks.west;
    const includesD1 = arr => arr.includes("D1");

    const actions = {
      b1_east_now: () => {
        // rescue D1,D2,D3 now; west waits
        const now = 3 * pNow;
        const later = west.length * pWestLater; // 2
        return now + later;
      },
      b2_west_plus_one_east: () => {
        // rescue D4,D5 + one east; remaining east wait
        const now = 3 * pNow;
        const later = (east.length - 1) * pEastLater; // 2 wait
        return now + later;
      },
      b3_mixed_break_promise: () => {
        // rescue D1 + one east + one west now; remaining wait by dock
        const now = 3 * pNow;
        const later = ((east.length - 2) * pEastLater) + ((west.length - 1) * pWestLater);
        return now + later;
      }
    };

    // Return raw expected survivors; apply concavity if desired
    const v = scn.params.priority_fn === "sqrt" ? sqrt : (x=>x);
    return scn.actions.map(a => [a.id, v(actions[a.id]())]);
  }

  // --- Deontic admissibility --------------------------------------------------

  function deonticAdmissible(scn, actionId) {
    // Universal constraints satisfied in these seeds (no intentional harm, consent).
    if (scn.id === "triage-vent-v1") {
      // Treat-like-cases-alike: prognosis differences material -> lottery not required
      return { admissible: true, reasons: [] };
    }
    if (scn.id === "evac-promise-v1") {
      // Promise-keeping: if enabled, breaking promise inadmissible unless large-harm override
      const keep = scn.constraints.keep_credible_promises;
      if (!keep || !keep.enabled) return { admissible: true, reasons: [] };

      // Identify whether action breaks promise to D1 being rescued first
      const breaks = (actionId === "b2_west_plus_one_east"); // D1 not guaranteed this round
      if (!breaks) return { admissible: true, reasons: [] };

      // Compute Δ lives saved between best admissible promise-keeping action and the breaking action
      // Compare b1 (keep promise strictly) vs b2 (break promise)
      const scnCopy = JSON.parse(JSON.stringify(scn));
      const getLives = id => evacExpectedLives(scnCopy).find(([aid])=>aid===id)[1];
      const delta = getLives("b2_west_plus_one_east") - getLives("b1_east_now");

      if (delta < (keep.theta_lives ?? 1.5)) {
        return { admissible: false, reasons: ["Breaks credible promise without sufficient harm avoidance"] };
      } else {
        return { admissible: true, reasons: ["Promise overridden by large harm avoidance"] };
      }
    }
    return { admissible: true, reasons: [] };
  }

  // --- Virtue distance (proxy) -----------------------------------------------
  // Traits: honesty (penalize promise-breaking), compassion (favor higher expected lives),
  // fairness (prefer lottery when options are close)
  function virtueScore(scn, actionId, consRawMap) {
    let honesty = 1, compassion = 0, fairness = 0;

    if (scn.id === "evac-promise-v1") {
      const keep = scn.constraints.keep_credible_promises;
      const breaks = (actionId === "b2_west_plus_one_east");
      if (keep && keep.enabled && breaks) honesty = 0.4; // penalize promise-breaking
    }

    // Compassion ~ normalized consequentialist score
    const consVals = Array.from(consRawMap.values());
    const consNorm = normalize(consVals);
    const consIdx = Array.from(consRawMap.keys()).indexOf(actionId);
    compassion = consNorm[consIdx];

    // Fairness: if top two cons options differ by < δ, boost lottery / split options
    const delta = (() => {
      const sorted = [...consVals].sort((a,b)=>b-a);
      return (sorted[0] - (sorted[1] ?? sorted[0]));
    })();
    const close = delta < 0.25; // threshold: scenarios are coarse
    if (scn.id === "triage-vent-v1" && actionId === "a3_lottery" && close) fairness = 1.0;
    else fairness = 0.5;

    // Simple average; could weight traits later
    return (honesty + compassion + fairness) / 3;
  }

  // --- Consequentialist raw scores per scenario -------------------------------
  function consRawScores(scn) {
    if (scn.id === "triage-vent-v1") return triageExpectedYears(scn);
    if (scn.id === "evac-promise-v1") return evacExpectedLives(scn);
    throw new Error("Unknown scenario id: " + scn.id);
  }

  // --- Aggregation ------------------------------------------------------------
  function aggregate(moduleScores, credences) {
    // moduleScores: { cons: Map(action->norm), virtue: Map(action->norm) }
    // Admissibility handled before aggregation
    const { p_cons=0.5, p_deon=0.3, p_virtue=0.2 } = credences || {};
    const actions = [...moduleScores.cons.keys()];
    const out = new Map();
    for (const a of actions) {
      const c = moduleScores.cons.get(a) ?? 0;
      const v = moduleScores.virtue.get(a) ?? 0;
      // deontic has no scalar; it gates actions earlier
      out.set(a, p_cons*c + p_virtue*v); // p_deon implicit via gating
    }
    return out;
  }

  // --- Public API -------------------------------------------------------------
  function evaluateScenario(scn, credences) {
    // 1) Consequentialist raw
    const consPairs = consRawScores(scn);
    const consMapRaw = new Map(consPairs);
    const consNormVals = normalize(consPairs.map(([,v])=>v));
    const consMapNorm = new Map(consPairs.map(([k],i)=>[k, consNormVals[i]]));

    // 2) Deontic admissibility
    const adm = new Map();
    for (const a of scn.actions.map(x=>x.id)) {
      adm.set(a, deonticAdmissible(scn, a));
    }

    // 3) Virtue distance
    const virtueMapRaw = new Map();
    for (const a of scn.actions.map(x=>x.id)) {
      virtueMapRaw.set(a, virtueScore(scn, a, consMapRaw));
    }
    const virtueNormVals = normalize([...virtueMapRaw.values()]);
    const virtueMapNorm = new Map([...virtueMapRaw.keys()].map((k,i)=>[k, virtueNormVals[i]]));

    // 4) Gate inadmissible, aggregate
    const gated = [...adm.entries()].filter(([,v])=>v.admissible).map(([k])=>k);
    const consG = new Map(gated.map(k=>[k, consMapNorm.get(k)]));
    const virtueG = new Map(gated.map(k=>[k, virtueMapNorm.get(k)]));
    const agg = aggregate({cons: consG, virtue: virtueG}, credences);

    // 5) Minimal explanation set (simplified)
    const explanations = [];
    if (scn.id === "triage-vent-v1") {
      explanations.push("E1: Prognosis delta between A and B is material.");
      explanations.push("E2: No deontic constraint triggered.");
    }
    if (scn.id === "evac-promise-v1") {
      const promiseOn = scn.constraints.keep_credible_promises?.enabled;
      explanations.push(`E1: Promise-keeping ${promiseOn ? "enabled" : "disabled"} with θ=${scn.constraints.keep_credible_promises?.theta_lives ?? "—"}.`);
    }

    // 6) Rankings
    const ranking = [...agg.entries()].sort((a,b)=>b[1]-a[1]);

    return {
      scenarioId: scn.id,
      admissibility: adm,
      consRaw: consMapRaw,
      consNorm: consMapNorm,
      virtueRaw: virtueMapRaw,
      virtueNorm: virtueMapNorm,
      aggregate: agg,
      ranking,
      explanations
    };
  }

  return { evaluateScenario };
})();

// Expose for browser usage
window.EthicsEngine = Engine;
