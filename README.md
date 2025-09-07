# Ethics Testbed - Modular Moral Reasoning

**Ethics Testbed** is an experimental framework that translates ethical theories into **composable mathematical programs**.  
It is designed to make moral reasoning **transparent, auditable, and comparable** across different traditions of thought.  

The project is in active development & welcomes contributors who are interested in philosophy, mathematics, cognitive science, or applied AI ethics.

---

## 🔍 Purpose

Ethical debates often get stuck in rhetoric. This project aims to:

- **Formalize**: Represent normative theories (consequentialism, deontology, virtue ethics & others) in math-like evaluators.  
- **Separate**: Distinguish *facts* (causal models, probabilities) from *values* (weights, duties, virtues).  
- **Aggregate**: Handle pluralism by explicitly modeling moral uncertainty & combining multiple evaluators.  
- **Constrain**: Encode rights & duties as side-constraints, ensuring no rule-breaking is hidden in the math.  
- **Audit**: Generate explanation sets that highlight *which premises did the real work* in each recommendation.  

---

## 📂 Repository Structure

- `index.html` — Home page & project overview  
- `paper.html` — Methods paper (research-style, expanding the theoretical framework)  
- `language-math.html` — Accessible page on how language & math align as rule-based systems  
- `research.html` — Style exploration of math’s correlation with the universe  
- `results.html` — Interactive results dashboard with live re-weighting of parameters  
- `interactive.html` — Sensitivity analysis interface for exploring sliders & constraints  
- `data/scenarios.json` — Seed scenarios for triage, evacuation, vaccine allocation, etc.  
- `assets/` — Global site styles (`site.css`) and scripts (`site.js`)  
- `js/engine.js` — Core evaluation engine (formalizes consequentialism, deontology, virtue modules)  
- `ROADMAP.md` — Development roadmap & milestones  

---

## 🧩 Current Features

- Formal mathematical definitions of **Consequentialism, Deontology, & Virtue Ethics**  
- **Scenario schema (JSON)** for portable ethical case studies  
- Interactive **results viewer** with sliders to adjust credences & trait weights  
- **Normalization pipeline** to make modules comparable under aggregation  
- Clear UI/UX emphasis on **transparency and accessibility**  

---

## 🚧 In Progress

- Expanding scenario library (policy, global health, AI decision-making)  
- Adding new modules: Rawlsian max-min fairness, contractualism, care ethics  
- Enhanced visualization: heatmaps, causal graphs & interactive explanations  
- Integration with external datasets (e.g., real-world triage protocols, public health stats)  
- Peer-reviewed research paper aligning the engine with cognitive science & mathematical theology  

---

## 🔮 Future Directions

- Build a **scenario editor** so new dilemmas can be authored via the browser  
- Incorporate **probabilistic causal models** to test robustness of recommendations  
- Explore cross-disciplinary applications: legal reasoning, AI alignment & global policy  
- Develop a lightweight **API layer** for integration with other ethical/AI tools  
- Community-driven **axiom ledger** for iterative refinement of normative assumptions  

---

## 📖 Contributing

We encourage contributions in philosophy, programming, design & testing.  
See [`contribute.html`](contribute.html) or open an [issue](https://github.com/xartaiusx/ethics.testbed/issues).  

Ways to help:  
- Add new scenarios in `data/scenarios.json`  
- Extend the evaluation engine (`js/engine.js`)  
- Improve accessibility, UI & visualizations  
- Propose axioms or theoretical refinements  

---

## 📜 License

This project is released under the **MIT License**.  
You are free to use, modify & distribute with attribution.  

---

## ✨ Acknowledgments

- Inspired by **Eugene Wigner’s** question of math’s “unreasonable effectiveness.”  
- Informed by traditions across **philosophy, cognitive science, and AI ethics**.  
- Built to make reasoning processes as **auditable and reproducible** as scientific experiments.
