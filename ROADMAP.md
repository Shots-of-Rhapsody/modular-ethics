# Ethics Testbed — Project Roadmap

This roadmap outlines the next phases of development for the **Ethics Testbed** project.  
The goal is to build a transparent, interactive platform for encoding, comparing, and debating ethical decision rules across diverse scenarios.

---

## ✅ Current Milestones (v0.4.1)

- **Core Pages Live**
  - `index.html`: project overview
  - `paper.html`: methods and scientific framing
  - `results.html`: live tables with adjustable weights
  - `interactive.html`: heatmap sensitivity maps
  - `contribute.html`: documentation for adding scenarios and modules
- **Moral Modules**
  - Consequentialism (expected life-years / outcomes)
  - Rawls (maximin / worst-off perspective)
  - Virtue proxy (honesty, compassion, fairness)
  - Deontic gates (promise-keeping threshold)
- **Scenarios**
  - Ventilator triage
  - Evacuation with a promise
  - Vaccine allocation
- **Styling**
  - Unified into `assets/site.css`
  - Navigation and branding consistent across all pages
- **Hosting**
  - GitHub Pages deployment working
  - `sitemap.xml`, `robots.txt`, `CNAME`, and `404.html` in place

---

## 📌 Next Steps

### 1. Scenario Library Expansion
Add new cases to stress different ethical trade-offs:
- **Climate mitigation** — present costs vs. future harms
- **AI alignment** — override kill switch vs. autonomy
- **Justice/fairness** — resource allocation (jobs, education seats)
- **Risky lotteries** — low-probability, high-impact disasters

**Goal:** Broaden the testbed to cover different domains and stress-test modules.

---

### 2. Interpretability & Explanations
Improve outputs beyond numeric rankings:
- Add human-readable justifications:
  - *“Action b2 outranks b1 because it maximizes expected lives (Δ = 0.9) while staying within the promise override threshold θ.”*
- Contextualize module contributions (show how much each module influenced ranking).

**Goal:** Make results legible to non-technical audiences.

---

### 3. Visualizations
- Add bar charts to `results.html` showing module scores per action.
- Add a dynamic “ranking change” indicator in `interactive.html` as sliders move.
- Optional: small heatmap legend for clarity.

**Goal:** Support intuitive understanding of how ethical weights change decisions.

---

### 4. Contributor Workflow
- Add an **in-browser scenario editor** form to generate valid JSON.
- Export button → new scenario JSON ready for PR submission.
- Document JSON schema more explicitly in `contribute.html`.

**Goal:** Lower barrier for contributors to propose new scenarios.

---

### 5. Validation & Testing
- Browser validator exists; add CLI validator (Node or Python) for JSON.
- Create sample test scenarios for regression checks.
- Ensure all modules produce stable outputs on sample data.

**Goal:** Prevent breakage when contributors extend scenarios or modules.

---

### 6. Continuous Integration (CI)
- GitHub Actions workflow:
  - Validate `data/scenarios.json` on push
  - Run engine evaluation tests
  - Deploy automatically to GitHub Pages

**Goal:** Reliable deployment and quality assurance.

---

### 7. Paper Development
- Expand `paper.html` into a working paper:
  - Add abstract, related work, references
  - Insert screenshots of the interface
  - Include roadmap as appendix
- Optional: export as PDF for preprint (arXiv, OSF).

**Goal:** Share the project with academic, policy, and open-source audiences.

---

## 🔮 Future Ideas (Post-v1.0)
- Add new ethical modules (e.g., contractualism, rights-based).
- Allow users to save and share parameter settings via URL hashes.
- Multi-agent scenarios with negotiation or bargaining.
- Plugin system for external scenario packs.

---

## 📅 Versioning Plan
- **v0.5** — New scenarios (climate, AI, justice) + explanations
- **v0.6** — Charts/visualizations + scenario editor prototype
- **v0.7** — Validation tools + CI pipeline
- **v0.8** — Expanded paper draft + contributor-ready release
- **v1.0** — Public launch with scenario library and polished interface

---

## 🤝 Contributing
1. Fork the repo and create a branch.
2. Validate your changes (`data/scenarios.json` must pass validator).
3. Submit a PR with:
   - New scenario file or module
   - Documentation updates in `contribute.html` if needed
4. Discussion and review before merge.

---

**Ethics Testbed** is an open project. The roadmap is a living document — contributions, feedback, and debate are welcome.
