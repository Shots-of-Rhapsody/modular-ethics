# Ethics Testbed — Modular Moral Reasoning

![Build](https://img.shields.io/github/actions/workflow/status/Shots-of-Rhapsody/modular-ethics/ci.yml?branch=main)  
![Coverage](https://img.shields.io/codecov/c/github/Shots-of-Rhapsody/modular-ethics/main)  
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)  
![Version](https://img.shields.io/github/v/release/Shots-of-Rhapsody/modular-ethics)  
![Last Commit](https://img.shields.io/github/last-commit/Shots-of-Rhapsody/modular-ethics/main)  
![Contributors](https://img.shields.io/github/contributors/Shots-of-Rhapsody/modular-ethics)  
![Open Issues](https://img.shields.io/github/issues/Shots-of-Rhapsody/modular-ethics)  
![PRs](https://img.shields.io/github/issues-pr/Shots-of-Rhapsody/modular-ethics)  

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

├── public/ ← static front-end assets (HTML, CSS, JS)
├── src/ ← source code (interactive logic, UI, engine)
├── data/
│ └── scenarios.json ← seed moral dilemmas and case definitions
├── assets/ ← site-wide styles, shared scripts
├── scripts/ ← build / deployment or utility scripts
├── ROADMAP.md
├── SECURITY.md
├── LICENSE.md
├── package.json / lock
└── lychee.toml ← static-site / link-checker config


Key pages and modules:

- `index.html` — Home / project overview  
- `paper.html` — Expository / methods document  
- `language-math.html` — On the correspondence between language and formal rules  
- `research.html` — Explorations of math, philosophy, and world structure  
- `results.html` — Interactive dashboard: compare evaluator outputs  
- `interactive.html` — Slider & constraint interface for sensitivity analysis  
- `js/engine.js` — Core engine: module definitions, aggregation logic, explanation derivation  
- `data/scenarios.json` — Scenario definitions and metadata  

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

We welcome all kinds of contributions: philosophy, modeling, UI/visual design, code, testing, documentation.  
See [`contribute.html`](contribute.html) or open an [issue](https://github.com/Shots-of-Rhapsody/modular-ethics/issues).  

Ways to help:  
- Add or refine scenarios in `data/scenarios.json`  
- Extend or propose new modules in `js/engine.js`  
- Improve UI usability, mobile support, accessibility  
- Suggest or test axioms, alternative aggregation schemes, explanation methods  
- Report bugs, open issues, propose features  
- See [CONTRIBUTING](./CONTRIBUTING.md) for full guidelines  

---

## 📜 License

This project is released under the **MIT License**.  
You are free to use, modify & distribute with attribution.  

---

## ✨ Acknowledgments

- Inspired by **Eugene Wigner’s** question of math’s “unreasonable effectiveness.”  
- Informed by traditions across **philosophy, cognitive science, and AI ethics**.  
- Designed so moral reasoning is treated as a research subject — **auditable & reproducible** as scientific experiments.  

---

## 🌐 About

- **Modular Ethics Project**  
- Website: [shotsofrhapsody.com](https://shotsofrhapsody.com)  

**Resources**  
- Project homepage / live demo  
- ROADMAP & development notes  
- Security policy & code of conduct  

---

*Last updated: <!--AUTO-DATE-->*