/* Ethics Testbed — engine v0.3
   Modules: consequentialism, rawls (maximin), virtue; deontic gates
   Aggregation: normalize per module; credences (p_cons, p_rawls, p_virtue) renormalize to sum=1
*/
const Engine = (() => {
  const EPS = 1e-9;

  // Helpers
  const sqrt = x => Math.sqrt(Math.max(0, x));
  const sum = arr => arr.reduce((a,b)=>a+b,0);
  function normalize(values) {
    const lo = Math.min(...values), hi = Math.max(...values);
    return values.map(v => (v - lo) / (hi - lo + EPS));
  }

  // Merge UI settings into scenario (promise rules, etc.)
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

  // ---------- Consequentialism (scalar) ----------
  // TRIAGE: expected life-years (optionally concave)
  function triageExpectedYears(scn) {
    const A = scn.agents.find(x=>x.id==="A");
    const B = scn.agents.find(x=>x.id==="B");
    const yearsA = A.baseline.years_left;
    const yearsB = B.baseline.years_left;
    const v = scn.params.priority_fn === "sqrt" ? sqrt : (x=>x);

    const actions = {
      a1_allocate_A: () => v(A.survival.vent*yearsA) + v(B.survival.no_vent*yearsB),
      a2_allocate_B: () => v(A.survival.no_vent*yearsA) + v(B.survival.vent*yearsB),
      a3_lottery:    () => 0.5*(v(A.survival.vent*yearsA) + v(B.survival.no_vent*yearsB))
                     + 0.5*(v(A.survival.no_vent*yearsA) + v(B.survival.vent*yearsB))
    };
    return scn.actions.map(a => [a.id, actions[a.id]()]);
  }

  // EVAC: expected survivors (proxy)
  function evacExpectedLives(scn) {
    const pNow = scn.prob_survive_if_rescued;
    const pE = scn.prob_if_delayed.east;
    const pW = scn.prob_if_delayed.west;
    const v = scn.params.priority_fn === "sqrt" ? sqrt : (x=>x);

    const actions = {
      b1_east_now: () => v(3*pNow + 2*pW),
      b2_west_plus_one_east: () => v(3*pNow + 2*pE),
      b3_mixed_break_promise: () => v(3*pNow + (1*pE + 1*pW))
    };
    return scn.actions.map(a => [a.id, actions[a.id]()]);
  }

  function consRawScores(scn) {
    if (scn.id === "triage-vent-v1") return triageExpectedYears(scn);
    if (scn.id === "evac-promise-v1") return evacExpectedLives(scn);
    throw new Error("Unknown scenario id: " + scn.id);
  }

  // ---------- Rawlsian maximin (scalar) ----------
  // Score of an action = minimum expected welfare across persons.
  // TRIAGE: welfare_i = P_survive * years_left
  function triageRawls(scn) {
    const A = scn.agents.find(x=>x.id==="A");
    const B = scn.agents.find(x=>x.id==="B");
    const yA = A.baseline.years_left, yB = B.baseline.years_left;
    const byAction = {
      a1_allocate_A: () => Math.min(A.survival.vent*yA,     B.survival.no_vent*yB),
      a2_allocate_B: () => Math.min(A.survival.no_vent*yA,  B.survival.vent*yB),
      a3_lottery:    () => {
        // Expected per-person welfare under the 50/50 lottery
        const wA = 0.5*(A.survival.vent*yA) + 0.5*(A.survival.no_vent*yA);
        const wB = 0.5*(B.survival.vent*yB) + 0.5*(B.survival.no_vent*yB);
        return Math.min(wA, wB);
      }
    };
    return scn.actions.map(a => [a.id, byAction[a.id]()]);
  }

  // EVAC: welfare_i = expected survival probability per person (years not specified)
  function evacRawls(scn) {
    const pNow = scn.prob_survive_if_rescued;
    const pE = scn.prob_if_delayed.east;
    const pW = scn.prob_if_delayed.west;

    // Expected per-person survival by action
    const perPerson = {
      b1_east_now: () => ({
        D1:pNow, D2:pNow, D3:pNow,
        D4:pW,   D5:pW
      }),
      b2_west_plus_one_east: () => ({
        // one of East is rescued now at random
        D1: (1/3)*pNow + (2/3)*pE,
        D2: (1/3)*pNow + (2/3)*pE,
        D3: (1/3)*pNow + (2/3)*pE,
        D4: pNow, D5: pNow
      }),
      b3_mixed_break_promise: () => ({
        // now: D1 + one East + one West (each random among peers)
        D1: pNow,
        D2: 0.5*pNow + 0.5*pE,
        D3: 0.5*pNow + 0.5*pE,
        D4: 0.5*pNow + 0.5*pW,
        D5: 0.5*pNow + 0.5*pW
      })
    };

    const actions = {};
    for (const a of scn.actions.map(x=>x.id)) {
      const w = perPerson[a]();
      actions[a] = Math.min(w.D1, w.D2, w.D3, w.D4, w.D5);
    }
    return scn.actions.map(a => [a.id, actions[a.id]]);
  }

  function rawlsRawScores(scn) {
    if (scn.id === "triage-vent-v1") return triageRawls(scn);
    if (scn.id === "evac-promise-v1") return evacRawls(scn);
    throw new Error("Unknown scenario id: " + scn.id);
  }

  // ---------- Deontic admissibility (gates) ----------
  function deonticAdmissible(scn, actionId) {
    if (scn.id === "triage-vent-v1") {
      return { admissible: true, reasons: [] };
    }
    if (scn.id === "evac-promise-v1") {
      const keep = scn.constraints.keep_credible_promises;
      if (!keep || !keep.enabled) return { admissible: true, reasons: [] };
      const breaks = (actionId === "b2_west_plus_one_east"); // D1 not first
      if (!breaks) return { admissible: true, reasons: [] };

      // Compare breaking vs keeping (Δ lives saved)
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

  // ---------- Virtue (scalar proxy) ----------
  // Traits: honesty (promise-keeping), compassion (cons normalized), fairness (lottery/split bonus when close)
  function virtueScore(scn, actionId, consRawMap, traitWts) {
    const { honesty:wh=1, compassion:wc=1, fairness:wf=1 } = traitWts || {};
    let honesty = 1, compassion = 0, fairness = 0;

    if (scn.id === "evac-promise-v1") {
      const keep = scn.constraints.keep_credible_promises;
      const breaks = (actionId === "b2_west_plus_one_east");
      if (keep && keep.enabled && breaks) honesty = 0.35;
    }

    const consVals = Array.from(consRawMap.values());
    const consNorm = normalize(consVals);
    const idx = Array.from(consRawMap.keys()).indexOf(actionId);
    compassion = consNorm[idx];

    const spread = (() => {
      const s = [...consVals].sort((a,b)=>b-a);
      return (s[0] - (s[1] ?? s[0]));
    })();
    const close = spread < 0.25;
    if (scn.id === "triage-vent-v1" && actionId === "a3_lottery" && close) fairness = 1.0;
    else if (scn.id === "evac-promise-v1" && actionId === "b3_mixed_break_promise" && close) fairness = 0.9;
    else fairness = 0.5;

    const totalW = wh + wc + wf + EPS;
    return (wh*honesty + wc*compassion + wf*fairness) / totalW;
  }

  // ---------- Aggregation ----------
  function aggregate(moduleScores, credences) {
    // Renormalize scalar credences to sum=1 (deon is gating only)
    let { p_cons=0.5, p_rawls=0.25, p_virtue=0.25 } = credences || {};
    const s = p_cons + p_rawls + p_virtue;
    p_cons   = s>0 ? p_cons/s   : 1/3;
    p_rawls  = s>0 ? p_rawls/s  : 1/3;
    p_virtue = s>0 ? p_virtue/s : 1/3;

    const actions = [...moduleScores.cons.keys()];
    const out = new Map();
    for (const a of actions) {
      const c = moduleScores.cons.get(a)   ?? 0;
      const r = moduleScores.rawls.get(a)  ?? 0;
      const v = moduleScores.virtue.get(a) ?? 0;
      out.set(a, p_cons*c + p_rawls*r + p_virtue*v);
    }
    return out;
  }

  // ---------- Public API ----------
  function evaluateScenario(scnOriginal, settings) {
    const scn = mergeSettingsIntoScenario(scnOriginal, settings || {});
    const traitWts = settings.virtueWeights || { honesty:1, compassion:1, fairness:1 };

    // Consequentialism
    const consPairs = consRawScores(scn);
    const consMapRaw = new Map(consPairs);
    const consNorm = new Map(consPairs.map(([k],i)=>[k, normalize(consPairs.map(([,v])=>v))[i]]));

    // Rawls
    const rawlsPairs = rawlsRawScores(scn);
    const rawlsMapRaw = new Map(rawlsPairs);
    const rawlsNorm = new Map(rawlsPairs.map(([k],i)=>[k, normalize(rawlsPairs.map(([,v])=>v))[i]]));

    // Deontic admissibility
    const adm = new Map();
    for (const a of scn.actions.map(x=>x.id)) {
      adm.set(a, deonticAdmissible(scn, a));
    }

    // Virtue
    const virtueMapRaw = new Map();
    for (const a of scn.actions.map(x=>x.id)) {
      virtueMapRaw.set(a, virtueScore(scn, a, consMapRaw, traitWts));
    }
    const virtueNorm = new Map([...virtueMapRaw.keys()].map((k,i)=>[k, normalize([...virtueMapRaw.values()])[i]]));

    // Gate and aggregate
    const allowed = [...adm.entries()].filter(([,v])=>v.admissible).map(([k])=>k);
    const consG   = new Map(allowed.map(k=>[k, consNorm.get(k)]));
    const rawlsG  = new Map(allowed.map(k=>[k, rawlsNorm.get(k)]));
    const virtueG = new Map(allowed.map(k=>[k, virtueNorm.get(k)]));
    const agg = aggregate({cons:consG, rawls:rawlsG, virtue:virtueG}, settings?.credences || {});

    const explanations = [];
    if (scn.id === "triage-vent-v1") explanations.push("E1: Prognosis delta material; no hard constraints triggered.");
    if (scn.id === "evac-promise-v1") {
      const pr = scn.constraints.keep_credible_promises;
      explanations.push(`E1: Promise ${pr?.enabled ? "enabled" : "disabled"}; θ=${pr?.theta_lives ?? "—"}.`);
    }

    const ranking = [...(agg.entries())].sort((a,b)=>b[1]-a[1]);

    return {
      scenarioId: scn.id,
      admissibility: adm,
      consRaw: consMapRaw,    consNorm,
      rawlsRaw: rawlsMapRaw,  rawlsNorm,
      virtueRaw: virtueMapRaw, virtueNorm,
      aggregate: agg,
      ranking,
      explanations
    };
  }

  return { evaluateScenario };
})();

window.EthicsEngine = Engine;
