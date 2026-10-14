# Phase-2 evidence

Status: evidence record · 2026-10-14

[ARCHITECTURE.md](../../ARCHITECTURE.md) was produced in two research phases. Phase 1 is the eight reports and the critique one folder up. Phase 2 is this folder: gap research the critique asked for, hands-on spikes for the riskiest claims, three competing architecture proposals, and three judges who scored them. The plan cites these files as "gap report A/B/C", "spike S1–S4", "the lean/seams/velocity proposals" and "verdict V1–V13".

These files are a record of how decisions were reached. Where one of them says something the plan later decided differently (for example the spikes still mention a `tokens.legacy.css` fallback, which the plan dropped in §4.2), **ARCHITECTURE.md wins**.

| Cited as | File | What it covers |
|---|---|---|
| Gap report A | [gaps/gap-a-forms-tables-dates.md](gaps/gap-a-forms-tables-dates.md) | Field and form validation, data tables, dates and time zones, the command menu and hotkeys, the input family, measured bundle increments (D16–D20) |
| Gap report B | [gaps/gap-b-i18n-security-states.md](gaps/gap-b-i18n-security-states.md) | Strings, locale determinism and RTL; CSP matrix, Trusted Types and supply chain; the loading, empty and error contract |
| Gap report C | [gaps/gap-c-overlays-dark-a11y.md](gaps/gap-c-overlays-dark-a11y.md) | The overlay layering model and tests O-01…O-25; dark-mode elevation; contrast remediation with computed ratios |
| Spikes S1–S4 | [spikes/README.md](spikes/README.md) | `light-dark()` nesting and Lightning CSS lowering; RSC namespace exports on Next 16.4; Terrazzo 2.8.0 permutations and the Tailwind plugin; the spring → `linear()` solver. Scripts and outputs sit next to the README |
| Lean proposal | [design/proposal-lean.md](design/proposal-lean.md) | Architecture optimised for the smallest runtime |
| Seams proposal | [design/proposal-seams.md](design/proposal-seams.md) | Architecture optimised for swappable layers |
| Velocity proposal | [design/proposal-velocity.md](design/proposal-velocity.md) | Architecture optimised for a small team and a design that is still changing |
| Swappability verdict | [design/verdict-swappability.md](design/verdict-swappability.md) | Scores each proposal on whether each layer can be replaced without forking |
| Correctness verdict, re-runs V1–V13 | [design/verdict-correctness.md](design/verdict-correctness.md) | Technical correctness and performance; re-ran the spikes and size measurements (V1–V13) |
| Feasibility verdict | [design/verdict-feasibility.md](design/verdict-feasibility.md) | Whether two engineers can deliver each proposal on the stated timeline |

**Scripts.**
- [scripts/contrast/](scripts/contrast/): the WCAG 2.2 contrast calculations behind gap report C §3 and ARCHITECTURE §15 (Python 3, no dependencies; `colorlib.py` holds the luminance maths).
- [scripts/measure/](scripts/measure/): esbuild bundle-size measurements (r3's method). `lean-sets.mjs` reproduces r3's 69.0 KB React Aria dashboard set and measures smaller sets; `hooks-sets.mjs` measures the React Aria hooks altitude (verdicts V8 and V9). Pass the path of a `node_modules` that has the engines installed.
- [scripts/probe/](scripts/probe/): the browser probe for `light-dark()` inside `color-mix()` and `box-shadow`, and for inverse scopes.
- [scripts/dialog-spike/](scripts/dialog-spike/): native `<dialog>` behaviour in Chromium, WebKit and Firefox (scroll lock, a manual popover toast inside and outside a modal, focus return), cited as "D-spike" in ARCHITECTURE §12.2.

Dependencies were not copied. The spike folders' `package.json` files pin the exact versions that were run. The helper scripts import `esbuild` or `playwright-core` by bare name, so install those next to them first.
