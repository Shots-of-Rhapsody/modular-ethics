/* Ethics Testbed — minimal engine v0.2
   Adds: UI-configurable credences, promise override, and virtue-trait weights.
*/
const Engine = (() => {
  const EPS = 1e-9;

  // Helpers
  const sqrt = x => Math.sqrt(Math.max(0, x));
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const sum = arr => arr.reduce((a,b)=>a+b,0);

  function normalize(values) {
    const lo = Math.min(...values), hi = Math.max(...values);
    return values.map(v => (v - lo) / (hi - lo + EPS));
  }

  // Merge scenario with runtime settings (promise rules, etc.)
  function mergeSettingsIntoScenario(scn, settings) {
    const copy = JSON.parse(JSON.stringify(scn));
    if (copy.id === "evac-promise-v1") {
      const k = copy.constraints.keep_credible_promises || {};
      const ui = settings.promise || {};
      k.enabled = (ui.enabled ?? k.enabled ?? true);
      if (typeof ui.theta_lives === "number") k.theta_lives = ui.theta_lives;
      copy.constraints.keep_credible_promises = k;
    }
    return copy;
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

    const actions = {
      b1_east_now: () => {
        const now = 3 * pNow;               // D1,D2,D3 now
        const later = west.length * pWestLater; // D4,D5 later
        return now + later;
      },
      b2_west_plus_one_east: () => {
        const now = 3 * pNow;               // D4,D5 + one east
        const later = (east.length - 1) * pEastLater; // remaining east later
        return now + later;
      },
      b3_mixed_break_promise: () => {
        const now = 3 * pNow; // D1 + one east + one west
        const later = ((east.length - 2) * pEastLater) + ((west.length - 1) * pWestLater);
        return now + later;
      }
    };

    const v = scn.params.priority_fn === "sqrt" ? sqrt : (x=>x);
    return scn.actions.map(a => [a.id, v(actions[a.id]())]);
  }

  // --- Deontic admissibility --------------------------------------------------
  function deonticAdmissible(scn, actionId) {
    if (scn.id === "triage-vent-v1") {
      // Seeds have no hard deontic exclusion; prognosis difference is material
      return { admissible: true, reasons: [] };
    }
    if (scn.id === "evac-promise-v1") {
      const keep = scn.constraints.keep_credible_promises;
      if (!keep || !keep.enabled) return { admissible: true, reasons: [] };

      const breaks = (actionId === "b2_west_plus_one_east"); // D1 not first
      if (!breaks) return { admissible: true, reasons: [] };

      // Compare breaking vs keeping
      const scnCopy = JSON.parse(JSON.stringify(scn));
      const getLives = id => evacExpectedLives(scnCopy).find(([aid])=>aid===id)[1];
      const delta = getLives("b2_west_plus_one_east") - getLives("b1_east_now");
      const theta = keep.theta_lives ?? 1.5;

      if (delta < theta) {
        return { admissible: false, reasons: [`Breaks credible promise; ΔLives=${delta.toFixed(2)} < θ=${theta}`] };
      } else {
        return { admissible: true, reasons: [`Promise overridden; ΔLives=${delta.toFixed(2)} ≥ θ=${theta}`] };
      }
    }
    return { admissible: true, reasons: [] };
  }

  // --- Virtue distance (proxy) -----------------------------------------------
  // Traits: honesty (promise-keeping), compassion (cons normalized), fairness (lottery bonus when close)
  function virtueScore(scn, actionId, consRawMap, traitWts) {
    const { honesty:wh=1, compassion:wc=1, fairness:wf=1 } = traitWts || {};
    let honesty = 1, compassion = 0, fairness = 0;

    if (scn.id === "evac-promise-v1") {
      const keep = scn.constraints.keep_credible_promises;
      const breaks = (actionId === "b2_west_plus_one_east");
      if (keep && keep.enabled && breaks) honesty = 0.35; // penalty
    }

    // Compassion ~ normalized consequentialist score
    const consVals = Array.from(consRawMap.values());
    const consNorm = normalize(consVals);
    const idx = Array.from(consRawMap.keys()).indexOf(actionId);
    compassion = consNorm[idx];

    // Fairness: if top two cons options are close, lottery/split gets a bonus
    const spread = (() => {
      const s = [...consVals].sort((a,b)=>b-a);
      return (s[0] - (s[1] ?? s[0]));
    })();
    const close = spread < 0.25;
    if (scn.id === "triage-vent-v1" && actionId === "a3_lottery" && close) fairness = 1.0;
    else fairness = 0.5;

    // Weighted average
    const totalW = wh + wc + wf + EPS;
    return (wh*honesty + wc*compassion + wf*fairness) / totalW;
  }

  // --- Consequentialist raw scores per scenario -------------------------------
  function consRawScores(scn) {
    if (scn.id === "triage-vent-v1") return triageExpectedYears(scn);
    if (scn.id === "evac-promise-v1") return evacExpectedLives(scn);
    throw new Error("Unknown scenario id: " + scn.id);
  }

  // --- Aggregation ------------------------------------------------------------
  function aggregate(moduleScores, credences) {
    // Credences over scalarized modules (deon is gating)
    let { p_cons=0.5, p_virtue=0.5 } = credences || {};
    // Soft renormalize to sum=1 for scalar combo
    const s = p_cons + p_virtue;
    p_cons = (s>0) ? p_cons/s : 0.5;
    p_virtue = (s>0) ? p_virtue/s : 0.5;

    const actions = [...moduleScores.cons.keys()];
    const out = new Map();
    for (const a of actions) {
      const c = moduleScores.cons.get(a) ?? 0;
      const v = moduleScores.virtue.get(a) ?? 0;
      out.set(a, p_cons*c + p_virtue*v);
    }
    return out;
  }

  // --- Public API -------------------------------------------------------------
  function evaluateScenario(scnOriginal, settings) {
    const scn = mergeSettingsIntoScenario(scnOriginal, settings || {});
    const traitWts = settings.virtueWeights || { honesty:1, compassion:1, fairness:1 };

    // 1) Consequentialist raw & norm
    const consPairs = consRawScores(scn);
    const consMapRaw = new Map(consPairs);
    const consNormVals = normalize(consPairs.map(([,v])=>v));
    const consMapNorm = new Map(consPairs.map(([k],i)=>[k, consNormVals[i]]));

    // 2) Deontic admissibility
    const adm = new Map();
    for (const a of scn.actions.map(x=>x.id)) {
      adm.set(a, deonticAdmissible(scn, a));
    }

    // 3) Virtue
    const virtueMapRaw = new Map();
    for (const a of scn.actions.map(x=>x.id)) {
      virtueMapRaw.set(a, virtueScore(scn, a, consMapRaw, traitWts));
    }
    const virtueNormVals = normalize([...virtueMapRaw.values()]);
    const virtueMapNorm = new Map([...virtueMapRaw.keys()].map((k,i)=>[k, virtueNormVals[i]]));

    // 4) Gate inadmissible, aggregate
    const gated = [...adm.entries()].filter(([,v])=>v.admissible).map(([k])=>k);
    const consG = new Map(gated.map(k=>[k, consMapNorm.get(k)]));
    const virtueG = new Map(gated.map(k=>[k, virtueMapNorm.get(k)]));
    const agg = aggregate({cons: consG, virtue: virtueG}, settings.credences || {});

    // 5) Explanation set (brief)
    const explanations = [];
    if (scn.id === "triage-vent-v1") {
      explanations.push("E1: Prognosis delta material; no hard constraints triggered.");
    }
    if (scn.id === "evac-promise-v1") {
      const pr = scn.constraints.keep_credible_promises;
      explanations.push(`E1: Promise ${pr?.enabled ? "enabled" : "disabled"}; θ=${pr?.theta_lives ?? "—"}.`);
    }

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

window.EthicsEngine = Engine;
