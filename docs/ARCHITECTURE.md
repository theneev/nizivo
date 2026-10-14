# Nizivo UI — Architecture Plan

Status: Draft v0.1 · 2026-10-14 (the maintainer's answers of 2026-10-15 recorded)
Scope: the architecture, contracts, tooling and roadmap for Nizivo UI, Neev Technologies' open-source React design system built from the Figma file "Nizivo UI Library" (titled "Grove UI Library" until the maintainer renamed it; M16).

Nizivo UI ships as three small npm packages in v0.1: framework-neutral design tokens, React components and generated icons. Styling is static CSS (zero runtime), and server-safe components render with zero client JavaScript under React Server Components.
Every layer (Figma extraction, token build, theme mechanism, CSS, behaviour engine, single component, heavy modules, distribution) sits behind a written contract with a machine check, so it can be swapped later without forking.
v0.1 is deliberately small (about 6 weeks plus a 2-week buffer). Its exit gates are tied to the real state of the Figma file, and it has an ordered cut line.

## Contents

1. [Decisions we need from you](#1-decisions-we-need-from-you)
2. [TL;DR](#2-tldr)
3. [Principles](#3-principles)
4. [Layered architecture and swap seams](#4-layered-architecture-and-swap-seams)
5. [Packages and public API surface](#5-packages-and-public-api-surface)
6. [Repository layout](#6-repository-layout)
7. [Design tokens and theming](#7-design-tokens-and-theming)
8. [Styling contract](#8-styling-contract)
9. [Behaviour layer](#9-behaviour-layer)
10. [Component API conventions with code](#10-component-api-conventions-with-code)
11. [Framework compatibility](#11-framework-compatibility)
12. [Overlays, layering and focus](#12-overlays-layering-and-focus)
13. [Motion](#13-motion)
14. [Charts, icons, media, fonts and opt-in heavy packages](#14-charts-icons-media-fonts-and-opt-in-heavy-packages)
15. [Accessibility baseline and token remediation](#15-accessibility-baseline-and-token-remediation)
16. [Forms, data tables, dates, i18n and RTL](#16-forms-data-tables-dates-i18n-and-rtl)
17. [Performance budgets (measured)](#17-performance-budgets-measured)
18. [Quality: testing, visual regression, a11y automation, docs, Storybook](#18-quality-testing-visual-regression-a11y-automation-docs-storybook)
19. [Release, security, supply chain and OSS governance](#19-release-security-supply-chain-and-oss-governance)
20. [Figma ↔ code workflow](#20-figma--code-workflow)
21. [Roadmap](#21-roadmap)
22. [Risks and mitigations](#22-risks-and-mitigations)
23. [Decision log](#23-decision-log)
- [Appendices](#appendices)

**How to read evidence references.**
- Links go to the research reports in [`research/`](research/) and the Figma page reports in [`figma/`](figma/).
- `C`, `S`, `G` and `M` ids refer to the critique, [`research/00-critique.md`](research/00-critique.md).
- "Gap report A/B/C", "spike S1–S4", the lean/seams/velocity proposals and "verdict V1–V13" are the phase-2 evidence in [`research/phase2/`](research/phase2/README.md) (index in [Appendix D](#d-phase-2-evidence)).
- **VERIFIED** means measured or run locally. **UNVERIFIED** means nobody has checked it yet.

---

## 1. Decisions we need from you

Each item gives our recommendation first, then what each option costs. Nothing else in this plan is blocked on these, except where a v0.1 exit gate says so.

**Status, 2026-10-14.** The maintainer answered every item below except most of the design questions:

| # | Item | Status |
|---|---|---|
| 1 | Licence | **Decided: Apache-2.0** |
| 2 | Package name | **Decided: `@nizivo/react`** |
| 3 | Figma | **Decided: the file stays on the "Vampire D Studio" team (Professional plan).** No move, because there is no budget. The maintainer renamed the file to "Nizivo UI Library" (reported 2026-10-15; M16) |
| 4 | Browser floor | **Decided: Chrome/Edge 123, Firefox 129, Safari/iOS 17.5** |
| 5 | Copy-paste registry | **Decided: yes, at v0.3, items under MIT** |
| 6 | Visual regression | **Decided: in-repo screenshots only.** No paid service |
| 7 | Team | **Decided: Claude Code (an AI coding agent) writes the code; the maintainer reviews and merges.** **2026-10-15: Dayitava is the design contact** and holds both owner roles, design-system lead and accessibility owner, for overrides, proposals and the decision meeting (M15); Dayitava's GitHub username, which CODEOWNERS needs, is pending |
| 8 | Design questions | **(c) answered: allow 12 px.** (h) in part: the maintainer accepted the `spring()` order on 2026-10-14 (M12). (a, b, d–g, i, j) and (h)'s Reduced fades stay on the defaults until the design meeting |
| 9 | GitHub and npm | **Decided: `theneev/nizivo`** (`theneev` is a GitHub user account, not an organisation). The maintainer operates the `neevtechnologies` npm owner account. **2026-10-15: 0.1.0 publishes by hand** from the maintainer's machine with npm 2FA, through a local release script, without provenance (M14) |

**Status, 2026-10-15.** The maintainer's answers of 2026-10-15 (four of them recorded as M13–M16 in [§23.3](#233-maintainer-decisions-2026-10-14)), and what stays open:
- **Import paths (M13):** "we can keep import path per components". One subpath per component (D-h) is now a maintainer decision.
- **Publishing (M14):** "for no lets publish by hand, like we can make script if needed". 0.1.0 publishes by hand from the maintainer's machine with npm 2FA, through a local release script written in W5–W6, not through GitHub Actions OIDC trusted publishing. npm provenance needs CI, so 0.1.0 ships without it. Trusted publishing and provenance return when Actions is turned back on ([§19.2](#192-release-pipeline), exit criterion 1).
- **Design contact (M15):** "Dayitava is the person". Dayitava "can handle both" owner roles, design-system lead and accessibility owner, for overrides, proposals and the decision meeting ([§15.4](#154-ownership-and-the-override-mechanism)). Dayitava's GitHub username, which CODEOWNERS needs, is still pending.
- **Figma file title (M16):** the maintainer renamed the file to "Nizivo UI Library". The file key is unchanged, so links with the old `Grove-UI-Library` slug still open it.
- **Safari 17.5:** the maintainer installed the iOS 17.5 Simulator (free, through Xcode). A builder runs the floor lane on it in week 4 (exit criterion 6).
- **Open: the issue tracker.** GitHub Issues or Linear; the maintainer offered "if needed, we can make a linear workspace and add mcp scoped to this project". An override's `issue` field accepts any `https` URL, so either works with no code change ([§15.4](#154-ownership-and-the-override-mechanism)).
- **Later: docs DNS.** The `CNAME` record at neevtechnologies.in is added later, before the hosting step ([§18.2](#182-docs-site-public)).

**Standing constraint: zero spend.** Nothing in this plan may require a paid service, seat or plan upgrade. Every paid option below is kept for the record and marked *not funded*. Free tiers are used only where their terms allow use by a company (for example, GitHub Actions on a public repo, GitHub Pages).

**Standing constraint: nothing runs on GitHub Actions for now (2026-10-14).** The maintainer reports the account's monthly Actions minutes are used up and asked that every check run locally. The `CI` workflow is disabled on GitHub, so pushes start no runs; `gh workflow enable CI -R theneev/nizivo` turns it back on when the maintainer says so. GitHub's billing docs say standard hosted runners on public repos do not draw on the included minutes, which cover private repos, so lifting this is the maintainer's call rather than a billing limit on this repo. Until then: a local gate that mirrors `ci.yml` replaces CI (`pnpm check` in the root `package.json`, described in `CONTRIBUTING.md`); the daily drift check ([§7.7](#77-drift-detection)) runs as a local command; GitHub Pages deploys (also Actions) wait; and because trusted publishing runs on Actions ([§19](#19-release-security-supply-chain-and-oss-governance)), the publish path was revisited: **0.1.0 publishes by hand** (decided 2026-10-15, M14; [§19.2](#192-release-pipeline)).

**1. Licence: Apache-2.0. Decided 2026-10-14.**
- *Apache-2.0* (with a `TRADEMARKS.md` and DCO sign-off): an explicit patent grant from contributors, defensive termination, and a trademark reservation for "Nizivo". Company-backed peers use it (React Spectrum, IBM Carbon). With no `NOTICE` file, the §4(d) propagation duty never arises. Redistributors still keep the licence text and attributions (§4(a), (c)), and anyone who modifies a file must mark it as changed (§4(b)). That last duty would reach consumers who edit copy-paste registry items, so registry item source is published under MIT (decision 5). It is incompatible with GPLv2, which rarely matters for a UI library. Evidence: [r5 §11](research/r5-quality-docs.md).
- *MIT*: the most familiar licence (Radix, Base UI, shadcn/ui, Mantine), but it has no patent grant or trademark clause.
- Either is compatible with every dependency (React Aria and `@internationalized/date` are Apache-2.0, Lucide is ISC; gap report B §B5). It had to be decided before the repo went public, because relicensing after outside contributions needs every contributor's consent. Decided before the first commit, so exit criterion 13 is met.

**2. Package naming: `@nizivo/react`, not `@nizivo/ui`. Decided 2026-10-14.**
- **We earlier told you the import would be `import { Button } from "@nizivo/ui"`. This plan changes that.** The import becomes `import { Button } from "@nizivo/react"`, or per component `import { Button } from "@nizivo/react/button"`.
- Why: the package is a React binding. Naming it for its framework keeps `@nizivo/tokens` (and a later `@nizivo/css`) framework-neutral, and leaves an obvious name for any future non-React port (critique C1, [r8 §5.2](research/r8-extensibility-distribution.md)). All three proposals and all three judges agreed.
- v0.1 publishes `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons`; `@nizivo/charts` follows in v0.2.
- *If you prefer `@nizivo/ui`*: it is a one-field change per `package.json` until 0.1.0 ships, which is free. After the first publish, a rename costs a re-export shim package (one more trusted-publisher setup) plus a codemod.

**3. Figma: the file stays on "Vampire D Studio" (Professional). Decided 2026-10-14.**
- *Decided:* the maintainer confirmed in the Figma UI that "Grove UI Library" (since renamed "Nizivo UI Library" by the maintainer; M16) belongs to the **Vampire D Studio** team, which is on the **Professional** plan. The zero-spend constraint rules out upgrading "The Neev", so the file does not move. Everything the token pipeline needs works on Professional: variable modes, TokensBrücke, the `LIBRARY_PUBLISH` webhook (created by a team admin) and MCP at 200 calls a day.
- *Accepted risk (R3):* the file sits on a team that Neev does not formally own. Mitigations: a Neev person keeps edit or admin access to the team; every sync commits the raw TokensBrücke export to `figma/raw/`, so the repo can rebuild its tokens even if the file is lost; and a `.fig` backup is downloaded at each minor release.
- *The original analysis follows, kept for the record. The paid recommendation in it is not funded.*
- *Facts* (critique S-d, [r7 §8](research/r7-token-pipeline.md)): the connected account has seven Starter teams (including "The Neev") and one Pro team. Before 2026-10-14 nobody had confirmed which team owns "Grove UI Library". The file's 2–3-mode collections suggested a paid team.
- *What each plan allows* (rate limits follow the plan of the team that **owns the file**; MCP limits follow the seat):

  | Plan | Variable modes | REST API | Figma MCP | Variables REST API | Code Connect |
  |---|---|---|---|---|---|
  | Starter | cannot create modes | 6 requests/month per file | 20 calls/month | no | no |
  | Professional | yes (up to 10 per collection, UNVERIFIED) | 10–50/min by tier (tier mapping UNVERIFIED); webhooks (150) | 200/day, 10/min | no | no |
  | Organization | yes | higher | 200/day, 15/min | no | **yes** ($55 Full / $25 Dev per seat per month, annual) |
  | Enterprise | yes | higher | 600/day, 20/min | **yes** | yes |

- *Original recommendation (not funded):* upgrade "The Neev" to Professional (Full $16, Dev $12 per seat per month) and move the file there.
- *Consequences that still hold:* **never move the file to "The Neev" while that team is on Starter.** Doing so would break the multi-mode token setup and the agent extraction path. Organization is worth it only for Code Connect; the plan works without it (see [§20](#20-figma--code-workflow)). Variables REST needs Enterprise, and the plan does not need it.
- Exit criterion 12 now asks only that the owning team is confirmed and the mitigations are in place.

**4. Browser support floor: Chrome/Edge 123, Firefox 129, Safari/iOS 17.5. Decided 2026-10-14.**
- This floor is set by the platform features the CSS uses: `light-dark()` (Safari 17.5), `@starting-style` and `transition-behavior` (Firefox 129, Safari 17.5). The current Firefox ESR is 153, so nobody on a supported Firefox is excluded. React `^19.2.0` and Node `>=22.12` are already settled.
- *Lower to Safari 16.4* (the Next.js 16 and Tailwind 4 floor): Lightning CSS cannot lower `light-dark()` correctly. Spike S1 showed the lowered output breaks nested themes and renders **transparent** colours when the root has no scheme. So 16.4 would need a different theme mechanism: duplicated theme blocks (about 2× the colour CSS), which cannot express inverse surfaces inside nested themes, plus instant overlay entry with no animation. Consumer themes are written in `light-dark()` too ([§7.9](#79-consumer-theming-recipes-docs)), so the mechanism is public API. **Lowering later is a breaking change, not a build switch**: no block output is built ([§4.2](#42-seam-ledger)).
- *Raise the floor later*: each raise deletes fallbacks and unlocks native swaps behind the adapter (for example native `popover` light dismiss at iOS 18.3).

**5. Copy-paste registry: yes, at v0.3. Decided 2026-10-14.**
- *Yes:* domain compositions (commerce, Instagram storefront, dashboard templates, a TanStack data-table block) become shadcn-compatible registry items. The items are generated from the same example files the docs render in v0.2. They are hosted on the docs site with immutable versioned URLs, a SHA-256 manifest and an item-policy linter (gap report B §B6). Consumers own the copied code and get no automatic updates, so only thin compositions go there. Anything with behaviour or accessibility contracts stays on npm (critique C12).
- *Licence of registry items:* **MIT**, whatever decision 1 picks (a `patterns/LICENSE` from the first commit, so DCO contributions there are MIT too). Consumers who edit a copied file then owe no Apache §4(b) change notice.
- *No:* compositions stay as copyable docs examples only. That is cheaper, but consumers copy by hand with no versioned source.

**6. Visual regression: in-repo screenshots only. Decided 2026-10-14 (zero spend).**
- *In-repo (chosen):* Vitest `toMatchScreenshot` in a pinned Playwright Docker image. Baselines are committed as ordinary files, not Git LFS, while the set stays small (the v0.1 matrix is light mode at desktop width, cropped to the component). LFS has its own free quota, which CI checkouts would consume; it is adopted only if baselines outgrow plain Git, and after its current free quota is checked. Diffs are reviewed as CI artefacts.
- *Argos Pro (not funded):* a hosted review UI, about $100 a month. Argos' free Hobby tier is for personal projects, and its open-source sponsorship requires "not for commercial use" ([r5 §5](research/r5-quality-docs.md)), so neither free route fits a company project.

**7. Team: Claude Code builds, the maintainer reviews. Decided 2026-10-14.**
- *Decided:* Claude Code (an AI coding agent) writes the code, tests and docs, working through the roadmap phases in order. The maintainer reviews and merges, and does the steps that need a human account: GitHub repository settings, npm publishing with 2FA (0.1.0 by hand through the local release script, M14; the trusted-publisher setup waits until Actions is back on), Figma exports and DNS. Designer time is unknown, so every design question runs on its default until answered. **2026-10-15 (M15):** Dayitava is the design contact ("Dayitava is the person") and holds both owner roles, design-system lead and accessibility owner, for overrides, proposals and the decision meeting.
- *What this changes:* the weeks in [§21](#21-roadmap) are now an **ordering of work**, not a calendar; progress depends on review turnaround and on the human inputs above. Roles that need a person stay with people. The designer signs off light renders (exit criterion 11). The maintainer acts as accessibility owner for the manual screen-reader and forced-colours passes (exit criterion 14), backed by the automated checks. Since 2026-10-15 Dayitava holds the accessibility-owner role for overrides, proposals and the decision meeting (M15); the answer did not cover criteria 11 and 14, so those passes stay as written until the maintainer says otherwise.
- *Original assumption, for the record:* 2 front-end engineers, a designer at about 50%, and one engineer acting as accessibility owner.

**8. Questions for the design team.** The full design backlog, with every missing state and token request, is in [figma-handoff.md](figma-handoff.md). These are the ones that block code:

| # | Question | Handoff ref ([figma-handoff.md](figma-handoff.md)) | Needed by | Our default until answered |
|---|---|---|---|---|
| a | **Breakpoints beyond 640 px.** The only designer-stated threshold is "Below 640px the sidebar becomes a five-tab bar" (08). What width switches the sidebar from rail to expanded, and is there a tablet `md`? Which sidebar items go in the mobile "More" sheet, and is an off-canvas sidebar wanted on tablet portrait? | Q3, Q13, Q35 | start of v0.2 (≈ week 8); AppShell depends on it | Desktop values at a **provisional** `lg` = 1280 px, outside semver; no `md`; below 640 px the MobileTabBar replaces the sidebar, and the rail shows from 640 px |
| b | **Sidebar widths.** The tokens say 264/72/0; the frames are drawn at 248/76. Which is right? | Q4 | start of v0.2 | Tokens (264/72/0), because they sync automatically |
| c | **12 px caption.** The rule is "Nothing smaller than 14px", but several dense places might want 12 px. | Q20 | before v1.0 | **Answered 2026-10-14: allow 12 px.** Two code-owned text-style proposals, `Body/S` and `Label/S` at 12 px, emitted as `--nz-font-body-s` and `--nz-font-label-s` (names confirmed by the week 1 Terrazzo dry run; [§7.6](#76-code-owned-tokens)); lint floor 12 px; components keep their Figma sizes unless a change is listed on the Deviations page ([§15.1](#151-baseline)) |
| d | **Dark mode.** No dark render exists. Please review rendered dark pages 02, 04, 06 and 07 with our proposed elevation (floating surfaces on `bg/surface-raised`, an 8% white ring, shadows at 6× alpha). | ask #10, Q18 | v0.2 (dark leaves "preview") | Dark ships as **preview** in v0.1 |
| e | **Text contrast ladder.** Accept "Option A": light secondary/tertiary n700/n600, dark n300/n400. | Q8 | v0.1 week 2 | Shipped through the time-boxed override file |
| f | **Missing tokens.** `bg/scrim`, `bg/accent-hover` (and pressed), `bg/critical-hover`, `text/on-critical`, `text/accent`, `icon/info`, `border/control` (≥ 3:1), `border/control-hover`, `chart/warning`, `chart/critical`, and four new primitives. | ask #4 | v0.1 week 2 | Code-owned proposals with expiry dates. Week 2 ships all of them except `bg/accent-pressed`, among 19 proposals in all (with `Body/S`, `Label/S`, `duration/fade`, `duration/pulse` and `scale/enter`), all expiring 2027-01-31. `bg/accent-pressed` is not shipped: no value for it exists yet ([figma-handoff §1.5](figma-handoff.md#15-asks-from-week-2-2026-10-14)) |
| g | **Missing states.** Most sets lack Focus, Disabled, Loading and Error; Accent has no Pressed; Mobile Tab Bar has 2 of 5 Active values. | ask #5 | rolling | Built from tokens; listed on the docs "Deviations" page |
| h | **Motion.** Confirm that `spring(1, 260, 24, 0)` means (mass, stiffness, damping, velocity). Confirm that Reduced mode should keep short fades (Figma sets `duration/fast` to 0, which removes them). | Q1, Q34 | v0.1 week 1 | **Order accepted 2026-10-14** (the maintainer: "string numbers look fine"; M12). Reduced fades kept at 120 ms until Q34 is answered |
| i | **Toasts.** Do toasts with an action persist until dismissed (WCAG 2.2.1), or vanish in 5 s? | Q7 | v0.2 | Toasts with an action, and critical toasts, persist |
| j | **KPI tile tint.** Figma's "Tinted" is two fills coupled to the trend. May we decouple it into `tone="brand" \| "accent"`? Should cards draw a shadow at rest (the compositions draw none)? | Q12, Q5 | v0.2 | Decoupled; no shadow at rest |

**9. GitHub repo and npm owner account. Decided 2026-10-14: `theneev/nizivo`, public.**
- *Decided:* the repo is `github.com/theneev/nizivo`, created by the `theneev` account. It is **public from the first push**, because the licence is settled and public repos get free GitHub Actions minutes on every standard runner (private repos have metered minutes, with macOS counted at 10×). The maintainer holds the 2FA for the `neevtechnologies` npm owner account, which owns the `@nizivo` scope.
- *Because `theneev` is a user account, not an organisation:* collaborators on a personal repo get write access but cannot change settings. The owner account therefore makes the settings changes itself: the `npm` deployment environment, branch rules and GitHub Pages. Transferring the repo to a free GitHub organisation later is possible, but do it **before 0.1.0 publishes**; afterwards every trusted-publisher config has to be edited. (2026-10-15: 0.1.0 publishes by hand, M14, so no config exists until Actions is back on; the published `repository` fields still name the repo.)
- *Original recommendation:* `<Neev org>/nizivo` on GitHub. Name the person who holds the 2FA for the `neevtechnologies` npm owner account.
- *Why it binds:* each trusted-publisher config (tokens, react and icons once Actions is back on, since 0.1.0 publishes by hand, M14; charts at 0.2.0 if Actions is on by then) names the repo and `release.yml`, and each needs its own interactive 2FA setup by that owner ([§4.2](#42-seam-ledger), [§19.2](#192-release-pipeline)). Unvalidated configs expire after 48 hours. Moving or renaming the repo later means updating every config.
- Needed in week 0. It is a v0.1 exit gate (exit criterion 1, changed 2026-10-15 by M14: 0.1.0 is published by hand from this repo's `main`). The former `<neev-org>` and `<org>` placeholders in this plan now read `theneev`.

---

## 2. TL;DR

```
 DISTRIBUTION  npm: @nizivo/tokens · @nizivo/react · @nizivo/icons · @nizivo/charts (v0.2)
               docs examples (v0.2) ──same source──► shadcn registry /r/v{x.y.z}/ (v0.3; item source MIT)
                      │ public entries only
 HEAVY         @nizivo/charts (server SVG + 0.6 KB island) · @nizivo/icons (generated) · react/motion hooks
               ── meet core ONLY through element slots: chart={<Sparkline/>}, leadingIcon={<Icon/>}
                      │
 COMPONENTS    @nizivo/react/<name>: props · parts (namespace + flat) · render · (value, details) callbacks
               server-safe modules (no directive) │ public *.client.tsx leaves (own classes, data-slot, Field wiring)
                      │ import only through ./engine (generated from component.json + the <Name>Engine interface)
 BEHAVIOUR     _engines/react-aria/<name>.client.tsx implements <Name>Engine  ── the ONLY importers of react-aria*
                      │ emits only the Nizivo data-* vocabulary
 CSS           styles.css · css/base.css (a11y floor) · css/<name>.css   ── first line: the canonical @layer statement
               contract: nz-* classes · data-slot · data-* vocabulary · --nz-<name>-* hooks (read, never assigned)
                      │ reads only public --nz-* token names
 TOKENS        @nizivo/tokens: tokens.css (light-dark() once on :root) · tailwind.css · tokens.json · JS refs
                      ▲ Terrazzo 2.8.0 + 4 small plugins (golden-file tested)
 SOURCE        Figma "Grove"→"Nizivo" ─TokensBrücke→ figma/raw/ ─normalize→ figma-owned/ + code-owned/ (+ a11y overrides, proposals)
```

- **Import is `@nizivo/react`, not `@nizivo/ui`** (decision 2). Three npm packages in v0.1; charts in v0.2; the lab only after 1.0 and only if someone asks.
- **Zero runtime styling.** Plain CSS compiled by Lightning CSS, shipped as static files. Published JS never imports CSS. Server-safe components ship **0 KB** of client JS under RSC.
- **One canonical layer statement:** `@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;`. The order is semver'd public API.
- **Behaviour:** native HTML first (T0). React Aria is the **single** engine family for widgets the platform cannot do yet (T1), behind a per-component adapter and a typed engine interface. Our own code on platform APIs covers Toast, file upload and table selection (T2).
- **Every swap point is a file plus a check:** `component.json` (`"engine"`), a generated `engine.ts`, a conformance suite that asserts classes, `data-slot` and `data-*` (engine attributes are stripped by `engineDom`), and a check on **emitted** CSS that forbids any selector outside the documented vocabulary. Overlay-family components share one `OverlayEngine` and swap engines together.
- **The seam is proven, not promised:** a second Tooltip adapter (React Aria hooks with our own DOM; 7.2 vs 14.3 KB measured) passes the same suite from v0.2. A Base UI canary (Dialog and Select together, on one overlay core) runs nightly from v0.3.
- **Tokens:** Figma variables → DTCG 2025.10 → Terrazzo 2.8.0. Names follow the Figma `codeSyntax`, rewritten to `--nz-*` in the Figma file on 2026-10-14 (`--nz-bg-surface`); the normalizer accepts the `Grove` and `Nizivo` prefixes and keys tokens on Figma variable ids. Dark mode uses `light-dark()` once on `:root` and is **opt-in**, so host apps never repaint by surprise. The theme mechanism and the `light-dark()` consumer theme format are public API.
- **Accessibility:** a 2 px solid focus outline (including label-wrapped native inputs), a two-axis 44 px touch target, and forced-colours rules for borders and every fill- or shadow-painted state live in `nz.base`, so they survive a re-skin. Figma's contrast failures are fixed through a time-boxed, public override file (and a proposals file for new tokens) that CI deletes once Figma catches up.
- **Overlays:** engine portals in one z band ordered by DOM. Toast is the only top-layer element. Native `<dialog>`/`popover` remain a planned per-component swap, gated by four platform blockers and by tests proving each native adapter coexists with the family's `OverlayEngine`.
- **Budgets come from measurements** (gzip, React external): dashboard overlay set ≤ 75 KB, Select ≤ 66, Dialog ≤ 31, Tooltip ≤ 16, AreaChart ≤ 3.6 KB.
- **v0.1 in about 6 weeks plus 2 weeks of buffer** at the originally assumed team size (now an ordering of work, since Claude Code builds; decision 7), with an ordered cut line and design-reality exit gates: one real Figma→PR token sync merged, designer sign-off on light renders, and dark shipped as "preview".

---

## 3. Principles

| Principle | What it means in practice | How we know it holds |
|---|---|---|
| **Lightweight** | Pay per interaction. T0 components cost 0 KB on server-rendered pages; engine weight appears only where an engine widget is used. Every budget starts from a measurement. | `size-limit` per subpath (gzip, measured + 10%); the Next fixture asserts no `@nizivo` client chunk on a server-only page |
| **Server-first** | No required provider. `'use client'` only on interactive leaf modules. Links and images go through `render` and element slots. Sync server-safe parts may call `useId` (critique S6, VERIFIED in `react@19.3.0`). | Directive guard (src vs dist); a lint that fails `export * as` targeting a directive module; RSC fixture on both bundlers |
| **Swappable layers** | A seam exists only if it has a contract file, a machine check, a known price, and a realistic second implementation (the *seam ledger*, [§4.2](#42-seam-ledger)). | Each row of the ledger names its check |
| **Accessible by default** | WCAG 2.2 AA in light mode blocks every release. Native semantics first, then APG patterns through the engine. The a11y floor lives in `nz.base`. | axe in every story; conformance suites; contrast matrix over every theme permutation |
| **Design-token-driven** | CSS reads only public `--nz-*` semantic tokens. Primitives (`--nz-p-*`) are private. Theme logic exists only in the tokens package. | stylelint (token names must exist in `contract.json`; no `light-dark(`, `prefers-color-scheme` or `[data-nz-theme` outside tokens) |
| **Boring tooling** | One engine family, one linter, one generator, three packages. Pre-1.0 tools (tsdown, oxfmt, pnpm 12) are exact-pinned behind shared presets with a documented fallback. | Renovate approval for tooling minors; unbundled output keeps the bundler replaceable |
| **Honest about WIP design** | Anything designers have not confirmed ships as `preview`, `provisional` or `unstable/*`, outside semver. | Docs banners; `$extensions["app.nizivo.status"]`; the `unstable/*` exports lane |

---

## 4. Layered architecture and swap seams

### 4.1 Layers

Each layer below lists its responsibility, its contract (the files both sides may rely on), how the contract is enforced, and the step-by-step way to replace the layer.

#### L0 — Design source and extraction

- **Responsibility:** get Figma variables, text styles and effect styles into the repo as a raw snapshot.
- **Contract:** `packages/tokens/figma/raw/**` in TokensBrücke's split-mode DTCG 2025.10 shape: `{Collection}/{Mode}.tokens.json` for a multi-mode collection, `{Collection}.tokens.json` for a one-mode collection, and `Typography-styles.tokens.json` and `Effect-styles.tokens.json` for styles ([§7.1](#71-pipeline-figma--dtcg--outputs); the CLI's layout, and the plugin's is checked on its first run). The normalizer keeps Figma ids in `$extensions["dev.nizivo.figma"]` (variable ids, and `styleId` for text styles; the export has no variable keys, and effect styles have no id), and they are the token identity: override entries and drift checks key on the variable id, never on a display name. The normalizer reads collections matching `^(Grove|Nizivo) ` and styles matching `^(Grove|Nizivo)/`, and strips either prefix, so the Grove → Nizivo rename, applied in the Figma file on 2026-10-14 ([§20.3](#203-hygiene-contract-between-design-and-engineering)), changes nothing downstream.
- **Enforcement:** a schema check in the normalizer; the CI invariant `normalize(raw) === src/figma-owned/**`; a both-prefix test, which renames the real export to `Nizivo` inside the test and must normalize it to byte-identical `src/figma-owned/**` (W1: it does).
- **Replace the extractor:**
  1. Write an adapter that emits the same raw snapshot (the TokensBrücke CLI fed from an MCP `use_figma` dump, a manual export, or `tz import` on Enterprise).
  2. Accept it when, for one Figma version, its raw normalizes to byte-identical `src/figma-owned/**` and the token diff is empty. (Recomputing the invariant from whatever raw is committed cannot catch a non-equivalent extractor.)

#### L1 — Token build

- **Responsibility:** turn the DTCG source plus the resolver into every token output.
- **Contract:** the DTCG 2025.10 source (`src/figma-owned/**`, `src/code-owned/**`) and `src/nizivo.resolver.json` (sets `primitives` and `foundation`; modifiers `theme`, `motion` and `viewport`).
- **Enforcement:** golden-file tests that byte-compare every file in `dist/`; `tz check`/lint; the contrast matrix; the a11y-override checks.
- **Replace the builder** (Terrazzo 2.8.0 → Style Dictionary 5.6.1):
  1. Add `build/style-dictionary/` reading the same source.
  2. Make it reproduce every golden file.
  3. Flip the `build` script and delete the Terrazzo config. Consumers see nothing.
  - Note: Style Dictionary has no DTCG resolver support yet (issue #1590), so theme permutations would be hand-rolled. The swap is **UNVERIFIED**: the Style Dictionary spike installed dependencies but never ran.

#### L2 — Token outputs and theme mechanism

- **Responsibility:** the public token names, and how themes resolve.
- **Contract:** `@nizivo/tokens/contract.json` lists every public `--nz-*` name with its type and layer. The theme mechanism (`light-dark()` plus `color-scheme` scopes) and the consumer theme format (`light-dark()` values in `@layer nz.themes`, [§7.9](#79-consumer-theming-recipes-docs)) are **public and semver'd**.
- **Enforcement:** the token-diff PR comment (a removed or renamed public name is breaking); stylelint in component CSS (names must exist in `contract.json`; `--nz-p-*` is banned outside tokens; no theme logic outside `packages/tokens`); the S1 nesting matrix as a browser fixture.
- **Replace the theme mechanism:** a breaking change. Duplicated theme blocks for a Safari 16.4 floor are a seam deliberately not built ([§4.2](#42-seam-ledger)): block selectors cannot express inverse surfaces inside nested themes, the S1 matrix never ran on them, and no consumer needs them. Component CSS would still be unchanged, because it contains no theme logic.
- **Replace the whole theme (consumer):** ship a stylesheet that defines the names in `contract.json` inside `@layer nz.themes { … }` or unlayered. No fork and no rebuild.

#### L3 — CSS contract

- **Responsibility:** what consumers' CSS, overrides and re-skins may rely on.
- **Contract:** the canonical layer statement (`contracts/layers.css`), `nz-*` classes, `data-slot` values, the `data-*` vocabulary (`contracts/vocabulary.json`), the public hooks `--nz-<component>-*`, and the CSS file paths. Each component's surface is extracted to `contracts/api/css/<name>.json`.
- **Enforcement:**
  - `check-css-vocabulary.mjs` parses every **emitted** CSS file with Lightning CSS. It fails on any selector that uses a class, `data-*` name or value outside the vocabulary. The adapter strips engine `data-*` attributes such as `data-rac` ([§9.3](#93-contract-rules-keep-the-seam-honest) rule 6); only an undocumented per-engine functional allowlist reaches the DOM, and no shipped CSS may target it.
  - stylelint: no declaration of public hooks; spring easing paired with its duration; logical properties only; the layer line comes first; `font-size` ≥ 0.75rem (12 px, decision 8c), and 12 px only through the `Body/S` and `Label/S` tokens.
  - A Lightning CSS output guard fails on any `--lightningcss-*` variable, which would mean `light-dark()` was lowered (S1).
  - W2: the emitted-CSS check and the Lightning CSS guard run inside the react build (`packages/react/scripts/build-css.ts`, with `scripts/css/{compile,emitted,floor,exports}.ts`), not as separate `tooling/checks` scripts. The build also fails when a `dist/css` file has no exports entry.
  - The manifest diff classifies every change for the changeset.
- **Replace the authoring tool** (for example vanilla-extract or Panda `cssgen`): emit the same `dist/css/**`. The change is accepted when the manifest diff is empty and visual regression is clean.
- **Re-skin one component (consumer):** stop importing `css/<name>.css` and own a copy (or install the `<name>-css` registry item from v0.3). Markup, classes, `data-*`, behaviour and the a11y floor in `nz.base` keep coming from npm.

#### L4 — Behaviour adapters

- **Responsibility:** keyboard, focus, ARIA, positioning, dismissal and collections for T1 widgets.
- **Contract:** `<name>.contract.ts` holds the engine-free public types plus a `<Name>Engine` interface (one typed function per part), including the engine-rendered strings as `<Name>Labels` keys ([§16.4](#164-internationalisation-and-rtl-gap-report-b-part-a)). Adapters receive Nizivo DOM props and a normalised `render` function. They return elements carrying only vocabulary `data-*` attributes, derived from the engine's **render state**, never by copying engine DOM attributes (engine DOM props pass through `engineDom`, [§9.3](#93-contract-rules-keep-the-seam-honest) rule 6). Each engine family also implements one **`OverlayEngine`** (`_engines/<engine>/overlay.client.tsx`: portal container, hide-outside, scroll lock, dismiss stack, focus-return chain, `markTopLayer(el)`), shared by every overlay adapter of that family ([§12.2](#122-shared-mechanics-one-implementation-used-by-every-overlay)).
- **Enforcement:**
  - oxlint `no-restricted-imports` plus dependency-cruiser: only `src/_engines/**` may import `react-aria*`. That covers the hooks behind Toast, FileUpload and the hooks Tooltip too: each has `"engine": "react-aria"` and a `<Name>Engine` contract, whatever its tier.
  - A ts-morph walk of the `.d.ts` import graph from every `types` condition in the exports map fails if it reaches `react-aria*`, `@react-aria/*`, `@react-stately/*`, `@internationalized/*` or any `_engines/**` file. (Adapters ship per-module declarations in `dist/`, so a string grep would fail on harmless internal paths and miss the real requirement: no engine type is **reachable** from an export.) `isolatedDeclarations` forces explicit return types, so engine types cannot leak through inference.
  - The conformance suite `testkit/<name>.conformance.ts` runs per engine; the overlay O-tests run against each family's `OverlayEngine`.
  - `nz gen` fails if a component with `"overlay": true` names an `engine` other than the overlay default in `packages/react/engines.json`. The only exception is a gated native adapter ([§12.4](#124-native-swap-gates)), allowed once its coexistence tests pass.
- **Replace the engine for one component** (only components with `"overlay": false`):
  1. Write `_engines/<engine>/<name>.client.tsx` implementing `<Name>Engine`.
  2. Run `pnpm testkit --component <name> --engine <engine>`.
  3. Compare the `size-limit` diff in the PR.
  4. Re-map the engine-owned strings: pass every `<Name>Labels` key the new engine accepts, and update the "engine-owned" list on the docs page.
  5. Set `"engine": "<engine>"` in `<name>/component.json` and run `pnpm nz gen` (it rewrites one import specifier in `engine.ts`).
  6. Ship a **minor** changeset: "internal engine change, no API change".
- **Overlay family** (Dialog, Drawer, Popover, Select, Menu, Combobox, Tooltip, the Toast region, CommandMenu and the DateRangePicker popover) swaps **together**: write the new family's `OverlayEngine` and every overlay adapter, run the O-tests and conformance for all of them, then change the default in `packages/react/engines.json`. A per-component swap would put two overlay cores in one app (one hiding outside content with `inert`, the other with `aria-hidden`, each with its own scroll-lock count and dismiss stack), which [§12.2](#122-shared-mechanics-one-implementation-used-by-every-overlay) forbids. The `engine` value names a **family**: the v0.2 hooks Tooltip is a second adapter inside the `react-aria` family (`"adapter": "hooks"`), so it shares that family's `OverlayEngine`.
- **Whole family:** repeat per component (the overlay family as one set), then drop `react-aria-components`, `react-aria` and, if no date entry still needs it, `@internationalized/date` from `dependencies`.
  - **Consumer impact:** the CSP nonce meta ([§11.1](#111-per-framework-setup-and-gotchas)), the locale-optimizer plugin recipe and the engine-owned strings ([§16.4](#164-internationalisation-and-rtl-gap-report-b-part-a)) are engine-specific. A family swap therefore ships as a minor **with a migration note**, never as "no API change".

#### L5 — Components

- **Responsibility:** the public React API: props, parts, `render`, slots, labels, `status`, callbacks.
- **Contract:** `contracts/api/react/<name>.json` (generated by ts-morph: props, defaults, parts, details reasons) and the `.d.ts` snapshot.
- **Enforcement:** the API diff (a removed prop needs a breaking changeset); `expect-type` tests; the RSC fixture rendering namespace and flat imports from a Server Component.
- **Replace one component (Nizivo):** reimplement it behind the same props and parts; the same conformance suite; a minor release.
- **Replace one component (consumer), in increasing depth:**
  - **E0 theme:** override semantic tokens.
  - **E1 restyle:** hooks, `className`, unlayered CSS.
  - **E2 recompose:** parts with `render`.
  - **E3 re-skin:** own the component's CSS.
  - **E4 replace:** render the documented markup with `nz-*` classes and `data-*`, using the public helpers at `@nizivo/react/contracts` (`renderElement`, `mergeProps`, `stateAttrs`), so Nizivo's CSS still styles it.
- **Plug out:** move a component to `unstable/<name>` with a deprecated stable re-export for one minor. Removing a component means deleting its folder and running `nz gen`.

#### L6 — Heavy modules (charts, icons, motion hooks, lab)

- **Responsibility:** anything with its own runtime dependencies or a different release risk.
- **Contract:** element slots typed `ReactNode` (`KpiTile chart={…}`, `Button leadingIcon={…}`, and the glyph slots in [§14.2](#142-icons-nizivoicons)); `ChartFrame` accepts any renderer child through `chart-frame.contract.ts` ([§14.1](#141-charts-nizivocharts-v02)); charts scales implement a structural `ScaleLike` (callable plus `domain()` and `ticks()`), so d3 scales plug in unchanged; `IconProps` is the Lucide-shaped (stroke) contract of `@nizivo/icons`.
- **Enforcement:** dependency-cruiser: `@nizivo/react` never imports `@nizivo/charts` or `@nizivo/icons`; a lint bans `@nizivo/icons` and `lucide*` imports inside `packages/react`; `@nizivo/charts` imports nothing from `@nizivo/react`. `nz gen` generates charts' vendored `render`/`mergeProps` helpers from core's and CI fails on a diff. A charts-only fixture (`tokens.css` + `charts/styles.css`, no react CSS) runs axe and focus-visible checks.
- **Replace:** put Recharts, ECharts or uPlot inside `<ChartFrame>` (pass `table` and `interaction="none"`); pass any icon `ReactNode`; regenerate `@nizivo/icons` from another **stroke** icon set using `aliases.json`. A non-stroke source changes `IconProps`, so it ships as a major or as a separate package.

#### L7 — Distribution and docs

- **Responsibility:** npm packages, the docs site, and (v0.3) the registry.
- **Contract:** explicit `exports` maps (no `./*` wildcard), generated and drift-checked. Registry items depend only on `@nizivo/*`, at `~x.y.0` of the release that built them. (`shadcn add` writes item dependencies into the consumer's `package.json`; exact pins from items built at different releases would flip or downgrade the consumer's core and, through the fixed group, its tokens.)
- **Enforcement:** exports drift check; publint and attw; tarball content allowlist; the registry item-policy linter.
- **Swap channels:**
  - *npm → registry:* deprecate the export in a minor. For a component **without an engine**, the registry offers a `<name>-source` fork item labelled "no updates". An engine-backed component's adapter imports the engine and `_engines/**` is not exported, so it offers a `<name>-css` re-skin item plus E4 replacement through `@nizivo/react/contracts` instead. An engine fork item, if ever offered, declares the engine package at the same range as `@nizivo/react` and is labelled "engine-coupled".
  - *Registry → npm:* graduate the pattern to `unstable/<name>` once its Figma set has been unchanged for two sync cycles and it is used in two products. The registry item becomes a thin re-export.
  - *Registry off:* stop publishing; copies already in consumer code are unaffected.

### 4.2 Seam ledger

**Rule (an ADR and a `CONTRIBUTING.md` section):** a new seam needs a contract file, a machine check, a price in bytes and team-hours, and a realistic second implementation. Otherwise it is not built.

| # | Seam | Contract file | Machine check | Runtime cost | Second implementation |
|---|---|---|---|---|---|
| K1 | Extractor | `figma/raw/**` schema; identity = Figma variable id | `normalize(raw) === figma-owned`; both-prefix test (built from the real export inside the test; output byte-identical) | 0 | MCP dump, manual export, REST on Enterprise |
| K2 | Token builder | DTCG source + resolver | golden files | 0 | Style Dictionary 5.6.1 (UNVERIFIED) |
| K3 | Token names | `contract.json` | token diff; stylelint | 0 | any consumer theme |
| K4 | Theme confinement | "no theme logic outside tokens"; the public `light-dark()` theme format | stylelint; S1 fixture | 0 | consumer themes in the public format. A mechanism swap is a major: block output is deliberately not built (below) |
| K5 | CSS contract | `contracts/layers.css`, `vocabulary.json`, `api/css/*.json` | emitted-CSS vocabulary check; manifest diff; VR | 0 | consumer re-skins; another authoring tool |
| K6 | Behaviour engine | `<name>.contract.ts` + `<Name>Engine`; one `OverlayEngine` per family; `engines.json` | per-engine conformance; `.d.ts` import-graph walk; `engineDom` filter; overlay-family check in `nz gen` | est. ≤ 0.5 KB shared (`stateAttrs`, `EngineLocale`, details); measured in v0.1 | Tooltip on react-aria hooks inside the `react-aria` family (v0.2); Base UI Dialog + Select canary on one Base UI overlay core (v0.3) |
| K7 | Composition | `contracts/render.ts` | render-merge conformance; RSC fixture | est. ~0.4 KB | router links, `next/image`, motion elements |
| K8 | Heavy modules | slot props typed `ReactNode` (including the glyph slots) | dependency-cruiser; glyph-slot conformance | 0 | any chart library, any icon set |
| K9 | Chart renderer and scales | `chart-frame.contract.ts`; `ScaleLike` | chart conformance: data table and status for any child (a dummy third-party `<svg>` case), keyboard for Nizivo renderers; charts-only fixture | 0 | Recharts/ECharts; d3 scales |
| K10 | Strings and locale | `<Name>Labels` types (including engine-rendered strings); `formatLabel` | catalogue lint (plural categories); locale-determinism test; engine-string test with a locale outside React Aria's 36 | 0.2 KB (measured) | any app i18n stack passing strings; strings an engine will not accept are listed as engine-owned |
| K11 | Form library | control props (`name`, `value`, `onValueChange`, `onBlur`, `ref`, `invalid`) + `useFieldControl()` (`labelledBy` for button-based controls) | recipe tests (react-hook-form, TanStack Form, Conform) | 0 | any form library |
| K12 | Variant augmentation | `@nizivo/react/augment` interface maps | `expect-type` across subpath and barrel | 0 (types) | consumer `declare module` + CSS |
| K13 | Distribution channel | registry item policy (`~x.y.0` ranges; source forks only without an engine) | item-policy linter; fixture `shadcn add` | 0 | npm graduation |
| K14 | Docs/workshop/VR vendor | `*.example.tsx` plain modules | docs and Storybook both build | 0 | Ladle; Argos ↔ in-repo screenshots |
| K15 | A11y overrides and proposals | `code-owned/a11y/{light,dark}.overrides.tokens.json` (re-pointed Figma variables) + `code-owned/proposals.tokens.json` and `code-owned/proposals/{color/{light,dark},motion/{default,reduced}}.tokens.json` (new variables; split by mode, [§7.6](#76-code-owned-tokens)) | drift, redundancy, expiry and contrast checks (`packages/tokens/scripts/a11y.ts`, in the tokens build and again uncached as `pnpm check:a11y`) | 0 | the Figma fix (the entry deletes itself) |

**Seams deliberately not built** (each costs more than it is worth today):

| Dropped or deferred | Why |
|---|---|
| Runtime engine registry or context | Defeats tree-shaking and adds runtime cost (r3 §8.1) |
| A public headless `@nizivo/primitives` package | A second public API to design and semver; parts without CSS are already headless |
| One npm package per component, or domain packages (`dashboard`, `commerce`, `social`, `dates`, `blocks`, `motion`) | Each needs its own interactive 2FA trusted-publisher setup; there is no scope-wide OIDC ([r4 §6.1](research/r4-build-release.md)) |
| Per-instance `unstyled` prop | Touches every part; CSS-file granularity already does the job; additive later |
| Generated DTCG component-token tier | A second source of truth for hooks Figma does not have (C7) |
| Runtime-configurable class or token prefix | Impossible with zero-runtime CSS; the token prefix is a build setting |
| Router, Link, Image or Icon providers; `createCommerce()` factories | Force `'use client'` onto server-safe parts (C16) |
| `LayerProvider` with a top-layer/z-index switch | A required provider and a duplicated code path (gap report C §1.4) |
| A second engine for one widget in production | Mixing cores costs more (Radix + Base UI combobox 97.4 KB vs React Aria overlay set 88.7 KB, r3 §3.2), and two overlay cores fight over inert, scroll lock and dismissal. Enforced: overlay-family components share one engine (L4) |
| Duplicated theme blocks (`tokens.blocks.css`, a Safari 16.4 token floor) | Block selectors cannot express inverse surfaces inside nested themes; the S3 block output has only `:root` and dark blocks and never ran the S1 nesting matrix; no consumer asks. Consumer themes use `light-dark()`, so changing the mechanism is a major |
| Native top-layer overlay adapters | Four platform blockers ([§12.4](#124-native-swap-gates)) |
| Package-wide `#engine/*` import map | tsdown `unbundle` handling of `imports` subpaths is UNVERIFIED; the per-component `engine.ts` is proven |

---

## 5. Packages and public API surface

### 5.1 Package table

| Package | Purpose | First release | Runtime deps / peers | Budget (gzip, React external) | Version group |
|---|---|---|---|---|---|
| **`@nizivo/tokens`** | Framework-neutral design tokens: CSS variables, theme scopes, motion, responsive values, Tailwind adapter, JSON and typed JS refs | v0.1 | none | `tokens.css`: set at first build + 10% (estimate 2–5 KB) | fixed |
| **`@nizivo/react`** | Every core component and its static CSS, plus config, i18n, motion hooks (v0.2), hotkeys (v0.3) and the `unstable/*` lane | v0.1 | deps: `@nizivo/tokens` (exact, via the fixed group), `react-aria-components ^1.22.1`, `react-aria ^3.53.1`; later `@internationalized/date ^3.12.4` (date entries), `tinykeys ^4.0.1` (hotkeys). Peers: `react`, `react-dom ^19.2.0`; `@types/react` optional | Server-safe parts 0 KB under RSC; engine families per [§17](#17-performance-budgets-measured) | fixed |
| **`@nizivo/icons`** | Generated, tree-shakable Lucide set at the Figma stroke, plus brand glyphs | v0.1 (may slip to v0.2 without blocking core) | none at runtime (`lucide-static` 1.56.0 is a build-time devDependency). Peer: `react ^19.2.0` | ≈ 0.26 KB per icon; 0 KB when rendered by a Server Component | fixed |
| **`@nizivo/charts`** | Server-first SVG charts with one small interaction island | v0.2 | deps: `d3-shape ^3.2.0`, `d3-array ^3.2.4`, `@nizivo/tokens` (exact). Peers: `react`, `react-dom ^19.2.0`. **No dependency on `@nizivo/react`.** Optional peer `d3-scale` for the `./d3` adapter | AreaChart ≤ 3.6; island ≤ 0.8 | fixed |
| *`@nizivo/lab`* | WebGL shaders, liquid glass, 3D | after 1.0, only when a consumer asks | optional peers; `react ^19.3.0` | ShaderSurface ≤ 1.6 (1.4 measured, r6) | **independent 0.x** |
| *`@nizivo/css`* | A framework-neutral copy of the CSS | only when a non-React consumer appears | `@nizivo/tokens` | — | fixed |
| *`@nizivo/codemod`* | Migrations | at the first deprecation that needs one | — | — | fixed |

**Not published:** `@nizivo/ui`, `@nizivo/motion`, `@nizivo/dates`, `@nizivo/dashboard`, `@nizivo/commerce`, `@nizivo/social`, `@nizivo/blocks`, `@nizivo/themes`, `@nizivo/primitives`. Each would need its own trusted-publisher setup for something a subpath or the registry already covers (critique C12).

**Private workspace packages:** `@nizivo/testkit` (conformance and overlay suites), `@nizivo/tooling` (`nz gen`, checks, the spring generator), `@nizivo/tsconfig`, `@nizivo/tsdown-preset`, `@nizivo/stylelint-config`, plus `apps/docs`, `apps/workshop`, `fixtures/runner` (`@nizivo/fixture-runner`) and `fixtures/floor-lane`. A framework fixture such as `fixtures/next` is its own pnpm workspace root, outside the monorepo ([§18.1](#181-test-layers)).

### 5.2 Exports maps

All maps are **explicit**, committed, and drift-checked (`nz gen --check`, plus `git diff --exit-code`). tsdown's own `exports` generation is off in the shared preset. In `@nizivo/react`, `nz gen` writes one entry per component (`./<name>`, or `./unstable/<name>`) and one `./css/<name>.css` entry wherever `src/<name>/<name>.css` exists. Entries with no `component.json` (`./config`, `./contracts`, `./augment`, `./css/base.css`, later `./theme-script` and `./i18n`) are hand-maintained; `nz gen` keeps them and sorts the map. `./css/base.css` comes from `styles/base.css`, which `nz gen` writes, but its exports entry is kept by hand like `./config`. W2: the CSS build fails when any `dist/css` file has no exports entry, so a dropped `./css/base.css` cannot ship unimportable. `styles/base.css` writes two layer blocks, `nz.base` and then `nz.utilities` ([§8.1](#81-the-canonical-layer-statement)). Stable and unstable components share the `./css/<name>.css` path, so component names must be unique across both. The root barrel re-exports stable components only; an unstable one is reachable only through its `./unstable/<name>` subpath. There is **no `./*` wildcard** (critique C2): it would make internals public. `src/_engines/**` and `src/_internal/**` are excluded from `exports`; they ship in `dist/` only as relative imports.

```jsonc
// packages/tokens/package.json (excerpt)
{
  "name": "@nizivo/tokens",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "files": ["dist"],
  "engines": { "node": ">=22.12" },
  "exports": {
    ".":                  { "types": "./dist/index.d.ts", "default": "./dist/index.js" }, // typed var() refs, names, breakpoints, spring physics
                                                      // (W2 ships "." as an empty module; the js-refs output lands in W3–4)
    "./tokens.css":       "./dist/tokens.css",        // @layer nz.tokens; light-dark() once on :root
    "./tailwind.css":     "./dist/tailwind.css",      // @theme inline mapping (Tailwind v4)
    "./custom-media.css": "./dist/custom-media.css",  // @custom-media --nz-sm / --nz-lg (provisional)
    "./tokens.json":      "./dist/tokens.json",       // resolved per context, for charts, canvas and non-CSS consumers (W3–4)
    "./contract.json":    "./dist/contract.json",     // public names, types and layer
    "./package.json":     "./package.json"
  }
}
```

```jsonc
// packages/react/package.json (excerpt; component and css/<name>.css entries are generated from component.json files,
// the others are hand-maintained and kept by nz gen)
{
  "name": "@nizivo/react",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "files": ["dist"],
  "engines": { "node": ">=22.12" },
  "exports": {
    ".":                    { "types": "./dist/index.d.ts",            "default": "./dist/index.js" },   // pure re-export barrel, no directive
    "./button":             { "types": "./dist/button/index.d.ts",     "default": "./dist/button/index.js" },
    "./select":             { "types": "./dist/select/index.d.ts",     "default": "./dist/select/index.js" },
    "./dialog":             { "types": "./dist/dialog/index.d.ts",     "default": "./dist/dialog/index.js" },
    "./config":             { "types": "./dist/config/index.d.ts",     "default": "./dist/config/index.js" },      // optional client NizivoConfig
    "./theme-script":       { "types": "./dist/theme-script/index.d.ts", "default": "./dist/theme-script/index.js" }, // server-safe
    "./i18n":               { "types": "./dist/i18n/index.d.ts",       "default": "./dist/i18n/index.js" },        // formatLabel, dirOf
    "./contracts":          { "types": "./dist/contracts/index.d.ts",  "default": "./dist/contracts/index.js" },   // renderElement, mergeProps, stateAttrs
    "./augment":            { "types": "./dist/augment.d.ts",          "default": "./dist/augment.js" },           // types only; augment.js is an empty
                                                                                                                 // module, emitted because src/augment.ts is a tsdown entry
    "./unstable/date-range-picker": { "types": "…", "default": "…" },  // (v0.3) outside semver
    "./styles.css":         "./dist/styles.css",       // tokens + base + every component (the convenience sheet)
    "./css/base.css":       "./dist/css/base.css",     // reset-free base (a11y floor) + utilities, NO tokens
    "./css/button.css":     "./dist/css/button.css",   // one leaf file per component, no @import
    "./css/manifest.json":  "./dist/css/manifest.json",// per-component CSS dependencies, for granular imports
    "./reset.css":          "./dist/reset.css",        // opt-in
    "./package.json":       "./package.json"
  },
  "dependencies": { "@nizivo/tokens": "0.1.0", "react-aria-components": "^1.22.1", "react-aria": "^3.53.1" },
  "peerDependencies": { "react": "^19.2.0", "react-dom": "^19.2.0", "@types/react": "^19.2.0" },
  "peerDependenciesMeta": { "@types/react": { "optional": true } }
}
```

**v0.1 component subpaths** (kebab-case, one per component; a subpath holds a family only where noted): `text`, `heading`, `stack`, `inline`, `grid` (Grid, GridItem), `container`, `separator`, `button`, `icon-button`, `badge`, `card`, `delta`, `progress-bar`, `progress-ring`, `meter`, `skeleton`, `empty-state`, `inline-error`, `alert` (Alert, AlertDismiss), `kbd`, `image`, `field` (Field, `useFieldControl`), `fieldset`, `input`, `textarea`, `checkbox`, `radio-group`, `switch`, `segmented-control`, `select`, `native-select`, `tooltip`, `dialog`, `menu`, `tabs` (Tabs, TabNav). Each has its own `css/<name>.css`. Until week 2 this list grouped `text` (Text, Heading), `layout` (Stack, Inline, Grid, GridItem, Container, Separator) and `progress` (ProgressBar, ProgressRing, Meter); week 2 shipped one subpath per component instead (D-h, [§23.4](#234-builder-defaults-2026-10-14)). Week 3 split `field` the same way: `field` (Field, `useFieldControl`) and `fieldset` (D-r). It also added `theme-script` (`ThemeScript`, `themeScript`). One subpath per component is a maintainer decision since 2026-10-15 ("we can keep import path per components"; M13), so no regrouping is planned; it would be free before 0.1.0 and breaking after it.

**CSS import rule** (documented on the getting-started page):
- Import **either** `@nizivo/react/styles.css` (everything, tokens included) **or** `@nizivo/tokens/tokens.css` + `@nizivo/react/css/base.css` + the `css/<name>.css` files you use. Never both.
- `@nizivo/tokens` is the only source of token CSS. `styles.css` contains a byte-identical copy of `tokens.css` at the same version (the fixed group and the exact dependency guarantee this), so there is never skew.
- `@nizivo/charts/styles.css` contains chart CSS only, plus its own focus and visually-hidden rules scoped to `.nz-chart-*` (so charts need no `@nizivo/react` CSS), and expects tokens from either route.

### 5.3 Peers, engines and module format

- **ESM-only**, `"type": "module"`, fully specified `.js` specifiers, no top-level await, no `require` condition. Node ≥ 22.12 can `require()` the package (VERIFIED on Node 24.16, [r4](research/r4-build-release.md)). There is no dual CJS/ESM build, because that risks two React context instances.
- **React peer `^19.2.0`** (settled). Core imports nothing that needs 19.3 (`browser()`, `ViewTransition`, Fragment refs); a `no-restricted-imports` rule enforces this. The lab, if it ever ships, peers on `^19.3.0`.
- **Engine dependencies use caret ranges** so consumer trees dedupe. Exact pins would duplicate React Aria copies and contexts ([r3](research/r3-headless-primitives.md)). Tooling is pinned exactly.

### 5.4 Versioning groups

- **Changesets 3.0.3**, one **fixed** group: `@nizivo/tokens`, `@nizivo/react`, `@nizivo/icons`, `@nizivo/charts`. Tokens and components move in lockstep, so the CSS contract between them never skews.
- `@nizivo/lab` (when it exists) versions **independently** at 0.x (settled), so experiments never bump core.
- **0.x semantics:** a breaking change is a minor bump with a "BREAKING" note, classified by the `contracts/` diff. From 1.0, the diff enforces a major.
- **`unstable/*`** is outside semver. Prereleases go to the `next` dist-tag.
- **What semver covers:** props and parts, `data-slot` values, the `data-*` vocabulary, class names, public hooks, layer names and order, public token names, the theme mechanism and consumer theme format (`light-dark()` + `color-scheme` scopes), CSS file paths and exports keys.

---

## 6. Repository layout

```
nizivo/                                      github.com/theneev/nizivo (public; slug is bound into npm trusted publishers; decision 9)
├─ package.json                              private root; devEngines.packageManager pnpm@12.11.2
├─ pnpm-workspace.yaml                       catalogs; minimumReleaseAge: 4320; allowBuilds (deny-only: 'esbuild@0.28.2': false); trustPolicy;
│                                            blockExoticSubdeps; ignoredOptionalDependencies: [sharp]; '!fixtures/next'
├─ turbo.json
├─ .changeset/config.json                    fixed: [["@nizivo/tokens","@nizivo/react","@nizivo/icons","@nizivo/charts"]]
├─ .github/
│  ├─ CODEOWNERS                             tokens/src/figma-owned → design + 1 eng; tokens/src/code-owned/{a11y,proposals*}
│  │                                         → design lead + a11y owner (both Dayitava, M15; GitHub username pending)
│  └─ workflows/  ci.yml  release.yml (the only workflow npm trusts, once Actions is back on; 0.1.0 publishes by hand, M14)
│                 nightly.yml  tokens-sync.yml
├─ contracts/                                ◄ THE SEMVER'D SURFACE (human-owned sources + generated manifests, CI-diffed)
│  ├─ layers.css                             the canonical @layer statement; the build injects it as line 1 of every CSS file
│  ├─ vocabulary.json                        every data-* and data-nz-* name, value and meaning → TS types, stylelint allowlist,
│  │                                         emitted-CSS check, docs page
│  └─ api/  react/<entry>.json  css/<name>.json                    generated by nz api from the built packages (ts-morph;
│                                            Lightning CSS); tokens.json later (Terrazzo plugin)
├─ packages/
│  ├─ tokens/                                @nizivo/tokens
│  │  ├─ figma/raw/**                        extractor drop zone (committed for audit; never hand-edited)
│  │  ├─ figma/tokensbruecke.settings.md     exact export settings for designers
│  │  ├─ figma/snapshot.json  tb.config.json  DRY-RUN.md  codesyntax-rewrite.plan.{md,json}
│  │  │                                      engineer snapshot, CLI config, the W1 dry run, the codeSyntax rename plan
│  │  ├─ src/figma-owned/**                  written ONLY by the normalizer
│  │  ├─ src/code-owned/                     breakpoints · layers (z) · elevation · focus · motion-derived (incl. fade, pulse, spin)
│  │  │  ├─ proposals.tokens.json            NEW primitives and text styles Figma lacks (neutral/450, neutral/925, red/400,
│  │  │  │                                   blue/400, Body/S, Label/S): time-boxed, approved, deleted once Figma has them
│  │  │  ├─ proposals/{color/{light,dark},motion/{default,reduced}}.tokens.json   NEW semantic colour and motion variables
│  │  │  │                                   (scrim, accent-hover, text/on-critical, border/control, chart/warning, duration/fade …),
│  │  │  │                                   one file per mode, same rules (W2, §7.6)
│  │  │  └─ a11y/{light,dark}.overrides.tokens.json  contrast-pairs.json
│  │  │                                      time-boxed, approved re-pointing of EXISTING Figma variables; every pair components use
│  │  ├─ src/nizivo.resolver.json
│  │  ├─ build/  terrazzo.config.ts  css.ts (light-dark, typography, spring, permutations)  plugins.ts (custom-media, tailwind,
│  │  │          contract)  contrast.ts  a11y.ts (matrix, drift, redundancy, expiry, metadata). js-refs and tokens.json: W3–4
│  │  ├─ scripts/  normalize.ts  spring.ts  a11y.ts (the a11y gate: in the build, and as root `pnpm check:a11y`)  token-diff.ts (later)
│  │  │            figma/ (snapshot scripts, the CLI run `raw.ts`, the codeSyntax rewrite generator and its apply script)
│  │  ├─ CONTRAST.md                         the contrast matrix and the override and proposal tables (golden, generated)
│  │  └─ test/golden/**                      byte-compared outputs (tokens.css, tailwind.css, …). The normalizer's golden is
│  │                                         src/figma-owned itself; the both-prefix fixture is built inside the test from the real export
│  ├─ react/                                 @nizivo/react
│  │  ├─ src/
│  │  │  ├─ contracts/                       PUBLIC at ./contracts: render.ts, merge-props.ts, state.ts (generated), details.ts
│  │  │  ├─ _internal/                       never exported: cx.ts, glyphs.tsx (≤ 10 inlined icons), use-controllable.client.ts
│  │  │  ├─ _engines/react-aria/             'use client' adapters: overlay (OverlayEngine), select, menu, dialog, tooltip, tabs, toast,
│  │  │  │                                   file-drop, locale … (only react-aria importers) + dom.ts (engineDom) + dom-allowlist.json
│  │  │  ├─ button/      component.json  button.tsx  button.css  button.example.tsx  button.test.tsx  index.ts(gen)
│  │  │  ├─ select/      component.json  select.contract.ts  engine.ts(gen)  select.client.tsx  select.parts.ts(gen)
│  │  │  │               index.ts(gen)  select.css  select.example.tsx  select.labels.ts
│  │  │  ├─ field/       field.tsx (server)  field-scope.client.tsx  use-field-control.client.ts  field.css
│  │  │  ├─ unstable/<name>/…
│  │  │  ├─ config/  theme-script/  i18n/  augment.ts  index.ts(gen)
│  │  ├─ styles/  base.css (generated by nz gen: the nz.base a11y floor, then nz.utilities)  reset.css
│  │  ├─ scripts/build-css.ts  scripts/css/  the Lightning CSS build, floor guard, emitted-CSS check and exports check (W2)
│  │  ├─ test/ssr/render-all.test.tsx        renderToString every example; t0.server.test.tsx loads every T0 entry under React's
│  │  │                                      react-server build
│  │  ├─ engines.json                        the overlay-family default engine ({ "overlay": "react-aria" })
│  │  ├─ .size-limit.json(gen)  tsdown.config.ts  THIRD_PARTY_NOTICES (Lucide ISC, for the glyphs in _internal/glyphs.tsx)
│  ├─ icons/   scripts/generate.ts  aliases.json  mirror.json  src/(gen)  LICENSE (ISC + Feather MIT notices)
│  ├─ charts/  src/_core/{scale,time-ticks,geometry}.ts  src/_shared/{render,merge-props}.ts (vendored ~40 LOC, generated from core
│  │           by nz gen, CI-diffed)  src/chart-frame/chart-frame.contract.ts  src/<chart>/…  (v0.2)
│  ├─ testkit/ src/conformance/<name>.conformance.ts  src/overlay/O-01…O-25  src/native/N-01…N-04 (for future native swaps)
│  └─ tooling/ gen/ (nz gen, nz new; base-css.ts writes styles/base.css; COMPONENT-JSON.md is the manifest field reference)
│              release/ (W2: `pnpm check:release` on the packed tarballs: tarball allowlist, publint, attw, directive guard)
│              spring/ (spring.ts, spring.golden.json). Exports drift is `nz gen --check`; the `.d.ts` walk is
│              packages/react/test/built. api/ (nz api, schema.ts, API-JSON.md; `nz api --check` runs in `pnpm gen:check`)
│              tsconfig/  tsdown-preset/  stylelint-config/ (index.js + the contract rules in contract.js)
├─ patterns/                                 domain compositions (commerce, storefront, dashboard templates, data-table); LICENSE (MIT)
│                                            → rendered by docs (v0.2) → built into registry items (v0.3)
├─ apps/
│  ├─ docs/                                  Fumadocs 16.17 on Next 16.4, a static export: public docs, the largest RSC consumer,
│  │                                         /r registry (v0.3). RESULTS.md holds the measured build
│  └─ workshop/                              Storybook 10.6 (react-vite): internal workshop + browser test harness
├─ fixtures/                                 install the unpacked `pnpm pack` output as file: folders; one shared Playwright spec (§18.1)
│  ├─ runner/                                @nizivo/fixture-runner: pack, install, build, the shared spec (in the monorepo workspace)
│  ├─ floor-lane/                            browser floor lane: S1 matrix, halo/inverse probe, overlay entry (RESULTS.md)
│  ├─ next/  vite/  astro/                   v0.1; each is its own pnpm workspace root, excluded from the monorepo ('!fixtures/next')
│  └─ vite-ssr/  react-router/ (v0.2)   tanstack-start/ (v0.3)
├─ design/
│  ├─ component-map.json                     generated: Figma canonical AND ghost ids → export + props (critique C25)
│  └─ backlog.md                             the one consolidated design backlog (G9); mirrored into docs/figma-handoff.md
├─ docs/  ARCHITECTURE.md  component-inventory.md  figma-handoff.md  research/  figma/  adr/
├─ ASSETS.md                                 provenance ledger: no Figma raster ships anywhere without an entry
└─ LICENSE  TRADEMARKS.md  SECURITY.md  CONTRIBUTING.md  RELEASING.md  CODE_OF_CONDUCT.md
```

**`component.json` drives the bookkeeping.** `pnpm nz gen` derives files from it, and CI reruns it and fails on `git diff`. It starts minimal in week 1 (barrels, `engine.ts`, exports entries, component map) and grows later (size-limit entries, docs stub, conformance and story skeletons). `engine.ts` takes its names from the exported `<Name>Engine` interface in `<name>.contract.ts`, not from `parts`: a part can be leaf-only (Dialog's `Body` and `Footer` have no engine counterpart), and an engine element can be internal (Select's listbox). Only the interface's own members are read; `extends` is not followed. W1 (2026-10-14): a subpath that exports several components lists them in an optional `exports` field, because `<Pascal>` and `<Pascal><Part>` cannot express that. W2 uses it for `grid` (Grid, GridItem) and `alert` (Alert, AlertDismiss) only; text, layout and progress ship one subpath per component (D-h, [§23.4](#234-builder-defaults-2026-10-14)), because `nz gen`'s component map attributes every Figma node of a multi-export manifest to its first export. `field` (Field, Fieldset) is decided when it is built: week 3 shipped two subpaths (D-r). `tabs` (two compound namespaces, Tabs and TabNav, on one subpath) is still not expressible and needs a schema change before Tabs is built. Two more schema changes wait for v0.2: `"adapter"` is rejected with a "not supported yet" error until v0.2 defines the second adapter's file layout, and `"engine"` is accepted only on tier `engine`, so Toast and FileUpload (tier `own`, behind an engine contract, [§9.5](#95-per-component-tier-table-core)) need it allowed on tier `own`. W2 (2026-10-14) gave three fields exact shapes, documented in `packages/tooling/gen/COMPONENT-JSON.md`: `interactive` lists full `data-slot` values; `focusTarget` is `self`, `nested-input` or `within`, or a map from each interactive slot to one of them; `stateIndicator` is a list of `{ slot, state?, paint }` objects, and every `"overlay": true` component must list its popup with paint `border`. Every slot named must belong to the component. A manifest's Figma ids are `canonical`, `ghosts`, `variantsSeen` and `related` only: doc frames go under `related`, and an instance-path id such as Kbd's `I755:1033;755:879` cannot be stored.

```jsonc
// packages/react/src/select/component.json
{
  "name": "select",
  "status": "stable",                          // "unstable" → src/unstable/select and ./unstable/select
  "tier": "engine",                            // server | client | engine | own
  "engine": "react-aria",                      // ← THE engine swap point (a family); nz gen writes engine.ts from it and from
                                               //   the members of SelectEngine in select.contract.ts
  "overlay": true,                             // overlay family: engine must equal packages/react/engines.json (L4)
  // "adapter": "hooks",                       // optional: a second adapter inside the same family (the v0.2 Tooltip)
  "parts": ["Root", "Trigger", "Value", "Popup", "Item", "Group", "GroupLabel", "Separator"],
  // "exports": ["Grid", "GridItem"],          // optional, for a subpath that exports several components, as grid/component.json does
  "interactive": ["select-trigger", "select-item"],   // full data-slot values that get the nz.base focus floor and touch-action
  "focusTarget": "self",                       // "nested-input" for label-wrapped native inputs, "within" for :focus-within
                                               //   groups, or a map from each interactive slot to one of these (§8.5)
  "stateIndicator": [                          // states that get a forced-colours rule in nz.base (§8.5); overlays must list their popup
    { "slot": "select-popup", "paint": "border" },
    { "slot": "select-item", "state": "[data-selected]", "paint": "highlight" }
  ],
  "cssDeps": ["base", "field", "popover"],     // feeds css/manifest.json
  "variants": { "size": ["sm", "md", "lg"] },
  "figma": { "canonical": ["7275:11438"], "ghosts": ["745:222"], "variantsSeen": ["745:188"], "related": ["746:204"] },
  "budget": { "measuredKB": 59.5, "limitKB": 66, "source": "r3 §3.1, RAC Select standalone, all locales" }
}
```

---

## 7. Design tokens and theming

### 7.1 Pipeline: Figma → DTCG → outputs

```
FIGMA "Nizivo UI Library" (team "Vampire D Studio", Professional plan — decision 3; renamed from "Grove UI Library", M16)
  Nizivo Primitives · Nizivo Color (Light/Dark) · Nizivo Space · Nizivo Motion (Default/Reduced) · Nizivo Responsive (Desktop/Tablet/Mobile)
  + Nizivo/* text styles + Nizivo/* effect styles      (renamed from "Grove *" / "Grove/*" on 2026-10-14, figma-handoff §2.1)
                                                       (Clario, Pipkin, Merit, … leftovers: dropped by the "Grove *" | "Nizivo *" allowlist)
        │ EXTRACT — the designer runs TokensBrücke 3.18.0: DTCG 2025.10, split modes, styles + metadata
        │   v0.1: export, then upload through the GitHub web UI to a branch → PR (no token pasted into Figma)
        │   later: the plugin's "push to GitHub PR" with a Neev bot account (fine-grained PAT support UNVERIFIED)
        │   fallback: an engineer's read-only use_figma snapshot, converted by the TokensBrücke CLI (9 calls in W1;
        │             Pro seat; never in CI)
        ▼
packages/tokens/figma/raw/{Collection}/{Mode}.tokens.json    (a one-mode collection is raw/{Collection}.tokens.json)
                          Typography-styles.tokens.json · Effect-styles.tokens.json
        │ NORMALIZE — scripts/normalize.ts + scripts/normalize/** (ours, ~660 lines with the collection map; golden-tested)
        │   allowlist "Grove *" | "Nizivo *" (styles "Grove/*" | "Nizivo/*"); both prefixes → nz
        │   (the Grove allowlist is removed after the first post-rename sync) · FLOAT → dimension (rem) / duration (ms) / number
        │   by group · "spring(m,k,c,v)" → $extensions["dev.nizivo.spring"] · text styles → typography · effects → shadow
        │   Figma variable and text-style ids → $extensions["dev.nizivo.figma"] (the token identity; overrides key on it)
        │   writes oxfmt-clean JSON itself; `tz format` runs only as a check (W1: its layout fails oxfmt --check)
        ▼
src/figma-owned/** (normalizer only)  +  src/code-owned/** (engineers)  +  src/nizivo.resolver.json
        │ tooling/spring: ONE generator → code-owned/motion-derived.tokens.json (linear() + paired durations)
        │ BUILD — Terrazzo 2.8.0 (exact pin) + plugins: light-dark · tailwind · js-refs · contract
        ▼
dist/: tokens.css · tailwind.css · custom-media.css · contract.json   (W2)   + tokens.json · index.js/.d.ts js-refs   (W3–4)
        │ CI on the PR: invariant · tz check/lint · contrast matrix (every permutation) · override drift/redundancy/expiry ·
        │               golden diff · token-diff sticky comment (removed/renamed public name = breaking) · visual regression
        ▼
merge → changeset → release: 0.1.0 by hand through the local release script (npm 2FA, no provenance; M14)
                     → later release.yml (OIDC, provenance) once Actions is back on → the fixed group
```

All three Terrazzo behaviours this depends on were VERIFIED in spike S3 on 2.8.0:
- Partial permutations re-emit every token unless they use `only: { modifiers: [...] }` **plus** `exclude: ["color.p.**"]`; with both, the output is clean (re-run in verdict V4). Two caveats from S3a carry into week 1: the spike had a single set, so with the second set (`foundation`) each scoped block also needs an `include` glob for its own modifier's groups (S3a's verified recipe); and a permutation whose input equals the base defaults collides with the base permutation id, so none is declared. Week 2 found a third: once code-owned **set** tokens exist (`duration.spin`), a scoped permutation also needs `only: { modifiers: [...], sets: [] }`, or set tokens that match its include glob leak into the block. In W1 no set token matched a motion or viewport glob, so the recipe looked complete. A golden-file assertion checks that every `@media` and scope block contains only its own modifier's tokens.
- A ~15-line `light-dark` transform produces one declaration per semantic colour.
- The stock `plugin-tailwind` resolves aliases to **primitives** and adds an `@variant dark` block, which breaks nested themes. A ~20-line custom plugin emits semantic references instead.

**Verified in week 1 (2026-10-14; `packages/tokens/figma/DRY-RUN.md`):** the real TokensBrücke export (the CLI 3.18.0 on the read-only `use_figma` snapshot) passes `tz check` once normalized, the S3a recipe holds on it (each scoped block holds only its own modifier's tokens), and the typography names are recorded in [§7.2](#72-naming). The raw export does not validate on its own (8-digit hex colours, string line heights and letter spacing, cross-file aliases), and it types durations and scales as px dimensions, which is why the normalizer maps FLOATs by group. The plugin's own export (style group names, zip layout, and output equal to the CLI's apart from the known differences in `tokensbruecke.settings.md`) stays UNVERIFIED until the designer's first run (figma-handoff §1.4 #3, exit criterion 8).

**TokensBrücke 3.18.0 limits found in week 1:**
- It crashes on an effect style with no effects (`Elevation/0 Flat`). `scripts/figma/raw.ts` leaves that style out of the CLI input. Fixed in the file on 2026-10-14 (M11): the style was kept, renamed with the others, and given one invisible drop shadow (alpha 0, offset 0, radius 0, spread 0), so the export no longer crashes. The committed snapshot predates the fix, so the filter still applies to it and is harmless afterwards.
- Only a style's first effect decides its token type. `Surface/Glass` exports as a 24 px background `blur`, which has no DTCG type, so the normalizer skips it, and its drop shadow is lost. `Surface/Liquid Glass` (a Figma GLASS effect) is not exported at all. The code-owned backdrop token planned for week 2 was not added; it stays open with design's Glass answer (figma-handoff §1.4 #4, `DRY-RUN.md` open item 1), and it is needed only by `Surface material="glass"` (v0.3).
- It exports no Figma version id and no variable key. `$extensions.figma` holds `variableId`, `codeSyntax` and `collection`; the export metadata holds a `createdAt` date. Text styles carry a `styleId`; effect styles carry no id, so effect tokens are matched by name.
- Spawned from a script, the CLI rejects `--input -` as two arguments; `--input=-` works. `pnpm tokens:raw` pipes the snapshot on stdin that way, with `Elevation/0 Flat` filtered out.

**The next export after the rename (2026-10-14).** The Figma collections and styles now carry the `Nizivo` prefix, so the next export (plugin or engineer path) arrives with `Nizivo *` collection names and `Nizivo/*` style names. The normalizer accepts both prefixes and produces byte-identical `src/figma-owned/**` from either (the both-prefix test, L0), so the switch changes nothing there except one new token: `Elevation/0 Flat` now exports, as `--nz-elevation-0` (a shadow token whose only Figma layer is invisible). Nothing in code defines elevation 0 today (the only elevation shadow in `src/code-owned` is `elevation.button`; the ring and highlight are colours), so it does not collide. Three things go with that sync:
- **The old raw files.** On the web-upload path ([§20.1](#201-token-sync-on-the-current-plan) step 3) the `Grove …` files from the last export stay in `figma/raw/` beside the new `Nizivo …` ones, and the normalizer stops, because one collection under both prefixes is an error. Engineering deletes them on the PR branch (`tokensbruecke.settings.md`, upload step 5). The engineer path's `raw.ts` clears the folder itself.
- **The dark ring.** Decided 2026-10-14: `elevation()` in `build/css.ts` gives the `--nz-elevation-ring` layer (and, at levels 3–4, the highlight) only to an elevation that paints something. One whose every layer has alpha 0 is flat in both themes (its dark alpha is 6 × 0), so the built `--nz-elevation-0` is `0 0 0 0 transparent`, with no ring. The rule reads the layers, not the level, so a visible level 0 would take the ring like any raised surface; `test/elevation.test.ts` builds the token ahead of the sync (`DRY-RUN.md` open item 9; D-m, [§23.4](#234-builder-defaults-2026-10-14)).
- **Expected diffs.** The same PR updates `test/normalize.test.ts` (it expects elevation keys 1–4 and 7 effect tokens) and the `tokens.css`, `tailwind.css` (`--shadow-nz-0`) and `contract.json` goldens. Each golden changes only by the `--nz-elevation-0` entry, which `test/elevation.test.ts` checks ahead of the sync.

The `Grove` allowlist goes after the first sync on the new names merges ([§20.3](#203-hygiene-contract-between-design-and-engineering)).

### 7.2 Naming

| Figma (`codeSyntax`) | CSS (published) | Public? |
|---|---|---|
| `--grove-p-green-700` | `--nz-p-green-700` | **private** (stylelint bans `--nz-p-*` outside tokens) |
| `--grove-bg-surface`, `--grove-text-secondary`, `--grove-border-focus`, `--grove-icon-*`, `--grove-chart-*` | `--nz-bg-surface`, `--nz-text-secondary`, `--nz-border-focus`, `--nz-icon-*`, `--nz-chart-*` | public |
| `space/4`, `radius/md`, `border-width/focus`, `size/control-md`, `size/touch-min` | `--nz-space-4`, `--nz-radius-md`, `--nz-border-width-focus`, `--nz-size-control-md`, `--nz-size-touch-min` | public |
| `duration/fast`, `easing/standard`, `easing/spring`, `distance/lift`, `scale/press`, `tilt/max-deg` | `--nz-duration-fast`, `--nz-easing-standard`, `--nz-easing-spring`, `--nz-distance-lift`, `--nz-scale-press`, `--nz-tilt-max-deg` | public |
| `grid/columns`, `layout/sidebar`, `layout/content-max`, `type/h1`, `section/gap` | `--nz-grid-columns`, `--nz-layout-sidebar`, `--nz-layout-content-max`, `--nz-type-h1`, `--nz-section-gap` | public |
| text style `Grove/Label/M` | `--nz-font-label-m` (a `font` shorthand) + `--nz-tracking-label-m`; families `--nz-font-family-sans`, `--nz-font-family-mono` | public. W1 dry run: Terrazzo emits `--nz-font-label-m` as a shorthand of `var()` references to its weight, size, line-height and family sub-values (`--nz-font-label-m-font-weight`, `-font-size`, `-line-height`, `-font-family`), plus a fifth sub-value, `--nz-font-label-m-letter-spacing`, which the shorthand does not include. Tracking arrives as `--nz-font-label-m-letter-spacing` in rem; week 2 renames it to `--nz-tracking-label-m` through plugin-css's `subValueVariableName` and emits `em` from the style's letter-spacing percent. Text styles carry only `"Geist"` / `"Geist Mono"`, so the family tokens are code-owned (week 2) |
| effect styles `Grove/Elevation/1 Card`, `2 Raised`, `3 Popover`, `4 Modal` (now `Nizivo/Elevation/…`) | `--nz-elevation-1` … `--nz-elevation-4` (the normalizer takes the leading number); `0 Flat` arrives as `--nz-elevation-0` with the next export and builds flat, `0 0 0 0 transparent` with no dark-mode ring (D-m, [§7.1](#71-pipeline-figma--dtcg--outputs)) | public |

Rules:
- Since 2026-10-14 the Figma `codeSyntax` values themselves read `var(--nz-…)` (M10); the `--grove-*` and `Grove/…` names in the first column are the pre-rename forms.
- There is **no** `--nz-color-*` family (critique C8). The `color.` group is stripped by `variableName`.
- `layout/viewport` is not emitted: those are frame widths, not breakpoints.
- Dimensions are emitted in `rem` (px ÷ 16) so user font scaling works (WCAG 1.4.4). Border widths stay in `px`.
- A lint fails CI if the string `grove` appears in any shipped file (G21).

### 7.3 Prefix configuration

- `NZ_TOKEN_PREFIX` (default `nz`) is read by Terrazzo's `variableName` and by a Lightning CSS visitor that rewrites `--nz-`/`--_nz-` in component CSS. It exists for forks and white-label rebuilds (`pnpm build --prefix acme`). W2: `turbo.json` lists it in `globalEnv`, so a root `NZ_TOKEN_PREFIX=acme pnpm build` gets its own task hashes instead of replaying the `nz` build from cache.
- **Published packages always use `nz`.** `contract.json` records the prefix.
- Class names (`nz-*`) and `data-*` attributes are component contract, not tokens, so they are not re-prefixed. A runtime prefix is impossible with zero-runtime CSS.

```ts
// packages/tokens/build/terrazzo.config.ts (condensed from the S3-verified configs)
const PREFIX = process.env.NZ_TOKEN_PREFIX ?? 'nz';
const variableName = (t) => `--${PREFIX}-${t.id.replace(/^color\./, '').replace(/\./g, '-')}`;   // → --nz-bg-surface
export default defineConfig({
  tokens: ['./src/nizivo.resolver.json'],
  plugins: [
    captureResolver,                                          // lets lightDark() read the dark value of the same token
    css({ filename: 'tokens.css', variableName, permutations: [
      { input: { theme: 'light', motion: 'default', viewport: 'mobile' }, exclude: ['layout.viewport'],   // frame widths (§7.2)
        transform: lightDark, prepare: rootBlock },
      // only.modifiers + sets: [] + include (own groups) + exclude: the S3a recipe plus W2's `sets: []` (code-owned set tokens
      // such as duration.spin would otherwise leak in); non-default inputs only (no base-id collision).
      // MOTION_GROUPS = ['duration.**', 'easing.**', 'distance.**', 'scale.**', 'tilt.**', 'stagger.**', 'magnetic.**'];
      // VIEWPORT_GROUPS = ['grid.**', 'layout.**', 'type.**', 'section.**']
      { input: { motion: 'reduced' },   only: { modifiers: ['motion'], sets: [] },   include: MOTION_GROUPS,   exclude: ['color.p.**'], prepare: reducedBlocks },
      { input: { viewport: 'tablet' },  only: { modifiers: ['viewport'], sets: [] }, include: VIEWPORT_GROUPS, exclude: ['color.p.**', 'layout.viewport'], prepare: media('--nz-sm') },
      { input: { viewport: 'desktop' }, only: { modifiers: ['viewport'], sets: [] }, include: VIEWPORT_GROUPS, exclude: ['color.p.**', 'layout.viewport'], prepare: media('--nz-lg') },
    ]}),
    tailwind({ filename: 'tailwind.css', namespace: 'nz' }),
    contract({ filename: 'contract.json' }),
  ],
});
```

### 7.4 Theme mechanism

- **`light-dark()` in every semantic colour, declared once on `:root`.** Colour tokens are **never** registered with `@property`. Spike S1 (Chromium 156, WebKit 27.2) showed that native `light-dark()` nests correctly (dark → light → dark), and that both `@property` registration and Lightning CSS lowering break nesting. The week 1 floor lane reproduced the nesting matrix on Firefox 129 for the token path (`light-dark()` in custom properties, read through `var()`; `fixtures/floor-lane/RESULTS.md`); the direct literal form fails on Firefox 129–131 (Deviations page entry D1, [§7.5](#75-sample-generated-css)). Safari 17.5 is not tested yet.
- **Opt-in default.** `:root` gets no `color-scheme`, so pages render light even when the OS is dark (S1 VERIFIED: an unset or `normal` root resolves to light). The app opts in with `<html data-nz-theme="system">` (follows the OS), `"light"` or `"dark"`. Any element with `data-nz-theme` is a nested scope.
- **`ThemeScript`** (server-safe, ~250 B, `nonce` prop, published SHA-256) persists a user's choice before first paint (r1). There is no ThemeProvider. Week 3 shipped the platform half only (`@nizivo/react/theme-script`: `ThemeScript` and the `themeScript` string, 257 bytes): it sets `data-nz-platform` from `navigator.userAgentData.platform`, else `navigator.platform`, never the user-agent string, keeps a value already on `<html>`, and never throws (D-z). Persisting the theme choice is still to build; the docs site runs its own theme script followed by `themeScript`.
- **Inverse surfaces** (Toast, Tooltip, Card `tone="inverse"`): the component emits `data-nz-scheme="inverse"`, and `tokens.css` maps that to `color-scheme: var(--nz-scheme-inverse)`. Every nested token then resolves to the opposite theme, with no "on-inverse" token family (gap report C §2.6; probe VERIFIED in Chromium, WebKit and Firefox 129).
  - **Inverse inside inverse stays inverse.** Adopted 2026-10-14 (builder default; the maintainer can override); the maintainer set the question aside on 2026-10-14 while the design has no nested case ("if current design does not use it let's not worry about it right now", D-e). A nested inverse surface does not flip back, because `--nz-scheme-inverse` is inherited unchanged; that is what the CSS does in every engine the floor lane ran. Portaled overlays render outside the surface, so the common case, a Tooltip opened from a `tone="inverse"` Card, does not nest. A check of 6 pages of the Figma file found no nested inverse surface; the only nesting is Card Inverse's slot, which uses `bg/inverse-elevated`. Q36 is set aside and reopens if a design nests one (figma-handoff §6).
- **The `nz.themes` layer** sits right after `nz.tokens`. A brand file or consumer theme written in `@layer nz.themes { … }` beats base tokens **regardless of import order**. Without it, `:root` and `[data-nz-brand]` on `<html>` tie on specificity and source order decides.
- **Brand and density are reserved names with no values in 0.x** (`data-nz-brand`, `data-nz-density`). When a brand ships, the generator re-declares aliases on the brand scope, because `var()` substitutes where a property is declared.
- **Motion preference:** `prefers-reduced-motion: reduce` **or** `[data-nz-motion="reduce"]` swaps the motion tokens. There is no `full` override (critique C9b) and no test-only `off`; Playwright's `animations: 'disabled'` covers screenshots.
- **Dark ships as `preview` in v0.1.** No rendered dark pass exists (G4), and every dark value is computed from hexes. It becomes stable once design reviews rendered pages 02, 04, 06 and 07.
- **No compat output.** Duplicated theme blocks for a Safari 16.4 token floor are a seam deliberately not built ([§4.2](#42-seam-ledger)). The S3 block output emitted only `:root` and a dark block, it never ran the S1 nesting matrix, and block selectors cannot express inverse surfaces inside nested themes. Consumer themes are written in `light-dark()` ([§7.9](#79-consumer-theming-recipes-docs)), so the mechanism is public, and lowering the floor would be a major.

### 7.5 Sample generated CSS

Values come from [`figma/00-tokens-and-styles.md`](figma/00-tokens-and-styles.md). Override, proposal and code-owned entries are marked ([§7.6](#76-code-owned-tokens)); their values come from gap report C §3.2.

```css
/* @nizivo/tokens/tokens.css — GENERATED by Terrazzo 2.8.0. Do not edit. */
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.tokens {
  :root {
    --nz-css-version: "0.1.0";                                         /* dev-only JS/CSS skew handshake */
    /* primitives: PRIVATE (--nz-p-*) */
    --nz-p-neutral-0: #ffffff; --nz-p-neutral-25: #fbfbf9; --nz-p-neutral-50: #f6f7f4; --nz-p-neutral-200: #e2e5df;
    --nz-p-neutral-300: #cbd0c8; --nz-p-neutral-400: #9ea59c; --nz-p-neutral-500: #747c73; --nz-p-neutral-600: #596058;
    --nz-p-neutral-700: #414741; --nz-p-neutral-850: #202421; --nz-p-neutral-900: #181b19; --nz-p-neutral-950: #101311;
    --nz-p-neutral-450: #828a81; --nz-p-neutral-925: #151816;           /* PROPOSAL (new primitives; proposals.tokens.json) */
    --nz-p-green-300: #79b993; --nz-p-green-400: #4c9e71; --nz-p-green-500: #2e8358; --nz-p-green-700: #1a573a;
    --nz-p-green-950: #0a211a; --nz-p-lime-300: #c6e06a; --nz-p-lime-400: #afd146; --nz-p-red-600: #b93a23;
    /* … remaining Figma primitives (54) + red/400 #e47962, blue/400 #7098e0 (proposed) */

    /* semantic colour: ONE declaration each; resolves per element, so nested scopes are free (S1) */
    --nz-bg-canvas:         light-dark(var(--nz-p-neutral-50),  var(--nz-p-neutral-950));
    --nz-bg-surface:        light-dark(var(--nz-p-neutral-0),   var(--nz-p-neutral-900));
    --nz-bg-surface-raised: light-dark(var(--nz-p-neutral-0),   var(--nz-p-neutral-850));
    --nz-bg-subtle:         light-dark(var(--nz-p-neutral-25),  var(--nz-p-neutral-925));  /* OVERRIDE dark n900→n925, expires 2027-01-31 */
    --nz-bg-brand:          light-dark(var(--nz-p-green-700),   var(--nz-p-green-400));
    --nz-bg-accent:         light-dark(var(--nz-p-lime-300),    var(--nz-p-lime-400));
    --nz-bg-accent-hover:   light-dark(var(--nz-p-lime-400),    var(--nz-p-lime-300));     /* PROPOSAL; dark value UNVERIFIED */
    --nz-bg-critical:       var(--nz-p-red-600);                                           /* OVERRIDE: red/600 in both modes */
    --nz-text-primary:      light-dark(var(--nz-p-neutral-900), var(--nz-p-neutral-50));
    --nz-text-secondary:    light-dark(var(--nz-p-neutral-700), var(--nz-p-neutral-300));  /* OVERRIDE Option A */
    --nz-text-tertiary:     light-dark(var(--nz-p-neutral-600), var(--nz-p-neutral-400));  /* OVERRIDE Option A: 5.65:1 worst */
    --nz-text-on-accent:    var(--nz-p-green-950);                                         /* single-mode in Figma */
    --nz-text-on-critical:  var(--nz-p-neutral-0);                                         /* PROPOSAL (new) */
    --nz-border-default:    light-dark(var(--nz-p-neutral-200), var(--nz-p-neutral-700));  /* OVERRIDE dark n800→n700 */
    --nz-border-control:    light-dark(var(--nz-p-neutral-450), var(--nz-p-neutral-500));  /* PROPOSAL (new): ≥ 3.10:1 on every bg */
    --nz-border-focus:      light-dark(var(--nz-p-green-500),   var(--nz-p-green-300));

    /* code-owned */
    --nz-bg-scrim:          light-dark(rgb(24 27 25 / 0.32), rgb(0 0 0 / 0.6));
    --nz-focus-halo:        color-mix(in oklab, var(--nz-border-focus) 28%, transparent); /* resolves per scope (probe) */
    --nz-elevation-ring:    light-dark(transparent, rgb(255 255 255 / 0.08));
    --nz-elevation-highlight: transparent;                                                 /* design may switch it on */
    --nz-elevation-1: 0 0 0 1px var(--nz-elevation-ring),
                      0 1px 2px 0 light-dark(rgb(16 19 17 / .04), rgb(0 0 0 / .24)),
                      0 1px 1px 0 light-dark(rgb(16 19 17 / .03), rgb(0 0 0 / .18));
    --nz-elevation-button: inset 0 1px 0 0 rgb(255 255 255 / .16), 0 1px 2px 0 rgb(10 33 26 / .18); /* Figma's raw Primary effect */
    --nz-chart-warning:  var(--nz-icon-warning);                         /* PROPOSAL: interim until design adds chart/warning */
    --nz-chart-critical: var(--nz-chart-negative);                       /* PROPOSAL: interim until design adds chart/critical */
    --nz-scheme-inverse: dark;
    --nz-z-raised: 1; --nz-z-sticky: 100; --nz-z-chrome: 200; --nz-z-overlay: 1000; --nz-z-toast: 1100;

    /* foundation (rem except border widths) */
    --nz-space-1-5: 0.375rem; --nz-space-2: 0.5rem; --nz-space-4: 1rem; --nz-radius-md: 0.75rem; --nz-radius-2xl: 1.75rem;
    --nz-border-width-default: 1px; --nz-border-width-focus: 2px;
    --nz-size-control-sm: 2rem; --nz-size-control-md: 2.5rem; --nz-size-control-lg: 3rem; --nz-size-touch-min: 2.75rem;
    --nz-font-family-sans: var(--font-geist-sans, "Geist"), ui-sans-serif, system-ui, sans-serif;  /* no font files shipped */
    /* text styles: a font shorthand built from its own sub-values (the shape Terrazzo 2.8.0 emits; W1 dry run) */
    --nz-font-label-m: var(--nz-font-label-m-font-weight) var(--nz-font-label-m-font-size)/var(--nz-font-label-m-line-height)
                       var(--nz-font-label-m-font-family);
    --nz-font-label-m-font-family: var(--nz-font-family-sans);        /* W1 emits Figma's literal "Geist"; week 2 maps it */
    --nz-font-label-m-font-size: 0.875rem; --nz-font-label-m-font-weight: 500; --nz-font-label-m-line-height: 1.4;
    --nz-tracking-label-m: 0em;                                         /* the letter-spacing sub-value, renamed; em in week 2 */
    --nz-font-body-s:  var(--nz-font-body-s-font-weight) …;            /* PROPOSAL: Body/S, 400 12 px / 1.5 (name confirmed W1, §7.6) */
    --nz-font-label-s: var(--nz-font-label-s-font-weight) …;           /* PROPOSAL: Label/S, 500 12 px / 1.4 (name confirmed W1, §7.6) */

    /* motion: Figma "Default" mode + derived pairs */
    --nz-duration-instant: 80ms; --nz-duration-fast: 140ms; --nz-duration-base: 220ms; --nz-duration-chart-draw: 700ms;
    --nz-duration-fade: 140ms;                                          /* code-owned: = fast by default, survives Reduced (§13) */
    --nz-duration-pulse: 2000ms; --nz-duration-spin: 1000ms;            /* code-owned: Skeleton loop (one cycle); spinner turn */
    --nz-easing-standard: cubic-bezier(0.2, 0, 0, 1); --nz-easing-enter: cubic-bezier(0, 0, 0, 1);
    --nz-easing-exit: cubic-bezier(0.3, 0, 1, 1);
    --nz-easing-spring: linear(0, 0.007 1.5%, 0.027 3.1%, 0.06 4.8%, 0.108 6.7%, 0.211 10%, 0.559 20.2%, 0.658 23.5%,
      0.742 26.7%, 0.811 29.8%, 0.868 32.9%, 0.916 36.1%, 0.954 39.4%, 0.985 43%, 1.007 46.9%, 1.022 51.1%,
      1.029 55.9%, 1.029 63.7%, 1);                                     /* spring(1,260,24,0): 19 points, 224 B (S4) */
    --nz-easing-spring-soft: linear(0, 0.006 1.2%, 0.021 2.4%, 0.083 5.2%, 0.161 7.8%, 0.462 17%, 0.555 20.3%, 0.637 23.6%,
      0.706 26.9%, 0.766 30.3%, 0.817 33.9%, 0.86 37.7%, 0.898 42.1%, 0.929 47%, 0.953 52.5%, 0.971 58.7%, 0.991 73.9%, 1);
                                                                        /* spring(1,170,26,0): 18 points, 211 B, no overshoot */
    --nz-duration-spring: 493ms; --nz-duration-spring-soft: 702ms;    /* derived; always travel with their easing */
    --nz-distance-lift: 0.25rem; --nz-scale-press: 0.98; --nz-scale-enter: 0.96;

    /* responsive: base = Figma "Mobile" mode (mobile first) */
    --nz-grid-columns: 4; --nz-grid-gutter: 1rem; --nz-grid-margin: 1rem; --nz-layout-sidebar: 0rem;
    --nz-layout-content-max: 22.375rem; --nz-type-h1: 1.5rem; --nz-type-kpi: 1.75rem; --nz-section-gap: 1.25rem;
  }

  /* theme scopes set ONLY color-scheme. :root has none, so the default is opt-in light (S1). */
  [data-nz-theme="light"]  { color-scheme: light;      --nz-scheme-inverse: dark; }
  [data-nz-theme="dark"]   { color-scheme: dark;       --nz-scheme-inverse: light; }
  [data-nz-theme="system"] { color-scheme: light dark; --nz-scheme-inverse: dark; }
  @media (prefers-color-scheme: dark) { [data-nz-theme="system"] { --nz-scheme-inverse: light; } }
  [data-nz-scheme="inverse"] { color-scheme: var(--nz-scheme-inverse); }

  /* reduced motion = Figma "Reduced" mode (only.modifiers + exclude; S3 shape) */
  @media (prefers-reduced-motion: reduce) {
    :root {
      --nz-duration-instant: 0ms; --nz-duration-fast: 0ms; --nz-duration-base: 120ms; --nz-duration-chart-draw: 0ms;
      --nz-duration-fade: 120ms; --nz-duration-pulse: 0ms;              /* the loop stops; --nz-duration-spin is kept (§13.2) */
      --nz-easing-standard: linear; --nz-easing-enter: linear; --nz-easing-exit: linear;
      --nz-easing-spring: linear; --nz-duration-spring: 120ms; --nz-easing-spring-soft: linear; --nz-duration-spring-soft: 120ms;
      --nz-distance-lift: 0px; --nz-scale-press: 1; --nz-scale-enter: 1;
    }
  }
  [data-nz-motion="reduce"] { /* the same declarations, emitted by the same permutation */ }

  /* viewport: @custom-media is substituted at build time (variables cannot appear in media queries) */
  @media (width >= 40rem) {            /* --nz-sm: "Below 640px the sidebar becomes a five-tab bar" (designer, settled 11) */
    :root { --nz-grid-columns: 8; --nz-grid-gutter: 1.25rem; --nz-grid-margin: 1.5rem; --nz-layout-sidebar: 4.5rem;
            --nz-layout-content-max: 61rem; --nz-type-h1: 1.75rem; --nz-type-kpi: 1.75rem; --nz-section-gap: 1.5rem; }
  }
  @media (width >= 80rem) {            /* --nz-lg: PROVISIONAL threshold (outside semver); values are Figma "Desktop" */
    :root { --nz-grid-columns: 12; --nz-grid-gutter: 1.5rem; --nz-grid-margin: 2rem; --nz-layout-sidebar: 16.5rem;
            --nz-layout-content-max: 80rem; --nz-type-h1: 2rem; --nz-type-kpi: 2rem; --nz-section-gap: 2rem; }
  }
}
```

Notes on the sample:
- `light-dark()` inside `color-mix()` and `box-shadow` resolved per scope in Chromium 156 and WebKit 27.2 (probe), and on **Firefox 129** for the token path (`--nz-focus-halo`, `--nz-elevation-1`; W1 floor lane, `fixtures/floor-lane/RESULTS.md`). Written **directly** on a non-inherited property with literal colours (`background-color: light-dark(#fff, #181b19)`, the same inside `color-mix()` or a `box-shadow` colour), it takes the wrong scheme in nested scopes on Firefox 129–131 (bug 1914735, fixed in 132). `tokens.css` never takes that shape; consumers are told to keep it in custom properties ([§7.9](#79-consumer-theming-recipes-docs)), and it is Deviations page entry D1 ([§18.2](#182-docs-site-public)). **The Safari 17.5 floor itself is still UNVERIFIED** (§21.1, exit criterion 6).
- The elevation shadows use gap report C §2.3's rule: same geometry as Figma, dark alpha = min(0.6, 6 × light alpha), black. These are design-tuning values. An elevation whose every layer has alpha 0 is flat: no ring and no highlight (`--nz-elevation-0: 0 0 0 0 transparent`; D-m).

### 7.6 Code-owned tokens

Figma has no breakpoints, z-index, scrim or dark elevation. These live in `src/code-owned/**`. **One rule decides where a value that Figma does not supply goes:**
- **Re-pointed existing Figma variables** (an alias changed for contrast, or for the Option A ladder in the case of text/secondary: text/secondary, text/tertiary, dark text/critical, dark text/info, icon/warning, border/warning, dark icon/critical, dark bg/critical, dark bg/subtle and the dark border/* values) go in `code-owned/a11y/{light,dark}.overrides.tokens.json` with `$extensions["app.nizivo.override"]` (`figmaVariableId`, `figmaValueAtOverride`, …; [§15.4](#154-ownership-and-the-override-mechanism)). Drift and redundancy are checked against the Figma value.
- **New variables and primitives** (no Figma variable yet) are proposals, with `$extensions["app.nizivo.proposal"]` (`figmaVariable` to create, `approvedBy`, `expires`). Their redundancy check is "Figma now defines this variable", which forces deletion. W2 splits them by kind, because one DTCG resolver source cannot hold a value per mode. Semantic colour proposals live in `code-owned/proposals/color/{light,dark}.tokens.json` (all ten: bg/scrim, bg/accent-hover, bg/critical-hover, text/on-critical, text/accent, icon/info, border/control and -hover, chart/warning, chart/critical) and motion proposals in `code-owned/proposals/motion/{default,reduced}.tokens.json` (duration/fade, duration/pulse, scale/enter). A proposal with one value for every mode (bg/critical-hover, text/on-critical, chart/warning, chart/critical) repeats it, with its metadata, in both files; the gate checks that the copies agree. Primitives and text styles (neutral/450, neutral/925, red/400, blue/400, `Body/S`, `Label/S`) are in `code-owned/proposals.tokens.json`.
- **New text styles** (no Figma style yet) go in the same file as `typography` tokens. Their proposal extension names a `figmaStyle` instead of a `figmaVariable`, and the redundancy check matches the style name in the export, so an entry deletes itself once design adds the style. The first two are `Body/S` and `Label/S` at 12 px (decision 8c). Their CSS names, `--nz-font-body-s` and `--nz-font-label-s`, are **confirmed** by the week 1 Terrazzo dry run (`packages/tokens/figma/DRY-RUN.md`): written as `typography` tokens at `font.body.s` and `font.label.s`, the proposals emit the same shorthand and sub-values as a real style, and Figma styles named `Body/S` and `Label/S` normalize to the same ids. Swapping in the real styles is therefore not a breaking change.
- **Code-owned by nature** (breakpoints, z-index, derived spring values, the inverse mechanism) carry neither and stay.

| Token | Value | Why code-owned | Leaves code when |
|---|---|---|---|
| breakpoint `sm` | 40rem | Designer text on page 08 (settled 11) | never (code-owned by nature) |
| breakpoint `lg` | 80rem, `$extensions["app.nizivo.status"]: "provisional"` (namespaced, as DTCG extensions should be) | No designer threshold (C11); the Desktop **values** are designer-authored | design confirms; the flag is removed |
| breakpoint `md` | not emitted | no evidence | design asks for one |
| `--nz-z-raised/-sticky/-chrome/-overlay/-toast` | 1 / 100 / 200 / 1000 / 1100 | An engineering layering model (gap report C §1.5) | never |
| `--nz-bg-scrim` (proposal) | light n900 @ 32%; dark #000 @ 60% | Missing in Figma; 08's raw `bg/inverse @ .32` **brightens** dark pages | design adds `bg/scrim` |
| `--nz-bg-accent-hover` (proposal) | light lime/400 (as Figma binds it); dark lime/300 (UNVERIFIED) | Figma binds a mode-blind primitive; in dark, hover equals rest | design adds `bg/accent-hover`. No `bg/accent-pressed` is shipped: neither the plan nor gap report C has a value, so design is asked ([figma-handoff §1.5](figma-handoff.md#15-asks-from-week-2-2026-10-14)) |
| `--nz-elevation-ring`, `--nz-elevation-highlight`, dark shadow alphas | §7.5 | No dark elevation (G16) | design binds effect colours to variables |
| `--nz-elevation-button` | Figma's raw Primary highlight + green-tinted shadow (02) | Hard-coded effect in Figma | design creates `Elevation/Button` |
| `--nz-focus-halo` | `color-mix(in oklab, var(--nz-border-focus) 28%, transparent)` | Figma's halo is static and drifts in hex | design binds Focus/Ring to a variable |
| `--nz-duration-spring(-soft)`, `--nz-easing-spring(-soft)` | 493 / 702 ms + `linear()`; Reduced 120 ms + `linear` | Derived by the one generator | never (derived) |
| `--nz-duration-fade` | 140 ms; Reduced 120 ms | Keeps fades in Reduced mode ([§13](#13-motion)) | design adds `duration/fade` to Nizivo Motion (handoff Q34) |
| `--nz-duration-pulse` | 2000 ms (one cycle; the 09 specimen's 1000 ms half-cycle); Reduced 0 ms | Loops stop in Reduced instead of speeding up ([§13.2](#132-rules)) | design adds `duration/pulse` |
| `--nz-duration-spin` | 1000 ms; unchanged in Reduced | The pending spinner is essential status feedback | never (code-owned) |
| `--nz-chart-warning` (proposal) | `var(--nz-icon-warning)`: amber/600 in light after the §15.3 override (3.22:1 on `chart/track` and `bg/muted`, both n100) | ProgressBar `tone="warning"` ships in v0.1; Figma's fill misuses `text/warning` | design adds `chart/warning` |
| `--nz-chart-critical` (proposal) | `var(--nz-chart-negative)`: red/500 (3.77:1 light and 3.10:1 dark on `chart/track`, the background the fill sits on) | ProgressBar `tone="critical"`; Figma's fill misuses `text/critical` | design adds `chart/critical` |
| `--nz-scale-enter` | 0.96; Reduced 1 | From the Dropdown Menu description "scale 0.96→1" | design adds `scale/enter` |
| `--nz-font-body-s`, `--nz-font-label-s` (proposals) | 400 / 500, 12 px (0.75rem), line height 1.5 / 1.4, tracking 0 | Decision 8c allows 12 px; Figma has no 12 px style (figma/00) | design adds `Body/S` and `Label/S` |
| `--nz-font-family-sans`, `--nz-font-family-mono` | sans: `var(--font-geist-sans, "Geist")`, then system fallbacks ([§7.5](#75-sample-generated-css)); mono (week 2): `var(--font-geist-mono, "Geist Mono"), ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace`, a longer fallback list than sans | Figma text styles carry only the family name; the fallback stack and the `next/font` hook are code concerns | never (code-owned by nature) |
| `--nz-scheme-inverse` | dark / light | Mechanism for inverse scopes | never |
| a11y overrides and proposals | [§15.3](#153-token-remediation-computed) | WCAG failures in Figma values; variables Figma lacks | the redundancy check deletes each one |

### 7.7 Drift detection

| Signal | v0.1 | Later |
|---|---|---|
| Figma changed but the repo did not | The release PR body prints the last sync date: `createdAt` in the committed export's metadata (`tb.config.json` keeps `omitCreatedAt: false` for this). W1: TokensBrücke exports no Figma version id and no variable key, so the later REST check compares the file's latest version date with that `createdAt` | A daily scheduled GitHub Action (a local command while Actions is off, [§1](#1-decisions-we-need-from-you)) reads the file's latest version through the REST API and opens a "sync needed" issue when that version is newer than the committed export's `createdAt`. This works because the file is on Professional (decision 3). It needs a read-only Figma token as a repo secret and no hosted relay, so it costs nothing. A `LIBRARY_PUBLISH` webhook would need a hosted relay, so it is not used under the zero-spend constraint. **Never poll a file on Starter** (6 requests a month there) |
| Release while Figma is ahead | — | Releases are blocked while a "sync needed" issue is open |
| Value diff | Every extractor PR: normalize → build → token-diff sticky comment; removed or renamed public names need a breaking changeset | — |
| Hand edits to Figma-owned files | Invariant `normalize(raw) === src/figma-owned`; code-first edits need the `tokens:code-first` label plus a recorded Figma follow-up. A one-off engineer script rewrites all 175 `codeSyntax.WEB` values to `var(--nz-…)` for design to review, with the Grove → Nizivo rename (handoff §2.1). W1: `scripts/figma/codesyntax-rewrite.ts` wrote the plan (`figma/codesyntax-rewrite.plan.md`: 175 rewrites, 33 renames) and generated `scripts/figma/codesyntax-apply.figma.js`. **Applied 2026-10-14** with the maintainer's go-ahead (M10): the builder wrote it through `use_figma` only after the live change list matched the plan's FNV fingerprints `1b78ef83` and `d0cb2e42`, then read the file back to verify. The file's version history holds the pre-rename state | An agent `figma-push` script writes proposals to a Figma **branch** within the MCP budget |
| Override drift, redundancy, expiry | CI fails on each ([§15.3](#153-token-remediation-computed)) | — |
| Visual impact | Visual regression on every sync PR (light, desktop) | dark, mobile and RTL modes by v1.0 |

### 7.8 Tailwind v4 adapter

```css
/* consumer: app.css — Nizivo nests under Tailwind's components layer: above preflight, below utilities */
@import "tailwindcss";
@import "@nizivo/react/styles.css" layer(components);   /* includes tokens.css */
@import "@nizivo/tokens/tailwind.css";
```

```css
/* @nizivo/tokens/tailwind.css — GENERATED by the custom Terrazzo plugin (S3) */
@theme inline {
  --color-nz-bg-surface: var(--nz-bg-surface);
  --color-nz-text-primary: var(--nz-text-primary);
  --radius-nz-md: var(--nz-radius-md);
  --shadow-nz-1: var(--nz-elevation-1);
  --ease-nz-standard: var(--nz-easing-standard);
  --breakpoint-nz-sm: 40rem;                               /* literal: breakpoints cannot read variables */
}
```

- Utilities then follow nested themes, because they reference semantic variables, not primitives. The S3 compile with Tailwind 4.3.3 VERIFIED this for the un-namespaced form (`--color-bg-surface`).
- **The `nz` namespace (`--color-nz-*`)** avoids clobbering the consumer's palette. W2 emits it. **VERIFIED in the W2 docs step:** Tailwind 4.3.3 in `apps/docs` compiles it (`.bg-nz-bg-surface{background-color:var(--nz-bg-surface)}`, `.rounded-nz-lg`, `.shadow-nz-2`, and `nz-sm:` in the 40rem media block), and the docs smoke test checks at runtime that `bg-nz-bg-surface` follows a nested dark scope and that `nz-sm:grid-cols-2` gives 2 columns at 1280 px and 1 at 375 px.
- **`@nizivo/react/styles.css` does not exist yet** (W2 docs step). Until it does, the recipe imports `@nizivo/tokens/tokens.css`, `@nizivo/react/css/base.css` and each component stylesheet in `layer(components)`; the docs generate that list from the exports map (`apps/docs/.generated/nizivo.css`).
- **W2 scope of `tailwind.css`:** what the sketch above shows and no more: `--color-nz-*` for the `bg`, `text`, `border`, `icon` and `chart` semantic colours (no primitives), `--radius-nz-*`, `--shadow-nz-*` (elevation 1–4 and button), `--ease-nz-*`, and literal `--breakpoint-nz-sm` / `-lg`. Spacing, typography, z-index and durations are not mapped; whether they should be is open (W3–4).

### 7.9 Consumer theming recipes (docs)

```css
/* 1. Rebrand globally. light-dark() keeps it theme-safe; no [data-nz-theme] duplication needed. */
@layer nz.themes { :root { --nz-bg-brand: light-dark(#5b21b6, #a78bfa); --nz-text-on-brand: light-dark(#fff, #1e1b4b); } }
/* 2. Rebrand one subtree */
.marketing { --nz-radius-md: 999px; }
/* 3. Restyle one component everywhere through its public hook */
.nz-card { --nz-card-padding: var(--nz-space-5); }
/* 4. A dark island inside a light page: <aside data-nz-theme="dark">…</aside> */
```

Keep `light-dark()` inside custom properties, as recipe 1 does. Written directly on `background`, `border` or `box-shadow` with literal colours, it takes the wrong scheme in nested scopes on Firefox 129–131 (Deviations page entry D1, [§18.2](#182-docs-site-public)).

---

## 8. Styling contract

### 8.1 The canonical layer statement

```css
/* contracts/layers.css — the FIRST line of every CSS file Nizivo ships, verbatim
   (tokens.css, styles.css, css/base.css, every css/<name>.css, charts CSS, registry CSS). Repeating it is idempotent,
   so bundler chunk order can never change precedence. The order is semver'd public API: inserting a layer later is breaking.
   W2: Lightning CSS minification splits the statement around the layer block, so the build strips it from each source
   and writes it back verbatim as line 1 of the output. */
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
```

| Layer | Holds | Shipped by | Why it is there |
|---|---|---|---|
| `nz.tokens` | Generated custom properties, `color-scheme` scopes, motion and viewport switches | `@nizivo/tokens` | — |
| `nz.themes` | Brand files and consumer themes (`@layer nz.themes { … }`); empty in npm packages | consumers (brands later) | A theme beats base tokens regardless of import order |
| `nz.reset` | Opt-in `reset.css` only; empty otherwise | `@nizivo/react` | Components never depend on a reset |
| `nz.base` | **The a11y floor**, keyed on stable classes: focus outline, `.nz-hit-target`, forced-colours borders, `touch-action` on pressables, `[data-mirror]`, `scroll-padding` for sticky chrome and toasts | `@nizivo/react` (`css/base.css`) | It survives an E3 re-skin, because it is not in component CSS |
| `nz.components` | One block per component, **including core patterns** (KpiTile, TrendCard, RankedList, AppShell) and every chart | `@nizivo/react`, `@nizivo/charts` | — |
| `nz.patterns` | **Reserved for registry items and consumer pattern CSS**; empty in npm packages | consumers | Pattern CSS beats component CSS without specificity games, and never ties with core |
| `nz.utilities` | `.nz-visually-hidden`, `.nz-truncate`, `.nz-tabular-nums`, `.nz-text-link` (W2 ships `.nz-visually-hidden`; the others come when a component needs them) | `@nizivo/react` (`css/base.css`, a second block after `nz.base`) | Utilities must beat components |

`css/base.css` is the one shipped file that writes into two layers, `nz.base` and then `nz.utilities`; every other file writes into one. The layer guard and the stylelint layer rule allow exactly that pair for `styles/base.css` (`expectedLayers()`).

- **Unlayered consumer CSS beats every `nz.*` layer** with no `!important` ([r2 §4.2](research/r2-styling.md)).
- **Tailwind:** `@import "@nizivo/react/styles.css" layer(components);` nests all seven layers inside Tailwind's `components` layer, above preflight and below utilities ([§7.8](#78-tailwind-v4-adapter)).
- React Aria injects a small anonymous `@layer {}` into `<head>`. It is created first, so it has the lowest priority and never disturbs this order (gap report B §B1.2).

### 8.2 Class, slot and naming conventions

| Thing | Convention | Example |
|---|---|---|
| Root class | `nz-<component>`, kebab-case, unhashed, fixed prefix | `nz-kpi-tile` |
| Part class | `nz-<component>-<part>` (no BEM `__`/`--`; stylelint pattern `^nz(-[a-z0-9]+)+$`) | `nz-select-trigger` |
| `data-slot` | The class minus `nz-`, on every documented part | `data-slot="select-trigger"` |
| Variant attributes | `data-variant`, `data-size`, `data-tone`; any other enumerated presentational prop maps to `data-<prop>`. The `presentational` group of `contracts/vocabulary.json` holds 13 names: `data-slot`, `data-variant`, `data-size`, `data-tone`, `data-full-width` (D-c), and since week 2 `data-padding`, `data-elevation`, `data-shape`, `data-gap`, `data-span`, `data-span-sm`, `data-span-lg` and `data-ratio` (D-j). All are part-owned under the composition rule below. Adopted 2026-10-14 (builder defaults; the maintainer can override) | `data-padding="sm"`, `data-full-width` |
| Public hook | `--nz-<component>-<property>[-<state>]`; **read, never assigned by Nizivo**. A component whose name is also a token family (`text`: `--nz-text-*`; `grid`: `--nz-grid-*`) has no hooks under that prefix: the contract always reads such a name as a token, so a mistyped token cannot pass as a hook. Text, Heading (for consistency with Text) and Grid have no hooks in W2 | `--nz-button-bg-hover` |
| Private variable | `--_nz-<component>-<property>`; set only by variant, size and tone rules | `--_nz-button-bg` |
| Components and parts | PascalCase; flat `<Component><Part>`, and `Component.Part` through the namespace | `SelectTrigger`, `Select.Trigger` |
| Enumerations | Lowercase Figma names, never invented synonyms | `variant: 'primary' \| 'secondary' \| 'tertiary' \| 'critical' \| 'accent'`; `tone: 'critical'` (not `danger`) |
| Booleans | HTML-aligned, no `is` prefix | `disabled`, `invalid`, `pending`, `required`, `readOnly`, `fullWidth` |
| Callbacks | `on<X>Change(value, details)`; `details.reason` is Nizivo-owned and may be `'unknown'` | `onOpenChange(open, { reason: 'escape' })` |
| Client files | `'use client'` only in `*.client.tsx` and `_engines/**` | `field-scope.client.tsx` |

Consumer `className` is appended **after** ours. Consumer event handlers run **before** ours, and ours skip when `event.defaultPrevented`. A part is "documented" when it has a `data-slot`; DOM between documented parts is not API. A documented inner element of a single-root component is API for CSS only (see "Which parts take `render`" below).

**Composition precedence.** Adopted 2026-10-14 (builder default; the maintainer can override). The maintainer's "okay for now" (2026-10-14, D-a) covers the week 1 rule: the part's presentational attributes win, and every other prop merges with the element winning. Week 2 grew the presentational group to 13 names (D-j) and added the children rule below; both are builder defaults. When a part renders through a `render` element, the part's presentational attributes win: the 13 names of the vocabulary's `presentational` group (`PART_OWNED` in `contracts/render.ts`; a unit test keeps the two equal). Every other prop merges with `mergeProps` semantics, where the element wins, and duplicate `className` tokens are dropped. **Children follow the same rule, so a render element with no content of its own must not carry any:** Button renders no children at all when it has no label, icon or pending indicator. Otherwise a server `<Button />` passed as `Select.Trigger`'s `render` reaches the part under RSC as a host `<button>` whose only child is an empty label span, and it replaces the trigger's value and chevron (the week 2 `/select-composed` fixture page caught this; `packages/react/test/unit/render.test.tsx` checks it). Making the part's children win instead is wrong: it broke `/render-prop`, where React Aria hands `Dialog.Trigger` non-null children. The rule covers a server `Button` passed into a client part: under RSC it arrives pre-rendered as a host `<button data-slot="button" data-size="md">`, so fixing precedence inside Button alone is not enough (the Next fixture caught this in week 1). Button also applies its own `data-*` before the consumer's props, so the in-tree path gives the same result. `data-size` therefore follows the part: `Select.Root size="lg"` with a Button trigger gives `data-size="lg"`.

**Which parts take `render`.** Every exported part that renders DOM, except the engine-owned positioned popups (`Select.Popup`, `Dialog.Popup`, `Tooltip.Popup`) and `Select.Root`. The engine owns those elements in v0.1 (positioning, focus containment, portal). Adopted 2026-10-14 (builder default; the maintainer can override); revisit with the v0.2 hooks adapter, which owns its DOM. Explained to the maintainer on 2026-10-14 as having no visual difference; no change was requested (D-b). **The shipped reading (week 2, a builder default the explanation did not cover):** a single-root component (Badge, Delta, Alert, ProgressBar, Meter, ProgressRing, EmptyState, InlineError, Kbd) takes `render` on its root only. Its inner elements carry a `data-slot` (`alert-title`, `progress-bar-track`, `meter-label`, `kbd-glyphs`, `delta-value`, …) so CSS can target them, but they are prop slots, not exported parts, and take no `render`. ProgressBar's and Meter's `render` composes the wrapper; the native `<progress>` or `<meter>` takes none, because a replaced element would lose its value semantics.

### 8.3 The state vocabulary (one list, engine-independent)

The single source is `contracts/vocabulary.json`. It generates the `stateAttrs()` TypeScript helper, the stylelint allowlist, the emitted-CSS check and the docs page.

**Rules.**
1. **Native and ARIA first, but only for states that belong to the element whatever the engine.** CSS may select `:disabled`, `:checked`, `:indeterminate`, `:focus-visible`, `:user-invalid`, `:placeholder-shown`, `[aria-expanded]`, `[aria-current]`, `[aria-pressed]`, `[aria-sort]` and `[aria-selected]` on T0 parts and on engine parts that render the same native element.
2. **Overlay state is always `data-*`.** `[open]`, `:popover-open`, `:modal` and `::backdrop` are **not** in the public vocabulary, because they exist only for native overlays. Using them would make every re-skin break on an engine swap.
3. Adapters derive attributes from the engine's **render state** (React Aria's `isEntering`, `isSelected`, …), never by copying engine DOM attributes. The adapter strips **every** engine `data-*` attribute, including engine copies of vocabulary names such as React Aria's own `data-invalid` and `data-pressed` ([§9.3](#93-contract-rules-keep-the-seam-honest) rule 6); only an undocumented per-engine functional allowlist reaches the DOM, and no shipped CSS or docs reference it. This rule wins where rule 6 once said vocabulary-named engine attributes may pass. Adopted 2026-10-14 (builder default; the maintainer can override). (Without the filter, React Aria's `data-hovered` would sit next to Nizivo's `data-pressed` and look official, and CSS written against it would break on any engine swap.)
4. Every attribute is a **presence** attribute (`data-open=""`) unless a value set is listed.
5. **A name listed with `"values": null` takes its value set from each component manifest's `variants`**, under the camelCase prop name: `data-padding` reads Card's `variants.padding`, `data-span-sm` reads Grid's `variants.spanSm`, and the local `data-platform` reads Kbd's `variants.platform` (`apple`, `other`). The emitted-CSS check fails on a value outside that set, or on a component that does not declare the variant. `data-slot` is the exception: its value must be a component's slot name (`<name>` or `<name>-<part>`, [§8.2](#82-class-slot-and-naming-conventions)), checked against the slot prefixes, not `variants`. `component.json` has no field for component-local attributes; they live in the vocabulary's `local` group. Adopted 2026-10-14 (builder default; the maintainer can override).

**Global state attributes** (emitted by `stateAttrs()`):

| Attribute | Values | On | Meaning | React Aria source (adapter) |
|---|---|---|---|---|
| `data-open` | — | triggers, positioners, popups, backdrops, disclosures | Open | `isOpen` |
| `data-entering` / `data-exiting` | — | popups, backdrops, toasts | Enter/exit transition running; the node stays mounted until it ends | `isEntering` / `isExiting` |
| `data-side` | `top\|right\|bottom\|left` | positioned popups | **Resolved physical** side after flip and RTL; the `side` prop takes logical values | `placement` |
| `data-align` | `start\|center\|end` | positioned popups | Resolved alignment | the requested `align` (React Aria reports only the resolved side, so its adapter echoes the request) |
| `data-nested-open` | — | dialog popup | A child modal is open | own |
| `data-highlighted` | — | collection items | Keyboard or virtual focus, or pointer hover | `isFocused` (items) |
| `data-selected` | — | items, rows, tabs, segments | Selected | `isSelected` |
| `data-checked` / `data-indeterminate` | — | menu checkbox/radio items, select-all | Checked/mixed where no native input exists | `isSelected` / `isIndeterminate` |
| `data-pressed` | — | engine pressables | Pointer or keyboard press (native parts use `:active`) | `isPressed`, but not while open: React Aria also reports an open Select or Dialog trigger as pressed, and adapters do not map that |
| `data-focus-visible` | — | parts with virtual or programmatic focus | Otherwise use `:focus-visible` | `isFocusVisible` |
| `data-disabled` / `data-readonly` / `data-required` | — | control roots, items, non-native renders | Mirrors the attribute | `isDisabled` / `isReadOnly` / `isRequired` |
| `data-invalid` | — | field, control | **An error message is currently presented** (not "fails constraints"; gap report A §2.3) | own Field state, never the engine's |
| `data-placeholder` | — | select value | No value chosen | `isPlaceholder` |
| `data-orientation` | `horizontal\|vertical` | tabs, segmented control, separator | Layout axis | `orientation` |
| `data-loading` / `data-pending` / `data-empty` / `data-error` | — | data-display roots, rows, Button | Data lifecycle ([§16.5](#165-loading-empty-and-error-contract)); `data-pending` also on Button and SubmitButton | own / `isPending` |
| `data-mirror` | `rtl` | directional glyphs | Mirror under `:dir(rtl)` | own |

**Presentational attributes** (the `presentational` group; part-owned under the composition rule, [§8.2](#82-class-slot-and-naming-conventions)): `data-slot`, `data-variant`, `data-size`, `data-tone` and `data-full-width`, plus, since week 2 (D-j), `data-padding` (Card), `data-elevation` (Card), `data-shape` (Skeleton), `data-gap` (Stack, Inline, Grid), `data-span`, `data-span-sm` and `data-span-lg` (GridItem) and `data-ratio` (Image). Every one except the presence attribute `data-full-width` is listed with `"values": null` (rule 5; `data-slot` takes the slot names).

**Component-local attributes** (semver'd in each component's manifest): `data-sort` (`ascending|descending`, on `<th>`), `data-interactive` (card, row with a stretched link), `data-presentation` (`table|list`, DataView), `data-collapsed` (Sidebar rail), `data-validate-on` (`submit|blur`, Field), the calendar-cell set (`data-today`, `data-outside-month`, `data-unavailable`, `data-range-start`, `data-range-end`, `data-in-range`), `data-platform` (Kbd glyph spans), `data-x-direction` (chart plot), and the a11y-floor opt-outs `data-focus-inset` and `data-hit-inset`.

**Scope attributes** (`data-nz-*`, set on ancestors or scope roots, never as component state):

| Attribute | Values | Set by |
|---|---|---|
| `data-nz-theme` | `light\|dark\|system` | the app on `<html>`, or any subtree |
| `data-nz-motion` | `reduce` | the app (no `full`) |
| `data-nz-scheme` | `inverse` | Toast, Tooltip, Card `tone="inverse"` |
| `data-nz-platform` | `apple\|other` | `ThemeScript` (for Kbd) |
| `data-nz-touch-targets` | `always` | app opt-in for hybrid touch laptops |
| `data-nz-bottom-bar` | — | the shell, in a layout effect (toast and sticky-bar offsets) |
| `data-nz-top-layer` | — | toast region and live announcer (`OverlayEngine.markTopLayer` maps it to the engine's exemption attribute) |
| `data-nz-brand`, `data-nz-density` | **reserved, no values in 0.x** | — |

**Runtime CSS variables written by components** (read-only for consumers): `--nz-trigger-width`, `--nz-available-width`, `--nz-available-height` and `--nz-transform-origin` on popups; `--nz-toast-inset`, `--nz-layout-bottom-inset` and `--nz-layout-top-inset` on `<html>`. They are written through CSSOM from client code, which a strict CSP allows (gap report B §B1.1). The React Aria adapter copies them from the engine's positioning style: `--trigger-width` → `--nz-trigger-width`, `--trigger-anchor-point` → `--nz-transform-origin`, and `maxHeight` → `--nz-available-height`. React Aria provides nothing for `--nz-available-width`, so that variable is not written with this engine. The adapter also drops the engine's inline `z-index` (100000), so the `--nz-z-overlay` band applies ([§12.1](#121-the-layering-model)).

### 8.4 Component CSS hooks

1. **A hook is read once, at the property:** `background: var(--nz-button-bg, var(--_nz-button-bg));`. Variants, sizes and tones set **only** `--_nz-*` privates. A variant therefore can never shadow a consumer hook, and no variant can "forget" to honour one.
2. **stylelint rules** (`@nizivo/stylelint-config`, also applied to registry CSS):
   - no declaration of `--nz-<component>-*` anywhere in shipped CSS;
   - every `--nz-*` token name used must exist in `contract.json`; `--nz-p-*` is banned outside tokens;
   - no `light-dark(`, `prefers-color-scheme` or `[data-nz-theme` outside `packages/tokens`;
   - a `--nz-easing-spring*` value must sit in the same transition item as its paired `--nz-duration-spring*`, and only on `transform`, `scale`, `translate` or `rotate`;
   - `animation-iteration-count: infinite` only with `--nz-duration-pulse` or `--nz-duration-spin` ([§13.2](#132-rules));
   - logical properties only (`stylelint-use-logical`);
   - `font-size` ≥ 0.75rem (12 px, decision 8c), and 12 px only through the `Body/S` and `Label/S` tokens;
   - every file starts with the canonical layer line;
   - `@keyframes` names match `^nz(-[a-z0-9]+)+$` (`nz-<component>-<name>`), because keyframe names are global and a shipped `spin` would clash with a consumer's or Tailwind's (`keyframes-name-pattern`, added in week 2);
   - a component whose name is also a token family (`text`, `grid`) cannot have hooks under that prefix: a missing `--nz-text-*` or `--nz-grid-*` name is always reported as a missing token, never accepted as a hook ([§8.2](#82-class-slot-and-naming-conventions)).
3. **Per-state hooks** (`-hover`, `-pressed`, `-disabled`) exist in 0.x only on Button, IconButton, Input, Select trigger, Card and NavItem. Other components get base hooks, except Text, Heading and Grid, which have none (rule 2). Adding a hook later is a minor.
4. **Hooks are extracted** by a Lightning CSS visitor into `contracts/api/css/<name>.json`. A removed hook is breaking; during a deprecation the old name is aliased as `var(--nz-new, var(--nz-old, …))` for one minor.

### 8.5 The a11y floor (`nz.base`)

The selector lists are generated from `component.json` (`"interactive"` parts, `"focusTarget"` and `"stateIndicator"`), so a new component cannot forget them. W2 (`packages/tooling/gen/base-css.ts`, field reference in `packages/tooling/gen/COMPONENT-JSON.md`) fixed how each list is built:
- **Focus:** `focusTarget: "self"` emits `:where(<interactive slots>):is(:focus-visible, [data-focus-visible])`, so the separate virtual-focus list for items in the sketch below is covered by `self`. `"nested-input"` emits the `:has(> input:focus-visible)` rule, and the new `"within"` mode emits the `:focus-within` rule for a group such as Input's box (`.nz-input`; week 3 named the root after the component, §8.2, and the native element `.nz-input-control`). Week 3: WebKit matches no `:focus-visible` on a radio reached by an arrow key, so `nested-input` now emits `:is(:has(> input:focus-visible), [data-focus-visible])` and the component sets `data-focus-visible` on the label after a key (SegmentedControl; ChipGroup and ChoiceCard need the same, D-t).
- **`touch-action`:** the interactive slots, except those in `within` mode.
- **Forced colours:** one rule per `stateIndicator` entry, `{ slot, state?, paint }`, where `paint` is `border`, `fill`, `highlight`, `mark` or `outline`. The popup borders come from explicit `border` entries, and the schema requires one for `<name>-popup` on every `"overlay": true` component.
- The rules sit in `@layer nz.base`. No reduced-motion rule belongs here: reduced motion is a token swap in `tokens.css` ([§13.2](#132-rules) rule 3).

```css
/* @nizivo/react/css/base.css (excerpt) — generated selector lists; survives any component re-skin */
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.base {
  /* settled 12: a 2 px SOLID outline is the indicator (forced-colours safe; green/500 is ≥ 4.07:1 on every light bg).
     Components may add the halo (--nz-focus-halo) as decoration only. */
  :where(.nz-button, .nz-icon-button, .nz-select-trigger, .nz-menu-trigger, .nz-tabs-tab,
         .nz-checkbox-input, .nz-radio-input, .nz-switch-input /* … */):focus-visible,
  :where(.nz-menu-item, .nz-select-item /* … virtual focus */)[data-focus-visible],
  /* focusTarget "nested-input": the visible part is a <label> wrapping a hidden native input */
  :where(.nz-segmented-control-item, .nz-chip, .nz-choice-card):has(> input:focus-visible) {
    outline: var(--nz-border-width-focus) solid var(--nz-border-focus);
    outline-offset: 2px;
  }
  :where(.nz-input):focus-within { outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px; }  /* week 3: Input's box; Textarea is the box itself (self) */
  [data-focus-inset]:focus-visible { outline-offset: -2px; }            /* inside clipped scrollers (DialogBody, table cells) */

  /* gap report C §3.6 — fixes critique S2: correct sign, BOTH axes, primary coarse pointer only */
  .nz-hit-target { position: relative; }
  @media (pointer: coarse) {
    .nz-hit-target:not([data-hit-inset])::after { content: ""; position: absolute; inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2)); }
  }
  [data-nz-touch-targets="always"] .nz-hit-target:not([data-hit-inset])::after {
    content: ""; position: absolute; inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));
  }
  /* survives a blocked engine <style> injection under strict CSP (gap report B §B1.3) */
  :where(.nz-button, .nz-icon-button, .nz-select-trigger /* … pressables */) { touch-action: pan-x pan-y pinch-zoom; }

  @media (forced-colors: active) {   /* backgrounds are replaced and shadows dropped: borders and system colours carry edges and state */
    :where(.nz-dialog-popup, .nz-popover-popup, .nz-menu-popup, .nz-select-popup, .nz-tooltip-popup, .nz-toast) { border: 1px solid CanvasText; }
    /* generated from "stateIndicator" */
    :where(.nz-checkbox-input, .nz-radio-input, .nz-switch-input) { border: 1px solid CanvasText; }
    :where(.nz-checkbox-input, .nz-radio-input, .nz-switch-input):is(:checked, :indeterminate) { background: Highlight; forced-color-adjust: none; }
    .nz-switch-thumb { background: CanvasText; forced-color-adjust: none; }
    .nz-segmented-control-item:has(> input:checked) { outline: 2px solid Highlight; }
    :where(.nz-progress-bar-track)::-webkit-progress-value { background: Highlight; forced-color-adjust: none; }
    /* … one rule per native value pseudo-element (::-moz-progress-bar, the ::-webkit-meter-* values, ::-moz-meter-bar) */
    :where(.nz-menu-item, .nz-select-item)[data-selected] { background: Highlight; color: HighlightText; forced-color-adjust: none; }
  }
  :dir(rtl) [data-mirror="rtl"] { scale: -1 1; }
  html { scroll-padding-block: var(--nz-layout-top-inset, 0px) calc(var(--nz-layout-bottom-inset, 0px) + var(--nz-toast-inset, 0px)); }
}
```

`::after` is **reserved** for the hit area on interactive roots; components draw decoration with `::before` or real elements. Native checkbox, radio and switch inputs have no pseudo-elements, so their hit target is the wrapping `<label class="nz-checkbox nz-hit-target">`.

- **Focus on label-wrapped inputs.** SegmentedControl (v0.1), ChipGroup and ChoiceCard (v0.2) are native radios or checkboxes hidden inside a `<label>`, so `:focus-visible` on the label never matches and an outline on the hidden input is invisible. Their `component.json` says `"focusTarget": "nested-input"`, and `nz gen` emits the `:has(> input:focus-visible)` rule above (`:has()` is inside the Firefox 129 / Safari 17.5 floor). Checkbox, Radio and Switch keep focus on their styled input class. A Playwright check tabs to every T0 control and asserts that its visible part has a computed `outline-style: solid` (axe cannot see this, and T0 parts have no conformance suite).
- **Forced colours.** Every state painted with a fill or a shadow (Switch track and thumb, Checkbox and Radio checked state, the selected segment, progress and meter fills, selected menu and select items) is listed in `component.json` `"stateIndicator"`, and `nz gen` emits a system-colour rule for it. Exit criterion 14 reviews forced-colours screenshots of every v0.1 control.
  - **Open (week 2): a generated fill loses to a component's own `background`.** The rules are in `nz.base`, so any `background` a component declares in `nz.components` (a later layer) wins, and base's `forced-color-adjust: none` then shows the brand colour instead of `Highlight`. `!important` is not a fix: stylelint bans it. Until the generator has a way to win, a component that paints a `stateIndicator` state with `background` repeats the forced-colours rule in its own stylesheet: `progress-bar.css` and `meter.css` do. Select was not unaffected, as week 2 thought: `[data-selected]` sets no background, but `[data-highlighted]` does, and keyboard focus opens the list on the selected option, so in forced colours its label was HighlightText on the hover token (about 1.1:1). Since the docs review (2026-10-14) `select.css` repeats the `[data-selected]` rule in its own forced-colours block, and the docs smoke test checks the open, selected option's contrast in Chromium's forced colours. Checkbox, Switch and SegmentedControl (W3) will need the same.
  - **Exception: ProgressRing.** Its arc is an SVG stroke, and no `paint` covers a stroke yet, so its `stateIndicator` is empty and `progress-ring.css` carries its forced-colours rules (`forced-color-adjust: none` on the svg, `stroke: GrayText` on the track, `stroke: Highlight` on the arc). They do not survive an E3 re-skin. A follow-up adds a `stroke` paint (and a track kind) to the schema and the generator and moves the rules into `nz.base`.

### 8.6 Overrides, from lightest to heaviest

| Level | How | Example |
|---|---|---|
| Token (E0) | Redefine semantic `--nz-*` in `@layer nz.themes` or unlayered CSS | `:root { --nz-radius-md: 999px }` |
| Hook (E1) | Set `--nz-<component>-*` globally, per subtree, per variant or per instance | `.checkout .nz-button[data-variant="primary"] { --nz-button-bg: var(--nz-bg-accent) }` |
| Class (E1) | `className` + unlayered CSS (beats every `nz.*` layer) | `<Button className="w-full">` |
| Recompose (E2) | Parts + `render` | `<Dialog.Trigger render={<Button variant="critical" />} />` |
| Re-skin (E3) | Drop `css/<name>.css`, own a copy | install the `select-css` registry item (v0.3) |
| Replace (E4) | Own markup with `nz-*` classes, `data-*` and `@nizivo/react/contracts` helpers | registry `<name>-source` fork item, labelled "no updates" (components without an engine only; L7) |

Variant augmentation is type-safe through one declaring module:

```ts
// consumer: types/nizivo.d.ts
declare module '@nizivo/react/augment' { interface ButtonVariantMap { ai: true } }
// + in the consumer's CSS: .nz-button[data-variant="ai"] { --nz-button-bg: …; }
```

### 8.7 Unstyled mode

- **There is no `unstyled` prop in 0.x.** To render a component unstyled, do not import its CSS: import `tokens.css` + `css/base.css` + only the `css/<name>.css` files you want. `css/manifest.json` lists each component's CSS dependencies.
- Markup, classes, `data-*`, behaviour and the a11y floor all remain. Nothing in JS depends on CSS (settled 9).
- A per-instance prop can be added later as a minor (it would need context on client compounds and a prop on server parts).

---

## 9. Behaviour layer

### 9.1 Engine choice

- **Tiers.** T0 is native or server-rendered (0 KB). T1 is the engine. T2 is our own code on platform APIs.
- **The T1 engine is React Aria**, one family:
  - `react-aria-components` 1.22.1 for most widgets;
  - `react-aria` 3.53.1 hooks where Nizivo owns the DOM (Toast region, tooltip trigger on our own `<button>`, file drop target). Each sits in `_engines/react-aria/**` behind a `<Name>Engine` contract, like every other engine import.
  - Both are regular `dependencies` with caret ranges.
- **Why** (all from [r3](research/r3-headless-primitives.md); measurements reproduced by gap report A and verdict V8):
  - Dashboard set (Dialog, Popover, Menu, Select, Tabs, Tooltip): **69.0 KB gz** on React Aria vs 88.3 on Base UI. Full set: 104.0 vs 149.4.
  - It is the only stable single family that covers calendar and range calendar (the Figma Date Range Picker), combobox, autocomplete (command menu, +4.7 KB), number field and sheet. **Base UI has no calendar**, which would force us to hand-build an APG grid.
  - It ships 36 locales and a documented screen-reader test matrix (VoiceOver, JAWS, NVDA, TalkBack).
  - It exempts `[data-react-aria-top-layer]` from `inert`, so a toast stays reachable over a modal (gap report C §1.3, source-verified).
  - Mixing engines measured worst of all (Radix + Base UI combobox: 97.4 KB, more than React Aria's whole overlay set at 88.7).
- **Confidence: medium.** Base UI has more ecosystem momentum (shadcn's default since July 2026) and may close the size gap. The seam below keeps a family swap cheap, and a Base UI canary keeps the contract honest.

### 9.2 The adapter seam

Server-safe components have no adapter. **Only engine-backed parts** carry the two-layer split:
- **The public `*.client.tsx` leaf owns the CSS contract:** classes, `data-slot`, variant attributes, hooks, Field wiring and labels.
- **The adapter `_engines/<engine>/<name>.client.tsx` owns only behaviour.** It implements the typed `<Name>Engine` interface and maps engine render state to the vocabulary through `stateAttrs()`. **It writes no class names.** Internal elements it creates (a positioner, a backdrop) receive their class and slot as props from the public leaf.

An engine swap therefore cannot touch the styling contract, and the conformance suite asserts classes and `data-slot` as well as `data-*`.

```
src/select/
  component.json           "engine": "react-aria"           ← the swap point
  select.contract.ts       public engine-free types + SelectEngine interface   (no directive)
  engine.ts                GENERATED: named re-exports from ../_engines/<engine>/select.client of the members of
                           SelectEngine (not component.json "parts"; see §6)   (no directive)
  select.client.tsx        'use client' — public parts: classes, data-slot, hooks, Field wiring; call Engine.*
  select.parts.ts          GENERATED: named re-exports from ./select.client, aliased Root/Trigger/…   (no directive)
  index.ts                 GENERATED: flat named re-exports + `export * as Select from './select.parts'`   (no directive)
src/_engines/react-aria/select.client.tsx   'use client' — the ONLY Select module importing react-aria-components
```

**Why this exact shape:**
- **Spike S2 (VERIFIED, Next 16.4.0, Turbopack and webpack):** `export * as Dialog` from a `'use client'` module **fails** the build with "Element type is invalid … got: undefined". A **directive-free** `*.parts.ts` re-exporting client leaves passes.
- **Verdict re-run V3 (VERIFIED):**
  - rolldown elides the `engine.ts` hop into direct named imports, so `dist` equals the S2-verified shape;
  - namespace and flat imports both build under Turbopack and webpack, hydrate with 0 console errors, and respond to clicks;
  - a Server Component can pass a server `<Button>` into a client part's `render`.
  - V3 also showed that `export *` from a client module **leaks internal contexts** into the public `.d.ts`. So every generated barrel uses **named** re-exports only.
- **The src-vs-dist directive guard** ([r4](research/r4-build-release.md)) compares each source directive with its dist output. It must **tolerate source modules that have no dist counterpart** (elided hops like `engine.ts`). A second lint fails any `export * as` whose target carries a directive.
- tsdown is pinned exactly, and the Next fixture (both bundlers, namespace + flat) runs on every PR.

### 9.3 Contract rules (keep the seam honest)

1. **Minimalism.** A public prop must be satisfiable by at least two engines, or by native HTML. Engine-only extras are prefixed `unstable_` (r3 §8.1).
2. **Honest `details`.** `ChangeDetails<R> = { reason: R | 'unknown'; event?: Event }`. Where the engine reports no cause (React Aria's `onChange` and `onOpenChange`), the adapter passes `'unknown'`, never a guessed reason. Reasons Nizivo itself knows (`'hidden'` for an Activity close, `'programmatic'`) are always exact.
3. **Documented element type on engine parts.** Engine parts (`Select.Trigger`, `Dialog.Trigger`, `Menu.Item`) render the element type their docs name; a *component* that renders that element can be swapped in through `render`. Another element type is unsupported, and Nizivo's own dev check in the public leaf warns about it. React Aria's dev-only warning (V10) is not the contract, so a replacement engine is never tested against React Aria's quirk. **`Menu.Item` supports links:** with `href`, or with `render={<Link …/>}` whose element carries `href`, the adapter passes the `href` to the engine's link mode (React Aria renders an `<a>`) and renders the consumer element. By rule 1, any replacement engine must support link items. T0 parts (Button, NavItem) have no limit.
4. **No engine types in public `.d.ts`:** a ts-morph walk of the `.d.ts` import graph from every `types` condition in the exports map must never reach `react-aria*`, `@react-aria/*`, `@react-stately/*`, `@internationalized/*` or any `_engines/**` file. No engine attribute names in docs.
5. **Locale is always explicit.** Every engine root is wrapped in `EngineLocale` (`I18nProvider` with the resolved locale; default `'en-US'`). Without it React Aria renders `en-US` on the server and switches to the browser locale after hydration (gap report B §A3, source-verified).
6. **Engine DOM props are filtered.** Adapters pass engine DOM props through `engineDom(p)` (`_engines/<engine>/dom.ts`). It removes **every** engine `data-*` key, vocabulary-named ones included ([§8.3](#83-the-state-vocabulary-one-list-engine-independent) rule 3 wins), except a per-engine functional allowlist (`_engines/<engine>/dom-allowlist.json`), which is never documented. Adopted 2026-10-14 (builder default; the maintainer can override). For React Aria it holds the attributes the engine reads back from the DOM: `data-key` and `data-collection` (focus, scroll-into-view and typeahead), `data-react-aria-top-layer`, `data-live-announcer`, and the `data-href` family that Menu's link items need; the file is the full list. `engineDom` also drops the engine's `className` (its default `react-aria-*` classes) and `slot` (a context slot name that would otherwise reach the DOM). Vocabulary attributes come only from `stateAttrs()` over render state, so React Aria's own `data-invalid` and `data-pressed` never reach the DOM with engine meaning. Without the filter, React Aria 1.22.1 adds `data-rac`, `data-hovered`, `data-focused` and more to every part, and the conformance rule "nothing outside the vocabulary" ([§9.6](#96-conformance-suite)) would fail for the default engine.
7. **Engine-rendered strings are listed.** Each `<name>.contract.ts` lists the strings its engine renders as `<Name>Labels` keys. Adapters pass them in wherever the engine accepts overrides; the rest are listed as "engine-owned" on the component's docs page ([§16.4](#164-internationalisation-and-rtl-gap-report-b-part-a)).

### 9.4 Proving the seam, and escape hatches

| What | When | Why |
|---|---|---|
| **Second Tooltip adapter** on `react-aria` hooks (`useTooltipTrigger` + stately) with our own DOM, passing the same Tooltip testkit nightly. It stays inside the `react-aria` family (`"adapter": "hooks"`), so it shares that family's `OverlayEngine` | **v0.2** (an exit criterion) | Proves the leaf/adapter split with a second implementation. It pays for itself: **7.2 KB vs 14.3 KB** for the RAC `Tooltip` (verdict V9). If it is green for two weeks it becomes the default and the RAC adapter stays as the nightly second implementation |
| **Base UI canary: Dialog and Select together** (`_engines/base-ui/{overlay,dialog,select}.client.tsx`, devDependency of `testkit` only, never shipped) | **v0.3** | Detects contract drift toward React Aria-only behaviour, which an unexercised seam would hide. Overlay-family components swap together (L4), so the canary runs O-01 (Select inside Dialog) on one Base UI overlay core, never on a mixed React Aria + Base UI setup |
| **Hooks-altitude escape hatch** per component (`"adapter": "hooks"` inside the `react-aria` family, like the Tooltip, so it shares the family's `OverlayEngine`) | only when a `size-limit` budget fails | Measured and reproduced: Menu 39.6 vs 51.3 KB; Menu + Select + Tabs 45.3 vs 65.5 KB (−31%). It costs us collection mapping and our own popup DOM, so it is not the default. Lazy chunks must be **re-measured on the hooks base** (verdict V9: RangeCalendar is +25.1 KB there, not +21.4) |
| **NativeSelect** (T0, plain-text options, server-safe, zero JS) beside the engine Select, mirroring the Select trigger skin (its values are copied, not shared) | **v0.1** | Server-Component forms get a real select with no JS. **Collapse gate:** when customizable `<select>` is Baseline (Firefox ships it), a native adapter replaces the engine for the plain-text subset through `engine.ts` |
| **Native overlay adapters** (`<dialog>`, `popover`) | when the four gates in [§12.4](#124-native-swap-gates) clear | Kept as tests N-01…N-04 in `testkit/native` so the gate is ready |

### 9.5 Per-component tier table (core)

Full mapping with Figma node ids: [component-inventory.md](component-inventory.md).

| Component | Tier | RSC | Release |
|---|---|---|---|
| Text, Heading, Stack, Inline, Grid, Container, Separator | T0 | server | v0.1 |
| Button | T0 | server | v0.1 |
| IconButton | T0 + T1 tooltip | split (`tooltip={false}` runs no client code; week 3 fixture: Turbopack and `next dev` still ship the tooltip leaf the shell imports, production webpack drops it) | v0.1 |
| Badge, Card, Delta, ProgressBar, ProgressRing, Meter, Skeleton, EmptyState, InlineError, Kbd, Image | T0 | server | v0.1 |
| Alert | T0 + dismiss leaf | split | v0.1 |
| Banner | T0 + dismiss leaf (like Alert) | split | v0.2 |
| Field, Fieldset | Field: T0 shell + `FieldScope` leaf; Fieldset: T0 (week 3: two subpaths, D-r) | Field split (a function child runs no client code; Turbopack and `next dev` still ship FieldScope, as for IconButton); Fieldset server | v0.1 |
| Input, Textarea, Checkbox, RadioGroup, Switch, SegmentedControl | T0 native in thin client leaves (Field wiring); native inputs, no engine (week 3; D-t, D-u). RadioGroup is a server Fieldset shell around one client part | client leaf, full SSR HTML | v0.1 |
| NativeSelect | T0 | server; inside a Field through the zero-JS function child (week 3, D-x) | v0.1 |
| Select | T1 | client | v0.1 |
| Tooltip | T1 (hooks adapter from v0.2) | client | v0.1 |
| Dialog (`role="dialog" \| "alertdialog"`) | T1 | client | v0.1 |
| Menu | T1 | client | v0.1 (first to cut) |
| Tabs / TabNav | T1 / T0 (links) | client / server | v0.1 (cut line) |
| Popover, Drawer/Sheet | T1 | client | v0.2 |
| Toast + LiveAnnouncer | T2 on `react-aria` hooks (behind `ToastEngine`) + `popover="manual"` | client | v0.2 (gate O-06) |
| FileUpload | T2 (native input + drop target on `react-aria` hooks, behind an engine contract) | client | v0.2 |
| Form, SubmitButton, FormMessage, PasswordInput, SearchField, ChipGroup, ChoiceCard | T0/T2 leaves | client leaf | v0.2 |
| Table parts, Pagination, Breadcrumb, Avatar, NavItem, TopBar, MobileTopBar, MobileTabBar, PageHeader, Split, StickyBar | T0 | server | v0.2 |
| TableSelection + BulkActionBar | T2 island (form-based) | split | v0.2 / v0.3 |
| AppShell (below `sm`: MobileTabBar + the "More" `Drawer side="bottom"`) | T0 + T1 drawer | split | v0.2 |
| Sidebar (rail from 640 px; not rendered below 640 px, where MobileTabBar takes over) | T0 | server | v0.2 |
| Metric, NumberValue, KpiTile, TrendCard, RankedList | T0 | server | v0.2 |
| CountUp, `usePointerFx` (`@nizivo/react/motion`) | own | client | v0.2 / v0.3 |
| Combobox, NumberField | T1 | client | v0.3 |
| QuantityStepper | T0 + own two-button leaf | client leaf | v0.3 |
| CommandMenu + hotkeys | T1 (Autocomplete + SearchField + Menu in Modal), lazy | client | v0.3 (`unstable/`) |
| DateRangePicker / RangeCalendar | T1, calendar lazy | split | v0.3 (`unstable/`) |
| DataView (Table ↔ List by container query) | T0 | server | v0.3 |
| Accordion (`<details name>`), PageIndicator, Surface (`material="glass"`) | T0 | server | v0.3 |

Toast and FileUpload are tier `own` (`component.json`) behind an engine contract. The `component.json` schema accepts `"engine"` only on tier `engine` today, so allowing it on tier `own` is a v0.2 schema change ([§6](#6-repository-layout)). Week 2 built the first and fourth rows (Text to Separator, with GridItem; Badge to Image) and Alert. Alert's dismiss leaf is `alert/alert-dismiss.client.tsx` (`AlertDismiss`): a 24 px button whose `children` default to the close glyph ([§14.2](#142-icons-nizivoicons)). It was built before `IconButton`, which shipped in week 3; `AlertDismiss` stays a public export of `./alert` until the 0.1.0 decision below, and it takes `render`, so an `IconButton` can already be composed into it. Whether `AlertDismiss` keeps its export then, or is replaced, is **open** and is decided before 0.1.0, because exports are semver'd ([§5.4](#54-versioning-groups)).

### 9.6 Conformance suite

`packages/testkit/src/conformance/<name>.conformance.ts` is engine-agnostic. Vitest aliases `src/<name>/engine.ts` to each adapter and runs the same cases:

1. **ARIA:** `ariaSnapshot()` of the closed and open states matches the golden role/name tree. Inside a `Field`, a button-based trigger's accessible name contains the Field label and the selected value.
2. **Keyboard:** the APG script (for Select: Enter, Space and ArrowDown open; navigate; typeahead; Home/End; Esc returns focus to the trigger).
3. **Styling contract:** every part carries **exactly** the documented class, `data-slot` and vocabulary attributes for each state, and nothing outside the vocabulary (engine attributes are stripped by `engineDom`; only the undocumented functional allowlist may remain).
4. **Render merge:** element and function forms keep `ref`, `className` and handlers (consumer-first). Engine parts render their documented element type, and `Menu.Item` with `href` or `render={<Link/>}` renders an `<a>`. Every glyph slot ([§14.2](#142-icons-nizivoicons)) replaces its internal glyph when given.
5. **Forms:** with `name`, `FormData` holds the value; `required` blocks submit and shows **exactly one** `[data-slot="field-error"]`; `form.reset()` restores the default.
6. **SSR and RSC:** `renderToString` under Node; hydration in the Vite and Next fixtures with zero warnings; namespace and flat imports from a Server Component.
7. **Locale determinism and strings:** with `navigator.language = 'de-DE'`, no text changes after hydration. With a locale outside React Aria's 36 (for example `cy-GB`), every accessible name and description comes from Nizivo `labels` or the component's documented engine-owned list.
8. **Overlays:** the relevant gap report C O-tests ([§12.5](#125-overlay-conformance-tests)), run against each engine family's `OverlayEngine`.
9. **axe** (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) in the open state, plus forced colours.

Chromium runs on every PR; Firefox and WebKit run on `main` and nightly. React 19.2.x and 19.3.x both run in the matrix from v0.2.

---

## 10. Component API conventions with code

All sketches are **illustrative** excerpts, not the compiled code. React Aria prop names follow the installed 1.22.1 type declarations (verdict V10): `Select` takes `value`/`defaultValue`/`onChange` (`selectedKey` is deprecated); components accept `render(domProps, renderProps)`; `Popover` exposes `UNSTABLE_portalContainer`. Week 1 compiled the Select, Dialog and Tooltip adapters; the sketches below were corrected where the compiled code differs (element types, Dialog's `contentProps`, which parts take `render`, `data-align`), and the code in `packages/react/src` is the reference.

### 10.1 Shared, server-safe helpers (`@nizivo/react/contracts`)

```tsx
// packages/react/src/contracts/render.ts — NO directive. Used by server-safe AND client parts.
// It must never import react-aria: those modules import 'client-only', which throws under react-server.
import { cloneElement, createElement, isValidElement, type ReactElement } from 'react';
import { mergeProps } from './merge-props';

export type RenderProp<S> =
  | ReactElement                                                     // element form: serializable from Server Components
  | ((props: Record<string, unknown>, state: S) => ReactElement);    // function form: client code only

export function renderElement<S>(tag: string, render: RenderProp<S> | undefined, state: S,
                                 props: Record<string, unknown>): ReactElement {
  if (typeof render === 'function') return render(props, state);
  if (isValidElement<Record<string, unknown>>(render)) {
    const merged = mergeProps(props, render.props);                  // the element wins, except …
    for (const name of PART_OWNED) if (props[name] !== undefined) merged[name] = props[name];   // … the part's presentational attrs (§8.2)
    return cloneElement(render, merged);
  }
  return createElement(tag, props);
}
/** The vocabulary's `presentational` group: the part's values win over a render element's (also a pre-rendered RSC host element). */
export const PART_OWNED = ['data-slot', 'data-variant', 'data-size', 'data-tone', 'data-full-width'];
/** Normalise any render prop to the function form adapters receive. */
export const toRenderFn = <S,>(render: RenderProp<S> | undefined, tag: string) =>
  (props: Record<string, unknown>, state: S) => renderElement(tag, render, state, props);
```

`mergeProps` (~40 LOC) rules:
- `className` is concatenated, ours first, and duplicate tokens are dropped.
- `style` is shallow-merged, theirs winning.
- Event handlers are chained consumer-first, and ours skip when `defaultPrevented`.
- Refs are merged with a callback ref.
- **It creates a function only when both sides supply one.** A server `Button` with `render={<Link/>}` must never synthesise a handler or ref callback, because a function cannot cross the RSC boundary. The RSC fixture covers this with a server → client `render` case that carries a ref.

### 10.2 Button (server-safe; Figma variants; default `secondary`)

```tsx
// packages/react/src/button/button.tsx — NO directive: zero client JS under RSC.
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { Glyph } from '../_internal/glyphs';
import type { ButtonVariant, ControlSize } from '../augment';

export interface ButtonState { variant: ButtonVariant; size: ControlSize; pending: boolean; disabled: boolean }
export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Figma "Variant". @default 'secondary' — designer: "One primary per view. Secondary for everything else,
   *  tertiary inside dense rows." Figma's own component default (Primary) is not the code default (critique C26). */
  variant?: ButtonVariant;            // 'primary' | 'secondary' | 'tertiary' | 'critical' | 'accent'
  size?: ControlSize;                 // 'sm' | 'md' | 'lg' → 32 / 40 / 48 px
  leadingIcon?: ReactNode;            // Figma boolean "Leading icon" → element slot (core imports no icon package)
  trailingIcon?: ReactNode;
  pending?: boolean;                  // not `loading` (gap report B #18)
  pendingIndicator?: ReactNode;       // replaces the internal spinner glyph (§14.2)
  fullWidth?: boolean;
  render?: RenderProp<ButtonState>;   // e.g. render={<Link href="/orders" />}
  children?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', leadingIcon, trailingIcon, pending = false, pendingIndicator,
  fullWidth = false, disabled = false, type, render, className, onClick, children, ...rest }: ButtonProps): React.JSX.Element {
  const native = render === undefined;              // only a real <button> may receive `type` and `disabled`
  return renderElement('button', render, { variant, size, pending, disabled }, {
    'data-slot': 'button', 'data-variant': variant, 'data-size': size,
    'data-pending': pending ? '' : undefined, 'data-disabled': disabled ? '' : undefined,
    'data-full-width': fullWidth ? '' : undefined,
    ...rest,                                          // after our data-*: when a part renders this Button, the part's
                                                      // data-slot, data-size and state attributes win (§8.2)
    className: cx('nz-button nz-hit-target', className),
    type: native ? (pending ? 'button' : (type ?? 'button')) : undefined,   // a pending submit cannot resubmit
    disabled: native && disabled && !pending ? true : undefined,
    'aria-disabled': pending || (!native && disabled) ? true : undefined,   // pending stays focusable (gap report B §C2.3)
    onClick: pending && onClick ? swallow : onClick,  // a handler only exists when a client component rendered us
    children: (
      <>
        {pending                                                                          /* keeps the width */
          ? <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{pendingIndicator ?? <Glyph name="spinner" />}</span>
          : leadingIcon != null && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{leadingIcon}</span>}
        <span className="nz-button-label" data-slot="button-label">{children}</span>
        {trailingIcon != null && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{trailingIcon}</span>}
      </>
    ),
  });
}
const swallow = (e: { preventDefault(): void }) => e.preventDefault();
```

```css
/* packages/react/src/button/button.css → @nizivo/react/css/button.css */
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.components {
  .nz-button {
    /* privates: defaults = Figma Secondary / Md. Variants and sizes set ONLY these. */
    --_nz-button-bg: var(--nz-bg-surface);        --_nz-button-bg-hover: var(--nz-bg-hover);
    --_nz-button-bg-pressed: var(--nz-bg-pressed); --_nz-button-fg: var(--nz-text-primary);
    --_nz-button-border: var(--nz-border-default); --_nz-button-border-hover: var(--nz-border-strong);  /* Figma: hover/pressed → border/strong */
    --_nz-button-shadow: none;                     --_nz-button-height: var(--nz-size-control-md);
    --_nz-button-padding-inline: var(--nz-space-4); --_nz-button-gap: var(--nz-space-2);
    --_nz-button-radius: var(--nz-radius-md);      --_nz-button-font: var(--nz-font-label-m);
    --_nz-button-icon-size: var(--nz-size-icon-sm);                                  /* 16 px at Sm/Md (Figma) */

    /* public hooks are READ here, once, at the property — never assigned by Nizivo */
    display: inline-flex; align-items: center; justify-content: center;
    gap: var(--nz-button-gap, var(--_nz-button-gap));
    block-size: var(--nz-button-height, var(--_nz-button-height));
    padding-inline: var(--nz-button-padding-inline, var(--_nz-button-padding-inline));
    border: var(--nz-border-width-default) solid var(--nz-button-border, var(--_nz-button-border));
    border-radius: var(--nz-button-radius, var(--_nz-button-radius));
    background: var(--nz-button-bg, var(--_nz-button-bg));
    color: var(--nz-button-fg, var(--_nz-button-fg));
    box-shadow: var(--nz-button-shadow, var(--_nz-button-shadow));
    font: var(--nz-button-font, var(--_nz-button-font));
    cursor: pointer;
    transition: background-color var(--nz-duration-fast) var(--nz-easing-standard),   /* 140 ms token; Figma's 160 ms is not a token (C35) */
                border-color var(--nz-duration-fast) var(--nz-easing-standard),
                scale var(--nz-duration-instant) var(--nz-easing-standard);           /* press 80 ms */
    @media (hover: hover) {
      &:hover:not(:disabled, [data-disabled], [aria-disabled="true"]) {
        background: var(--nz-button-bg-hover, var(--_nz-button-bg-hover));
        border-color: var(--nz-button-border-hover, var(--_nz-button-border-hover));
      }
    }
    &:active:not(:disabled, [data-disabled], [aria-disabled="true"]) {
      background: var(--nz-button-bg-pressed, var(--_nz-button-bg-pressed));
      border-color: var(--nz-button-border-hover, var(--_nz-button-border-hover));
      scale: var(--nz-scale-press);
    }
    &:focus-visible {   /* the 2 px outline lives in nz.base; this adds only the decorative halo */
      box-shadow: var(--nz-button-shadow, var(--_nz-button-shadow)), 0 0 0 calc(var(--nz-border-width-focus) + 4px) var(--nz-focus-halo);
    }
    &:is(:disabled, [data-disabled]) {   /* Figma: bg/disabled + border/subtle + text/disabled; no effect */
      background: var(--nz-button-bg-disabled, var(--nz-bg-disabled));
      color: var(--nz-button-fg-disabled, var(--nz-text-disabled));
      border-color: var(--nz-border-subtle); box-shadow: none; cursor: not-allowed;
    }
    &[data-pending] { cursor: progress; }
    &[data-full-width] { inline-size: 100%; }
  }
  .nz-button[data-variant="primary"] {
    --_nz-button-bg: var(--nz-bg-brand); --_nz-button-bg-hover: var(--nz-bg-brand-hover);
    --_nz-button-bg-pressed: var(--nz-bg-brand-pressed); --_nz-button-fg: var(--nz-text-on-brand);
    --_nz-button-border: transparent; --_nz-button-border-hover: transparent;
    --_nz-button-shadow: var(--nz-elevation-button);                 /* Figma's raw highlight + green-tinted shadow */
  }
  .nz-button[data-variant="tertiary"] { --_nz-button-bg: transparent; --_nz-button-border: transparent; --_nz-button-border-hover: transparent; }
  .nz-button[data-variant="critical"] {                               /* bg/critical = red/600 both modes (override) */
    --_nz-button-bg: var(--nz-bg-critical); --_nz-button-bg-hover: var(--nz-bg-critical-hover);
    --_nz-button-bg-pressed: var(--nz-bg-critical-hover); --_nz-button-fg: var(--nz-text-on-critical);
    --_nz-button-border: transparent; --_nz-button-border-hover: transparent;
  }
  .nz-button[data-variant="accent"] {                                 /* "reserved for AI features": docs guidance, not enforced */
    --_nz-button-bg: var(--nz-bg-accent); --_nz-button-bg-hover: var(--nz-bg-accent-hover);   /* code-owned token, defined */
    --_nz-button-bg-pressed: var(--nz-bg-accent-hover);              /* Figma has no Accent Pressed: design backlog */
    --_nz-button-fg: var(--nz-text-on-accent); --_nz-button-border: transparent; --_nz-button-border-hover: transparent;
  }
  .nz-button[data-size="sm"] { --_nz-button-height: var(--nz-size-control-sm); --_nz-button-padding-inline: var(--nz-space-3);
                               --_nz-button-gap: var(--nz-space-1-5); --_nz-button-radius: var(--nz-radius-sm); }
  .nz-button[data-size="lg"] { --_nz-button-height: var(--nz-size-control-lg); --_nz-button-padding-inline: var(--nz-space-5);
                               --_nz-button-font: var(--nz-font-label-l); --_nz-button-icon-size: var(--nz-size-icon-md); }  /* 20 px */
  .nz-button-icon { display: inline-flex; inline-size: var(--_nz-button-icon-size); block-size: var(--_nz-button-icon-size); }
  @media (forced-colors: active) { .nz-button { border-color: ButtonText; } }
}
```

Usage:
- **Link:** `<Button render={<Link href="/orders" />}>Orders</Button>`. The element form serialises from a Server Component. For a non-native render, Button emits `aria-disabled` instead of `disabled` and never emits `type`. Disabling a link is the consumer's job (omit `href`).
- **Restyle without a fork:** `.checkout .nz-button[data-variant="primary"] { --nz-button-bg: var(--nz-bg-accent) }`, or `style={{ '--nz-button-radius': '999px' }}` on one instance.
- **`IconButton`** is the same module with a required `label`. With the default `tooltip` ("Always paired with a tooltip", 02), it delegates to `icon-button.client.tsx`, which renders the `<button>` itself and wires the tooltip trigger. `tooltip={false}` keeps it server-safe. Its Figma default is **Secondary**, and its glyph is 20 px at 1.6 px stroke.

### 10.3 Select (engine-backed; the adapter seam end to end)

```ts
// packages/react/src/select/select.contract.ts — public, engine-free (the .d.ts import-graph walk must never reach an engine)
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import type { ChangeDetails } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { ControlSize } from '../augment';

export type SelectValueReason = 'item-press' | 'keyboard' | 'typeahead' | 'form-reset';
export type OpenReason = 'trigger' | 'escape' | 'outside-press' | 'item-press' | 'hidden' | 'programmatic';
export interface SelectRootProps {
  value?: string | null; defaultValue?: string | null;
  onValueChange?(value: string | null, details: ChangeDetails<SelectValueReason>): void;   // reason may be 'unknown'
  open?: boolean; defaultOpen?: boolean;
  onOpenChange?(open: boolean, details: ChangeDetails<OpenReason>): void;
  name?: string; required?: boolean; disabled?: boolean; invalid?: boolean; placeholder?: string;
  'aria-labelledby'?: string;          // defaults to the Field label id: a <button> trigger is named by aria-labelledby (§16.1)
  size?: ControlSize; children: ReactNode;
}
export interface SelectTriggerState { open: boolean; pressed: boolean; focusVisible: boolean; disabled: boolean }
export interface SelectItemState { highlighted: boolean; selected: boolean; disabled: boolean; focusVisible: boolean }

/** Engine-side part props: Nizivo DOM props (classes, data-slot, ids, Field aria) + a normalised render function. */
type EnginePart<T extends keyof React.JSX.IntrinsicElements, S> =
  Omit<ComponentProps<T>, 'children'> & { children?: ReactNode; render: (props: Record<string, unknown>, state: S) => ReactElement };

/** What EVERY Select adapter implements. testkit/select.conformance.ts runs against it. Adapters write no classes. */
export interface SelectEngine {
  Root(p: Omit<SelectRootProps, 'size'> & EnginePart<'div', { open: boolean; disabled: boolean }>): ReactElement;
  Trigger(p: EnginePart<'button', SelectTriggerState>): ReactElement;
  Value(p: EnginePart<'span', { placeholder: boolean }>): ReactElement;
  Popup(p: EnginePart<'div', { entering: boolean; exiting: boolean; side: 'top' | 'right' | 'bottom' | 'left' }> & {
    side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; sideOffset?: number; container?: Element | null;
    list: Record<string, unknown> }): ReactElement;            // class + data-slot for the internal listbox element
  Item(p: EnginePart<'div', SelectItemState> & { value: string; textValue?: string; disabled?: boolean }): ReactElement;
  Group(p: EnginePart<'section', Record<string, never>>): ReactElement;       // React Aria 1.22.1 renders <section> …
  GroupLabel(p: EnginePart<'header', Record<string, never>>): ReactElement;  // … and <header> (W1)
  Separator(p: EnginePart<'div', Record<string, never>>): ReactElement;
}
```

```ts
// packages/react/src/select/engine.ts — GENERATED by `nz gen` from component.json "engine" and the SelectEngine members. No directive.
export { Root, Trigger, Value, Popup, Item, Group, GroupLabel, Separator } from '../_engines/react-aria/select.client';
```

```tsx
// packages/react/src/select/select.client.tsx — PUBLIC parts. They own the CSS contract; the engine owns behaviour.
'use client';
import { createContext, use, type ReactNode } from 'react';
import * as Engine from './engine';
import { useFieldControl } from '../field/use-field-control.client';   // optional: Select works without <Field>
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { Glyph } from '../_internal/glyphs';
import type { SelectRootProps, SelectTriggerProps, SelectPopupProps, SelectItemProps } from './select.contract';

const Scope = createContext<{ size: NonNullable<SelectRootProps['size']> }>({ size: 'md' });

export function SelectRoot({ size = 'md', name, required, disabled, invalid, ...props }: SelectRootProps): React.JSX.Element {
  const field = useFieldControl({ name, required, disabled, invalid });   // Field owns the message; one error channel
  return (
    <Scope value={{ size }}>
      <Engine.Root {...props} aria-labelledby={props['aria-labelledby'] ?? field.ids?.label}   // the trigger's name = value + label
        name={field.name} required={field.required} disabled={field.disabled} invalid={field.invalid}
        className="nz-select" data-slot="select" data-size={size} render={toRenderFn(undefined, 'div')} />
    </Scope>
  );
}

export function SelectTrigger({ className, leadingIcon, indicator, children, render, ...rest }: SelectTriggerProps): React.JSX.Element {
  const { size } = use(Scope);
  const field = useFieldControl({ labelBehavior: 'focus' });   // a label click focuses the trigger; it never opens the listbox
  return (
    <Engine.Trigger {...rest} id={rest.id ?? field.ids?.control} aria-describedby={field.describedBy}
      className={cx('nz-select-trigger nz-hit-target', className)} data-slot="select-trigger" data-size={size}
      render={toRenderFn(render, 'button')}>
      {leadingIcon != null && <span className="nz-select-icon" data-slot="select-icon" aria-hidden="true">{leadingIcon}</span>}
      {children ?? <Engine.Value className="nz-select-value" data-slot="select-value" render={toRenderFn(undefined, 'span')} />}
      <span className="nz-select-chevron" data-slot="select-chevron" aria-hidden="true">   {/* "the chevron says choose" */}
        {indicator ?? <Glyph name="chevrons-up-down" />}
      </span>
    </Engine.Trigger>
  );
}

// SelectRoot and SelectPopup take no `render`: the engine owns those elements in v0.1 (§8.2).
export function SelectPopup({ className, side = 'bottom', align = 'start', sideOffset = 8, container, children }: SelectPopupProps): React.JSX.Element {
  return (
    <Engine.Popup side={side} align={align} sideOffset={sideOffset} container={container}
      className={cx('nz-select-popup', className)} data-slot="select-popup" render={toRenderFn(undefined, 'div')}
      list={{ className: 'nz-select-list', 'data-slot': 'select-list' }}>
      {children}
    </Engine.Popup>
  );
}
// SelectItem, SelectGroup, SelectGroupLabel, SelectSeparator follow the same shape (nz-select-item, data-slot="select-item", …).
```

```tsx
// packages/react/src/_engines/react-aria/select.client.tsx — the ONLY Select module that imports the engine.
'use client';
import { use } from 'react';
import { Select, Button, SelectValue, Popover, ListBox, ListBoxItem, SelectStateContext, useLocale } from 'react-aria-components';
import type { SelectEngine } from '../../select/select.contract';
import { stateAttrs } from '../../contracts/state';          // generated from contracts/vocabulary.json
import { mergeProps } from '../../contracts/merge-props';
import { details } from '../../contracts/details';
import { EngineLocale } from './locale.client';             // I18nProvider with the resolved locale (default 'en-US')
import { toPlacement, resolveSide, popupStyle } from './overlay.client';   // this family's OverlayEngine
import { engineDom, defined } from './dom';                 // engineDom drops every engine data-* except the functional allowlist
                                                            // (§9.3 rule 6); defined drops undefined keys

export const Root: SelectEngine['Root'] = ({ value, defaultValue, onValueChange, open, defaultOpen, onOpenChange,
  name, required, disabled, invalid, placeholder, 'aria-labelledby': labelledBy, render, children, ...dom }) => (
  <EngineLocale>
    <Select value={value} defaultValue={defaultValue} aria-labelledby={labelledBy}
      onChange={(v) => onValueChange?.(v == null ? null : String(v), details('unknown'))}   // the engine gives no reason
      isOpen={open} defaultOpen={defaultOpen} onOpenChange={(o) => onOpenChange?.(o, details('unknown'))}
      name={name} isRequired={required} isDisabled={disabled} isInvalid={invalid} placeholder={placeholder}
      validationBehavior="native"                           // a hidden native <select> carries name/required into forms
      render={(p, rp) => render(mergeProps(engineDom(p), dom, stateAttrs({ open: rp.isOpen, disabled: rp.isDisabled, required: rp.isRequired })),
                                { open: rp.isOpen, disabled: rp.isDisabled })}>
      {children}
    </Select>
  </EngineLocale>
);

export const Trigger: SelectEngine['Trigger'] = ({ render, children, id, 'aria-describedby': describedBy, ...dom }) => {
  const open = use(SelectStateContext)?.isOpen ?? false;    // ButtonRenderProps has no isOpen (V10)
  return (
    <Button id={id} aria-describedby={describedBy} render={(p, rp) => {
      const s = { open, pressed: rp.isPressed && !open, focusVisible: rp.isFocusVisible, disabled: rp.isDisabled };   // an open trigger is not "pressed"
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);  // Nizivo DOM props merged here; never rely on the engine forwarding them
    }}>{children}</Button>
  );
};

export const Popup: SelectEngine['Popup'] = ({ side, align, sideOffset, container, list, render, children, ...dom }) => {
  const { direction } = useLocale();
  return (
    <Popover placement={toPlacement(side, align)} offset={sideOffset}
      {...defined({ UNSTABLE_portalContainer: container ?? undefined })}   // unset: OverlayScope's container (a parent overlay), else body
      render={(p, rp) => {
        const s = resolveSide(rp.placement, side, direction);    // React Aria reports the resolved side only …
        return render(mergeProps({ ...engineDom(p), style: popupStyle(p.style) }, dom,
                                 stateAttrs({ open: !rp.isExiting, entering: rp.isEntering, exiting: rp.isExiting,
                                              side: s, align })),   // … so data-align echoes the request
                      { entering: rp.isEntering, exiting: rp.isExiting, side: s });
      }}>
      <ListBox render={(p) => <div {...mergeProps(engineDom(p), list)} />}>{children}</ListBox>
    </Popover>
  );
};

export const Item: SelectEngine['Item'] = ({ value, textValue, disabled, render, children, ...dom }) => (
  <ListBoxItem id={value} textValue={textValue} isDisabled={disabled} render={(p, rp) => {
    const s = { highlighted: rp.isFocused, selected: rp.isSelected, disabled: rp.isDisabled, focusVisible: rp.isFocusVisible };
    return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
  }}>{children}</ListBoxItem>
);
// Value, Group, GroupLabel and Separator follow the same shape. The Popover's positioning style is passed through
// popupStyle(), which drops the engine's z-index and adds --nz-trigger-width, --nz-transform-origin and
// --nz-available-height (§8.3).
```

```ts
// select.parts.ts — GENERATED. No directive: the namespace object is built outside the client module (spike S2).
export { SelectRoot as Root, SelectTrigger as Trigger, SelectValue as Value, SelectPopup as Popup,
         SelectItem as Item, SelectGroup as Group, SelectGroupLabel as GroupLabel, SelectSeparator as Separator } from './select.client';
// index.ts — GENERATED. No directive. Named re-exports only (V3: `export *` leaked internal contexts).
export { SelectRoot, SelectTrigger, SelectValue, SelectPopup, SelectItem, SelectGroup, SelectGroupLabel, SelectSeparator } from './select.client';
export * as Select from './select.parts';
export type { SelectRootProps, SelectTriggerProps, SelectPopupProps, SelectItemProps, SelectValueReason, OpenReason } from './select.contract';
```

```tsx
// Usage from a Server Component (namespace and flat imports both work; the Next fixture re-checks on every build)
import { Field } from '@nizivo/react/field';
import { Select } from '@nizivo/react/select';
import { Calendar } from '@nizivo/icons/calendar';

<Field label="Period" name="period">
  <Select.Root defaultValue="30d">
    <Select.Trigger leadingIcon={<Calendar />} />
    <Select.Popup>
      <Select.Item value="7d">Last 7 days</Select.Item>
      <Select.Item value="30d">Last 30 days</Select.Item>
    </Select.Popup>
  </Select.Root>
</Field>
```

Inside a `Field`, `SelectRoot` passes the Field label id as `aria-labelledby`, so React Aria names the trigger "value + label" ("Last 30 days Period"). Without it, the trigger's `aria-labelledby` would hold only the value id and override the `<label for>`, so the button would never be announced as "Period" (WCAG 4.1.2, 2.5.3). `labelBehavior: 'focus'` makes `FieldScope` turn a label click into focus on the trigger instead of a click that opens the listbox ([§16.1](#161-forms-gap-report-a-d16)).

For plain-text options in a Server-Component form with zero JS, use `NativeSelect` (same trigger skin): `<NativeSelect name="period" defaultValue="30d" options={[…]} />`.

### 10.4 Dialog (engine-backed overlay)

Parts: `Root`, `Trigger`, `Popup`, `Title`, `Description`, `Body`, `Footer`, `Close`.
- The **backdrop is a real element** (`.nz-dialog-backdrop`, `data-slot="dialog-backdrop"`), rendered automatically for the root modal only. Nested modals do not double-darken the page (gap report C §1.7). `backdrop={false}` turns it off.
- It is an element, not `::backdrop`, so a future native `<dialog>` adapter must render the same element and every re-skin keeps working.
- `role="alertdialog"` (Figma Modal `Type=Destructive`) disables outside-press dismissal and puts initial focus on the least destructive action.
- `size`: `md` (default) is Figma's only Modal width, 480 px. `sm` (400) and `lg` (640) follow figma/07's proposed scale and are **provisional** (outside semver) until design answers the handoff's "Component sizes" ask.
- `Dialog.Popup` takes no `render`: the engine owns the positioned element in v0.1 ([§8.2](#82-class-slot-and-naming-conventions)). `Dialog.Close` takes `render` and renders a `<button>`. The IconButton default for Close ([§12.3](#123-per-type-rules)) arrives with IconButton in week 3.
- The precedence rule in [§8.2](#82-class-slot-and-naming-conventions) applies to the composed triggers below: the trigger's `data-slot="dialog-trigger"` wins over the server Button's `data-slot="button"`.

```tsx
// Server Component page. Trigger and Popup are client parts; the server <Button> arrives as a host element (V3).
<Dialog.Root>
  <Dialog.Trigger render={<Button variant="critical">Delete product</Button>} />
  <Dialog.Popup role="alertdialog" size="sm">
    <Dialog.Title level={2}>Delete “Stoneware mug”?</Dialog.Title>      {/* constrained heading level (settled 1) */}
    <Dialog.Description>This can't be undone.</Dialog.Description>
    <Dialog.Footer>
      <Dialog.Close render={<Button>Cancel</Button>} />
      <form action={deleteProduct}><Button type="submit" variant="critical">Delete</Button></form>
    </Dialog.Footer>
  </Dialog.Popup>
</Dialog.Root>
```

```tsx
// packages/react/src/dialog/dialog.client.tsx (public leaf, excerpt): the leaf names every element; the adapter names none.
export function DialogPopup({ size = 'md', backdrop, role = 'dialog', container, className, children, ...rest }: DialogPopupProps) {
  return (
    <Engine.Popup {...rest} role={role} container={container} backdrop={backdrop}
      positioner={{ className: 'nz-dialog-positioner', 'data-slot': 'dialog-positioner' }}
      backdropProps={{ className: 'nz-dialog-backdrop', 'data-slot': 'dialog-backdrop' }}
      contentProps={{ className: 'nz-dialog-content', 'data-slot': 'dialog-content' }}   // clipping lives here, not on the positioner
      className={cx('nz-dialog-popup', className)} data-slot="dialog-popup" data-size={size}
      render={toRenderFn(undefined, 'div')}>
      {children}
    </Engine.Popup>
  );
}
// The React Aria adapter (excerpt): ModalOverlay → positioner (+ backdrop element as its first child, root modal only),
// Modal → popup, and React Aria's Dialog → the content element: a <section> carrying role="dialog" or "alertdialog",
// which only the adapter can render, so the leaf passes its class and slot as `contentProps` (W1; named so because
// `content` is also an HTML attribute). It wraps react-aria UNSAFE_PortalProvider for the nested-portal chain, never exposed publicly.
// DialogRoot owns `open` and closes with reason 'hidden' in a layout-effect cleanup under <Activity> (r1 §11.8).
```

```css
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.components {
  .nz-dialog-positioner { position: fixed; inset: 0; z-index: var(--nz-z-overlay); display: grid; place-items: center;
                          padding: var(--nz-space-8); }                       /* never transformed: it is the nested-portal container */
  .nz-dialog-backdrop { position: fixed; inset: 0; background: var(--nz-bg-scrim);
    transition: opacity var(--nz-duration-base) var(--nz-easing-enter);      /* "the backdrop only fades" (01) */
    &[data-entering] { opacity: 0; }
    &[data-exiting]  { opacity: 0; transition: opacity var(--nz-duration-fade) var(--nz-easing-exit); } }
  .nz-dialog-popup {
    position: relative;                                                       /* above the backdrop sibling */
    inline-size: min(var(--nz-dialog-width, var(--_nz-dialog-width)), 100%);
    --_nz-dialog-width: 30rem;                                                /* Figma Modal 7275:15139: 480 px */
    max-block-size: calc(100dvh - 2 * var(--nz-space-8));
    display: flex; flex-direction: column; border-radius: var(--nz-dialog-radius, var(--nz-radius-2xl));
    background: var(--nz-dialog-bg, var(--nz-bg-surface-raised)); box-shadow: var(--nz-elevation-4);  /* dark: n850 + ring (G16) */
    transition: scale var(--nz-duration-spring) var(--nz-easing-spring),       /* spring only on transforms, always with its pair */
                opacity var(--nz-duration-spring) var(--nz-easing-enter);       /* Reduced: 120 ms linear fade survives */
    &[data-entering] { opacity: 0; scale: var(--nz-scale-enter); }            /* 0.96, or 1 when reduced: no travel */
    &[data-exiting]  { opacity: 0; transition: opacity var(--nz-duration-fade) var(--nz-easing-exit); }  /* Figma: exit 140 ms ease-in */
    &[data-size="sm"] { --_nz-dialog-width: 25rem; }                          /* 400 px, PROVISIONAL (figma/07 size/dialog-sm) */
    &[data-size="lg"] { --_nz-dialog-width: 40rem; }                          /* 640 px, PROVISIONAL until design answers "Component sizes" */
  }
  .nz-dialog-content { display: flex; flex-direction: column; min-block-size: 0; overflow: clip; border-radius: inherit; } /* Figma clips at radius 28 */
  .nz-dialog-body { overflow: auto; }                                         /* the only scroller */
}
```

### 10.5 Card (compound server component)

```tsx
// packages/react/src/card/card.tsx — NO directive. Every part is server-safe, so the namespace is trivially RSC-safe.
type CardTone = 'surface' | 'subtle' | 'inverse';                    // Figma "Style": Surface | Subtle | Inverse
export function CardRoot({ tone = 'surface', padding = 'md', elevation = 0, render, className, ...rest }: CardRootProps) {
  // padding: 'sm' | 'md' (always emitted); elevation: 0 | 1 (0 emits nothing)
  return renderElement('div', render, { tone, padding, elevation }, {
    ...rest, className: cx('nz-card', className), 'data-slot': 'card', 'data-tone': tone, 'data-padding': padding,
    'data-elevation': elevation === 1 ? '1' : undefined,             // rest elevation 0: compositions draw none (C35), design to confirm
    'data-nz-scheme': tone === 'inverse' ? 'inverse' : undefined,    // every nested token flips; no "on-inverse" tokens
  });
}
export function CardTitle({ level = 3, render, className, ...rest }: CardTitleProps) {   // level: 2 | 3 | 4 | 5 | 6
  return renderElement(`h${level}`, render, {}, { ...rest, className: cx('nz-card-title', className), 'data-slot': 'card-title' });
}
// CardHeader, CardDescription, CardAction (Figma "Show action" → presence of this part), CardBody (Figma "Slot"), CardFooter: same shape.
// card.parts.ts / index.ts are generated: flat named exports + `export * as Card from './card.parts'`.
```

```css
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.components {
  .nz-card {
    --_nz-card-bg: var(--nz-bg-surface); --_nz-card-padding: var(--nz-space-6);       /* Figma: padding 24, gap 20, radius xl */
    --_nz-card-border: var(--nz-border-subtle); --_nz-card-shadow: none;
    display: flex; flex-direction: column; gap: var(--nz-card-gap, var(--nz-space-5));
    padding: var(--nz-card-padding, var(--_nz-card-padding));
    border-radius: var(--nz-card-radius, var(--nz-radius-xl));
    background: var(--nz-card-bg, var(--_nz-card-bg)); color: var(--nz-text-primary);
    border: var(--nz-border-width-default) solid var(--nz-card-border, var(--_nz-card-border));
    box-shadow: var(--nz-card-shadow, var(--_nz-card-shadow));
    &[data-elevation="1"]  { --_nz-card-shadow: var(--nz-elevation-1); }
    &[data-tone="subtle"]  { --_nz-card-bg: var(--nz-bg-subtle); --_nz-card-border: transparent; }   /* sets PRIVATES only */
    &[data-tone="inverse"] { --_nz-card-border: transparent; }                         /* bg/surface resolves in the inverse scheme */
    &[data-padding="sm"]   { --_nz-card-padding: var(--nz-space-5); }
  }
  .nz-card-title { font: var(--nz-font-heading-h4); margin: 0; }                       /* visual style fixed at any level */
}
```

Week 2 shipped this sketch with one correction from Figma: the Subtle (`7275:13764`) and Inverse (`7275:13770`) variants draw no stroke and no effect, so those tones keep a **transparent** 1 px border. Every tone keeps the same box, and in forced colours the border becomes `CanvasText` for all three. The earlier sketch drew `border/subtle` on every tone. The rest elevation stays 0 until design answers (Q j; [figma-handoff §1.5](figma-handoff.md#15-asks-from-week-2-2026-10-14)).

### 10.6 Field and a form-library recipe

```tsx
// packages/react/src/field/field.tsx — NO directive (sync, server-safe; useId is allowed here: critique S6)
export function Field({ label, description, error, name, required, disabled, readOnly, ids, messages,
  validateOn = 'submit', render, children }: FieldProps): React.JSX.Element {
  const base = useId();
  const id = { control: ids?.control ?? `${base}-control`, label: ids?.label ?? `${base}-label`,
               description: ids?.description ?? `${base}-description`, error: ids?.error ?? `${base}-error` };
  return renderShell(render, { id, label, description, required, disabled, validateOn },
    typeof children === 'function'
      // Zero-JS mode: the shell renders the error itself; the child receives ready-made control props.
      ? <>{children(controlProps(id, { name, required, disabled, readOnly, error, description }))}
          {error && <FieldError id={id.error}>{error}</FieldError>}</>
      // Default: FieldScope ('use client', ~0.5 KB) owns context and the error slot (native messages, Form errors).
      : <FieldScope ids={id} describedBy={description ? id.description : undefined} name={name} error={error}
                    required={required} disabled={disabled} readOnly={readOnly} messages={messages} validateOn={validateOn}>
          {children}
        </FieldScope>);
}
// DOM order: label, control, description, error (icon + text). Figma recolours only the help text, which fails WCAG 1.4.1 (02).
```

Week 3 shipped this with three changes (D-q, D-s). `FieldScope` renders the whole anatomy (root, label, description, error) from `fieldRootProps()` in `field.tsx`, not only the error slot, so the root's `data-invalid` and the error element follow native messages; both paths print the same server HTML. A group control (SegmentedControl) takes `group` on the Field, so the label has no `for`. `useFieldControl()` returns `id`, `labelledBy`, `describedBy`, `name`, the four flags and `controlProps`; the contract every control follows is `packages/react/src/field/FIELD-CONTRACT.md`.

Button-based third-party controls also take `aria-labelledby={f.labelledBy}` and call `useFieldControl({ labelBehavior: 'focus' })`, as Select does ([§16.1](#161-forms-gap-report-a-d16)).

```tsx
// Third-party controls plug into Field through one hook (K11): no adapter package needed.
'use client';
import { useFieldControl } from '@nizivo/react/field';
export function ColourPicker(props: ColourPickerProps) {
  const f = useFieldControl({ name: props.name, required: props.required });
  return <ThirdPartyColourInput id={f.ids?.control} name={f.name} aria-describedby={f.describedBy}
                                aria-invalid={f.invalid || undefined} required={f.required} {...props} />;
}
```

```tsx
// Recipe (docs only; Nizivo has no form-library dependency): react-hook-form 7.x + Standard Schema
'use client';
const { register, control, handleSubmit, formState: { errors } } = useForm<ProductInput>({ resolver: standardSchemaResolver(Product) });
<form onSubmit={handleSubmit(save)} noValidate>
  <Field label="Product title" error={errors.title?.message}>
    <Input {...register('title')} />                            {/* the ref reaches the native <input>, so setFocus works */}
  </Field>
  <Controller control={control} name="status" render={({ field, fieldState }) => (
    <Field label="Status" error={fieldState.error?.message}>
      <Select.Root name={field.name} value={field.value} onValueChange={(v) => field.onChange(v)} disabled={field.disabled}>
        <Select.Trigger ref={field.ref} onBlur={field.onBlur} />
        <Select.Popup><Select.Item value="active">Active</Select.Item><Select.Item value="draft">Draft</Select.Item></Select.Popup>
      </Select.Root>
    </Field>)} />
  <Button variant="primary" type="submit">Save</Button>
</form>
```

```tsx
// Recipe: React 19 server action (v0.2 <Form> maps errors by name and focuses the first invalid control)
const [state, action] = useActionState(saveProduct, {});
<Form action={action} errors={state.fieldErrors}>
  <Field name="title" label="Product title" required messages={{ valueMissing: 'Enter a product title' }}>
    <Input defaultValue={state.values?.title} />   {/* echo values back: React resets uncontrolled fields after an action */}
  </Field>
  <SubmitButton>Save</SubmitButton>                {/* useFormStatus → pending; aria-disabled, keeps focus */}
</Form>
```

TanStack Form 1.x and Conform 1.21 recipes follow gap report A §2.7; Conform's generated ids go into Field's `ids` prop.

### 10.7 KpiTile (server-safe pattern; the `status` contract; heavy module through a slot)

```tsx
// packages/react/src/kpi-tile/kpi-tile.tsx — NO directive. Its CSS lives in @layer nz.components (nz.patterns is reserved).
export function KpiTile({ label, value, format = 'compact', locale = 'en-US', delta, comparison, chart,
  tone = 'surface', status = 'ready', pending, empty, error, labels, render, className, ...rest }: KpiTileProps): React.JSX.Element {
  const L = { ...kpiTileLabels, ...labels };                                 // serialisable strings (gap report B §A2)
  const id = useId();
  const st: DataStatus = status === 'ready' && value == null ? 'empty' : status;
  return renderElement('div', render, { status: st, pending: !!pending }, {
    ...rest, role: 'group', 'aria-labelledby': id,                          // a named group, not a landmark
    className: cx('nz-kpi-tile', className), 'data-slot': 'kpi-tile',
    'data-tone': tone,                 // Figma Tone Surface|Tinted → 'surface' | 'brand' | 'accent', DECOUPLED from the trend (04 §4.3)
    'data-loading': st === 'loading' ? '' : undefined, 'data-empty': st === 'empty' ? '' : undefined,
    'data-error': st === 'error' ? '' : undefined, 'data-pending': pending ? '' : undefined,
    'aria-busy': st === 'loading' || pending || undefined,
    children: (<>
      <p id={id} className="nz-kpi-tile-label" data-slot="kpi-tile-label">{label}</p>
      <div className="nz-kpi-tile-value-row" data-slot="kpi-tile-value-row">
        {st === 'loading' ? <><span className="nz-skeleton nz-kpi-tile-value-skeleton" aria-hidden="true" />
                              <span className="nz-visually-hidden">{formatLabel(locale, L.loading, { label: String(label) })}</span></>
        : st === 'error' ? (error ?? <InlineError>{formatLabel(locale, L.error, { label: String(label) })}</InlineError>)
        : st === 'empty' ? (empty ?? <span className="nz-kpi-tile-empty"><span aria-hidden="true">—</span>
                              <span className="nz-visually-hidden">{L.noData}</span></span>)
        : <><NumberValue className="nz-kpi-tile-value" value={value!} format={format} locale={locale} />
            {chart /* element SLOT, e.g. <Sparkline/> from @nizivo/charts — core never imports charts (settled 6) */}</>}
      </div>
      {st === 'ready' && delta != null &&
        <div className="nz-kpi-tile-footer" data-slot="kpi-tile-footer"><Delta value={delta} locale={locale} comparison={comparison} /></div>}
    </>),
  });
}
```

```tsx
// Next 16: the Suspense fallback IS the component (G20). A test asserts the root box is identical (±1 px) across all four states.
<Suspense fallback={<KpiTile label="Revenue" status="loading" />}>
  <RevenueKpi />   {/* async server component → <KpiTile label="Revenue" value={123307.4} delta={0.124} comparison="vs last week"
                        chart={<Sparkline data={series} />} format="currency-compact" locale="en-GB" /> */}
</Suspense>
```

### 10.8 AreaChart (`@nizivo/charts`, server-first)

```tsx
// packages/charts/src/area-chart/area-chart.tsx — NO directive: full SVG on the server; ~3.2 KB if hydrated in an SPA.
import { area, line, curveMonotoneX } from 'd3-shape';
import { max, nice, ticks } from 'd3-array';
import { ChartFrame } from '../chart-frame/chart-frame';                     // figure + caption + data table + legend + status
import { ChartInteraction } from '../_island/chart-interaction.client';     // 'use client', ~0.6 KB; receives plain JSON
import { linear, point, type ScaleLike } from '../_core/scale';             // ScaleLike = callable + domain() + ticks(); d3 scales fit

export function AreaChart({ data, x, y, compare, title, summary, locale = 'en-US', format = 'compact',
  xScale, yScale, status = 'ready', empty, error, labels, xDirection = 'ltr' }: AreaChartProps): React.JSX.Element {
  const [, top] = nice(0, Math.max(max(data, y) ?? 0, compare ? max(data, compare) ?? 0 : 0), 4);  // NICE FIRST (fixes 03's "data above top tick")
  const yTicks = ticks(0, top, 4);                                            // now ends exactly at `top`
  const sx: ScaleLike<string> = xScale ?? point(data.map(x), [0, 100]);       // ISO plain dates as evenly spaced buckets
  const sy: ScaleLike<number> = yScale ?? linear([0, top], [100, 0]);         // percent space, y flipped
  const fmt = new Intl.NumberFormat(locale, numberPreset(format));            // format once, on the server (gap report B §A4)
  const pts = data.map((d) => ({ px: sx(x(d)), py: sy(y(d)), label: x(d), value: fmt.format(y(d)) }));
  return (
    <ChartFrame title={title} summary={summary} status={status} empty={empty} error={error} labels={labels}
      table={toTable(pts, labels)}   /* { columns: string[]; rows: string[][] } per chart-frame.contract.ts */
      ticks={{ x: pickTicks(data.map(x)), y: yTicks.map((t) => fmt.format(t)) }}
      className="nz-area-chart" data-x-direction={xDirection}>
      <svg className="nz-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {yTicks.map((t) => <line key={t} className="nz-chart-grid" x1={0} x2={100} y1={sy(t)} y2={sy(t)} />)}
        {compare && <path className="nz-chart-line" data-series="previous"
                          d={line<Datum>().x((d) => sx(x(d))).y((d) => sy(compare(d))).curve(curveMonotoneX)(data)!} />}
        <path className="nz-chart-area" d={area<Datum>().x((d) => sx(x(d))).y0(100).y1((d) => sy(y(d))).curve(curveMonotoneX)(data)!} />
        <path className="nz-chart-line" data-series="current"
              d={line<Datum>().x((d) => sx(x(d))).y((d) => sy(y(d))).curve(curveMonotoneX)(data)!} />
      </svg>
      {status === 'ready' && <ChartInteraction points={pts} label={title} />}   {/* crosshair, tooltip, roving keys, live region */}
    </ChartFrame>
  );
}
```

```css
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.components {
  .nz-area-chart .nz-chart-plot { position: relative; aspect-ratio: var(--nz-chart-aspect, 18 / 7); }   /* Figma 720×280 */
  .nz-chart-svg { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; overflow: visible;
                  animation: nz-chart-reveal var(--nz-duration-chart-draw) var(--nz-easing-standard) both; }  /* 0 ms when reduced */
  .nz-chart-grid { stroke: var(--nz-chart-grid); stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .nz-chart-line { fill: none; stroke: var(--nz-chart-primary); stroke-width: 2px; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .nz-chart-line[data-series="previous"] { stroke: var(--nz-chart-neutral); stroke-dasharray: 5 4; }  /* decorative; the table carries values */
  .nz-chart-area { fill: var(--nz-chart-primary); fill-opacity: 0.1; }
  [data-x-direction="rtl"] .nz-chart-svg { scale: -1 1; }
  @keyframes nz-chart-reveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
}
```

- Tick labels are HTML on CSS grid tracks with N equal columns, so there is no per-label inline `style` (safe under CSP Profile B).
- Bars in `BarChart` are SVG `<rect>` elements with percentage attributes, not HTML with a `--v` style.
- The draw-in uses `clip-path`, because `pathLength` combined with non-scaling strokes is UNVERIFIED.
- **Renderer seam:** `<ChartFrame title summary status table={…} interaction="none"><RechartsArea …/></ChartFrame>` keeps Nizivo's caption, data table, legend and status around any third-party renderer. The caller supplies `table`; keyboard access to points is only claimed for Nizivo renderers ([§14.1](#141-charts-nizivocharts-v02)).
- **WebKit `non-scaling-stroke` in percent space is UNVERIFIED** (r6 risk 2). It is the first task of v0.2.

---

## 11. Framework compatibility

Nizivo's promise: **zero required configuration** in every target framework. That holds because JS never imports CSS, the output is ESM-only, `'use client'` survives per file, and there is no required provider ([r1](research/r1-framework-compat.md)).

### 11.1 Per-framework setup and gotchas

| Framework (fixture version) | Setup | Gotchas we handle or document |
|---|---|---|
| **Next.js App Router** 16.4.0 (RSC, streaming; Turbopack **and** webpack) — fixture v0.1 | `import '@nizivo/react/styles.css'` in `app/layout.tsx`. `<html suppressHydrationWarning>` plus `<ThemeScript nonce={nonce} />` in `<head>` | Server-safe parts ship no client JS (asserted). Namespace compounds work from Server Components (S2/V3). Pass `render` as an **element** from server code; the function form only works in client code. With `cacheComponents`, routes stay hidden under `<Activity>`: transient overlays close in a layout-effect cleanup, and dialogs report `reason: 'hidden'`. Mount `<Toaster>` in the root layout, outside route Activity. For CSP nonces, generate them in `proxy.ts` and render `<meta property="csp-nonce" nonce={nonce} />` so React Aria picks them up. Next's App Router uses its own React canary, so the fixture also runs against `next@canary`. **Webpack barrel leak (S2c, measured):** under `next build --webpack`, a page that renders at least one client part and imports through the `@nizivo/react` barrel also gets every other `'use client'` module reachable through the barrel in its client chunk, even ones it never renders. A server-only page is unaffected, because it loads no page chunk at all. Turbopack (the default) does not leak. Docs therefore teach per-component subpaths (`@nizivo/react/button`) first, and webpack users who prefer the barrel add `experimental.optimizePackageImports: ['@nizivo/react']` (which removed the leak in S2c). **Turbopack needs browserslist (W2 docs step, measured):** without browserslist targets, Next 16.4.0 with Turbopack lowers every `light-dark()` in `tokens.css` to Lightning CSS's `--lightningcss-light`/`-dark` fallbacks (0 of 68 kept), which breaks nested scopes and inverse surfaces; with targets at Nizivo's floor (`chrome >= 123`, `edge >= 123`, `firefox >= 129`, `safari >= 17.5`, `ios_saf >= 17.5`, as in `apps/docs/package.json`) all 68 are kept. `next build --webpack` keeps 68 either way. The setup step therefore adds that browserslist; `fixtures/next` has none yet and passes only because it does not test nested scopes (W5). **Pages Router:** import the CSS in `_app` (UNVERIFIED that 16.x still requires it) |
| **Vite SPA** 8.3.4 — fixture v0.1 | Import the CSS once in `main.tsx`; paste `themeScript` into `index.html` `<head>` | Rolldown may print `MODULE_LEVEL_DIRECTIVE` warnings for `'use client'` in dependencies. They are harmless; the opt-out config path in Vite 8 is UNVERIFIED and documented once confirmed |
| **Vite SSR** 8.3.4 — fixture v0.2 | Nothing extra: **no `ssr.noExternal`** | Vite externalises dependencies in SSR; a dependency that imports `.css` would crash Node (`ERR_UNKNOWN_FILE_EXTENSION`). Ours never does |
| **Astro** 7.3.8 + `@astrojs/react` 7.0.1 — fixture v0.1 | `import '@nizivo/react/styles.css'` in the layout (keep the `.css` extension); `<script is:inline set:html={themeScript} />` in `<head>` | Children passed from `.astro` files arrive as static HTML, so **compose compound components inside one `.tsx` island**. Props to `client:*` islands must be serialisable: no functions. Context never crosses islands; each island that needs a non-default locale wraps its own `NizivoConfig`. Per-island `useId` prefixes are handled by `@astrojs/react` 7 (VERIFIED in its dist). Server-only usage (no `client:` directive) ships zero JS |
| **React Router** 8.4.0 framework mode — fixture v0.2 | CSS through a side-effect import in `root.tsx` (or `links` with `?url`); theme script in the root `Layout` `<head>` | v8 requires React 19.2.7+, Node 22.22+ and Vite 7+. RSC mode is still unstable; in non-RSC mode `'use client'` is a no-op string |
| **TanStack Start** 1.169.1 — fixture v0.3 (RSC lane non-blocking) | `import css from '@nizivo/react/styles.css?url'` → `head().links`; theme script in the root route head | Whether `@vitejs/plugin-rsc` honours `'use client'` inside `node_modules` is UNVERIFIED; the experimental RSC lane is non-blocking. The `ScriptOnce` helper name is UNVERIFIED |

### 11.2 Rules every component PR must pass

**RSC and modules**
- [ ] The file is server-safe (no directive, no state/effect/context hooks, no handlers, no browser APIs) **or** a client leaf (`*.client.tsx`). Sync server-safe parts may call `useId`.
- [ ] Compound parts are exported as a namespace **and** flat names, with no static properties. `*.parts.ts` and `index.ts` are directive-free and use **named** re-exports only.
- [ ] Props usable from Server Components are serialisable; slots are `ReactNode`; callbacks are optional.
- [ ] No React 19.3-only import (`browser`, `ViewTransition`, Fragment refs) in core.

**SSR and hydration**
- [ ] All ids come from `useId()` with an `id` override; no `Math.random()` or counters.
- [ ] No `Date.now()`, `new Date()`, `navigator`, `window` or `matchMedia` in render. Components that need "today" take `now`, `locale` and `timeZone` props.
- [ ] `Intl` formatting takes an explicit `locale` (default `'en-US'`) and `timeZone`, and formats once where the value first renders (Node and browsers disagree on some output; gap report B §A4 reproduced it).
- [ ] Responsive behaviour is CSS (container or media queries), never JS breakpoints.

**Overlays, Activity and Strict Mode**
- [ ] Transient open state closes in a `useLayoutEffect` cleanup, only for state that defaults to closed and was opened by the user.
- [ ] Scroll lock, inert and focus traps come from the engine's reference-counted implementation; effects are idempotent under React 19.3's double invocation during hydration.

**Forms**
- [ ] Native `name`/`value`/`form` work; custom controls render a visually hidden **real** input or select (`type="hidden"` cannot be `required`); `form.reset()` restores `defaultValue`.

**Packaging**
- [ ] The directive guard, the plain-Node load test (default condition for every entry, `react-server` for server-safe entries), publint and attw pass; no `dist/**/*.js` imports CSS.

---

## 12. Overlays, layering and focus

This adopts gap report C §1.4 in full. It resolves critique C17 (two conflicting z scales) and S10 (the `popover` iOS 18.3 gap).

### 12.1 The layering model

- **L1 — one overlay band, ordered by DOM.**
  - Every portaled overlay root (popover, menu, select listbox, combobox list, tooltip, dialog, drawer, sheet, and their backdrops) uses `z-index: var(--nz-z-overlay)`.
  - Engines append portals in open order, so a later-opened overlay paints above an earlier one. That is exactly the top layer's last-in-first-out rule, so a later native swap keeps the same visual semantics.
  - **There are no per-type z numbers.** Fixed precedence ("popover < modal") is what broke every Select inside a Dialog in Figma's page 07 scale.
- **L2 — nested overlays portal into the parent overlay's positioner.**
  - The container is resolved at open, in this order: an explicit `container` prop; the nearest parent Nizivo overlay; the nearest ancestor `dialog:modal`, `dialog[open]` or `:popover-open` of the trigger (this covers consumers' own native dialogs); `document.body`.
  - The container is never transformed and never clips (`overflow: hidden`, `contain: paint` and `clip-path` are banned on it).
- **L3 — Toast is the only top-layer element.**
  - The region is a `<section popover="manual">`, shown while at least one toast exists and re-promoted (`hidePopover(); showPopover()`) when a toast arrives while focus is outside the region.
  - It is marked `data-nz-top-layer`, which `OverlayEngine.markTopLayer` maps to the engine's inert exemption (`data-react-aria-top-layer` for React Aria).
  - Without the Popover API it falls back to `position: fixed; z-index: var(--nz-z-toast)`.
  - Manual popovers have no light dismiss, so the iOS 17.0–18.2 light-dismiss bug does not apply. Toast works on the whole Safari 17.5 floor.
- **L4 — page chrome sits below the band:** `--nz-z-raised` 1 (hover-lifted cards), `--nz-z-sticky` 100 (sticky headers and action bars), `--nz-z-chrome` 200 (top bar, sidebar, mobile tab bar). Apps with their own chrome above 1000 raise `--nz-z-overlay`, which is a public token.

### 12.2 Shared mechanics (one implementation, used by every overlay)

These mechanics are one contract per engine family, **`OverlayEngine`** (`_engines/<engine>/overlay.client.tsx`): portal container, hide-outside, scroll lock, dismiss stack, focus-return chain and `markTopLayer(el)`. Overlay-family components swap engines together ([§4.1](#41-layers) L4), so one app never runs two overlay cores.

| Concern | Rule |
|---|---|
| Inert / AT hiding | Delegated to the engine (React Aria uses `inert`, reference-counted). Nizivo never writes `inert` or `aria-hidden` while an engine is in charge, because two writers would fight over counts |
| Scroll lock | Exactly one lock: the engine's (`usePreventScroll`, a layout effect, `scrollbar-gutter: stable`). Owners: modal Dialog, AlertDialog, modal Drawer/Sheet, and the engine's modal popovers (Select, Menu). Tooltip and Toast never lock. On iOS React Aria injects a `<style>` that reads `<meta name="csp-nonce">` |
| Focus on open | Dialog/Drawer: `initialFocus`, else the first tabbable element in the body, else the popup. AlertDialog: the least destructive action. Menu/listbox: the first or selected item. Tooltip and Toast never move focus |
| Focus return | `returnFocus` (default `true`, or a ref, function or `false`) → the original trigger if still connected → the parent overlay's trigger (a Dialog opened from a Menu item returns to the Menu button) → `body` with a dev warning. WebKit returns focus to nothing on its own (D-spike, VERIFIED), so return is always explicit |
| Dismiss stack | Esc and outside press close **only the topmost** overlay. Presses inside the toast region dismiss nothing. Tab out of a Menu or listbox closes it |
| Callbacks | `onOpenChange(open, { reason })` with `'trigger' \| 'escape' \| 'outside-press' \| 'close-part' \| 'item-press' \| 'hidden' \| 'programmatic' \| 'unknown'` |
| Activity | The adapter passes a **controlled** open state to the engine, so preserved engine state cannot reopen a transient overlay on return. An uncontrolled user-opened Dialog closes with `'hidden'`; a controlled one receives `onOpenChange(false, { reason: 'hidden' })` and the app decides. `react-dom` 19.3 hides portals under a hidden Activity (VERIFIED in source); 19.2 is UNVERIFIED, so test O-15 runs on both |
| SSR | Closed overlays render nothing. The live announcer (two `aria-live` nodes) and the toast region **are** in the SSR HTML, so screen readers register them before the first announcement |
| Motion | `data-open`, `data-entering`, `data-exiting`, `data-side` and `data-align` drive CSS. Popups enter on the spring pair and exit on `--nz-duration-fade` + `--nz-easing-exit`; the backdrop only fades ([§13](#13-motion)). Portaled exits do not depend on animating `display`, because the engine keeps the node mounted through `data-exiting` (by design; verified per browser by the W3–4 overlay conformance) |
| Positioning | Engine JS positioning, exposing `--nz-trigger-width`, `--nz-available-width`, `--nz-available-height`, `--nz-transform-origin` (React Aria provides no available width, so its adapter writes the other three; [§8.3](#83-the-state-vocabulary-one-list-engine-independent)). CSS anchor positioning is a later enhancement behind the adapter (not Baseline as a whole) |

### 12.3 Per-type rules

| Type | Pattern | Modal | Dismiss | Backdrop | Notes |
|---|---|---|---|---|---|
| Dialog | `role="dialog"`, labelled by Title | yes | Esc; outside press (default on) | scrim, root modal only | `Body` is the only scroller; Close is an `IconButton`, not a bare 20 px icon |
| AlertDialog | `role="alertdialog"` + `aria-describedby` | yes | Esc; **no outside press** | scrim | One critical action; an async confirm keeps the dialog open with the action `pending` |
| Drawer / Sheet | Dialog pattern, logical `side`: `start\|end\|top\|bottom` | yes by default | Esc; outside press | scrim | Non-modal (`modal={false}`) **pushes** layout at wide widths and falls back to modal below (WCAG 2.4.11). Bottom Sheet on mobile |
| Popover | `role="dialog"` (non-modal semantics) | engine default modal | Esc, outside press | none | Nested overlays portal inside |
| Menu | `role="menu"` | yes | Esc (one level), outside press, Tab, item select | none | An item that opens a Dialog closes the Menu first; the Dialog returns focus to the Menu trigger |
| Select | listbox in popover | yes | Esc, outside press, Tab, select | none | `NativeSelect` needs none of this |
| Tooltip | `role="tooltip"` via `aria-describedby` | no | Esc, pointer leave, blur | none | 400 ms delay (Figma); hoverable (WCAG 1.4.13); shown on keyboard focus, not on touch; never on a disabled trigger without a wrapper; inverse scheme. API: the compound `Tooltip.Root` / `Trigger` / `Popup` is canonical; a `content` convenience prop and `shortcut` (needs Kbd) come in week 3 with IconButton's tooltip wiring. Adopted 2026-10-14 (builder default; the maintainer can override); the maintainer confirmed it on 2026-10-14 ("works", D-d) |
| Toast | region `aria-label="Notifications (F8)"` + separate announcer | n/a (top layer, exempt) | Esc on a focused toast, swipe, timer | none | [§12.6](#126-toast) |
| Mobile navigation (< 640 px) | MobileTabBar: 5 links in `<nav>` with `aria-current`; "More" opens a `Drawer side="bottom"` rendered by AppShell | yes (the sheet) | Esc, outside press, route change | scrim | Pattern and threshold from the designer (`7275:18744`, S-11): "Below 640px the sidebar becomes a five-tab bar". The Sidebar is not rendered below 640 px |

### 12.4 Native swap gates

Native `<dialog>` and `popover` stay the planned path, one component at a time, through `engine.ts`. This is the one sanctioned exception to "overlay-family components swap together" ([§4.1](#41-layers) L4): a native adapter must pass N-01…N-04 plus O-01, O-04 and O-10 next to the family's `OverlayEngine` (inert and scroll-lock counts, dismiss stack, focus return) before `nz gen` accepts `"engine": "native"` on an overlay component. A component moves only when that holds and all four gates clear (gap report C §1.4):

1. `overlay` (keeping a node in the top layer while it animates out) ships in Firefox and Safari, or design accepts no exit animation for native overlays.
2. Elements above a native modal become interactive (whatwg/html#9936), **or** the "toast outlet follows the topmost modal" rule passes test O-08 on all engines.
3. `dialog[closedby]` ships in Safari, or a JS backdrop-click fallback is accepted.
4. Re-parenting uses React portals, never `moveBefore` (missing in Safari) or `appendChild` (drops popover state).

The native-specific tests N-01…N-04 already exist in `testkit/native` (Esc/`cancel` exit sequencing including 0 ms reduced motion; toast outlet inside a native modal; iOS scroll lock with `:has(dialog:modal)`; WebKit focus return after mouse activation). A native adapter must render the same `.nz-dialog-backdrop` **element** and emit the same `data-*` vocabulary, never rely on `::backdrop` or `[open]`, so the CSS contract survives the swap.

These gates cover native dialog and popover only. Select's native swap (customizable `<select>`) has no gate list yet; its closest statement is the NativeSelect collapse gate in [§9.4](#94-proving-the-seam-and-escape-hatches). Week 3 measured what such a swap would need to match: NativeSelect equals the Select trigger in height, border widths, start padding, font and chevron placement at every size in Chromium and WebKit (`test/browser/text-controls.spec.tsx`). Two values still differ, the `sm` radius and the disabled border, and wait for the week 4 `select.css` pass.

### 12.5 Overlay conformance tests

The O-tests come from gap report C §1.10 and run against each engine family's `OverlayEngine`, with that family's overlay adapters only (never a mixed set). They are staged:

| Stage | Tests |
|---|---|
| v0.1 (Chromium on PRs; Firefox and WebKit on `main`) | O-01 Select inside Dialog · O-03 Tooltip inside Dialog · O-04 Dialog on Dialog (one backdrop, focus chain, lock count back to 0, `<html>` styles restored) · O-10 scroll-lock counting under Strict Mode · O-11 focus-return fallbacks · O-17 SSR/hydration · O-20 exit animations in all engines · O-22 Esc stack · O-21 forced colours |
| v0.2 | O-02 Menu → Dialog focus return · O-05 Popover inside Drawer · **O-06 Toast over a modal: F8 reaches the action, the modal stays open, no `aria-hidden-focus` violation (the gate for Toast)** · O-07 Toast created before a modal · O-09 one announcement per toast (manual SR) · O-12 outside-press ordering · O-13 WCAG 2.4.11 with toasts · O-14 toast timing · O-15 Activity hide/show on React 19.2 and 19.3 · O-18 Popover API missing |
| v1.0 | All 25, including O-08 (consumer native modal), O-16 (native-swap only), O-19 (iOS device), O-23 (non-modal Drawer), O-24 (CSP), O-25 (clipping), on three engines × React 19.2/19.3 |

### 12.6 Toast

- **Store:** a module-level external store (`useSyncExternalStore`) behind a `toast()` facade. React Aria's `useToastRegion`/`useToast` hooks only render it, from `_engines/react-aria/toast.client.tsx` behind `ToastEngine`. `UNSTABLE_Toast` is not used, because an exact pin would stop consumers deduping.
- **Announcements** go through the persistent announcer, never through the region becoming visible. Success, info and neutral are `polite`; critical is `assertive`. Toast items themselves are not live, so nothing is read twice.
- **Timing (WCAG 2.2.1):** Figma's "gone in 5 s" applies only to toasts **without** an action. Timers pause on hover, focus-within, document hidden and region focus. **Toasts with an action, and critical toasts, persist until dismissed** (design confirmation 8i).
- **Keyboard:** F8 focuses the region; Tab moves within it; Esc dismisses the focused toast; leaving returns focus to where it was. Inside a modal, F8 is the documented path, because the focus trap wraps Tab.
- **Focus not obscured (WCAG 2.4.11):** the Toaster writes its stack height to `--nz-toast-inset` on `<html>`, which feeds `scroll-padding-block-end` in `nz.base`. If focus lands under the stack, it collapses to a one-pill "peek".
- **Mobile:** the region sits above the Mobile Tab Bar and sticky action bars through `--nz-layout-bottom-inset` + `env(safe-area-inset-bottom)`. The shell sets `html[data-nz-bottom-bar]` in a layout effect, not `:root:has(…)`, because `:has()` still matches routes hidden by Activity.
- **The toast action is a real `Button`** (tertiary, sm) coloured `--nz-text-accent`, and close is an `IconButton`. The toast grows from 44 to 56 px; this is a design ask.
- **Outlet rule:** only for consumer-owned native `<dialog>` modals (and our own future native swap), the region re-portals through React into the topmost `dialog:modal`. It is UNVERIFIED and gated by O-08.

---

## 13. Motion

### 13.1 One generator, one threshold

`tooling/spring/spring.ts` is a port of spike S4's closed-form damped-oscillator solver. It is the **only** place a spring becomes CSS.

| Figma | Settle threshold | Output | Overshoot | Points / bytes |
|---|---|---|---|---|
| `easing/spring` = `spring(1, 260, 24, 0)` | \|x − 1\| ≤ 0.1% of travel | `--nz-easing-spring: linear(…)` + `--nz-duration-spring: 493ms` | 3.02% | 19 / 224 B |
| `easing/spring-soft` = `spring(1, 170, 26, 0)` | same | `--nz-easing-spring-soft` + `--nz-duration-spring-soft: 702ms` | none | 18 / 211 B |

- Points are placed adaptively (Ramer–Douglas–Peucker, ε = 0.004; maximum error 0.0037). All 12 generated strings pass `CSS.supports` in Chromium 156 and WebKit 27.2 (S4, VERIFIED), and the `--nz-easing-spring` string also passes in Firefox 129 (W1 floor lane). A golden test pins the values.
- Motion's own `toString()` reports 600/750 ms for the same springs, but its own done-scan settles at 554/718 ms. That is why four reports had four sets of numbers (critique C10). We take no build dependency on Motion.
- **The parameter order is `spring(mass, stiffness, damping, velocity)`.** The maintainer accepted it on 2026-10-14 ("string numbers look fine"; M12), which answers question 8h's first half and handoff Q1. If design ever reports another order, it is a token-value patch: change `parseFigmaSpring` in `tooling/spring/spring.ts` and re-pin `spring.golden.json`.

### 13.2 Rules

1. **Pairing:** a spring easing is used only with its own derived duration, and only on `transform`, `scale`, `translate` or `rotate` (stylelint). Opacity runs on a normal easing; when it accompanies a spring, it may reuse the spring's **duration** so both finish together.
2. **Durations come from tokens.** Figma's hover reactions use 160 ms, which is not a token; we use `duration/fast` (140 ms) and log the deviation (critique C35).
3. **Reduced motion is a token swap, never a markup change.** The Figma "Reduced" mode drives `prefers-reduced-motion: reduce` and `[data-nz-motion="reduce"]`:

| Token | Default | Reduced | Source |
|---|---|---|---|
| `--nz-duration-instant` / `-fast` | 80 / 140 ms | 0 / 0 ms | Figma |
| `--nz-duration-base` / `-slow` / `-slower` | 220 / 320 / 480 ms | 120 / 120 / 160 ms | Figma |
| `--nz-duration-count-up` / `-chart-draw` | 900 / 700 ms | 0 / 0 ms | Figma |
| `--nz-easing-*` (standard, enter, exit, spring, spring-soft) | curves | `linear` | Figma |
| `--nz-duration-spring` / `-spring-soft` | 493 / 702 ms | **120 / 120 ms** (Reduced `base`) | derived |
| `--nz-duration-fade` | 140 ms | **120 ms** | code-owned |
| `--nz-duration-pulse` (Skeleton loop, one cycle) | 2000 ms | **0 ms** (the loop stops) | code-owned |
| `--nz-duration-spin` (pending spinner) | 1000 ms | 1000 ms (kept) | code-owned |
| `--nz-distance-lift` / `-reveal` / `-float`, `--nz-tilt-max-deg`, `--nz-magnetic-pull`, `--nz-stagger-item` | 4 / 12 / 8 px, 6°, 6 px, 40 ms | 0 | Figma |
| `--nz-scale-press` / `-hover` / `-enter` | 0.98 / 1.02 / 0.96 | 1 | Figma / code-owned |

**Why `--nz-duration-fade` exists.** Figma's Reduced mode sets `duration/fast` to 0, yet its own motion principle says "Reduced mode keeps fades, drops travel … fades stay ≤ 160 ms" (01). Any fade on `duration/fast` (overlay exits, the tooltip fade) would vanish for reduced-motion users. So opacity-only fades use the code-owned `--nz-duration-fade`: 140 ms by default (identical to Figma's `fast`), 120 ms when reduced. Spring durations likewise drop to 120 ms rather than 0, so fades that share them survive. Design question 8h's second half (handoff Q34) asks whether to add this token to Nizivo Motion.

**Loops stop in Reduced mode.** Infinite animations may only run on `--nz-duration-pulse` (the Skeleton loop) or `--nz-duration-spin` (the pending spinner); stylelint enforces this. Reduced sets the pulse to 0 ms. An infinite animation with a zero iteration duration has an active duration of 0, so it never runs, and its keyframes are authored so the element's own static style is the resting look. Binding the loop to `duration/slower` instead (as the 09 specimen's label suggests) would make it pulse at about 3 Hz in Reduced (160 ms). The spinner keeps rotating, because it is essential status feedback.

4. **CSS-first entry; exit where the browser can animate it.** Adopted 2026-10-14 (builder default; the maintainer can override).
   - **Entry:** `@starting-style` plus `transition-behavior: allow-discrete` for CSS-only components. It works on the whole floor tested (Firefox 129 in the W1 floor lane, in every shape tried; Safari 17.5 not tested).
   - **Exit:** to `display: none` it is instant in every Firefox (129 to 157), because `display` is not animatable there (Mozilla bug 1834877). A CSS-only component whose exit animation matters hides with `visibility` plus `allow-discrete`, which fades in every browser tested. Otherwise the instant exit in Firefox is an accepted deviation: Deviations page entry D2 ([§18.2](#182-docs-site-public)).
   - **Engine-managed overlays** use `data-entering`/`data-exiting` and keep the node mounted until the exit ends, so their exits do not depend on animating `display` (by design; verified per browser by the W3–4 overlay conformance).
5. **No force-full-motion override** (critique C9b). Visual-regression screenshots use Playwright's `animations: 'disabled'`.

### 13.3 Figma motion specs → CSS

| Figma spec (source) | Implementation |
|---|---|
| "Overlays enter on spring, exit in 140 ms ease-in; the backdrop only fades" (01) | popup `scale` on the spring pair + opacity; exit on `--nz-duration-fade` + `--nz-easing-exit`; backdrop opacity on `--nz-duration-base` |
| Dropdown Menu "scale 0.96 → 1" (02) | `--nz-scale-enter` |
| Tooltip "Delay 400 ms, fade + 4 px rise in duration/fast" (02) | 400 ms delay in the adapter; opacity on `--nz-duration-fade`; `translate` by `--nz-distance-lift` (0 when reduced) |
| Button hover / press (02) | `background-color` on `--nz-duration-fast`; `scale: var(--nz-scale-press)` on `--nz-duration-instant` |
| Chart draw (03, 09) | `clip-path` keyframes on `--nz-duration-chart-draw` (0 when reduced) |
| Count-up (04) | `CountUp` hook; the server renders the final value; 0 ms when reduced |
| Skeleton pulse (09) | loop on code-owned `--nz-duration-pulse` (2000 ms per cycle; 0 ms when reduced, so it stops) until design adds `duration/pulse` |
| Card lift, toast enter/exit (09) | component CSS on motion tokens; exit on `--nz-duration-fade` |

### 13.4 Packaging

- CSS motion lives in tokens and component CSS.
- The ~1 KB of hooks (`CountUp` 0.50 KB, `usePointerFx` for Tilt/Magnetic 0.48 KB; [r6 §3](research/r6-heavy-modules.md)) ship at **`@nizivo/react/motion`** (v0.2). There is **no `@nizivo/motion` package**: a subpath tree-shakes identically and saves a trusted-publisher setup.
- **No Motion (motion.dev) adapter is planned.** `motion.div` measured 44.2 KB, and Motion's SSR leaves content at `opacity: 0` before hydration. Consumers who want it can wrap parts with `motion.*` through `render`.

---

## 14. Charts, icons, media, fonts and opt-in heavy packages

### 14.1 Charts (`@nizivo/charts`, v0.2)

- **Server-first geometry.** Server Components compute SVG paths. One `ChartInteraction` island (~0.6 KB) adds the crosshair, tooltip, roving keyboard index and live region from pre-formatted strings. Measured: our AreaChart 3.2 KB vs 10.4 KB with `d3-scale` vs 107.7 KB for Recharts, and Recharts 3's SSR emits no SVG ([r6 §2](research/r6-heavy-modules.md)).
- **Runtime dependencies:** `d3-shape` and `d3-array` only, plus our own ~10-line linear, band and point scales behind the structural `ScaleLike` interface. d3 scale objects satisfy it unchanged.
- **Time axes:** daily and weekly buckets (what Figma page 03 draws) use a point scale over ISO plain dates, with every-Nth ticks and a forced last tick. Irregular timestamps go through the opt-in `@nizivo/charts/d3` adapter (optional peer `d3-scale`; `scaleTime` costs 17.6 KB). This can wait until a consumer needs it.
- **Domains are niced before ticks** (`d3-array` `nice`), which fixes Figma 03's "bar exceeds the top tick" defect.
- **Geometry:**
  - Lines and areas use a percent-space `viewBox` with `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke`.
  - Bars are SVG `<rect>` elements with percentage attributes. Bars are at most 22 px, rounded at the data end, and dimmed siblings use opacity, not `chart/secondary` (1.59:1 in dark).
  - Labels are HTML on CSS grid tracks. No inline `style` anywhere, so charts render correctly under CSP Profile B.
- **`ChartFrame`** renders a `<figure>` with a caption, a server-rendered data table (the accessible alternative), the legend, and the `status` contract. Its props contract is `chart-frame.contract.ts`:
  ```ts
  export interface ChartFrameProps {
    title: ReactNode; summary?: ReactNode; status?: DataStatus;
    table: { columns: string[]; rows: string[][] };   // pre-formatted strings, so it serialises from a Server Component
    axes?: 'frame' | 'none';                           // ChartFrame's HTML tick labels, or the child draws its own
    interaction?: 'nizivo' | 'none';                   // 'none' for third-party children: no keyboard claim
  }
  ```
  Any renderer can be a child. With a third-party child (for example Recharts), the caller passes `table` and `interaction="none"`: ChartFrame then guarantees the caption, data table, legend and status, but makes no keyboard claim for the points. A conformance case renders a dummy third-party `<svg>` child and asserts exactly that.
- **Charts imports nothing from `@nizivo/react`.** It depends only on `@nizivo/tokens` (CSS variables) and vendors the ~40-line `render`/`mergeProps` helpers, which `nz gen` generates from core's and CI diffs. Its CSS carries its own focus outline and visually-hidden rule scoped to `.nz-chart-*`, so it never relies on `@nizivo/react`'s `nz.base`. A charts-only fixture (`tokens.css` + `charts/styles.css`, no react CSS) runs axe and focus-visible checks. Core reaches charts only through slots (`KpiTile chart={<Sparkline/>}`), so either package can be used without the other.
- **Figma rules kept:** Donut folds to at most 3 categories plus "Other"; categorical colours `chart/cat-1..3` never cycle; the comparison series is dashed `chart/neutral` (decorative; the data table carries the values).
- **RTL:** time and value axes do not mirror by default (`xDirection="ltr"`; `"rtl"` and `"auto"` are opt-in). Chart chrome follows `dir`.
- **First v0.2 task:** a WebKit screenshot check of `non-scaling-stroke` in percent space (UNVERIFIED). The fallback is a pixel-space `viewBox` per container size.
- **v0.3:** Funnel and Heatmap (HTML/CSS). The heatmap needs solid sequential `chart/seq-1..5` colours from design.

### 14.2 Icons (`@nizivo/icons`)

- **Generated** by a ~150-line codegen plus SVGO 4 from **exact-pinned `lucide-static` 1.56.0**. One ESM module per icon, no directive (server-safe), `currentColor`, `sideEffects: false`. The full Lucide set is generated (unused icons cost nothing).
- **Stroke (settled 7):** default `size={20}` and **`strokeWidth={1.92}` on the 24 viewBox, non-absolute.** That renders 1.6 px at 20 px and 1.28 px at 16 px, exactly what Figma draws for 20 px icons and the 16 px Button icons (02). `absoluteStrokeWidth` is opt-in (use `strokeWidth={1.6}` with it for 1.6 px at every size). The stroke is an SVG attribute, never a CSS `calc()`: verdict V11 showed a `calc()` over a length variable collapses to 1 user unit, and CSS beats the attribute fallback.
- `aria-hidden` unless `title` is given.
- **`mirror.json`:** a curated directional subset gets `data-mirror="rtl"`. Clocks, checks, search, rings and trend icons never mirror.
- **`aliases.json`** keeps names stable across Lucide renames, or when regenerating from another source.
- **Brand glyphs** at `@nizivo/icons/brands/<name>`, from simple-icons (CC0), starting with Instagram plus its usage rule ("only for Connect / Follow on Instagram links").
- `LICENSE` carries the Lucide ISC and Feather MIT notices; CI checks they are present. The notice is needed wherever Lucide path data ships, so `packages/react` also ships a `THIRD_PARTY_NOTICES` file for the glyphs in `_internal/glyphs.tsx` (Lucide ISC; the Feather MIT notice is added if a Feather-derived glyph is inlined). W1: `packages/react/test/unit/notices.test.ts` checks that the file is in `files` and carries the ISC text; it runs in `pnpm test`. The check on `@nizivo/icons`' `LICENSE` comes with the icons generator (W3–4).
- **Core imports no icon package.** A lint bans `@nizivo/icons` and `lucide*` inside `packages/react`, and dependency-cruiser enforces it. At most 10 internal glyphs are inlined from one list in `_internal/glyphs.tsx`: spinner, error mark, check, indeterminate dash, chevron (rotated for sort, select and pagination), chevrons-up-down, close, eye/eye-off, plus/minus, calendar. Each is overridable through a slot prop on the part that renders it, so an icon-set swap leaves no Lucide-stroke glyph behind:

  | Glyph | Part | Slot prop |
  |---|---|---|
  | spinner | Button, IconButton (`pending`) | `pendingIndicator` |
  | chevrons-up-down | `Select.Trigger` | `indicator` |
  | check, indeterminate dash | Checkbox | `indicator` |
  | error mark | `FieldError`, InlineError | `icon` |
  | close | `Dialog.Close`, Toast close, Alert dismiss | `children` |
  | chevron | Table sort button; Pagination | `indicator`; `previousIcon` / `nextIcon` |
  | eye / eye-off | PasswordInput | `showIcon` / `hideIcon` |
  | plus / minus | QuantityStepper | `incrementIcon` / `decrementIcon` |
  | calendar | DateRangePicker trigger | `icon` |

  A conformance case per part renders a custom slot and asserts that the internal glyph is gone.

  **W2 state.** `_internal/glyphs.tsx` holds `spinner` and `chevrons-up-down`. The error mark is Lucide's `circle-x` (what Figma's Alert Critical draws) and close is Lucide's `x`. Both are on Lucide's list of Feather-derived icons, so inlining them also needs the Feather MIT notice in `THIRD_PARTY_NOTICES` and in `test/unit/notices.test.ts` (today the file says neither inlined glyph is Feather-derived). Until they land, `InlineError`'s `icon` and `AlertDismiss`'s `children` are **required** props, and become optional with the glyph as default afterwards. **W3 state:** done. `glyphs.tsx` holds `spinner`, `chevrons-up-down`, `circle-x`, `close`, `check` and `minus` (Checkbox's mark and dash, also Feather-derived); `THIRD_PARTY_NOTICES` lists all six by their Lucide names and carries the Feather MIT notice, and `notices.test.ts` checks both. `InlineError`'s `icon` and `AlertDismiss`'s `children` are optional, with `circle-x` and `close` as defaults. Icons Figma draws that are not in this list stay consumer slots with no default: Alert's tone icons (info, circle-check, triangle-alert, circle-x) and Delta's trend icons (trending-up, trending-down, minus) go through each component's `icon` slot, filled from `@nizivo/icons`.
- **`IconProps`** (`size`, `strokeWidth`, `absoluteStrokeWidth`, `title`) is the Lucide-shaped stroke contract of `@nizivo/icons`. Regenerating from another stroke icon set keeps it; a non-stroke source changes it, so it ships as a major or as a separate package.
- If icons slip from v0.1, docs fall back to `lucide-react` with `strokeWidth={1.92}` through the same slots.

```tsx
// packages/icons/src/calendar.tsx — GENERATED. No directive.
export function Calendar({ size = 20, strokeWidth = 1.92, absoluteStrokeWidth = false, title, ...rest }: IconProps) {
  const sw = absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={sw}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...rest}>
      {title && <title>{title}</title>}
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
    </svg>
  );
}
```

### 14.3 Media

- **`Image`** is a server-safe `<img>`: `width`, `height` and `alt` are required; `data-ratio` presets (`1/1`, `4/5`, `3/2`, `16/9`) map to `aspect-ratio` in CSS; **no inline `style`** (it would be blocked under a strict CSP and never repaired by hydration; gap report B §B1.1). `priority` maps to `fetchpriority="high"` with eager loading.
- `render={<NextImage … />}` (or unpic) swaps in a framework image component. Nizivo has no image provider.
- **No Figma raster ships anywhere** (packages, docs, Storybook, registry, fixtures, a Community copy) until it has an entry in `ASSETS.md`. The 3D renders, product photos and portraits have unknown provenance (G7).
- Instagram media goes through an app-side proxy or cache; components never fetch from or script Meta (gap report B §B7).

### 14.4 Fonts

- **The library ships no font files** (settled 15). Geist and Geist Mono are OFL-1.1 and must not be vendored under the code licence. The `geist` npm package peers on Next only.
- Font tokens reference a variable with fallbacks: `--nz-font-family-sans: var(--font-geist-sans, "Geist"), ui-sans-serif, system-ui, sans-serif;`. Next apps set `--font-geist-sans` through `next/font`; other frameworks load Geist themselves or accept the system stack.
- Numeric text styles always set `font-variant-numeric: tabular-nums`.

### 14.5 Opt-in heavy packages (`@nizivo/lab`)

- **Not created before 1.0, and only when a consumer asks.** The Figma "3D" items are raster images, not 3D scenes. The Rays and Mesh shader sources could not be retrieved from the file (09). SVG-displacement liquid glass works only in Chromium.
- When it exists: independent 0.x versioning, peer `react ^19.3.0` (`use(browser())`), optional peers (`@paper-design/shaders-react`, three), lazy loading, and a server-rendered poster. Our own `ShaderSurface` measured 1.4 KB ([r6 §4](research/r6-heavy-modules.md)).
- **CSS glass is core:** `Surface material="glass"` (v0.3) uses `backdrop-filter` (Safari 18; below that an opaque fallback), with opaque fallbacks under `@supports not`, `forced-colors` and `prefers-reduced-transparency`.

---

## 15. Accessibility baseline and token remediation

### 15.1 Baseline

| Area | Commitment |
|---|---|
| Standard | WCAG 2.2 AA. **Any AA failure in light mode blocks a stable release.** Dark is reported but not blocking while it is `preview` |
| Focus | 2 px solid outline, offset 2 px, in `nz.base` (forced-colours safe). `border/focus` measures 4.07–4.66:1 on light backgrounds (green/500) and 5.87–8.17:1 on dark (green/300). The halo is decoration. Invalid fields keep the green outline and switch only the halo to critical |
| Target size | Every pointer target ≥ 24 × 24 px (2.5.8). Controls are 32/40/48. On a coarse **primary** pointer, an invisible `::after` expands hit areas to 44 px on **both** axes (a 40 × 40 icon button grows 3 px per side; a 120 × 40 button grows only vertically). `data-nz-touch-targets="always"` opts hybrid devices in. Visible sizes never change automatically |
| Type | Floor **12 px** (0.75rem), linted (decision 8c, 2026-10-14; this reverses the original 14 px floor from critique S5). 12 px is allowed only through the named `Body/S` and `Label/S` styles (`--nz-font-body-s`, `--nz-font-label-s`; names confirmed by the week 1 dry run), never as an ad-hoc size. Small text gets no contrast discount: every colour used at 12 px must reach 4.5:1, and the contrast matrix checks those pairs. Components keep the sizes Figma draws; moving one to 12 px (for example Field help or error text) is a one-line hook change, listed on the Deviations page. Sizes in rem so user scaling works |
| Colour | Never colour-only: Field errors carry an icon and text (Figma recolours only help text, which fails 1.4.1) |
| Forced colours | Overlay popups get `border: 1px solid CanvasText`; focus is an outline. Forced colours replace backgrounds and drop shadows, so every state painted with a fill or a shadow gets a system-colour rule generated from `stateIndicator` ([§8.5](#85-the-a11y-floor-nzbase)): the Switch track and thumb, the Checkbox and Radio checked state, the selected segment, progress and meter fills, and selected menu and select items. The selected segment also draws a 1 px `border/control` ring in both modes, because its thumb is 1.04:1 against the track. Two week 2 caveats ([§8.5](#85-the-a11y-floor-nzbase)): a component that paints the state with `background` repeats the rule in its own CSS (ProgressBar, Meter), and ProgressRing's stroke-painted arc has its rules only in `progress-ring.css` until a `stroke` paint exists. Forced-colours screenshots of every v0.1 control gate v0.1 (exit criterion 14) |
| Motion | Reduced-motion token swap ([§13](#13-motion)); loops stop (`--nz-duration-pulse` = 0 ms); the pending spinner keeps turning as essential feedback |
| Semantics | Native elements first; APG patterns through the engine; tables are `<table>`, never `role="grid"`; KPI tiles are named groups, not landmarks |
| AT testing | Manual matrix every minor (NVDA, JAWS, VoiceOver macOS/iOS, TalkBack, Narrator, forced colours, 200% zoom). Guidepup NVDA/VoiceOver nightly from v1.0, non-blocking until green for 30 days |

### 15.2 Failures in the Figma tokens today (all reproduced by gap report C §3.1)

| Pair | Ratio | Needs |
|---|---|---|
| `text/tertiary` n500, light, on n0 / n25 / n50 / n100 | 4.31 / 4.16 / 4.01 / **3.76** | 4.5 |
| `text/tertiary` n500, dark, on n950 / n900 / n850 / n800 | 4.34 / 4.03 / 3.65 / **3.12** | 4.5 |
| dark `text/critical` red/500 on n900 / n850 / n800 | 4.01 / 3.63 / **3.11** | 4.5 |
| dark `text/info` blue/500 on n900 / n850 | 3.63 / 3.29 | 4.5 |
| dark `bg/critical` red/500 with white / n900 / n950 | 4.33 / 4.01 / 4.32 (no passing foreground) | 4.5 |
| `border/default` n200 / `border/strong` n300 vs n0 (input boundaries) | **1.27 / 1.57** | 3 |
| `icon/warning` amber/500 vs n0 / amber/50 | **2.45** / 2.27 | 3 |
| Focus halo alone (green/500 @ 28%) vs n0 | **1.45** | 3 (fixed by the outline) |
| dark Toast action lime/400 on white; dark success icon green/300 on white | 1.75; 2.29 | 4.5; 3 |

### 15.3 Token remediation (computed)

All pairs below were recomputed with the WCAG 2.2 relative-luminance formula against every background each token can sit on (gap report C §3.2), and all pass. The two tables follow the placement rule in [§7.6](#76-code-owned-tokens).

**Overrides:** existing Figma variables re-pointed, in `code-owned/a11y/{light,dark}.overrides.tokens.json`.

| Token | Mode | Was (worst) | Now | Worst ratio now | Needs |
|---|---|---|---|---|---|
| `text/secondary` | L | n600 (5.65) | n700 `#414741` | **8.31** | 4.5 |
| `text/secondary` | D | n400 (5.32) | n300 `#cbd0c8` | **8.58** | 4.5 |
| `text/tertiary` | L | n500 (3.76) | n600 `#596058` | **5.65** | 4.5 |
| `text/tertiary` | D | n500 (3.12) | n400 `#9ea59c` | **5.32** | 4.5 |
| `text/critical` | D | red/500 (3.11) | red/400 `#e47962` (new primitive, a proposal) | **4.62** | 4.5 |
| `text/info` | D | blue/500 (2.81) | blue/400 `#7098e0` (new primitive, a proposal) | **4.65** | 4.5 |
| `bg/critical` | D | red/500: no passing foreground | red/600 (as in light) | **5.69** with white | 4.5 |
| `icon/warning`, `border/warning` | L | amber/500 (2.13) | amber/600 `#b07b0e` | **3.22** | 3 |
| `icon/critical` | D | red/500 (3.11, which already passes 3:1) | red/400 | **4.62** | 3 (a **pairing** override, not a contrast fix: it keeps the icon on the same red as `text/critical`) |

**Proposals:** new variables Figma does not have yet. Semantic colours and motion values are in `code-owned/proposals/{color,motion}/<mode>.tokens.json`, one file per mode; primitives and text styles are in `code-owned/proposals.tokens.json` ([§7.6](#76-code-owned-tokens)).

| Token | Mode | Was (worst) | Now | Worst ratio now | Needs |
|---|---|---|---|---|---|
| `text/accent` | L / D | — (Toast action used `bg/accent`) | green/700 / lime/300 | **7.91** / **10.68** | 4.5 |
| `text/on-critical` | L+D | — | white on `bg/critical` | **5.69** | 4.5 |
| `bg/critical-hover` + white | L+D | raw red/700 bind | red/700 | **8.26** | 4.5 |
| `icon/info` | L / D | Alert used `icon/brand` | blue/600 / blue/400 | **5.83** / **4.65** | 3 |
| `border/control` (input, checkbox, radio, switch-off track, select trigger) | L / D | n200/n300 (1.27/1.57) | neutral/450 `#828a81` (new) / n500 | **3.10** / **3.12** | 3 |
| `border/control-hover` | L / D | n300 / n700 | n500 / n400 | **3.76** / **5.32** | 3 |
| `chart/warning` (interim alias of `icon/warning`) | L | `text/warning` misused as a fill | amber/600 | **3.22** on `chart/track` | 3 |
| `chart/critical` (interim alias of `chart/negative`) | L+D | `text/critical` misused as a fill | red/500 | **3.77** light / **3.10** dark, on `chart/track` | 3 |

**Dark surface and border changes that go with it** (overrides; gap report C §2.3): dark `bg/subtle` n900 → new n925 (the subtle band reappears at 1.03:1, matching light's 1.04); dark `border/subtle` n850 → n800, `border/default` n800 → n700, `border/strong` n700 → n600; every floating surface uses `bg/surface-raised` (n850). On n850, hover rows (n800) stay distinct at 1.17:1.

**New primitives** (proposals; OKLCH-interpolated between ramp neighbours, so hue and chroma follow the ramp): neutral/450 `#828a81`, neutral/925 `#151816`, red/400 `#e47962`, blue/400 `#7098e0`.

**The text ladder: Option A** (recommended, design question 8e). It re-spaces the ladder with existing primitives: light 900/700/600, dark 50/300/400. It keeps the designer's secondary-to-tertiary step (ΔL\* 10.5 light, 15.9 dark). Option B (new steps) would compress that step to about 1.2:1, so tertiary nearly merges with secondary. If design rejects A, use C (alias tertiary to secondary) rather than B. The cost of A: light secondary text gets one step deeper on about 20 components, so the render review must include **light** pages 02, 04, 05 and 08.

**Component remapping:** Input, Select trigger, Search Field, Checkbox and Radio boundaries use `border/control` (hover: `border/control-hover`). `border/default` and `border/subtle` become decorative only (cards, dividers). The Switch off-track fill uses `border/control`'s colour (4.31:1 light, 4.03:1 dark). Bare close icons (Toast 16 px, Alert 16 px, Banner 18 px, Modal 20 px) become `IconButton`s (week 2: Alert's is `AlertDismiss`, a 24 px target that can compose an `IconButton` through `render`; [§9.5](#95-per-component-tier-table-core)); Alert Info uses `icon/info`; Critical hover uses `bg/critical-hover` instead of the raw red/700 bind. ProgressBar's warning and critical fills use `chart/warning` and `chart/critical`. The selected SegmentedControl segment draws `box-shadow: inset 0 0 0 1px var(--nz-border-control)` plus the weight change, in both modes (the thumb is 1.04:1 against the track; handoff §4.9).

**Week 2 corrections to the remapping** (from the contrast matrix on the built `tokens.css`, `packages/tokens/CONTRAST.md`):
- **Progress fills are measured on `chart/track`, the background they are painted on.** The `chart/warning` 3.22 and `chart/critical` 3.77 figures above are ratios on n100, which is `chart/track` in light. `contrast-pairs.json` now checks every ProgressBar, Meter and ProgressRing fill on `chart-track` (`chart-primary`, `icon-success`, `chart-warning`, `chart-critical`, `icon-secondary`). Dark `chart/critical` on the track is 3.10, just above 3:1.
- **Tones Figma has no fill for** use builder-chosen tokens (D-i, pending design): `success` uses `icon/success` (4.06 light, 5.87 dark on the track); `neutral` uses `icon/secondary` (3.75 light, 5.32 dark), because `chart/neutral` is 1.36:1 light and 1.41:1 dark on the track and fails 1.4.11.
- **Dark `icon/critical` is a pairing override, not a contrast fix**: red/500 is 3.11:1 at worst, which passes 3:1. It ships with kind `pairing` so the redundancy rule does not delete it ([§15.4](#154-ownership-and-the-override-mechanism)).
- **Select's trigger hover now reads `border/control-hover`.** Week 1's Select CSS fell back to `border/strong` (1.56:1 on white) on hover; week 2 changed it to `--nz-border-control-hover` (3.75:1 light, 5.32:1 dark), as this remapping says.
- The matrix also checks Alert's text, icons and focus outline on the four `bg/*-subtle` tints, and `text/primary` on `bg/pressed`. In all, 58 checked pairs (29 per theme) pass.

### 15.4 Ownership and the override mechanism

- **Figma remains the source of truth for values.** When it conflicts with AA, code ships a **time-boxed override** of the existing variable in the token source (`src/code-owned/a11y/{light,dark}.overrides.tokens.json`), applied as the last resolver source of each context. It is not a CSS layer, so the CSS, JS refs, Tailwind output and Figma-importable JSON all agree, and the layer order is untouched. A variable or primitive Figma does not have yet is a **proposal**: a semantic colour or motion value in `src/code-owned/proposals/{color,motion}/<mode>.tokens.json` (one file per mode), a primitive or text style in `src/code-owned/proposals.tokens.json` ([§7.6](#76-code-owned-tokens)).
- Each override records `figmaVariableId` (the stable id from `$extensions["dev.nizivo.figma"]`, so the Grove → Nizivo rename cannot orphan it), `figmaVariable` (the display name, for people), `figmaValueAtOverride`, `kind`, `reason`, `wcag`, `issue`, `approvedBy` and `expires`. Each proposal records `figmaVariable` (the prefix-free name to create, for example `text/on-critical`), `wcag` where relevant, `approvedBy` and `expires`.
- **`kind`** is one of three (week 2; D-k): `contrast` (the default: a fix for a failing pair); `ladder` (re-spacing a ladder, not a fix: the two Option A `text/secondary` entries, and the dark surface and border ladder `bg/subtle`, `border/subtle`, `border/default` and `border/strong`); and `pairing` (keeps one token on the same value as its partner although Figma's value passes: dark `icon/critical`, which follows `text/critical`). Only `contrast` overrides take the passes-on-its-own redundancy test (CI rule 3).
- **`issue`** is required: the tracking issue's `https` URL, or an explicit `null` until one is filed. All 14 week 2 overrides carry `null`; no tracker issues exist yet. The tracker itself is open (2026-10-15): GitHub Issues, or a Linear workspace with an MCP server scoped to this project, which the maintainer offered ("if needed, we can make a linear workspace and add mcp scoped to this project"). The check accepts any `https` URL, so either needs no code change.
- **`approvedBy`** is `["maintainer"]` on every entry until a second owner and a CODEOWNERS file exist; the entries ship on the decision 8e and 8f defaults. The two-owner rule below applies from then on. **2026-10-15 (M15):** the second owner is named: Dayitava, the design contact, "can handle both" roles, design-system lead and accessibility owner, for overrides, proposals and the decision meeting. Dayitava's GitHub username is still pending; it goes into CODEOWNERS, and Dayitava's approval goes into `approvedBy` (next to `maintainer`, in the same identifier form CODEOWNERS uses) as Dayitava reviews each entry. Until then the entries keep `["maintainer"]`.

```jsonc
// code-owned/a11y/dark.overrides.tokens.json (one entry)
// token ids as the normalizer writes them: colours sit under `color.` (stripped from CSS names by variableName, §7.3)
{ "color": { "text": { "critical": { "$type": "color", "$value": "{color.p.red.400}",
  "$extensions": { "app.nizivo.override": {
    "figmaVariableId": "VariableID:737:146", "figmaVariable": "Nizivo Color/text/critical (Dark)", "figmaValueAtOverride": "{color.p.red.500}", "kind": "contrast",
    "reason": "4.01:1 on bg/surface, 3.11 on bg/hover (WCAG 1.4.3)", "wcag": ["1.4.3"],
    "issue": null, "approvedBy": ["maintainer"],          // later the issue's https URL (GitHub Issues or Linear: open); both owners
    "expires": "2027-01-31" } } } } } }
```

**CI rules** (`packages/tokens/scripts/a11y.ts` over `build/a11y.ts`, on every PR and every sync PR; while Actions is off, in the local gate). It runs twice: inside the tokens build after `tz build`, and again as the root `pnpm check:a11y` (`--check`) after `pnpm build` in `pnpm check`. The second run is never cached, which rule 4 needs: a cached build replays a pass after the expiry date, because the date is not a cache input.
1. **Contrast matrix:** `contrast-pairs.json` lists every foreground/background pair components use, with its role (text, large text, non-text, focus, decorative, disabled). CI evaluates **every theme permutation** and fails on any AA miss. It does not rely on Terrazzo's per-modifier lint alone, which is unconfirmed.
2. **Drift** (overrides): the Figma value of `figmaVariableId` no longer equals `figmaValueAtOverride` → fail ("Figma changed this token; re-evaluate").
3. **Redundancy:** an override whose Figma value now equals it, or a **contrast** override whose Figma value now passes on its own, or a proposal whose variable Figma now defines (matched by the prefix-free name) → fail ("delete the override"). This is how both files empty themselves. The two Option A `text/secondary` entries are not contrast fixes: Figma's n600/n400 already pass (5.65/5.32), and the entries only re-space the ladder so tertiary can move up. They carry `"kind": "ladder"`, skip the passes-on-its-own test, and leave when Figma adopts Option A (equality) or when design rejects it (expiry). The dark surface and border overrides are `ladder` too, and dark `icon/critical` is `pairing`; neither kind takes the test.
4. **Expiry:** warn 14 days before `expires`, fail after; renewal needs both owners (Dayitava holds both roles, M15; the maintainer alone until Dayitava's GitHub username is in CODEOWNERS). Only an uncached run can see the date change: `pnpm check:a11y`.
5. **Docs:** the build emits a public "Deviations from Figma" page listing every live override and proposal.
6. **Release gate:** Changesets refuses a stable publish with any failing pair. An allowlist is permitted only in prereleases.

**RACI:** the design-system designer is **accountable** for values (fixes land in Figma). The engineering accessibility owner is **responsible** for the matrix and may propose overrides. CODEOWNERS on `code-owned/a11y/**` and `code-owned/proposals*` requires both, once a second owner exists; until then the maintainer approves alone, and the repo has no CODEOWNERS file yet. **2026-10-15 (M15):** Dayitava holds both roles for overrides, proposals and the decision meeting, so one review by Dayitava covers both approvals, and the maintainer still reviews and merges every change (decision 7). The CODEOWNERS file waits for Dayitava's GitHub username. The release manager enforces the gate (for 0.1.0, the maintainer running the local release script, M14).

---

## 16. Forms, data tables, dates, i18n and RTL

### 16.1 Forms (gap report A, D16)

- **`Field` is a server-safe shell.** It is sync, calls `useId`, and renders the label and description from props. It wraps its children in a tiny `'use client'` **`FieldScope`** leaf (~0.5 KB), which provides context and renders the error slot. Week 3: FieldScope measures 1.0 KB min+gz on its own (2.7 KB with the anatomy helpers it imports from `field.js`, InlineError and the glyphs; W3-RESULTS.md), because it also owns native validation and renders the whole anatomy (D-q).
- **Zero-JS mode (documented first for Server-Component forms):** pass a function child. `Field` then renders the error itself, and the child receives ready-made `controlProps` (ids, `aria-describedby`, `aria-invalid`, `name`, `required`). Week 3: this is zero execution, not always zero bytes. `field.tsx` imports FieldScope, and Turbopack and `next dev` ship a client module a route's server graph imports even when nothing renders it; production webpack drops it (the Next fixture's `/field-zero-js`). A separate static entry would make it zero bytes everywhere; that is open (§21.1 week 3).
- **Every control is a thin client leaf** (~0.3 KB target each). Its SSR HTML is complete and works before hydration. This overrides r3's "Input is T0 server": a control must read `FieldScope`. Week 3 measured 0.4 to 1.2 KB of own code per leaf (min+gz; Textarea 0.4, Switch 0.6, RadioGroup 0.7, Input 0.8, Checkbox 0.8, SegmentedControl 1.2), within §17.2's 1 KB cap except SegmentedControl; NativeSelect is the exception to the rule and stays `server` (D-x).
- **Group controls** (SegmentedControl; later ChipGroup and third-party pickers) are a root `role="radiogroup"` over several native inputs, not one labelable element. The Field takes `group`: its label renders with no `for`, and the control names its root with `aria-labelledby` (D-s).
- **Native constraint validation stays on.** The `invalid` event is intercepted so messages render inline (React 19.3 delivers it to `onInvalid`; VERIFIED in jsdom). Messages appear **on submit by default** (the GOV.UK pattern); `validateOn="blur"` is opt-in.
- **One error channel**, in priority order: the `error` prop, then `Form errors[name]`, then the native message. Errors use `aria-describedby`, not `aria-errormessage`. `data-invalid` means "a message is presented", never merely "fails constraints".
- **`Form`, `SubmitButton` and `FormMessage`** (v0.2) are optional clients: errors by name, focus on the first invalid control, an optional error summary, and `useFormStatus` → `pending`.
- **Form libraries are docs recipes only:** react-hook-form 7.90, TanStack Form 1.33 and Conform 1.21, with Standard Schema validation ([§10.6](#106-field-and-a-form-library-recipe)). There are no `XField` wrappers and no adapter packages; adapter packages would couple us to RHF 8 beta and TanStack Form 2 alpha.
- **Third-party controls** plug in through `useFieldControl()`. Recipe tests cover all three libraries.
- **Button-based controls** (Select; later the DateRangePicker and Combobox triggers, and third-party button controls) are named through `aria-labelledby`, not through `<label for>`. React Aria builds the trigger's `aria-labelledby` from the value id plus whatever label id it is given, and `aria-labelledby` overrides `<label for>`; without the Field label id the button would be announced only by its value (WCAG 4.1.2, 2.5.3). So the control passes the Field label id (`useFieldControl()` returns it as `labelledBy`). A `<label for>` that points at a `<button>` also turns a label click into a button click, which opens the popup; with `useFieldControl({ labelBehavior: 'focus' })`, `FieldScope` intercepts the label's click, prevents that, and focuses the control instead, as React Aria's own `labelElementType: 'span'` does. The server-safe `Field` shell and the zero-JS function-child path are unchanged.
- **Input family (D20):**

| Item | Tier | Notes |
|---|---|---|
| Input (text, email, url, tel) + `prefix`/`suffix`/`leadingIcon` | T0 in a client leaf | Text affixes join `aria-describedby`; icons are `aria-hidden`; the group shows `:focus-within`. Week 3: also `search`, `password` and `number`, `trailingIcon` and sizes; the root `.nz-input` is the box (D-y) |
| Textarea (+ character `count`) | T0 + `field-sizing: content` | Auto-grow with no JS (Baseline Newly 2026-06-16; older browsers fall back to `rows`). The count is `aria-hidden` visually and announced politely only after the user pauses. Soft limit by default. Week 3: `field-sizing` ships inside `@supports (field-sizing: content)`, the one property the Lightning CSS guard allows only there; Firefox 129 and Safari 17.5 keep `rows` (D-w). The count is not built yet |
| PasswordInput | own leaf (~0.4 KB) | `aria-pressed` toggle with a constant label; reverts to `type="password"` on submit |
| SearchField | T0: `<search>` + `type="search"` | Zero-JS filtering with `<form method="get">` |
| QuantityStepper | T0 `type="number"` + own two-button leaf | Integer only; buttons `tabIndex={-1}`; arrows from the native spinbutton |
| NumberField (currency, percent, locale parsing) | T1 (+9.8 KB) | Native `type="number"` mishandles locale separators |
| Combobox | T1 (+9.8 KB) | Never hand-built; `<datalist>` rejected |

### 16.2 Data tables (gap report A, D17)

- **Native `<table>` server-safe parts in core** (`@nizivo/react/table`, 0 KB client JS): container, table, header, body, row, head, cell, sort button. Semantics are `table`, never `grid`.
- **One form-based selection island** plus `BulkActionBar` (≤ 2 KB target). Selection is tri-state on the header checkbox. Rows use `data-selected`, never `aria-selected` inside a `table`.
- **Server-driven sort, filter and pagination through the URL**, using `render={<Link/>}` on sort buttons and Pagination. The page is the state; there is no client data engine in core.
- **`DataView`** (v0.3) renders both Table and List presentations and swaps them with a container query at `sm`. It is the only SSR-deterministic way to do 08's Table ↔ List swap.
- **TanStack Table v9 and TanStack Virtual appear only in registry blocks** (`data-table`, `data-table-virtual`), never as npm dependencies of ours. Their 12.9–17.0 KB stays in the app that chose them.
- **Rejected:** the React Aria `Table` (+29.0 KB over the dashboard set, `role="grid"`).
- **Large data:** pagination first; virtualisation is opt-in in the registry block. `content-visibility: auto` does nothing on `<tr>` (CSS Containment excludes internal table boxes), but it works on the List presentation.
- Sticky header via `--nz-z-sticky` and the `--nz-table-sticky-offset` hook; horizontal scroll inside the container with `data-focus-inset` cells.

### 16.3 Dates and time (gap report A, D18)

- **Public values are ISO plain-date strings** (`'2026-10-14'`), never `Date`. They serialise across the RSC boundary and carry no time-zone ambiguity. Ranges are `{ start, end }`.
- **Internally, `@internationalized/date` 3.12.4** is an explicit dependency of the date entries. It is already a dependency of React Aria Components, so it adds nothing for most apps.
- **No Temporal polyfill:** it costs 19.3 KB, and Safari stable has not shipped Temporal (BCD: `preview`). Because the public type is a string, moving internals to native Temporal later is a **patch**.
- **`timeZone` is required** wherever "today", relative presets or "now" are involved.
- **The trigger is the SSR surface** (≤ 1.5 KB eager); **the calendar is client-only and lazy** (+21.4 KB over the dashboard set → budget 24 KB).
- Ships as **`@nizivo/react/unstable/date-range-picker`** in v0.3, until design draws the day-cell states (today, outside month, unavailable, range start/end/in range).
- The Figma shape (a button trigger + popover + presets list + RangeCalendar, no segmented `DateInput`) measured 70.1 KB standalone. Skipping `DateInput` saves about 7 KB.
- Open design questions (Apply/Cancel vs instant commit, one or two months, compare-to-previous-period) are in [figma-handoff.md](figma-handoff.md).

### 16.4 Internationalisation and RTL (gap report B, Part A)

- **Strings.** About 60 built-in strings exist (for example "Close", "Loading {label}", "Showing {from}–{to} of {total}", "{count} rows selected").
  - Each part takes a serialisable **`labels` prop** with English defaults. The optional client `NizivoConfig` can supply `labels` globally.
  - Plain-object catalogues ship at `@nizivo/react/locales/<tag>` (v0.2), starting with `en-US` only. Others are added on request.
  - Plurals use CLDR category objects (`{ one, other }`) through a ~0.2 KB `formatLabel` built on `Intl.PluralRules`. There is no MessageFormat dependency (FormatJS measured 9.65 KB). Strings are never concatenated.
  - A catalogue lint checks plural categories per locale.
  - **Engine-rendered strings.** React Aria-backed parts render some strings from React Aria's own 36-locale catalogues (for example NumberField "Increase", DatePicker segment labels and Toast region labels; gap report B §A1). Nizivo's `labels` do not control them, an app i18n stack cannot translate them for other locales, and an engine swap would silently change them (Base UI ships no strings). So each `<name>.contract.ts` lists them as `<Name>Labels` keys; adapters pass them into the engine wherever it accepts overrides, and the rest are listed as "engine-owned" on the component's docs page. A conformance case with a locale outside React Aria's 36 checks that every accessible name comes from Nizivo labels or that list. An engine swap re-maps them ([§4.1](#41-layers) L4).
- **Locale determinism.** The default locale is `'en-US'`; nothing reads `navigator.language` during render. Every React Aria root is wrapped in `I18nProvider` with the resolved locale. A conformance test sets the browser to `de-DE` and asserts no text changes after hydration.
- **Direction.** `NizivoConfig` has **no `direction` key**. React Aria derives direction from the locale; our own code reads it from the DOM when an event fires; CSS uses logical properties and `:dir()` only. `stylelint-use-logical` runs from the first commit (cheap now, expensive later). `dirOf(locale)` helps apps set `<html dir>`.
- **Formatting.** `Intl` with an explicit `locale` and `timeZone`; `format` takes a serialisable `Intl.*Options` object or a named preset; values are formatted once where they first render; formatted numbers are wrapped in `unicode-bidi: isolate` and use tabular figures.
- **Icons.** The curated `mirror.json` subset auto-mirrors under RTL, with a per-instance opt-out. Media, clocks, checks, search, rings and trend icons never mirror.
- **Text expansion.** Tab-bar labels truncate with an ellipsis plus `aria-label` (08 has 75 px tabs).
- **Testing.** A 10-locale matrix plus two pseudo-locales. ar-EG enters visual regression at v1.0 (he-IL for spot checks). A mirror-geometry Playwright test lands in v0.3.
- **React Aria locale strings** (36 locales) add 4.8 KB to the dashboard set unless apps use `@react-aria/optimize-locales-plugin`. Budgets are measured **with** all locales (the worst case), and docs give the plugin recipe per framework.

### 16.5 Loading, empty and error contract

From gap report B, Part C. It applies to every data-display component (KpiTile, Metric, TrendCard, charts, Table, DataView, RankedList):
- **API:** `status: 'ready' | 'loading' | 'empty' | 'error'`, plus `pending` (a refresh is in flight while showing data) and `empty`/`error` element slots. `status` is reserved for this lifecycle; domain states use domain names (`availability`, `paymentStatus`, `fulfillmentStatus`).
- **The Suspense fallback is the same component with `status="loading"`.** The frame persists and only the content region swaps. A test asserts the root box is identical (±1 px) across all four states at three container widths, so streaming causes no layout shift.
- **The library never fetches and never suspends.**
- **Attributes:** `data-loading`, `data-pending`, `data-empty`, `data-error`. `data-error` (a load failure) is distinct from `data-invalid` (validation).
- **Accessibility:** `aria-busy` plus static visually hidden text ("Loading Revenue"); **no live region inside skeletons**. `InlineError` takes an `action` slot.
- **Pending UI:** Button `loading` is renamed **`pending`**; it stays focusable with `aria-disabled`. Every stateful part is controllable, so `useOptimistic` can drive it; optimistic rows use `data-pending`; controls are never disabled during a transition.
- Client islands fail closed: if an island throws, the server-rendered content stays.

---

## 17. Performance budgets (measured)

**Method** (settled 13). Sizes are min + **gzip**, React and ReactDOM external, using r3's esbuild method (bundle + minify, ESM, production condition, gzip -9) with **all 36 React Aria locales included**, the worst case a consumer can hit. Gap report A and verdict V8 reproduced r3's dashboard baseline exactly (69.0 KB). Each limit is the measurement + ~10%. Rows marked "target" are UNVERIFIED until the first build, then become hard `size-limit` entries. `size-limit` 14.2 is configured for gzip so the numbers stay comparable (r4's brotli ceilings are not used; critique C23).

### 17.1 `@nizivo/react` — engine families

| Entry | Measured (KB gz) | Limit | Source |
|---|---:|---:|---|
| Tooltip (RAC components) | 14.3 | 16 | r3 §3.1 |
| Tooltip (react-aria hooks, own DOM; v0.2 adapter) | 7.2 | 8 | verdict V9 |
| Dialog | 28.1 | 31 | r3 |
| Popover | 29.4 | 32 | r3 |
| Sheet | 26.3 | 29 | r3 |
| Tabs | 31.9 | 35 | r3 (use `TabNav` for link tabs: 0 KB) |
| Menu | 51.3 | 57 | r3 |
| Select | 59.5 | 66 | r3 |
| **Dashboard set** (Dialog, Popover, Menu, Select, Tabs, Tooltip) | **69.0** | **75** | r3 §3.2 |

**Increments over the dashboard set** (gap report A §1.5):

| Entry | Measured | Limit |
|---|---:|---:|
| Combobox | +9.8 | +11 |
| NumberField | +9.8 | +11 |
| CommandMenu (Autocomplete + SearchField; lazy on first ⌘K) | +4.7 | +7.5 |
| CommandMenu with virtualisation | +8.8 more | +10 more |
| Calendar chunk for the date-range picker (lazy) | +21.4 | +24 |
| Date-range trigger (eager) | — | ≤ 1.5 (target) |
| hotkeys (tinykeys 1.0 + registry) | 1.0 + own | ≤ 2 |

**Escape-hatch reference (not the default):** React Aria hooks with our own DOM measured Menu 39.6 KB and Menu + Select + Tabs 45.3 KB, vs 51.3 and 65.5 for RAC components (verdict V8, reproduced twice). If a component moves to the hooks altitude, every lazy chunk is **re-measured on that base**: verdict V9 found RangeCalendar is +25.1 KB over the hooks base, not +21.4, and an RAC Autocomplete-based CommandMenu is +19.9 KB, not +4.7.

### 17.2 Own code, CSS, icons and charts

| Entry | Budget |
|---|---|
| Server-safe parts (Button, Card, Badge, KpiTile, Table parts, …) | **0 KB client JS under RSC** (Next fixture assertion); ≤ 1 KB each for SPA consumers (target) |
| Shared helpers (`renderElement`, `mergeProps`, `stateAttrs`) | ≤ 1 KB (target) |
| Engine seam overhead (`stateAttrs` + `EngineLocale` + details) | estimated ≤ 0.5 KB; **measured in v0.1** and recorded in the seam ledger |
| Field + FieldScope + Form + SubmitButton | ≤ 2.5 KB (target) |
| Each own input leaf (Input, Textarea, PasswordInput, QuantityStepper) | ≤ 1 KB (target) |
| Table selection + BulkActionBar | ≤ 2 KB (target) |
| Toast (own store, region, announcer on react-aria hooks) | first build + 10%; ceiling 20 KB standalone (RAC `UNSTABLE_Toast` measured 19.9) |
| `styles.css`, `tokens.css`, each `css/<name>.css` | first build + 10%, gzip (target ≤ 2 KB per leaf file). W2 measured: all 24 react stylesheets are under 2 KB gzip, the largest `button.css` at 1,013 bytes; `tokens.css` is 3,958 bytes gzip (`packages/react/W2-RESULTS.md`) |
| `@nizivo/icons` | ≈ 0.26 KB per icon (lucide-react: 10 icons = 2.6 KB, r6); tarball size tracked |
| AreaChart / ChartInteraction island / Donut | 3.2 → **3.6** / 0.6 → **0.8** / 2.9 → **3.2** (r6, measured) |
| Sparkline / all charts together | ≤ 2 / ≤ 12 (targets) |
| CountUp / `usePointerFx` | 0.50 → 0.55 / 0.48 → 0.55 (r6) |

### 17.3 Page-level arithmetic and runtime performance

- **A server-only page** (cards, KPI tiles, tables, buttons, charts without interaction): 0 KB of Nizivo client JS.
- **The overview dashboard (08) in v0.2:** the dashboard set (≤ 75 KB, shared core) + table selection (≤ 2) + chart islands (0.8 each) + Toast increment (measured in v0.2). Lazy surfaces (calendar, command menu) load on first use.
- **Runtime:** Vitest 5 `bench` in browser mode with a Profiler; a regression above 15% fails. The v0.2 exit requires CLS < 0.01 on a streamed overview page with delayed Suspense boundaries. Web Vitals for the RSC + React Aria hydration cost are recorded on the docs site and fixtures from v0.2 (critique G22).
- **Budgets only go up through a labelled PR.** The PR comment shows the `size-limit` diff, produced by a small custom step (the community `size-limit-action` has not been released since April 2024).

---

## 18. Quality: testing, visual regression, a11y automation, docs, Storybook

### 18.1 Test layers

| Layer | Tool | Runs | Notes |
|---|---|---|---|
| Unit and interaction | Vitest 5.0.4 Browser Mode + `@vitest/browser-playwright` + `vitest-browser-react`, `getByRole` locators | Chromium on PRs; Firefox and WebKit on `main` and nightly | Real CSS, focus-visible, dialogs and layout need a real browser. Any console warning or error fails the test |
| SSR | Node-environment suite: `renderToString` of every example; every entry loads under the default condition; server-safe entries load under `react-server` | every PR | Catches a hook or browser API in a server-safe module. W2: `test/ssr/render-all.test.tsx` renders all 27 examples and checks every emitted `data-*` against the vocabulary; `test/ssr/t0.server.test.tsx` loads all 19 T0 entries and renders their examples with `react` mocked to React's react-server build (a stub dispatcher serves `useId`), not through a real resolve condition. The Next fixture is the real RSC render |
| Conformance | `@nizivo/testkit` per component per engine, plus the O-tests ([§9.6](#96-conformance-suite), [§12.5](#125-overlay-conformance-tests)) | PRs (Chromium), `main` (all) | Asserts classes, `data-slot` and `data-*`, not only behaviour |
| Framework fixtures | `fixtures/{next,vite,astro,…}` install the **packed** packages and run one shared Playwright spec from `fixtures/runner` (`@nizivo/fixture-runner`). How (W1, `fixtures/next/RESULTS.md`): the runner unpacks each `pnpm pack` tarball and the fixture installs the folders as `file:` dependencies, which pnpm copies into its store (never a workspace link) with no integrity hash, so a committed lockfile stays valid across builds and installs with `--frozen-lockfile`. A tarball itself cannot carry a stable lockfile, because its hash changes with every build. Each fixture is its own pnpm workspace root, excluded from the monorepo (`'!fixtures/next'`), because the packed `@nizivo/react` depends on an unpublished exact `@nizivo/tokens` and only a workspace root can override that | every PR (path-filtered), nightly in full | Zero console errors, zero recoverable hydration errors, interactivity after hydration, axe, no theme flash, no `@nizivo` client chunk on server-only pages |
| Accessibility | axe-core **4.14.0**, a direct catalog pin. W2 docs step: no pnpm override is needed while `@axe-core/playwright` (which pins axe-core ~4.13) is not installed, because the docs smoke test injects axe-core's own source into Playwright pages; the override comes back with the Storybook addon or `@axe-core/playwright`. Storybook a11y addon with `test: 'error'` and `wcag2a/2aa/21a/21aa/22aa`; `@axe-core/playwright` on docs and fixtures in light, dark, forced colours and reduced motion; oxlint `jsx-a11y` rules | every PR | Dark results are reported, not blocking, while dark is `preview` |
| Screen readers | Guidepup (`@guidepup/playwright` 0.19.1): NVDA on `windows-2025`, VoiceOver on macOS | nightly from v1.0; non-blocking until green for 30 days | Select, Combobox, Menu, Tabs, Dialog, Toast, form groups, charts. Manual AT pass every minor until then |
| Visual regression | Vitest `toMatchScreenshot` in a pinned Playwright Docker image; baselines committed as ordinary files (Git LFS only if they outgrow plain Git). No hosted service (decision 6, zero spend); stories stay CSF3, so a vendor could be added later | sync PRs and `main` | v0.1 matrix: light, desktop. Dark, mobile and RTL by v1.0. Full matrices only on the merge queue |
| Types | `expect-type` 1.4.0 in `*.test-d.ts`, compiled with plain `tsc` on TS 6.0 and 7.0 | every PR | Includes the `augment` maps across subpath and barrel |
| Package correctness | publint 0.3.25 and attw 0.18.5 (profile esm-only, CSS entries excluded) inside the build; Node 22/24 resolution test; exports drift; directive guard; tarball allowlist | every PR | On packed tarballs. W2: the root `pnpm check:release` (`packages/tooling/release/check.ts`) packs `@nizivo/tokens` and `@nizivo/react` and runs the tarball allowlist with published-`package.json` rules, publint (strict), attw and the directive guard with the `export * as` lint on each, as the last step of `pnpm check`. The allowlist names exact files (`LICENSE`, `README.md`, `package.json`, and `THIRD_PARTY_NOTICES` for react), not §19.3's globs. Neither package ships a README yet |
| API surface | `contracts/api/**` regenerated and diffed; the changeset must classify the change. W2 docs step: `nz api` writes 51 files (27 React entries, 24 stylesheets) from the built `@nizivo/react` and `@nizivo/tokens` (D-o), and the root `pnpm gen:check` builds `@nizivo/react` and runs `nz api --check`. Classifying the change in the changeset is not automated yet | every PR | The props table and hooks table in the docs come from the same files |
| Performance | `size-limit` (gzip), Vitest `bench` | every PR | [§17](#17-performance-budgets-measured) |

### 18.2 Docs site (public)

- **Fumadocs 16.17.2 on Next 16.4** at nizivo.neevtechnologies.in. It is also the largest RSC consumer of the library.
- **Hosting (zero spend):** a static export (`output: 'export'`) deployed to **GitHub Pages** from the public repo, with the custom domain through a DNS `CNAME` record at neevtechnologies.in, which the maintainer adds later, before the hosting step (2026-10-15). A static export keeps every free static host available, Cloudflare Pages included. Vercel's free Hobby plan is for non-commercial personal use, so it is not used for a company project. Search is the built-in static index, so no server is needed. While GitHub Actions is off ([§1](#1-decisions-we-need-from-you)), the docs build is local only: no Pages configuration and no workflow file. The Fumadocs skeleton was built in the separate step right after week 2 (**Docs skeleton status**, [§21.1](#211-v01--foundations-forms-and-core-overlays--6-weeks--2-weeks-buffer-dist-tag-next); `apps/docs/RESULTS.md`).
- Live examples come from the `*.example.tsx` modules, rendered by a server `<Example>` that also shows their Shiki-highlighted source. W2 docs step (D-n): `apps/docs/scripts/generate.ts` copies each module into `apps/docs/.generated/examples/` with its relative imports rewritten to the public subpaths, and writes one route per component that imports only its own examples. One route for every component would put every example's client modules on every page: Next bundles every client reference a route's server graph imports, rendered or not, and dynamic `import()` does not change that. Props tables come from `contracts/api/react/*.json`, which `nz api` writes from the built `dist/*.d.ts` with ts-morph 28 (which bundles TS 6.0.2; D-o). Hook and token tables come from `contracts/api/css` and `contract.json`. A hook's description is published only from a `/** … */` doc comment in the source CSS; plain `/* … */` comments are maintainer notes and never reach the site. The **"Deviations from Figma"** page is generated from the override files (`packages/tokens/CONTRAST.md` holds the same override and proposal tables). It also lists the builder-chosen values (for example the progress fills of D-i, and the off-scale Figma values the week 2 components snapped to the scale, from the "builder decides" items in `docs/figma/11-w2-server-safe-components.md`) and the browser degradations the floor lane records (exit criterion 6). The page exists since the docs skeleton step and quotes the first two, from week 1 (`fixtures/floor-lane/RESULTS.md`), from this list; D3 and D4 joined in week 4, when Mobile Safari 17.5 ran on the iOS 17.5 Simulator:
  - **D1.** "Firefox 129–131: `light-dark()` with literal colours written directly on a non-inherited property can take the wrong scheme in nested scopes (Firefox bug 1914735, fixed in 132). Nizivo's tokens are unaffected; write theme colours as custom properties."
  - **D2.** "Firefox (all versions tested, 129 to 157): an exit transition that ends in `display: none` is instant, because Firefox cannot animate `display` (bug 1834877). Entry animations work. Engine-managed overlays are unaffected; a CSS-only component that needs an exit animation hides with `visibility` instead."
  - **D3.** "Firefox 129–157, WebKit 27.2 and Mobile Safari 17.5 have no `overlay` property, so a native popover or `<dialog>` exit is instant there. Nizivo's overlays are engine-managed and stay mounted through `data-exiting`, so they are unaffected; this is why no overlay swaps to the native element yet (§12.4 gate 1)."
  - **D4.** "Mobile Safari 17.5 (iOS 17.5 Simulator): an exit transition that ends in `display: none` is instant, as in Firefox (D2): `transition-behavior: allow-discrete` parses, but `display` does not transition. Entry animations work, and WebKit 27.2 fades. Engine-managed overlays are unaffected; a CSS-only component that needs an exit animation hides with `visibility` instead."
- Every component page has sections for Accessibility (keyboard map, APG pattern), Tokens and hooks, and Figma (canonical and ghost node ids from `component-map.json`).
- Built-in static search and `llms.txt` (both built in the docs skeleton step; the search index loads only when a reader first opens search). A lazy "Open in StackBlitz" (`@stackblitz/sdk`) is deferred: it calls an external service, and the site makes no external runtime call.
- Getting-started pages for Next, Vite and Astro (v0.1), then React Router (v0.2) and TanStack Start (v0.3), each including the Tailwind recipe and the CSS import rule.
- **v0.2:** commerce, storefront and template examples (from `patterns/**`). **v0.3:** the same sources build the registry at `/r/v{x.y.z}/`.

### 18.3 Storybook (internal workshop)

- **Storybook 10.6.2** with `@storybook/react-vite` (not `@storybook/nextjs`, which Storybook 11 deprecates), addon-vitest, addon-a11y, addon-themes and storybook-addon-pseudo-states.
- Stories are plain **CSF3** wrapping the same `*.example.tsx` modules plus edge cases. Docs never depend on Storybook and Storybook never depends on the docs, so either can be replaced alone (Ladle reads CSF3 as a fallback).
- Theme, motion and RTL toolbars set `data-nz-theme`, `data-nz-motion` and `dir` on the preview root.

---

## 19. Release, security, supply chain and OSS governance

### 19.1 Toolchain (registry-verified 2026-10-14; critique S-c)

| Area | Choice | Pin |
|---|---|---|
| Package manager | pnpm workspaces + catalogs | **12.11.2** exact via `devEngines.packageManager` (fallback 11.28.2) |
| Task runner | Turborepo (signed remote cache; release builds use `--force`) | 2.11.x |
| Library build | tsdown `unbundle`, ESM, `platform: 'neutral'`, `target: 'es2022'`, oxc `.d.ts` via `isolatedDeclarations` | **0.23.1** exact (pre-1.0; one shared preset; rolldown 1.2.13) |
| CSS build | Lightning CSS (nesting, `@custom-media`, minify; targets = the support floor; never lowers `light-dark()`) | 1.33.0 |
| TypeScript | TS 7.0.2 for typecheck; `@typescript/typescript6` 6.0.2 aliased only for tools that need the JS API | exact |
| Lint and format | oxlint 1.88 (type-aware, `jsx-a11y`, react, hooks, `no-restricted-imports`) + oxfmt 0.73; stylelint with our config (exact pin at setup; version not covered by the research) | exact |
| Compiler rules | A **narrow ESLint 10.12 job** running only `eslint-plugin-react-hooks` 7 on client leaves and adapters, through the `typescript6` alias | from v0.2, **non-blocking** until React Compiler phase 2 is scheduled |
| Engine | `react-aria-components` 1.22.1, `react-aria` 3.53.1 | caret |
| Tokens | `@terrazzo/cli` 2.8.0 (Style Dictionary 5.6.1 as the documented swap target); TokensBrücke 3.18.0 | exact |
| Icons | `lucide-static` 1.56.0, `simple-icons` 16.35.0, SVGO 4 | exact (build-time) |
| Tests | Vitest 5.0.4, Playwright 1.64.0, axe-core 4.14.0, expect-type 1.4.0, publint 0.3.25, attw 0.18.5, size-limit 14.2.0, knip 6.41.0 | exact |
| Docs and workshop | fumadocs-core and fumadocs-ui 16.17.2 (fumadocs-ui peers on its own core version; the fumadocs-ui pin and its release-age exclusion are builder default D-p, [§23.4](#234-builder-defaults-2026-10-14)), fumadocs-mdx 15.4.7, Next 16.4.0, Tailwind CSS 4.3.3 and Geist 1.7.2 in `apps/docs`; Storybook 10.6.2 | exact |
| Release | `@changesets/cli` 3.0.3 + `changesets/action` v2 sub-actions | exact |

**React Compiler output is not shipped in 0.x.** Compiled modules crash under the `react-server` condition (VERIFIED with React 19.3.0; react#31702 is open). Phase 2 may compile only `*.client.tsx` after benchmarks.

### 19.2 Release pipeline

**0.1.0 publishes by hand (decided 2026-10-15, M14).** The maintainer: "for no lets publish by hand, like we can make script if needed". Trusted publishing runs on GitHub Actions, which is off ([§1](#1-decisions-we-need-from-you)), so 0.1.0 does not go through `release.yml`:
- **Changesets** with the fixed group ([§5.4](#54-versioning-groups)) still decides the versions; prereleases use pre mode and the `next` dist-tag. Preview packages through pkg.pr.new wait for Actions.
- **A local release script**, written in W5–W6 (its path and name are set then), runs on the maintainer's machine from a clean checkout of `main` at the commit to publish. That commit already carries the version bumps: the maintainer runs `pnpm changeset version` and merges the result to `main` first, as the version PR would have done. In order: the full local gate (`pnpm check`, with `TURBO_FORCE=true` so no task replays from the shared cache); `pnpm pack` of each published package, which rewrites pnpm's `workspace:` and `catalog:` specifiers (`check:release` already packs this way, and its `--keep` flag leaves the tarballs it checked); `pnpm check:release` on those tarballs (allowlist, publint, attw, directive guard) and the shipped-runtime licence gate of [§19.3](#193-security) (`pnpm licenses list --prod` per package, which the pack job would have run); then `npm publish <tarball> --tag next` per package, in dependency order (`@nizivo/tokens` first), prompting for the npm 2FA one-time password for each. It publishes exactly the tarballs it checked, never a package folder: npm does not rewrite those specifiers. It stops at the first failure and prints what was and was not published. Tags (`<package>@<version>`) are created and pushed by the maintainer's owner account after the publish; the "tags created only by the release App" ruleset ([§19.4](#194-oss-governance)) is set up with the App, once Actions is back on.
- **No provenance in 0.1.0.** npm provenance needs a supported CI provider's identity, so a local publish cannot attest it. The 0.1.0 release notes say so.
- **No long-lived token.** The publish uses the maintainer's own npm login on the `neevtechnologies` owner account with 2FA (decision 9). No `NPM_TOKEN` and no 2FA-bypass token is created, in the repo or anywhere else; such tokens lose direct publish around January 2027 anyway.
- **Release gates** (unchanged, run by the script): no stable publish with an AA failure ([§15.4](#154-ownership-and-the-override-mechanism)), with an open "sync needed" issue ([§7.7](#77-drift-detection)), or with generator or exports drift.

**When Actions is turned back on**, trusted publishing and provenance return. The design below was the 0.1.0 path until M14; it now applies to the first release after Actions is back on:
- **npm trusted publishing (OIDC) only.** There is no `NPM_TOKEN` anywhere. Provenance is automatic for a public repo and public package. 2FA-bypass tokens lose direct publish around January 2027, so none are created.
- **`release.yml` uses split jobs** (select-mode → version → pack → publish). `id-token: write` is granted **only** to the publish job, which runs in a protected GitHub environment `npm` with required reviewers.
- A GitHub App token (`actions/create-github-app-token` v3, `client-id`) is used for the version PR (so CI runs on it) and for tags (so the tag ruleset passes).
- Publishing never runs from `pull_request_target` or `issue_comment` (npm rejects OIDC from them).
- **Trusted-publisher configs** name `release.yml`, environment `npm`, and explicitly allow `npm publish`; configs created after 2026-09-03 default to stage-only, and Changesets cannot do staged publishing. Unvalidated configs expire after **48 hours**. The plan bootstrapped each package at its **first** release (`npm stage publish` can create new packages since 2026-10-02); after a hand-published 0.1.0 the three packages already exist, so each config is added to an existing package and validated by the first OIDC publish that follows (the 48-hour window still applies).
- **Rehearsal** on a throwaway package before the first OIDC release: pnpm 12.11.2 `publish <tarball>` over OIDC through `changesets/action` v2 is UNVERIFIED end to end (critique S-b 6). pnpm 11.28.x is the fallback. It is no longer on the 0.1.0 path (M14).
- The same release gates apply.

### 19.3 Security

**CSP: two published profiles, tested in CI** (gap report B §B1; matrix VERIFIED in Chromium 156 and WebKit 27.2; Firefox UNVERIFIED):

| Profile | Policy | Guarantee |
|---|---|---|
| **A — full library** (documented default) | `style-src 'self' 'nonce-{N}'; style-src-attr 'unsafe-inline'; script-src 'self' 'nonce-{N}' 'strict-dynamic'; …` | Every component works. Client positioning and React Aria's `VisuallyHidden` use inline style attributes |
| **B — strict styles** | the same with `style-src-attr 'none'` | **All server-safe (T0) components, tokens CSS and charts' static output render correctly.** Engine parts are covered only when rendered client-only, until adapters replace engine inline styles (tracked per component) |

The rules that make Profile B true are enforced **from v0.1**; the A/B fixtures arrive in v0.3:
- A lint bans the `style` JSX attribute in every directive-free module, except pass-through of the consumer's own `style` prop.
- Server-rendered `style` attributes fail silently under a strict CSP, and hydration never repairs them. Data geometry therefore uses SVG presentation attributes, native `<progress>`/`<meter>`, `data-*` plus classes, and CSS grid tracks.
- `.nz-visually-hidden` is a class, never an inline style object.
- Nizivo injects no `<style>`. CSS ships as static files.
- React Aria's injected `<style>` (press `touch-action`, iOS overscroll) reads `<meta property="csp-nonce">`. Core CSS also sets the `touch-action` rule by `nz-` class, so a blocked injection loses nothing on desktop.

**Trusted Types and DOM sinks:**
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or string timers in library code (oxlint plus an ast-grep rule).
- The single exception is the server-only `ThemeScript`, which takes a `nonce` and has its SHA-256 published per release.
- Strings stay strings: nothing accepts an HTML string.
- A `require-trusted-types-for 'script'` fixture runs in v0.3, in Report-Only first.

**Dependencies and supply chain:**
- **Runtime dependency budget** (anything new needs an RFC): tokens none; react `react-aria-components`, `react-aria` (later `@internationalized/date`, `tinykeys`); icons none; charts `d3-shape`, `d3-array`.
- pnpm settings: `minimumReleaseAge: 4320`, `allowBuilds` (a deny list), `trustPolicy: no-downgrade` and `blockExoticSubdeps: true`. pnpm 12.11.2, which rejects unknown keys, accepted all four on 2026-10-14. W2 docs step (D-p, [§23.4](#234-builder-defaults-2026-10-14)): `allowBuilds` is `{ 'esbuild@0.28.2': false }`, not `{}`. pnpm 12 fails an install on any dependency script that `allowBuilds` does not list (`ERR_PNPM_IGNORED_BUILDS`), and `fumadocs-mdx` pulls in esbuild 0.28.2, whose postinstall only validates its platform binary; the JS API that fumadocs-mdx uses works without it. The explicit deny runs no script. The key names the exact version, so any new script, a new esbuild version's included, still stops the install; a bare `esbuild` key would deny every future version's script unreviewed. `strictDepBuilds: false` is never set, because it would skip every future script silently. `trustPolicyExclude` holds `undici-types@6.21.0`, a real provenance downgrade by the same maintainer, not a takeover. `fixtures/next/pnpm-workspace.yaml` copies all four keys.
- **Licence gates** (two scopes, because build tools the plan pins are not under the runtime allowlist: Lightning CSS, axe-core and `@axe-core/playwright` are MPL-2.0, and Next 16.4 in `apps/docs` and `fixtures/next` depends on `caniuse-lite`, which is CC-BY-4.0):
  - **Shipped runtime trees** of the published packages (`packages/{tokens,react,icons,charts}`): the allowed licences are MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, BlueOak-1.0.0, Unlicense and Python-2.0, plus written per-package exceptions (for example the optimize-locales plugin, whose `package.json` has no `license` field). Everything else fails, including GPL/AGPL/LGPL, SSPL, BUSL, PolyForm, CC-BY-NC and unknown. The gate is `pnpm licenses list --prod` per published package, in the pack job (for 0.1.0, in the local release script; M14, [§19.2](#192-release-pipeline)).
  - **Every PR:** `dependency-review-action` with `fail-on-severity: moderate`, `fail-on-scopes: runtime`, and the same `allow-licenses` list. Build tooling, `apps/**` and `fixtures/**` (never shipped) may also use MPL-2.0 and CC-BY-4.0 (and OFL-1.1 for `geist`, the font files the docs self-host), through `allow-dependencies-licenses` purls: `caniuse-lite` (a runtime dependency of Next in the docs app and fixtures), and `lightningcss` with its platform binaries, `axe-core` and `@axe-core/playwright` in case the licence check also sees development scopes (UNVERIFIED for pnpm lockfiles). Purl wildcard support is UNVERIFIED, so platform binaries are listed one by one. W1: every Next tree also pulls in `@img/sharp-libvips-*` (LGPL-3.0-or-later) through Next's optional `sharp` dependency (used only by `next/image` optimisation). Each Next tree therefore sets `ignoredOptionalDependencies: [sharp]`: `fixtures/next/pnpm-workspace.yaml` does, and so does the root `pnpm-workspace.yaml` since `apps/docs` exists (no `sharp` or `@img/*` package is in the lockfile). A tree that needs `sharp` lists those purls here instead.
- OpenSSF Scorecard; SHA-pinned actions; `permissions: {}` by default; `persist-credentials: false`.
- **GSAP is banned** (its licence is not OSI-approved) through `no-restricted-imports` and the allowlist.
- A **tarball content allowlist** (`dist/**`, `LICENSE*`, `THIRD_PARTY_NOTICES*`, `README.md`, `package.json`) fails on any image, font, `.glb` or `.env*`. Published `package.json` files have no lifecycle scripts. W2 (`packages/tooling/release/tarball.ts`, run by `pnpm check:release`): the allowlist names exact files instead of globs (`LICENSE`, `README.md`, `package.json`, and `THIRD_PARTY_NOTICES` for `@nizivo/react` only); a README is allowed but not yet required, and neither package ships one.
- **SBOM and attestation (v1.0):** `pnpm --filter <pkg> sbom --sbom-format cyclonedx --prod` in the pack job (whether it includes licence fields is UNVERIFIED; the fallback is `@cyclonedx/cdxgen`), attached to the GitHub Release and attested with `actions/attest@v4` on the publish job only.
- **Registry (v0.3):**
  - immutable `/r/v{major}.{minor}.{patch}/{name}.json` URLs plus a short-TTL moving alias;
  - built and attested in CI only, with a pinned `shadcn build`;
  - a SHA-256 manifest;
  - an item-policy linter: only `@nizivo/*` dependencies, at `~x.y.0` of the release that built the item (exact pins would flip or downgrade the consumer's core when items from different releases are added); `<name>-source` fork items only for components without an engine; no `envVars`, no foreign `registryDependencies`, file targets confined to component, hook or lib directories; item source under MIT (decision 5).
- **Assets:** the `ASSETS.md` provenance ledger; CI fails on any binary under `apps/**/public` or `registry/**` without an entry. A lint fails on the string `grove` in shipped code.

### 19.4 OSS governance

- **Licence:** decision 1 (Apache-2.0 recommended) + `TRADEMARKS.md` + **DCO** sign-off (lower friction than a CLA; Apache §5 already licenses inbound contributions). No `NOTICE` file, so §4(d) never applies; §4(b) change notices still apply to modified files, which is why registry item source (`patterns/`) is MIT (decision 5).
- **Community files:** Contributor Covenant 3.0; `SECURITY.md` with GitHub private vulnerability reporting and a supported-versions table; YAML issue forms (bug, a11y, component request, docs); `CODEOWNERS` per package; `rfcs/` with a 7-day final comment period; `GOVERNANCE.md` (company-led, open contribution, lazy consensus, path to committer) by v1.0.
- **Repo rulesets on `main`:** PR + code-owner review, required checks, merge queue, linear history, tags created only by the release App (from when Actions is back on; the 0.1.0 tags come from the owner account, M14, [§19.2](#192-release-pipeline)).
- **Renovate:** `minimumReleaseAge` 3 days (mirrors pnpm); `helpers:pinGitHubActionDigests`; Dashboard approval for tsdown, pnpm and TypeScript minors; one group for `react-aria*`. Dependabot does not support pnpm 11/12.
- **Stability tiers** (in docs and type JSDoc): **stable** (semver); **`unstable/*`** (no semver); **preview** (dark mode in v0.1); **provisional** (the `lg` breakpoint; Dialog `sm` and `lg` widths).
- **Deprecation:** `@deprecated` JSDoc plus a dev-only console warning; removal no earlier than the next major and at least 6 months later; codemods when mechanical.
- **LTS (from 1.0):** the previous major gets security and a11y fixes for 12 months.
- **Seam ledger** ([§4.2](#42-seam-ledger)) and this decision log ([§23](#23-decision-log)) live as ADRs in `docs/adr/`.

---

## 20. Figma ↔ code workflow

### 20.1 Token sync on the current plan

**One sync (v0.1):**
1. The designer edits the library's variables, styles or effects in Figma (the `Nizivo *` collections, renamed from `Grove *` on 2026-10-14) and publishes the library.
2. The designer runs **TokensBrücke** with the exact settings in `packages/tokens/figma/tokensbruecke.settings.md` (DTCG 2025.10, split modes, styles and metadata included).
3. The designer uploads the exported folder through the GitHub web UI to a new branch under `packages/tokens/figma/raw/`, and opens a PR. No token is pasted into Figma.
4. While GitHub Actions is off ([§1](#1-decisions-we-need-from-you)), an engineer checks out the branch, regenerates `src/figma-owned/**` and the goldens, runs `pnpm check` locally and writes in the PR what changed (`packages/tokens/figma/tokensbruecke.settings.md`, "checking a sync branch"). Once Actions is back on, CI runs the normalizer, the build, `tz check`, the contrast matrix, the override checks, golden diffs and visual regression, and posts the token-diff comment, which flags removed or renamed public names as breaking.
5. An engineer reviews the code-facing impact and the designer reviews the visual diff. Merge, then add a changeset.

**The first sync after the rename** carries `Nizivo *` collection names and `Nizivo/*` style names. The normalizer accepts both prefixes byte-exactly, so `src/figma-owned/**` changes only by the new `--nz-elevation-0` token from `Elevation/0 Flat`. On the designer path (step 3) the old `Grove …` files in `figma/raw/` are deleted on that PR branch first, or the normalizer stops on a collection under both prefixes; the engineer path's `raw.ts` clears the folder itself. The same PR updates the normalize test and three goldens, each by the one `--nz-elevation-0` entry; the token builds flat, with no dark-mode ring (decided 2026-10-14, D-m, [§7.1](#71-pipeline-figma--dtcg--outputs)). Once it merges, the `Grove` allowlist is removed.

**Later upgrades:**
- The plugin's push-to-PR with a Neev bot account, once fine-grained PAT support is confirmed (UNVERIFIED).
- A daily scheduled GitHub Action compares the file's latest version with the last export's `createdAt` (the export carries no version id) and opens a "sync needed" issue ([§7.7](#77-drift-detection)). The file is on Professional (decision 3), so the REST call is within limits; it needs a read-only Figma token as a repo secret. Releases are blocked while that issue is open. A `LIBRARY_PUBLISH` webhook would need a hosted relay, so it is not used under the zero-spend constraint.
- **Never poll a file on a Starter team** (6 requests a month there).
- **Engineer fallback:** a read-only Figma MCP `use_figma` snapshot converted by the TokensBrücke CLI (`pnpm tokens:raw`). Week 1 used 9 calls: an inventory call, Primitives and Color split in two each to keep every return small, Space, Motion and Responsive one each, and the text and effect styles together, within the Professional seat's 200 calls/day. It is human-triggered and never in CI, because the remote MCP server is OAuth-only.
- **Code → Figma:** an optional `figma-push` script writes override proposals to a Figma **branch**. Merging the branch closes the loop through a normal sync. (The one-off rewrite of all 175 `codeSyntax.WEB` values to `var(--nz-…)`, so Dev Mode shows real names, was not "later": it ran with the rename on 2026-10-14, [§20.3](#203-hygiene-contract-between-design-and-engineering).)

The v0.1 exit requires at least one real sync merged end to end.

### 20.2 Component map instead of Code Connect

- Custom Code Connect needs an Organization or Enterprise plan, which Neev does not have (critique S-d). We do not plan on it.
- `component.json` records each component's Figma ids: the canonical on-canvas set **and** the ghost or live masters (critique C25; for example Nav Item's live set is the off-canvas `755:658`, not the `7275:14700` page copy). `nz gen` writes `design/component-map.json`: Figma ids → export, props mapping, docs URL and Storybook URL.
- The map is surfaced to designers through Figma component descriptions that link to the docs page (and Dev Mode dev-resource links on Professional), and to agents through `AGENTS.md`.
- **After an Organization upgrade,** the map converts mechanically to `*.figma.tsx` Code Connect files.

### 20.3 Hygiene contract between design and engineering

| Rule | Owner | When |
|---|---|---|
| Only `Grove *` or `Nizivo *` collections and `Grove/*` or `Nizivo/*` styles are read (the normalizer allowlists them; both prefixes map to `nz`); the 10 leftover collections (nine named `<Brand> Tokens`, from Clario to Ardenfield, plus `Pipkin Soft`) and their 138 text styles are ignored, and removed from any Community copy | engineering / design | now |
| Rename collections and styles Grove → Nizivo in the source file, and rewrite all 175 `codeSyntax.WEB` values to `var(--nz-…)` (a one-off engineer script, reviewed by design) | the builder, through `use_figma` (M10); the file title: the maintainer | **Done 2026-10-14** (M10): 175 code syntaxes now read `var(--nz-…)`, and the 5 collections, 18 text styles and 10 effect styles carry the `Nizivo` prefix. **Title done** (reported 2026-10-15, M16): the maintainer renamed the file to "Nizivo UI Library" by hand (the Plugin API cannot); the file key is unchanged. The normalizer accepts both prefixes until the first post-rename sync merges, then the `Grove` allowlist is removed. Tokens and overrides key on Figma variable ids, so the rename orphans nothing |
| Variant names stay Figma names (Primary, Secondary, Tertiary, Critical, Accent; Surface/Subtle/Inverse); renames go through a deprecation | both | always |
| Bind hard-coded values to variables (Button Lg height, stroke weights, the Primary effect, Switch track, scrim) | design | rolling, tracked in [figma-handoff.md](figma-handoff.md) |
| Give Motion variables (all 20 have empty scopes) proper scopes; W1 found Color, Space and Responsive already scoped, and Primitives empty as intended | design | v0.2 |
| Relink ghost masters to the canonical sets | design | **not on the critical path**; a v1.0 / Code Connect prerequisite. The map keys both ids until then |
| Missing states (Focus, Disabled, Loading, Error, Accent Pressed, Mobile Tab Bar Active) | design | rolling; code builds them from tokens meanwhile and lists them on the deviations page |
| A component whose Figma set is unchanged for **two sync cycles** becomes a candidate for promotion from `unstable/*` to stable | both | from v0.2 |
| Design sign-off: light renders of Button, Input, Select and Dialog (v0.1); rendered dark pages 02, 04, 06 and 07 (v0.2, to make dark stable) | design | gates |
| A cleaned Figma Community copy (foreign collections stripped, remaining "Grove" copy and demo strings removed, cover, Getting-started and Changelog pages, version stamp), published from a Neev team profile under CC BY 4.0 | design | v1.0 |

---

## 21. Roadmap

**Team (decision 7, decided 2026-10-14):** Claude Code builds; the maintainer reviews, merges and does the steps that need a human account. The week numbers below were sized for the original assumption (2 front-end engineers, a designer at about 50%, one engineer as accessibility owner). They now give the **order** of work, not a calendar. The generator, the token pipeline and React Aria carry most of the load. If the work runs long, the ordered cut line applies.

### 21.1 v0.1 — "Foundations, forms and core overlays" (≈ 6 weeks + 2 weeks buffer; dist-tag `next`)

**Week 0 — owners outside engineering** (status 2026-10-15):
1. ~~Confirm which team owns the Figma file~~ **Done:** "Vampire D Studio", Professional; the file stays (decision 3).
2. ~~Decide the licence~~ **Done:** Apache-2.0 (decision 1).
3. ~~Decide the GitHub repo and npm operator~~ **Decided:** `theneev/nizivo`, public (decision 9). **Done 2026-10-14:** the `theneev` account created the empty public repo, added `amnn-in` as a collaborator (write access) and enabled private vulnerability reporting; the code of conduct names theneevteam@gmail.com for reports. ~~**Open:** the npm owner sets up a trusted publisher for a throwaway package on npmjs.com, and we **rehearse an OIDC publish** with it.~~ **Off the 0.1.0 path (2026-10-15, M14):** 0.1.0 publishes by hand through the local release script, so the trusted-publisher setup and the OIDC rehearsal wait until Actions is turned back on ([§19.2](#192-release-pipeline)).
4. **Week 1 is not blocked on design:** Claude Code takes the first real export through the engineer path ([§20.1](#201-token-sync-on-the-current-plan)): a read-only `use_figma` snapshot (9 MCP calls in week 1, within the Professional seat's 200 a day), converted by the TokensBrücke CLI (`tokens-bruecke` 3.18.0). **Done in week 1.** The normalizer is therefore tested on real TokensBrücke output, not invented output (R7). **Open, before v0.1 exit:** the designer runs the TokensBrücke **plugin** once with the settings in `packages/tokens/figma/tokensbruecke.settings.md` and uploads the export, proving the designer path (exit criterion 8).
5. **Open, no date yet:** hold the design decision meeting with Dayitava, the design contact, who holds the design-system lead and accessibility owner roles for it (M15): [figma-handoff §6](figma-handoff.md#6-questions-for-designers) Q2–Q10, Q12, Q34 and Q35, plus figma-handoff §1.3 asks #3 and #4, the open §1.4 asks #3, #4 and #7, and the §1.5 asks ([figma-handoff §1.5](figma-handoff.md#15-asks-from-week-2-2026-10-14)). (This covers Reduced fades, the text ladder, the token asks, the `lg` threshold, sidebar widths and mobile navigation needed by the start of v0.2, toast persistence, KPI tint, Card rest elevation, the neutral and success progress fills, `bg/accent-pressed` and the Glass backdrop.) Q20 is answered (12 px allowed). **Resolved 2026-10-14 by the maintainer:** the Grove → Nizivo rename and `codeSyntax` rewrite (applied; M10), `Elevation/0 Flat` (kept with an invisible shadow; M11) and the `spring()` order (Q1 accepted; M12). Inverse inside inverse (Q36) is set aside while the design has no nested case and reopens if one does (D-e). Until the meeting, every open question runs on its §1 default; (e) and (f) are the most urgent because weeks 1–2 build on them.
6. ~~**Open, the maintainer:** rename the Figma file from "Grove UI Library" to "Nizivo UI Library" in Figma's File menu.~~ **Done** (reported 2026-10-15, M16): the maintainer renamed it. The Plugin API cannot rename a file, so the 2026-10-14 rename script had left the title unchanged (figma-handoff §2.1). The file key is unchanged, so links that carry the old `Grove-UI-Library` slug still open it; the docs now use `Nizivo-UI-Library`. The file's version history keeps the pre-rename state.
7. **Open, the maintainer:** choose the issue tracker, GitHub Issues or a Linear workspace with an MCP server scoped to this project (offered 2026-10-15). Override `issue` fields accept either ([§15.4](#154-ownership-and-the-override-mechanism)).
8. **Later, the maintainer:** the docs DNS `CNAME` record at neevtechnologies.in, before the hosting step ([§18.2](#182-docs-site-public)).
9. **Open, Dayitava:** a GitHub username for CODEOWNERS and `approvedBy` ([§15.4](#154-ownership-and-the-override-mechanism)).

**Not on the critical path:** ghost relinking (the component map keys both ids).

| Week | Work |
|---|---|
| W1 — de-risk first | A **real** TokensBrücke export through the normalizer (both prefixes, variable-id identity, golden-tested) and Terrazzo (`only.modifiers` + `exclude`; typography output names); the one-off `codeSyntax` rewrite script for the Grove → Nizivo rename. **Compile** the Select, Dialog and Tooltip adapter skeletons against React Aria 1.22.1 types (render-prop fields, `SelectStateContext`, portal container). Rebuild the S2 fixture on the **generated** barrels (both bundlers, hydration recorded). Run the S1 nesting matrix and the halo/inverse probe on **Firefox 129 and Safari 17.5** (floor lane), including `@starting-style` overlay entry. Monorepo, presets, and a **minimal** `nz gen` (barrels, `engine.ts`, exports, component map). Port the spring generator |
| W2 | Token pipeline (light-dark, typography, spring, a11y overrides and proposals, contrast matrix, golden files; `tokens.json` and the js-refs `.` entry move to W3–4). `css/base.css` (a11y floor, including `focusTarget` and `stateIndicator` rules). stylelint contract, emitted-CSS vocabulary check, Lightning CSS guard. Server-safe components. Then, as a separate small step right after W2: the Fumadocs skeleton with generated tables (a local static build only; no Pages configuration and no workflow file while Actions is off) |
| W3–4 | Field system and controls; NativeSelect. The React Aria `OverlayEngine` and `engineDom`, then adapters for Tooltip, Dialog and Select, then Menu and Tabs, each with conformance. `@nizivo/icons` generator |
| W5 | Next, Vite and Astro fixtures on the packed packages ([§18.1](#181-test-layers)). `size-limit` at measured + 10%; seam cost measured. Deviations page. In-repo visual regression. ~~`release.yml` wired~~ The local release script (M14, [§19.2](#192-release-pipeline)): full gate, pack, `check:release`, then `npm publish` per package with the 2FA prompt |
| W6 | Hardening; design review of light renders; publish 0.1.0 on `next`, by hand through the local release script (M14) |
| +2 weeks | Buffer |

**Week 1 status (2026-10-14).** Built and verified:
- **Tokens:** the real Figma export (9 read-only `use_figma` calls, TokensBrücke CLI 3.18.0) through the normalizer (both prefixes, variable-id identity, golden-tested) and a Terrazzo 2.8.0 dry run: 11 source files, 200 tokens, `tz check` clean. Emitted names, TokensBrücke limits and open items: `packages/tokens/figma/DRY-RUN.md`. The `codeSyntax` rewrite was planned in week 1 and applied to the Figma file on 2026-10-14, together with the Grove → Nizivo rename of collections and styles (M10; figma-handoff §1.4 #1).
- **Code:** minimal `nz gen` (barrels, `engine.ts` from `<Name>Engine`, exports, component map), the spring generator, Button, and Select, Dialog and Tooltip on React Aria 1.22.1 with `engineDom` and `stateAttrs()`. `packages/react` ships a `THIRD_PARTY_NOTICES` file for its inlined glyphs, and a unit test checks it ([§14.2](#142-icons-nizivoicons)).
- **Floor lane** (`fixtures/floor-lane/RESULTS.md`): Firefox 129.0 passes the S1 nesting matrix, the halo/inverse probe and `@starting-style` overlay entry on the token path. It records Deviations page entries D1 and D2 ([§18.2](#182-docs-site-public)) and the inverse-inside-inverse gap ([§7.4](#74-theme-mechanism)). Safari 17.5 is not tested.
- **Next fixture** (`fixtures/next/RESULTS.md`): on the packed packages (the unpacked `pnpm pack` output, [§18.1](#181-test-layers)) and the generated barrels, Turbopack, webpack and webpack + `optimizePackageImports` all pass (Chromium). Plain webpack reproduces the S2c barrel leak and `optimizePackageImports` removes it, as [§11.1](#111-per-framework-setup-and-gotchas) says.
- **Exit criteria:** advances 2 (the Next part, under all three builds; Vite, Astro, axe and no theme flash are W5) and 6 (Firefox 129 floor verified; Safari 17.5 not tested; the free routes are in criterion 6). It partly advances 3: exports drift through `nz gen --check`, and the `.d.ts` import-graph walk from every `types` entry (`packages/react/test/built`). The committed raw export is one of criterion 12's R3 mitigations.
- **Moves to week 2:** `tokens.css` with `light-dark()`; the spring `linear()` transform; the `--nz-tracking-*` rename through `subValueVariableName` with an `em` transform; font-family tokens; the Lightning CSS build replacing the interim tsdown CSS copy; the tarball allowlist, publint/attw and the directive guard; a `defaultOpen` fixture page; Select Group and Separator coverage in the fixture. All of these landed in week 2.

**Week 2 status (2026-10-14).** 13 commits, each of which passes the full local gate (`pnpm check`) from a clean state; GitHub Actions stays off, so no CI run was involved. Built and verified:
- **Tokens:** the `@nizivo/tokens` build runs tsdown, `tz build` and the a11y gate, and writes `tokens.css` (one `light-dark()` declaration per semantic colour on `:root`, no `@property`), `custom-media.css`, `tailwind.css` and `contract.json`, each pinned by a byte golden. Typography is a `font` shorthand per style plus `--nz-tracking-*` in em; the font families are code-owned; the spring `linear()` pairs come from the one generator in the (mass, stiffness, damping, velocity) order the maintainer accepted (M12). The contrast matrix (`packages/tokens/CONTRAST.md`) has **58 checked pairs (29 per theme), all passing**, with **14 overrides and 19 proposals, all expiring 2027-01-31**, plus the drift, redundancy, expiry and metadata checks. The gate also runs uncached as `pnpm check:a11y` ([§15.4](#154-ownership-and-the-override-mechanism)).
- **CSS:** the Lightning CSS build (`packages/react/scripts/build-css.ts`) compiles **24 stylesheets** (23 components and `base.css`) to the browser floor, guards the output, and checks the emitted CSS against the vocabulary and the real `tokens.css` (425 token reads and 95 hooks, no missing name). **Every stylesheet is under the 2 KB gzip leaf target; the largest, `button.css`, is 1,013 bytes gzip** (`packages/react/W2-RESULTS.md`). `nz gen` writes `styles/base.css`: the a11y floor from `interactive`, `focusTarget` and `stateIndicator`, then `.nz-visually-hidden` in `nz.utilities`. `@nizivo/stylelint-config` carries the contract rules, `declaration-no-important` and `keyframes-name-pattern` ([§8.4](#84-component-css-hooks)).
- **Components:** the server-safe (T0) set: Text, Heading, Stack, Inline, Grid and GridItem, Container, Separator, Kbd, Image, Badge, Card, Delta, ProgressBar, ProgressRing, Meter, Skeleton, EmptyState, InlineError, and Alert with its `AlertDismiss` client leaf, one subpath each (D-h). `packages/react/test/ssr/t0.server.test.tsx` loads all **19 T0 entries** and renders their examples under React's `react-server` build, with Alert's dismiss leaf the only client module allowed; `render-all.test.tsx` renders all 27 examples against the vocabulary. Card has `padding` and `elevation`, Skeleton has `shape`, and the eight attributes behind them join the `presentational` group (D-j). Button renders no children when it has nothing to show ([§8.2](#82-class-slot-and-naming-conventions)).
- **Fixtures** (`fixtures/next/RESULTS.md`): all 13 Next pages pass under Turbopack, webpack, webpack + `optimizePackageImports` and `next dev`, with 0 console messages. `/t0` (subpaths) and `/t0-barrel` (root barrel) ship no `@nizivo` client module in any build, and `/alert-dismiss` ships only Alert's dismiss leaf. New pages also cover a Dialog and a Tooltip open on the server, Select groups and separator, and a server Button composed into `Select.Trigger`.
- **Floor lane on the real `tokens.css`** (`fixtures/floor-lane/RESULTS.md`, `results/w2-real-tokens/`): Firefox 129.0 passes every token-path check. Its 166 failures are all D1 probes that write `light-dark()` directly on the property, the same cells as in week 1. Chromium 156 and WebKit 27.2 have 0 failures. Safari 17.5 is still not tested.
- **Release checks:** `pnpm check:release` packs `@nizivo/tokens` and `@nizivo/react` and runs the tarball allowlist, publint (strict), attw (esm-only) and the directive guard, with its `export * as` lint, on the tarballs. It is the last step of `pnpm check`.
- **Figma:** the Grove → Nizivo rename and the `codeSyntax` rewrite were applied to the file (M10), and `Elevation/0 Flat` was fixed (M11).
- **Exit criteria:** advances 3: every check it names now exists and passes in the local gate (directive guard and `export * as` lint, emitted-CSS vocabulary check, Lightning CSS guard, exports drift, publint/attw, `.d.ts` walk); CI itself is off. Advances 7 in part: the matrix passes with the overrides; listing them on the Deviations page is W5. Advances 2 for the T0 set: the planted-marker rule holds for every T0 component through subpath and barrel, in Next only (Vite, Astro, axe and theme flash are W5). Advances 6: the floor lane runs on the shipped `tokens.css` (Firefox 129 verified; Safari 17.5 not tested). Not advanced: 14. Builders took Chromium forced-colours screenshots during review, but none is committed or reviewed by the accessibility owner, and the solid-outline check does not exist yet.
- **Moves:** the Fumadocs skeleton with generated tables goes to a separate small docs step right after week 2: a local static build only, with no Pages configuration and no workflow file while Actions is off (done: see the docs skeleton status below). `tokens.json` and the js-refs `.` entry of `@nizivo/tokens` (an empty module today) go to W3–4, before 0.1.0. A floor-lane page that renders the T0 component CSS on Firefox 129, Chromium and WebKit with computed-size checks, and forced-colours screenshots of the T0 set, go to W5 with visual regression and exit criterion 14. ProgressRing's `stroke` paint ([§8.5](#85-the-a11y-floor-nzbase)) goes to a follow-up. Safari 17.5 is still not tested. Also open: the `close` and `circle-x` glyphs with the Feather MIT notice ([§14.2](#142-icons-nizivoicons)); `ThemeScript` setting `data-nz-platform` before first paint (Kbd shows Ctrl spellings on Apple devices until then); READMEs for the published packages before 0.1.0; the rest of the `nz.utilities` classes; whether `AlertDismiss` keeps its export once `IconButton` exists, decided before 0.1.0 ([§9.5](#95-per-component-tier-table-core)).

**Docs skeleton status (2026-10-14).** The separate docs step after week 2 is built and passes the full local gate (`pnpm check`, which now ends with `pnpm docs:check`) from a clean state. Nothing is hosted. The measured numbers are in `apps/docs/RESULTS.md`.
- **Site:** `apps/docs` (`@nizivo/docs`, private): fumadocs-core and fumadocs-ui 16.17.2 and fumadocs-mdx 15.4.7 on Next 16.4.0 (Turbopack), a static export (`output: 'export'`, `images: { unoptimized: true }`, trailing slashes) in `apps/docs/out`. 46 routes (Next's build counts 47 static pages): the home page, 41 docs pages (introduction, 4 getting started, 8 foundations, the components overview, 23 component pages, 3 utility entries and Deviations), a 404 page in the site's tokens, the static search index, `llms.txt` and `llms-full.txt`. The chrome is Fumadocs UI on Tailwind CSS 4.3.3, themed by Nizivo's tokens; Geist is self-hosted through `next/font/local`. An inline `<head>` script sets the `dark` class and `data-nz-theme` before `<body>` exists, standing in for `ThemeScript`.
- **Generated pages:** a new subpath gets its page with no hand edit. `apps/docs/scripts/generate.ts` reads the exports map and writes one route per component (D-n). Every table comes from `contracts/api`, `component.json`, `design/component-map.json`, `contract.json` or the examples; `apps/docs/content/components/<name>.mdx` adds optional prose and the keyboard map (Select, Tooltip and Dialog traced to react-aria 3.53.1). The Deviations page lists the 14 overrides with their expiry, the 19 proposals, D-i, the week 2 "builder decides" items each with the value the stylesheet ships (`apps/docs/lib/builder-choices.ts`; the build fails when an item has no recorded choice or the cited declaration has left its stylesheet), D1, D2 and the Safari 17.5 status. Plan citations such as §12.2 in the API records link to their section here.
- **API records:** `nz api` (`packages/tooling/api`; the format is `API-JSON.md`, the types `schema.ts`) writes `contracts/api/**`, 51 files, from the built packages (D-o). The root `pnpm gen:check` builds `@nizivo/react` and runs `nz api --check`.
- **Build and check:** `pnpm build` builds the site as the Turbo task `@nizivo/docs#build` (outputs `out/**`; its inputs add `contracts/api/**`, the examples, `component.json`, the code-owned token files and this plan, checked with `turbo --dry=json`; the `@nizivo/tokens` build output reaches its hash through `dependsOn: ["^build"]`); `@nizivo/docs#typecheck` caches the files it generates (`.source`, `.generated`, the component routes, `next-env.d.ts`, `.next/types`), because the type-aware lint reads them. `pnpm docs:check` serves `out/` and runs `apps/docs/scripts/smoke.ts` in Playwright Chromium: every page answers 200, logs no console error or warning, hydrates, makes no request outside the local server and has 0 axe violations (WCAG 2.2 A/AA tags) in light; dark is reported, and is also 0. axe's best-practice rules are reported. It also checks, at 375 px in the dark pass, that no table, code block or preview is cut off without a scroller (WCAG 1.4.10; every generated table sits in a focusable, named scroller), that no raw Markdown shows outside code, the 404 status, which Nizivo client modules each page loads, the theme switch (Light, Dark and System) and the no-flash script, nested and inverse scopes, the Tailwind `nz` utilities, Select, Tooltip and Dialog by keyboard, a selected Select option in forced colours, the skip link, the mobile drawer (modal while open: the page is inert, Escape closes it and focus returns), and offline search, which returns focus to its button on Escape. Turbo's global dependencies now name `contracts/layers.css` and `contracts/vocabulary.json` instead of `contracts/**`, so an `nz api` run no longer invalidates every cache.
- **Performance and offline:** the JavaScript on every page is Next, React and Fumadocs (199 KiB gzip on the home page, 215 KiB on the server-only Badge page). A Nizivo client module loads only where an example renders one, and only its own: Alert's dismiss leaf, Tooltip (233 KiB), Dialog (273 KiB) and Select (283 KiB, with React Aria). The search engine and its index load on the first search. A cold build passes with outbound network denied by `sandbox-exec`, so the build makes no network call.
- **Exit criteria:** advances 10 (every page it names exists and builds; nothing is live), 7 (every override is on the Deviations page with its expiry, locally) and 9 in part (the `contracts/api` manifests exist).
- **Deferred:** hosting (the Pages configuration, the deploy workflow and the DNS `CNAME` record at neevtechnologies.in) waits for the maintainer and for Actions; the maintainer adds the DNS record later, before the hosting step (2026-10-15). "Open in StackBlitz" waits too, because it calls an external service ([§18.2](#182-docs-site-public)). Storybook ([§18.3](#183-storybook-internal-workshop)) is not started. The Vite and Astro pages stay drafts until their W5 fixtures. The docs checks run in Chromium only: Firefox 129 and Safari 17.5 are not run, forced colours is checked for Select's selected option only, and reduced motion was checked once by hand (the Fumadocs drawer and dialogs drop their animations). `ci.yml` does not run `docs:check` yet. Unstable entries get a page section once one exists, and `ThemeScript` replaces the inline script when it ships.

**Week 3 status (2026-10-14).** The first half of W3–4: the Field system and form controls, NativeSelect and IconButton, built by three builders on a shared Field contract and integrated into one tree that passes the full local gate (`pnpm check`) from a clean state with `TURBO_FORCE=true` (142 s). GitHub Actions stays off. Measured numbers: `packages/react/W3-RESULTS.md`. **Review pass (2026-10-15):** a three-reviewer pass (a11y and forms, design and CSS, architecture and SSR) raised 23 findings; the fixes (focus after the inline error renders, SegmentedControl's single Tab stop in Chromium, the forced-colours Switch thumb, NativeSelect wired when placed directly in a Field, `--nz-focus-halo-critical`, `aria-keyshortcuts`, nz api roots through builders) and the open items (D-q, D-aa, D-ab) are in W3-RESULTS.md, and the gate passes again from clean (128 s) before the week is committed.
- **Components (11 new subpaths, 34 in all):** `field` (Field, `useFieldControl`) and `fieldset` (D-r); `input`, `textarea`, `checkbox`, `radio-group` (RadioGroup, Radio), `switch` and `segmented-control`, each a thin client leaf over native inputs with no engine (D-t, D-u); `native-select` (server, D-x); `icon-button` (server shell, default tooltip leaf, D-v); `theme-script` (`data-nz-platform` only, D-z). Field is a server shell that hands serialisable props to one client leaf, FieldScope, which owns the context, native validation messages and the whole anatomy; the function child is the zero-JS path (D-q). Controls follow `packages/react/src/field/FIELD-CONTRACT.md`. Tooltip gained `content` and `shortcut` (D-d), and its skin now follows the Figma master. Textarea grows with its content where `field-sizing` is supported (D-w).
- **Glyphs and licences** ([§14.2](#142-icons-nizivoicons)): `circle-x`, `close`, `check` and `minus` are inlined, all four Feather-derived; `THIRD_PARTY_NOTICES` carries the Feather MIT notice and `notices.test.ts` checks every glyph by its Lucide name. `InlineError`'s `icon` and `AlertDismiss`'s `children` default to them; `AlertDismiss` keeps its export (decided before 0.1.0).
- **Generated and contracts:** `nz gen` wrote the exports, barrels, `base.css` (focus, `touch-action` and forced-colours rules for every new interactive slot and state indicator) and 10 new `design/component-map.json` entries; the `nested-input` focus rule now also matches `[data-focus-visible]` ([§8.5](#85-the-a11y-floor-nzbase)). `nz api` wrote the records for every new subpath. The Lightning CSS guard accepts one property beyond the floor, `field-sizing`, and only inside `@supports (field-sizing: …)` (`SUPPORTS_GATED_PROPERTIES`). The vocabulary needed no new attribute; `data-orientation` and `data-focus-visible` name their new users.
- **Contrast:** 62 checked pairs (31 per theme) pass, with the same 14 overrides and 19 proposals; the new pairs cover the checked fills, the Switch tracks and thumb, a control border in a selected row and the pressed IconButton edge. No Figma colour failed.
- **Server safety:** `t0.server.test.tsx` now covers every `tier: "server"` manifest (25), on the shared RSC helper that replaces client leaves with client references and checks that every prop crossing into one serialises; each client-tier control proves the same in its own test file. A race in that helper (the mocked React not yet in place, about one run in three) is fixed for every test.
- **Next fixture** (`fixtures/next/RESULTS.md`): 18 of 18 pages pass under Turbopack, webpack, webpack + `optimizePackageImports` and `next dev`, with 0 console messages. A server form wires every Field in the server HTML, validates inline after hydration, and submits natively with JavaScript off; NativeSelect alone ships no client module; IconButton's tooltip shows on focus without describing the button; `ThemeScript` in `<head>` hydrates cleanly. **Measured:** a leaf that a server shell imports but the page does not render (FieldScope behind a function child, IconButton's tooltip behind `tooltip={false}`) runs no code anywhere, but Turbopack and `next dev` still ship it; production webpack does not ([§9.5](#95-per-component-tier-table-core), [§16.1](#161-forms-gap-report-a-d16)).
- **Docs:** 53 pages pass `pnpm docs:check` (no console message, axe WCAG 2.2 A/AA clean in light and dark, 375 px reflow, and each page loads only the Nizivo client modules its examples import). Each new component has a generated page with its examples, tables and an Accessibility section whose keyboard map comes from the native element or React Aria. The Deviations page lists all 29 week 3 values Figma leaves to the builder ([figma/12 §5](figma/12-w3-forms.md)), each checked against the declaration that ships it, and the docs site's head script now ends with `themeScript`.
- **Floor lane** (`fixtures/floor-lane/RESULTS.md`): a new page on the shipped CSS passes 20 of 20 checks in both OS schemes on Firefox 129.0, Chromium 156 and WebKit 27.2: `field-sizing` behind `@supports` (Firefox 129 keeps `rows`), `:has()` inside `:is()`, `1lh`, `:dir(rtl)` with `translate`, `:checked` and `:indeterminate` on `appearance: none` inputs, and the nested-input focus rule. Safari 17.5 is still not tested.
- **Browser lane:** `pnpm --filter @nizivo/react test:browser` (Vitest browser mode, Chromium) runs 57 hydration, validation, keyboard and geometry tests; it is not part of `pnpm check`. Builders also ran it in WebKit; Playwright's Firefox does not launch on this machine.
- **Exit criteria:** advances 2 for the week 3 set in Next only (zero console messages and zero hydration warnings in all four modes; the server-only NativeSelect page ships no client chunk; Vite, Astro, axe in the fixture and no theme flash stay W5). Keeps 3 green with every new subpath, and extends the Lightning CSS guard. Advances 4 in part: axe is clean on every new docs page in light and dark, but there are no stories yet. Advances 6: Firefox 129 passes the week 3 CSS; Safari 17.5 not tested. Advances 7: the matrix passes with the overrides, and the Deviations page now lists the week 3 builder values too. Advances 9 in part: `contracts/api` covers all 34 subpaths; `size-limit` is W5, and W3-RESULTS.md is its baseline. Advances 10 in part: every new page builds locally; nothing is live. Advances 14 in part: the browser lane asserts a solid outline on Input, Textarea, NativeSelect and a SegmentedControl item, and the floor page on a marked item; Checkbox, Radio, Switch and IconButton were checked only in builders' scratch runs, and no forced-colours screenshot is committed or reviewed. Not advanced: 1, 5 (conformance is week 4), 8, 11, 12, 13.
- **Moves to week 4:** besides the planned second half (the React Aria `OverlayEngine` and `engineDom` conformance for Tooltip, Dialog and Select, then Menu, Tabs and TabNav, `@nizivo/icons`, `tokens.json` and the js-refs `.` entry): Select's Field wiring with `labelBehavior: 'focus'`, and a `select.css` pass to match Input and NativeSelect (sm radius, disabled border, an invalid border); `Dialog.Close` defaulting to an IconButton with the close glyph. Open, with no week yet: whether Field and IconButton get a separate entry with no client import, so the zero-JS paths ship zero bytes under Turbopack too (a maintainer decision); clearing a native message on `form.reset()`; an inline native message for a required RadioGroup and for checkbox groups; Switch `pending`; the Textarea `count`; a description line for Checkbox and Switch rows; sizes for the selection controls; the theme half of `ThemeScript`; forced-colours screenshots and the outline check for every control (W5, exit criterion 14); Firefox in the browser lane; Safari 17.5.

**Scope (37 components, plus the foundations below):**
- **Foundations:** `tokens.css`, `tailwind.css`, `custom-media.css`, `ThemeScript`, `NizivoConfig`, `formatLabel`, `@nizivo/react/contracts`, `@nizivo/react/augment`.
- **Layout and type:** Text, Heading, Stack, Inline, Grid, GridItem, Container, Separator.
- **Actions:** Button, IconButton.
- **Display:** Badge, Card, Delta, ProgressBar, ProgressRing, Meter, Skeleton, EmptyState, InlineError, Alert, Kbd, Image.
- **Forms:** Field, Fieldset, Input, Textarea, Checkbox, RadioGroup, Switch, SegmentedControl, Select, NativeSelect.
- **Overlays and navigation:** Tooltip, Dialog (incl. `alertdialog`), Menu, Tabs, TabNav.
- **Icons:** the full Lucide set and the Instagram brand glyph.

**Ordered cut line** (if behind schedule, cut in this order to v0.2):
1. Menu
2. Tabs and TabNav
3. ProgressRing and Alert
4. SegmentedControl, Kbd, Image and NativeSelect
5. `@nizivo/icons` (docs fall back to `lucide-react` with `strokeWidth={1.92}` through the slots)

**Never cut:** Field, Select, Dialog, Button, Tooltip.

**Exit criteria** (all measurable):
1. ~~`@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons` 0.1.0 are published by `release.yml` in the repo named in decision 9, over OIDC with provenance, with no `NPM_TOKEN` anywhere.~~ **Changed 2026-10-15 by M14:** `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons` 0.1.0 are published by hand by the maintainer, with npm 2FA, through the local release script ([§19.2](#192-release-pipeline)) from a commit on `main` of the repo named in decision 9 that passes the full gate, publishing the tarballs `check:release` checked, with no `NPM_TOKEN` or 2FA-bypass token anywhere. 0.1.0 has **no provenance** (it needs CI). The original criterion, `release.yml` over OIDC with provenance, applies to the first release after Actions is turned back on.
2. The Next 16.4 (Turbopack **and** webpack), Vite 8 SPA and Astro 7.3 fixtures install the packed packages (the unpacked `pnpm pack` output as `file:` folders, [§18.1](#181-test-layers)) and pass the shared spec:
   - zero console errors and zero hydration warnings;
   - a server-only Next page ships **no** `@nizivo` client chunk, checked by planted-marker grep over the page's chunks (Next 16.4 no longer prints First Load JS);
   - under webpack with `optimizePackageImports`, a page that renders one client part through the barrel contains no marker of any other client module ([§11.1](#111-per-framework-setup-and-gotchas));
   - `<Select.Root>` and `<Dialog.Root>` render through namespace **and** flat imports from a Server Component and are interactive after hydration.
3. The directive guard, the `export * as` lint, the emitted-CSS vocabulary check, the Lightning CSS guard, exports drift, publint/attw, and the `.d.ts` import-graph walk (no engine package or `_engines/**` file reachable from any `types` entry) are green.
4. axe reports 0 violations (`wcag2a/2aa/21aa/22aa`) on every story in light. Dark is reported, not blocking.
5. Conformance (classes, `data-slot`, `data-*`, keyboard, forms, SSR) is green for Select, Dialog, Tooltip, and Menu and Tabs if not cut: Chromium on PRs, Firefox and WebKit on `main`. The v0.1 O-tests pass.
6. The floor lane (Firefox 129, Safari 17.5) passes the S1 nesting matrix, the halo/inverse probe and the overlay entry, or each degradation is documented. *Zero-spend note:* Firefox 129 runs free from Mozilla's release archive (done in week 1). Playwright's WebKit is a current engine, not Safari 17.5, so it cannot stand in for the floor, and GitHub's macOS runners ship a current Safari. Free routes to Safari 17.5 (steps in `fixtures/floor-lane/RESULTS.md`; `run.ts --serve` takes the results):
   - **iOS 17.5 Simulator** on a Mac with Xcode 27, whose simulator support is iOS 17 or later: local and free, and it covers iOS Safari 17.5 (not macOS). The posted user agent must read `Version/17.5`. **2026-10-15:** the maintainer installed the iOS 17.5 Simulator (free, through Xcode), and a builder runs the floor lane on it in week 4; the integrator records the result here and in `fixtures/floor-lane/RESULTS.md`.
   - **A macOS Sonoma 14.5 virtual machine** (for example in UTM) for macOS Safari 17.5. Where to get the 14.5 restore image and the VM licence terms are UNVERIFIED.
   - **Open-source programmes** once the repo is public: BrowserStack (eligibility for a company-backed project and Safari 17.5 availability are UNVERIFIED) or TestingBot (written criteria: a public repo, an OSI licence, active maintenance and "not a commercial or closed-source product"; whether a company-backed library qualifies is UNVERIFIED).
   - **An Apple device still on iOS 17.5 or macOS 14.5**, if anyone has one.
   - Without any of them, the Safari 17.5 result is recorded as "not tested" on the Deviations page.
7. The contrast matrix passes with overrides, and every override is on the deviations page with its expiry.
8. **At least one real Figma → TokensBrücke → PR sync has been merged end to end.**
9. `size-limit` budgets at measured + 10% are green; the seam overhead is measured and recorded; the `contracts/api` manifests are committed.
10. Docs are live at nizivo.neevtechnologies.in (static export on GitHub Pages, [§18.2](#182-docs-site-public)): getting started for Next, Vite and Astro (including the Tailwind recipe), tokens, theming, generated component pages, `llms.txt`.
11. **The designer signs off light renders** of Button, Input, Select and Dialog. (The design contact is Dayitava, M15.)
12. **The Figma file's owning team is confirmed** (done 2026-10-14: "Vampire D Studio", Professional) **and the R3 mitigations are in place:** a Neev person has edit or admin access to that team, and the raw export is committed to the repo.
13. **The licence is decided** before the repo goes public.
14. Forced-colours screenshots (Chromium `forcedColors: 'active'`) of every v0.1 control in every state are reviewed by the accessibility owner, and a Playwright check confirms a solid focus outline on the visible part of every T0 control.

### 21.2 v0.2 — "Dashboard, shell and overlays" (≈ weeks 9–14)

- **First task:** a WebKit `non-scaling-stroke` check for percent-space charts.
- **`@nizivo/charts`:** ChartFrame, AreaChart, BarChart, DonutChart, Sparkline, Legend, ChartTooltip.
- **Dashboard:** Metric, NumberValue, KpiTile, TrendCard, RankedList, `CountUp` (`@nizivo/react/motion`).
- **Overlays:** Toast + LiveAnnouncer (**gate: O-06**), Popover, Drawer/Sheet.
- **Data and navigation:** Table parts + selection, Pagination, Breadcrumb, Avatar.
- **Shell:** AppShell (below `sm`: MobileTabBar and the "More" bottom Drawer), Sidebar (rail from 640 px; replaced by MobileTabBar below 640 px), NavItem, TopBar, MobileTopBar, MobileTabBar, PageHeader, Split, StickyBar. **Needs design's `lg` threshold, sidebar widths and "More" sheet contents (handoff Q3, Q4, Q35) at the start of v0.2.**
- **Forms:** Form, SubmitButton, FormMessage, FileUpload, ChipGroup, ChoiceCard, PasswordInput, SearchField.
- **Feedback:** Banner (Alert-shaped: T0 + dismiss leaf).
- **Seam proof:** the react-aria-hooks Tooltip adapter passes the Tooltip suite nightly. It becomes the default after two green weeks.
- **Theme:** dark becomes **stable** after design reviews rendered pages 02, 04, 06 and 07.
- **Charts seam:** `chart-frame.contract.ts`, the third-party-child conformance case and the charts-only fixture.
- Docs examples for the commerce sets, the storefront set and the 08 templates.
- Vite SSR and React Router 8 fixtures; React 19.2.x + 19.3.x matrix.
- The locale-catalogue mechanism; the daily Figma drift check ([§7.7](#77-drift-detection); no webhook, which would need a hosted relay); the non-blocking ESLint react-hooks lane.

**Exit:** the overview dashboard (08) is rebuilt in the Next fixture from Nizivo parts only, with zero client JS for its server-rendered KPI row. CLS < 0.01 on a streamed overview. The WebKit stroke check passes. O-06, O-07 and O-15 are green. The second Tooltip adapter is green. Dark is signed off.

### 21.3 v0.3 — "Distribution and hard widgets" (≈ weeks 15–20)

- **Registry** (decision 5): `init`; commerce, storefront and template items; a `data-table` block (TanStack Table v9); `<name>-css` re-skin items; `<name>-source` fork items for components without an engine. Items depend on `@nizivo/*@~x.y.0`; item source is MIT. Immutable URLs, SHA-256 manifest, item-policy linter.
- **`unstable/*`:** DateRangePicker/RangeCalendar, CommandMenu + `@nizivo/react/hotkeys`.
- **New components:** Combobox, NumberField, QuantityStepper, Accordion (`<details name>`), DataView, BulkActionBar, PageIndicator, `Surface material="glass"`, `usePointerFx`, Funnel, Heatmap.
- **Base UI canary**: Dialog and Select adapters on one Base UI `OverlayEngine`, nightly.
- CSP Profile A/B fixtures; Trusted Types fixture (report-only); TanStack Start fixture (RSC lane non-blocking); RTL mirror-geometry test. (Argos is not funded; decision 6.)

### 21.4 v1.0 — "Freeze the contracts" (≈ 6–7 months from start)

- **API review:** every component is promoted or explicitly stays in `unstable/*`. Props, vocabulary, classes, hooks, layers and token names freeze.
- **Overlays:** all of O-01…O-25 on three browser engines × React 19.2/19.3.
- **Screen readers:** Guidepup NVDA and VoiceOver nightly; blocking after 30 green days.
- **Visual regression:** dark, mobile and RTL (ar-EG plus the `en-XA` pseudo-locale).
- **Accessibility debt:** every override is resolved in Figma or re-approved.
- **Supply chain:** SBOM + `actions/attest@v4`.
- **Governance:** `GOVERNANCE.md`; LTS policy published.
- **Design:** ghosts relinked; sign-off on breakpoints, dark elevation, the text ladder, toast timing, Card rest elevation, sidebar widths and the spring order; the cleaned Figma Community file.
- `@nizivo/codemod` only if a deprecation needs one.

### 21.5 Explicitly deferred

| Deferred | Why it is safe | What brings it back |
|---|---|---|
| `@nizivo/lab` (shaders, liquid glass, 3D) | The 3D items are raster images; shader sources are unreadable; SVG liquid glass is Chromium-only | A consumer request; independent 0.x |
| Native top-layer overlay adapters | Four platform gates ([§12.4](#124-native-swap-gates)) | The gates clear; one component at a time |
| A Motion (motion.dev) adapter | CSS covers every Figma motion spec; Motion costs 44.2 KB and its SSR leaves content invisible | Consumers can already wrap parts through `render` |
| `unstyled` prop | CSS-file granularity covers it | A consumer request (additive) |
| Brand and density values | No consumer and no Figma source | A real second brand (resolver modifier) |
| A Safari 16.4 token floor (duplicated theme blocks) | Floor is 17.5; block selectors cannot express inverse surfaces inside nested themes; the `light-dark()` theme format is public ([§4.2](#42-seam-ledger)) | A consumer request; ships as a major |
| `@nizivo/css` | No non-React consumer | A second framework or plain-HTML consumer |
| React Compiler output | Crashes under `react-server` | Compile phase 2 for `*.client.tsx` only, after benchmarks |
| Code Connect | Needs an Organization plan | An Organization upgrade (the map converts mechanically) |
| Native Temporal | Not Baseline (Safari `preview`) | web-features marks it Baseline (a patch) |
| ~~A 12 px caption style~~ | No longer deferred: decision 8c (2026-10-14) allows 12 px through the `Body/S` and `Label/S` proposals ([§7.6](#76-code-owned-tokens)) | — |
| Hotspot editor, Vue or Web Components bindings | Out of scope | Product demand |

---

## 22. Risks and mitigations

| # | Risk | Likelihood / impact | Mitigation | Revisit when |
|---|---|---|---|---|
| R1 | **The design keeps churning** (it is a work in progress) | High / medium | `unstable/*`; dark as preview; provisional `lg`; patterns in docs and the registry, not npm; one-click token sync with a diff; 0.x semantics; promotion after two unchanged sync cycles | Every two weeks |
| R2 | **Team bandwidth**; week 1 is heavy | High / high | The ordered cut line; a minimal generator first; one engine; three packages; registry, lab and RTL visual regression deferred; 2-week buffer | Every two weeks |
| R3 | **Figma ownership** (the file stays on "Vampire D Studio", a Professional team Neev does not formally own; decision 3) | Medium / high | Accepted under zero spend. A Neev person keeps edit or admin access; every sync commits the raw export to the repo; a `.fig` backup at each minor; TokensBrücke works on any plan; MCP path optional; never poll a Starter file | Loss of access to the team, or a plan downgrade |
| R4 | **The engine contract drifts toward React Aria-only behaviour**, so a swap stops being cheap | Medium / high | Contract minimalism (two engines or native); `'unknown'` reasons; second Tooltip adapter in v0.2; Base UI Dialog + Select canary (one overlay core) in v0.3; conformance asserts classes, `data-slot` and exactly the vocabulary `data-*` (`engineDom`); engine-owned strings listed per component | v0.2, v0.3 |
| R5 | **The S2 export shape regresses** (someone namespaces from a client file; a tsdown change) | Medium / high (production build breaks) | Generated barrels only; the `export * as` lint; directive guard; Next fixture on both bundlers on every PR; exact tsdown pin | Each tsdown upgrade |
| R6 | **Untested on the real floor:** Safari 17.5 itself (only WebKit 27.2 ran), and Firefox for the CSP matrix and the D-spike. W1: the floor lane verified Firefox 129 for S1, the probe and overlay entry | Medium / high | Week-1 floor lane (done for Firefox); v0.1 exit criterion 6 and its free Safari routes (the iOS 17.5 Simulator is installed since 2026-10-15, and week 4 runs the lane on it); documented degradations (Deviations page entries D1 and D2, [§18.2](#182-docs-site-public)) | A Safari 17.5 run |
| R7 | **TokensBrücke output fails Terrazzo's validation**, or typography names differ | Medium / medium | Day-1 real export (W1: the raw export fails `tz check` on its own and passes once normalized; names recorded in `DRY-RUN.md`); the normalizer writes the final form and `tz format` is a check; golden files; `subValueVariableName` and the `contract` plugin rename; MCP snapshot fallback | First plugin sync |
| R8 | **Terrazzo** (small community; broke at 0.10 → 2.0) changes output | Medium / medium | Exact pin; golden files; custom logic in plugins; the DTCG source stays tool-neutral; the Style Dictionary swap is documented but UNVERIFIED | Each Terrazzo minor |
| R9 | **tsdown is pre-1.0; pnpm 12 OIDC through Changesets is untested** | Medium / high | Exact pins; shared preset; directive guard; exports drift; publint/attw; the OIDC path is off the 0.1.0 path (M14: 0.1.0 publishes by hand, so the local release script's first run is the 0.1.0 risk) and is rehearsed before the first OIDC release; pnpm 11.28.x fallback; unbundled output so tsc or bunchee can replace tsdown with no consumer impact | Each minor |
| R10 | **React Aria toast hooks change** (stability UNVERIFIED) or the new Sheet is buggy | Medium / medium | Own store and region; hooks only render; O-06/O-07/O-09/O-14 gate upgrades; one Renovate group; Sheet falls back to Modal + CSS | Each React Aria minor |
| R11 | **React Aria Tabs weight** (31.9 KB) on Tabs-only pages | Medium / low | `TabNav` for link tabs (0 KB); budgets; the hooks escape hatch | A budget failure |
| R12 | **The a11y override layer becomes permanent debt** | Medium / medium | Expiry, redundancy and drift checks; the public deviations page; the release gate | Each expiry date |
| R13 | **CSP:** React Aria's inline `VisuallyHidden` styles break under Profile B | High for Profile B users / medium | Profile A is the default; B is guaranteed for server-safe parts; per-release grep of engine inline styles | v0.3 fixtures |
| R14 | **Percent-space SVG in Safari** (`non-scaling-stroke`), clip-path draw in RTL | Medium / medium | First v0.2 task; pixel-space fallback; `xDirection` default `ltr` | v0.2 week 1 |
| R15 | **Locale-string weight** (+4.8 KB on the dashboard set; +13.4 KB for date pickers) without the optimise plugin | High / low | Budgets measured with all locales; per-framework plugin recipes | — |
| R16 | **The Safari 17.5 floor sits above Next 16 and Tailwind 4 (16.4)** | Low / medium | Documented; a lower floor needs a new theme mechanism and ships as a major ([§4.2](#42-seam-ledger), [§21.5](#215-explicitly-deferred)) | A consumer asks |
| R17 | **Spring parameter order is wrong** | Low / low | Golden test pins the interpretation; the maintainer accepted the order on 2026-10-14 (M12); a fix is a token patch | Design reports a different order |
| R18 | **Toast outlet into native modals** (consumer `<dialog>`) misbehaves (state loss, duplicate announcements) | Medium / medium | Only needed for consumer native modals today; gated by O-08 at v1.0; documented limitation until then | v1.0 |
| R19 | **Visual-regression cost or terms** | Low / low | In-repo screenshots only (decision 6, zero spend); baselines in plain Git until they outgrow it | Baselines too large for plain Git |
| R20 | **Licence chosen after outside contributions** | Low / high | v0.1 gate: decided before the repo opens | Week 0 |

---

## 23. Decision log

ADR-style. "Judges" means the three phase-2 review lenses: swappability, technical correctness, and feasibility. Where they disagreed, the "Why" column says how it was decided. Full ADR files go in `docs/adr/`.

### 23.1 Settled constraints (adjudicated by the critique; not re-opened)

| # | Constraint | Evidence |
|---|---|---|
| S-1 | `render` prop (element or `(props, state)`) on every exported DOM-rendering part (inner `data-slot` elements of single-root components are CSS-only, D-b's week 2 reading) except the engine-owned positioned popups (`Select.Popup`, `Dialog.Popup`, `Tooltip.Popup`) and `Select.Root` (narrowed 2026-10-14 by D-b, [§23.4](#234-builder-defaults-2026-10-14); revisit with the v0.2 hooks adapter); no `asChild`, no polymorphic `as`; a constrained `level` on Heading, CardTitle and DialogTitle | [critique C3](research/00-critique.md), [r3 §4.2](research/r3-headless-primitives.md), [r8](research/r8-extensibility-distribution.md) |
| S-2 | Compounds as a namespace **and** flat parts; no static properties; `'use client'` only on leaves; src-vs-dist directive guard | C36, [r4](research/r4-build-release.md), spike S2 |
| S-3 | One canonical `nz.` layer statement, semver'd ([§8.1](#81-the-canonical-layer-statement)) | C1, [r2 §4.2](research/r2-styling.md), r8 §8.1 |
| S-4 | `nz-<component>[-<part>]` classes + `data-slot`; `data-variant/size/tone`; one engine-independent vocabulary ([§8.3](#83-the-state-vocabulary-one-list-engine-independent)) | C5, C6 |
| S-5 | Token names from the Figma `codeSyntax` with the prefix swapped; `--nz-p-*` private; prefix is a build setting | C8, [r7 §6](research/r7-token-pipeline.md) |
| S-6 | Progress Bar and Ring in core | C13 |
| S-7 | Generated icons from pinned `lucide-static`; core imports no icon package; 1.6 px at 20 px | C15, S1 |
| S-8 | No required provider; links and images through `render` and slots | C16 |
| S-9 | React `^19.2.0`; ESM-only; Node ≥ 22.12; tsdown `unbundle`; `sideEffects: ["**/*.css"]`; JS never imports CSS | C18, [r1](research/r1-framework-compat.md), r4 |
| S-10 | Changesets + npm OIDC from split jobs; lab independent 0.x (0.1.0 publishes by hand while Actions is off: M14, [§23.3](#233-maintainer-decisions-2026-10-14)) | C19, C21 |
| S-11 | 640 px is the only designer-backed breakpoint | C11, [figma/08](figma/08-overview-dashboard.md) |
| S-12 | Focus = 2 px solid outline; halo is decoration only | S3 |
| S-13 | Budgets from measurements, not 4–12 kB targets | C23, S4 |
| S-14 | Storybook internal; public docs on Fumadocs, which hosts the registry | C24 |
| S-15 | No font files shipped | [r6](research/r6-heavy-modules.md) |
| S-16 | One spring generator, one settle threshold | C10 |

### 23.2 Decisions made in this plan

| ID | Decision | Choice | Alternatives | Why | Reversibility / cost to change | Evidence |
|---|---|---|---|---|---|---|
| D1 | Behaviour engine | Native T0 + **React Aria** (RAC 1.22.1 + hooks 3.53.1) as the single T1 family; own T2 for Toast, upload, selection | Base UI 1.9.0; Radix 1.8.1; Ark/Zag; per-widget mixing | Lightest stable family covering calendar, combobox, number field and sheet (69.0 vs 88.3 KB); 36 locales; documented AT matrix; top-layer exemption for toasts. All judges agreed | Per non-overlay component: one adapter + `component.json` + a minor. Overlay family: one `OverlayEngine` and every overlay adapter, swapped together through `engines.json`. Whole family: also drop `react-aria`, re-map engine-owned strings, and ship a minor with a migration note (CSP nonce, locale plugin). Base UI has no calendar (own grid work) | [r3 §3, §6](research/r3-headless-primitives.md), gap report A §1.5, V8 |
| D1-seam | Adapter seam structure | **Public `*.client.tsx` leaf owns the CSS contract; the adapter implements a typed `<Name>Engine` and writes no classes;** `engine.ts` generated from `component.json` and the members of `<Name>Engine`; named re-exports only; engine DOM props filtered by `engineDom`, so only vocabulary `data-*` (from `stateAttrs()`) and the undocumented functional allowlist reach the DOM; one `OverlayEngine` per engine family | Velocity: the adapter is the public part (one file); lean: own DOM in adapters | Judges split (correctness and feasibility preferred a single adapter file; swappability preferred the split, because a new engine must otherwise re-implement every class and slot). We took the split, **but only for engine-backed parts** (server-safe parts have none), and generate the bookkeeping so the cost is one extra small file per engine-backed component | Collapsing to one file is internal and free | Verdicts (swappability §4.2), V3, spike S2 |
| D1-proof | Prove the seam | Second Tooltip adapter on react-aria hooks inside the same family (v0.2, measured 7.2 vs 14.3 KB); Base UI Dialog + Select canary on one overlay core (v0.3); hooks altitude as a per-component budget escape hatch | No second engine (velocity); break-glass RAC adapters for own native overlays in v0.1 (lean) | A seam with one implementation is a hypothesis. The Tooltip adapter also pays for itself. Lean's v0.1 dual implementation was judged unshippable | Drop the canary any time; the Tooltip choice follows the measurements | V8, V9, verdict (feasibility §2) |
| D3 | Packages and naming | `@nizivo/tokens`, `@nizivo/react`, `@nizivo/icons` (v0.1); `@nizivo/charts` (v0.2); motion at `@nizivo/react/motion`; lab independent and on demand. **Import is `@nizivo/react`, not `@nizivo/ui`** | `@nizivo/ui`; a separate `@nizivo/motion`; domain packages; five packages from day one | Each npm package needs its own 2FA trusted-publisher setup and there is no scope-wide OIDC; a framework-named binding keeps tokens and a future CSS package neutral. All judges agreed on the rename | Before 0.1.0: free. After: a shim package + codemod | C1, C12, [r4 §6.1](research/r4-build-release.md), [r8 §5.2](research/r8-extensibility-distribution.md) |
| D3-dist | Distribution channel | npm through v0.2; docs examples (v0.2) → shadcn registry (v0.3) from the same source; behaviour and a11y contracts stay on npm. Items depend on `@nizivo/*@~x.y.0`; `<name>-source` forks only for components without an engine; item source is MIT | Registry-only patterns now; npm domain packages | The registry has no update merge (r8 E1–E7), so only thin compositions belong there; patterns churn most in a WIP design | Stop publishing items any time; copies are unaffected | C12, gap report B §B6 |
| D3-charts | Charts dependency | `@nizivo/charts` depends on `@nizivo/tokens` only; vendors ~40 LOC of render helpers (generated from core, CI-diffed); ships its own focus and visually-hidden rules scoped to `.nz-chart-*`; `ChartFrame` has a props contract (`chart-frame.contract.ts`) | Peer on `@nizivo/react` (lean, velocity) | Charts usable with any component library; core and charts meet only through slots | Adding a peer later is additive | Verdict (swappability D11) |
| D4 | Styling authoring | Plain CSS per component, Lightning CSS 1.33; hand-written hooks extracted to manifests; no generated component tier | vanilla-extract; Panda `cssgen`; a DTCG component tier | Zero runtime; nothing to learn; the output contract is tool-independent | Authoring swap allowed when the manifest diff is empty and VR is clean | [r2](research/r2-styling.md), C7 |
| D4-hooks | Hook pattern | Read hooks once at the property; variants set only `--_nz-*`; stylelint bans hook declarations | Re-wrap the hook inside each variant private (velocity) | Velocity's pattern silently killed the border hook on four variants; lean's Card assigned its own hook. The seams pattern makes both impossible | Internal CSS only | Verdicts (swappability D4, correctness D4) |
| D4-layers | Layer order | `nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities`; core patterns in `nz.components`; `nz.patterns` reserved | No `nz.themes` (lean, velocity); core patterns in `nz.patterns` (velocity) | `nz.themes` makes themes import-order-independent; reserving `nz.patterns` stops registry CSS tying with core | Inserting a layer later is breaking; all are declared now | Verdict (swappability §5), r8 §8.1 |
| D4-vocab | State vocabulary | One list ([§8.3](#83-the-state-vocabulary-one-list-engine-independent)), React Aria-aligned names; overlay state always `data-*`; no `[open]`, `:popover-open`, `:modal`, `::backdrop` publicly; checked on **emitted** CSS; engine `data-*` stripped from the DOM by `engineDom` | Base UI names (`data-starting-style`); native pseudo-classes as carriers (lean) | Near-identity mapping for the default engine; native carriers would break re-skins on any engine swap | Adding names is a minor; renaming is breaking | C5, verdicts |
| D4-tw | Tailwind v4 | Generated `@nizivo/tokens/tailwind.css` (`@theme inline` → semantic vars, `nz` namespace) from a custom plugin | Stock `plugin-tailwind` | The stock plugin resolves to primitives and breaks nested themes (S3) | Generated file; rename or drop | Spike S3 |
| D5 | Token pipeline | DTCG 2025.10 + resolver; Terrazzo 2.8.0 exact; golden files; `contract.json`; 4 small plugins | Style Dictionary 5.6.1 (no resolver) | Terrazzo implements the resolver; S3 verified every behaviour we rely on | Builder swap is invisible to consumers (UNVERIFIED for SD) | [r7](research/r7-token-pipeline.md), S3 |
| D5-extract | Extractor and drift | Designer-run TokensBrücke, web-upload PR in v0.1 (no PAT); MCP snapshot as engineer fallback; a daily REST version check on the Professional plan, no webhook (it needs a hosted relay; changed by M3); **no REST polling while on Starter**; release block on an open "sync needed" issue; the normalizer accepts `Grove *` and `Nizivo *` through the v0.1 rename, and token and override identity is the Figma variable id | Nightly REST `/meta` poll (seams) | A Starter file allows 6 REST requests a month; the file's team is unknown | Any extractor that writes `raw/` | [r7 §8](research/r7-token-pipeline.md), critique S-d |
| D6 | Theme mechanism | `light-dark()` once on `:root`; opt-in default; `data-nz-theme`; never `@property` colours; theme logic lint-confined to tokens; inverse via `data-nz-scheme` | Duplicated blocks (r7 default); OS-dark by default | S1: native nesting works; lowering and `@property` break it; no-attribute resolves light, so host apps are untouched | Changing the mechanism is a major: consumer themes use `light-dark()`, and duplicated blocks cannot express inverse surfaces inside nested themes (not built, [§4.2](#42-seam-ledger)) | S1, probe, C9 |
| D6-dark | Dark status | **Preview** in v0.1; stable after a rendered design review (v0.2) | Stable from v0.1 (lean, seams) | No dark render exists (G4); every dark value is computed | Not applicable | Verdict (feasibility D6) |
| D7 | Support floors | Chrome/Edge 123, **Firefox 129**, Safari/iOS 17.5; React ^19.2.0; Node ≥ 22.12; per-feature fallbacks deleted when the floor rises | Firefox 128 (lean, seams); Safari 16.4 | `@starting-style` and `transition-behavior` need Firefox 129 (web-features 3.42.0, V13); `light-dark()` needs Safari 17.5 | Lowering = a new theme mechanism (a major) + instant overlay entry | V13, [r2 §9](research/r2-styling.md), decision 4 |
| D8 | Overlays and layering | Gap report C model: engine portals, one z band ordered by DOM, nested portals into the parent, Toast the only top-layer element (gate O-06); one `OverlayEngine` per engine family, so overlay-family components swap engines together; native `<dialog>`/`popover` a gated per-component swap, the one exception to swapping overlays together, once tests prove it coexists with the family core | Top layer first with own adapters (lean; r1 D9); per-type z scales | No engine uses the top layer; a native modal inerts toasts (whatwg #9936); `overlay` and `closedby` are missing in Safari/Firefox | Per component, once the four gates clear | Gap report C §1, C17, V6 |
| D8-backdrop | Backdrop | A real `.nz-dialog-backdrop` **element**, rendered automatically for the root modal only; `backdrop={false}` opts out | `::backdrop` styling (lean); scrim class on the positioner (velocity); an explicit Backdrop part (seams) | An element keeps the CSS contract through a native swap; automatic root-only rendering is simpler for consumers | Adding an explicit part later is additive | Verdicts (swappability D8, feasibility D8) |
| D9 | Residual configuration | No required provider; optional client `NizivoConfig` (`locale`, `labels`, `portalContainer`); `I18nProvider` on every engine root; explicit `timeZone`; no `direction` | A required provider | RSC cannot read context; React Aria flips locale after hydration without `I18nProvider` | Config fields are additive | C16, gap report B §A3 |
| D10 | Responsive | `sm` = 40rem stable; Figma Desktop values emitted at a **provisional** `lg` = 80rem (`$extensions["app.nizivo.status"]`, outside semver, docs banner); no `md`; container queries for components; below `sm` the MobileTabBar (plus a "More" bottom sheet) replaces the Sidebar, as the designer wrote | Emit nothing beyond `sm` (velocity, endorsed by two judges); invented `md` 64rem (seams) | The Desktop **values** are designer-authored; only the threshold is unknown. Shipping them provisionally lets AppShell work start, while the flag keeps the guess out of semver. A dated gate (start of v0.2) forces the design answer | Threshold is a token edit (patch, visual) | C11, verdicts (feasibility D10) |
| D11 | Charts | Own scales + d3-shape/d3-array; `ScaleLike`; `nice()` before ticks; percent-space SVG; `<rect>` bars; HTML labels; `clip-path` draw; 0.6 KB island; `ChartFrame` renderer seam; opt-in `./d3` time adapter | d3-scale everywhere; Recharts | 3.2 KB vs 10.4 vs 107.7 KB; CSP Profile B safe; velocity's un-niced ticks reproduced 03's defect | Internals swap behind the same props | [r6 §2](research/r6-heavy-modules.md), gap report B §B1.4, C14 |
| D12 | Motion | One generator (493/702 ms at 0.1%); springs only on transforms, paired; Reduced: easing `linear`, spring duration 120 ms, travel 0; `--nz-duration-fade` keeps fades; loops only on code-owned `--nz-duration-pulse` (0 ms in Reduced) and `--nz-duration-spin` | 0 ms spring durations in Reduced (seams); Motion's generator | Seams' 0 ms removed modal fades, contradicting Figma's "Reduced keeps fades"; Figma's own `fast` = 0 would too | Regenerating is a visual patch | S4, [figma/01](figma/01-foundations.md), verdicts |
| D13 | Icons | Generated from `lucide-static` 1.56.0; `strokeWidth` 1.92 attribute; `absoluteStrokeWidth` opt-in; lint + dependency-cruiser ban icon imports in core; `aliases.json`, `mirror.json`; every internal glyph overridable through a named slot prop | `calc()` stroke on a CSS variable (lean); a `lucide-react` peer | Matches Figma at 20 and 16 px; V11 showed the `calc()` approach collapses to 1 unit | Regenerate from another stroke source; a non-stroke source changes `IconProps` (a major or a separate package) | [figma/02](figma/02-actions-forms.md), V11, C15 |
| D14 | Toolchain | pnpm 12.11.2, Turborepo 2.11, tsdown 0.23.1, TS 7.0.2 + `typescript6` alias, oxlint + oxfmt + stylelint | ESLint + typescript-eslint (blocked on TS 7); Biome | Verified in r4's experiment; one linter | Unbundled output keeps the bundler swappable | [r4](research/r4-build-release.md), C20 |
| D14-hooks | Compiler-rule enforcement | Narrow ESLint react-hooks lane from v0.2, **non-blocking** until compile phase 2 | Blocking from v0.1 (seams); none in 0.x (velocity) | Judges split. The alias exists anyway; a non-blocking lane keeps code compiler-clean without loading week 1 | Make it blocking with one config line | C20, verdicts |
| D14-vr | Visual regression | **Decided 2026-10-14:** in-repo Vitest screenshots only, baselines in plain Git; Argos not funded (zero spend) | Argos from v0.1 (velocity); Chromatic | Budget is a user decision; Argos' free terms exclude commercial use | Stories stay CSF3, so vendors swap | [r5 §5](research/r5-quality-docs.md), decision 6 |
| D14-lic | Licence | **Decided 2026-10-14:** Apache-2.0 + TRADEMARKS.md + DCO; registry item source MIT | MIT | Patent grant and trademark reservation for a company project. With no `NOTICE` file §4(d) never applies, but §4(b) change notices do; MIT item source spares consumers who edit copied registry files. (HeroUI, once cited as an Apache peer, is MIT.) | Cheap before outside contributions | [r5 §11](research/r5-quality-docs.md), C22, decision 1 |
| D15 | A11y remediation | Figma first + a time-boxed override file for re-pointed Figma variables and a proposals file for new ones, both in the token source; Option A; gap report C values; a11y floor in `nz.base`; AA blocks stable releases in light | Block on design; silent code fixes; a CSS override layer | Bounded, visible, self-deleting debt; one value reaches every output | Entries delete themselves when Figma catches up | Gap report C §3, G19 |
| A-1 | Accent hover | Code-owned `--nz-bg-accent-hover` (light lime/400, dark lime/300 UNVERIFIED) | Fall back to the resting colour (lean); undefined token (velocity) | Velocity's reference rendered transparent (V12); lean's had no hover feedback | Deleted when design adds the token | V12, figma/02 issue 2 |
| A-2 | Bookkeeping | `component.json` + `nz gen` (minimal in week 1) + `contracts/` manifests, CI fails on drift | Hand-maintained barrels and exports | Generated barrels guarantee the S2 shape; manifests make every change classifiable | Generated files are committed; dropping the generator costs nothing | Verdicts (correctness §3, swappability D14) |
| A-3 | Seam governance | The seam ledger rule ([§4.2](#42-seam-ledger)) | Ad-hoc seams | Stops a small team over-building flexibility a WIP design will invalidate | An ADR | Verdict (feasibility §5) |
| G11 | Forms | Server-safe Field + `FieldScope` leaf; zero-JS function child; native validation on submit; one error channel; `useFieldControl()`; button-based controls named through `aria-labelledby` with click-to-focus labels; library recipes only | Engine-native Field; XField wrappers; adapter packages | Keeps Field engine-free; zero JS for server forms | Internal | Gap report A §2 |
| G12 | Data tables | Native `<table>` parts; form-based selection island; URL-driven state; DataView; TanStack only in registry blocks | React Aria Table; TanStack in core | `role=grid` is wrong for data tables; +29 KB | Swap the registry block | Gap report A §3 |
| G13 | Dates | ISO plain-date strings; `@internationalized/date` internal; no Temporal polyfill; lazy calendar; `unstable/` in v0.3 | `Date` objects; date-fns; a dates package | Serialisable and engine-aligned; a later Temporal move is a patch | Patch | Gap report A §4 |
| G14 | i18n/RTL | `labels` + config + catalogues; `formatLabel` 0.2 KB; no `direction`; logical properties linted from day one; mirror subset; engine-rendered strings listed per component | FormatJS; a direction prop | Small string count; locale determinism | Additive | Gap report B Part A |
| G15 | Overlay conformance | Gap report C O-tests staged v0.1 → v1.0; every adapter runs the same suite; N-tests kept for native swaps | Conformance-lite only until v1.0 | Tests are the swap gate | — | Gap report C §1.10 |
| G16 | Dark elevation | Tonal (n850 floating surfaces) + 8% ring + ×6 shadows; highlight off | Shadow-only; three tonal levels | Matches Material's tonal grid; keeps hover distinct | Token values (patch) | Gap report C §2 |
| G17 | Security | CSP Profiles A/B with the Profile B lint from v0.1 (fixtures v0.3); no DOM sinks; dependency policy; SBOM at v1.0; registry controls | Profile B fixtures only, no early lint | The lint is cheap and prevents rework | Additive | Gap report B Part B |
| G18 | Hotkeys and command menu | tinykeys registry behind `registerHotkey`; CommandMenu on React Aria Autocomplete, lazy | cmdk (stale; bundles Radix Dialog) | +4.7 KB lazy; no second engine | Swap the matcher | Gap report A §5 |
| G19 | A11y ownership | RACI: design accountable for values; a11y owner responsible for the matrix; CODEOWNERS needs both | — | Clear ownership of override debt | — | Gap report C §3.4 |
| G20 | Loading, empty, error | `status` + `pending` + slots; the Suspense fallback is the same component; library never fetches | Separate skeleton exports | Skeletons that mirror layout by construction | Additive | Gap report B Part C |


### 23.3 Maintainer decisions, 2026-10-14

These answer [§1](#1-decisions-we-need-from-you) (M1–M9) and the week 1 asks in figma-handoff §1.4 (M10–M12, 2026-10-14). M13–M16 record the maintainer's answers of 2026-10-15 (the §1 status of that date also lists the two items still open: the issue tracker and the docs DNS). Each row says which earlier recommendation it confirms or overrides.

| ID | Decision | Choice | Overrides | Consequence in this plan |
|---|---|---|---|---|
| M1 | Licence | Apache-2.0 (registry items MIT) | — (confirms D14-lic) | Exit criterion 13 met; `LICENSE`, `TRADEMARKS.md`, DCO and `patterns/LICENSE` go in the first commit |
| M2 | Package name | `@nizivo/react` | — (confirms D3) | `@nizivo/ui` is not used anywhere |
| M3 | Figma team | The file stays on "Vampire D Studio" (Professional) | The "upgrade The Neev and move the file" recommendation (not funded) | Exit criterion 12 reworded; R3 accepted with mitigations; drift detection is a free scheduled REST check instead of a webhook relay ([§7.7](#77-drift-detection)) |
| M4 | Browser floor | Chrome/Edge 123, Firefox 129, Safari/iOS 17.5 | — (confirms D7) | The Safari 17.5 floor lane needs a free device or service (exit criterion 6 note) |
| M5 | Registry | Yes, v0.3, MIT items | — (confirms D3-dist) | — |
| M6 | Zero spend | No paid service, seat or plan upgrade | Argos Pro option; Figma Professional upgrade; any paid hosting | Visual regression in-repo with plain-Git baselines; docs as a static export on GitHub Pages; the repo is public so CI minutes are free |
| M7 | Builder | Claude Code writes the code; the maintainer reviews and merges | The 2-engineer team assumption | §21 weeks are an ordering, not a calendar; the human-only steps are listed in §21.1 week 0 |
| M8 | Type floor | 12 px allowed through `Body/S` and `Label/S` proposals | The 14 px floor (critique S5) and handoff Q20's default | Lint floor 12 px; 4.5:1 for all small text; component sizes unchanged unless listed on the Deviations page; CSS names `--nz-font-body-s` and `--nz-font-label-s` confirmed by the week 1 dry run |
| M9 | Repo | `theneev/nizivo`, public; `theneev` is a user account | The `<neev-org>` placeholder | Repo settings are changed by the owner account; transfer to an organisation only before 0.1.0 publishes |
| M10 | Figma `codeSyntax` rewrite and Grove → Nizivo rename | The maintainer: "yes figma rename works" and "You are free to run the rename script whenever you want". **Applied 2026-10-14** by the builder through `use_figma`: all 175 WEB code syntaxes now read `var(--nz-…)` (none still `var(--grove-…)`); the 5 variable collections (Grove Primitives, Color, Space, Motion, Responsive → Nizivo …), 18 text styles and 10 effect styles (`Grove/…` → `Nizivo/…`) were renamed. The writes ran only after the live change list matched the committed plan's FNV fingerprints `1b78ef83` and `d0cb2e42`, and the result was verified by reading the file back | The week 1 plan's "runs once, only after the maintainer approves" gate (now passed); handoff §1.4 #1 | The file's version history holds the pre-rename state. The file **title** was left as "Grove UI Library" (the Plugin API cannot rename a file); the maintainer has since renamed it to "Nizivo UI Library" by hand (M16; week 0 item 6). The next export carries `Nizivo` names; the normalizer accepts both prefixes, and the `Grove` allowlist goes after the first post-rename sync ([§7.1](#71-pipeline-figma--dtcg--outputs), [§20.3](#203-hygiene-contract-between-design-and-engineering)) |
| M11 | `Elevation/0 Flat` | The maintainer: "for the elevation fix, I think that looks fine". The style (used once, frame `7275:12584` on the 01 Foundations page) was kept and given one invisible `DROP_SHADOW` (alpha 0, offset 0, radius 0, spread 0) | Handoff §1.4 #2's ask to delete the style | TokensBrücke no longer crashes on it, and the next export carries an elevation 0 token, `--nz-elevation-0`. Nothing in code defines elevation 0 today (`src/code-owned` has only `elevation.button` among shadows), so nothing collides. The build gives it no dark-mode ring (an elevation whose every layer has alpha 0 is flat; D-m), and the sync updates a test and three goldens ([§7.1](#71-pipeline-figma--dtcg--outputs)) |
| M12 | `spring()` parameter order | The maintainer: "string numbers look fine". The order (mass, stiffness, damping, velocity) is accepted, from Figma's `spring(1, 170, 26, 0)` and `spring(1, 260, 24, 0)` | — (confirms the week 1 assumption; answers design question 8h's first half and handoff Q1) | The spring golden and the `--nz-easing-spring(-soft)` / `--nz-duration-spring(-soft)` values stand (493 and 702 ms). R17 stays in [§22](#22-risks-and-mitigations) only in case design reports another order. Q34 (Reduced fades) stays open |
| M13 | Import paths | The maintainer, 2026-10-15: "we can keep import path per components". One subpath and one stylesheet per component (`@nizivo/react/<name>`, `@nizivo/react/css/<name>.css`), with the root barrel `@nizivo/react` beside them; a subpath holds more than one export only where §5.2's list says so (for example `grid`, `alert`, `field`, `radio-group`, `tabs`) | — (confirms builder default D-h, and D-r, which applied it to Field and Fieldset; §5.2's family subpaths `text`, `layout` and `progress` stay retired) | D-h is a maintainer decision, not a default ([§5.2](#52-exports-maps), [§23.4](#234-builder-defaults-2026-10-14)). New components follow the same rule through §5.2's list. It does **not** decide D-aa: whether Field and IconButton also get client-import-free entries stays the maintainer's call |
| M14 | Publishing 0.1.0 | The maintainer, 2026-10-15: "for no lets publish by hand, like we can make script if needed". 0.1.0 publishes by hand from the maintainer's machine with npm 2FA, through a local release script written in W5–W6 (the full gate, `pnpm pack`, `check:release`, then `npm publish` of each checked tarball, prompting for the one-time password). No provenance: it needs CI | §19.2's OIDC-only trusted publishing through `release.yml` for 0.1.0, and S-10 for 0.1.0 only; exit criterion 1 (changed, not dropped); week 0 item 3's OIDC rehearsal; the W5 "`release.yml` wired" item | [§19.2](#192-release-pipeline) leads with the local script and keeps the OIDC design for the first release after Actions is turned back on, when trusted publishing and provenance return. Still no `NPM_TOKEN` or 2FA-bypass token. R9's OIDC risk leaves the 0.1.0 path; the script's first run carries it instead |
| M15 | Design contact and owners | The maintainer, 2026-10-15: "Dayitava is the person". Dayitava "can handle both" owner roles, design-system lead and accessibility owner, for overrides, proposals and the decision meeting | §15.4's "the maintainer approves alone until a second owner exists"; decision 7's "designer availability is unknown" | Dayitava is the second owner in [§15.4](#154-ownership-and-the-override-mechanism): one review covers both roles, and the maintainer still reviews and merges. Dayitava's GitHub username is pending; CODEOWNERS and the `approvedBy` entries wait for it (entries keep `["maintainer"]` until then). Week 0 item 5's decision meeting is with Dayitava. Not stated: who does exit criterion 14's manual passes, so they stay as written |
| M16 | Figma file title | The maintainer renamed the file from "Grove UI Library" to "Nizivo UI Library" (reported 2026-10-15). The file key `BIzJFf1wm8KP0YG2AVI1tP` is unchanged | Week 0 item 6 and figma-handoff §2.1's open "File name" row (now done) | Docs name the file "Nizivo UI Library", and Figma links use the `Nizivo-UI-Library` slug (links with the old slug still open the file, because Figma resolves by key). The `Grove` allowlist in the normalizer is unaffected: it is about collection and style names, and goes after the first post-rename sync ([§20.3](#203-hygiene-contract-between-design-and-engineering)). Files under `packages/` that still say the title is pending are updated separately |

### 23.4 Builder defaults, 2026-10-14

Week 1 hit seven questions the plan did not settle (D-a to D-g), week 2 hit five more (D-h to D-l), the docs skeleton step four more (D-m to D-p), and week 3 ten more (D-q to D-z). The maintainer handed the build to the builder ("you build it"), so the builder adopted a default for each. Every row below is: **Adopted 2026-10-14 (builder default; the maintainer can override).** Each is also recorded in the section it changes. On 2026-10-14 the maintainer responded to four of the week 1 rows (D-a, D-b, D-d, D-e), and on 2026-10-15 confirmed D-h (M13); each of those rows records the response.

| ID | Decision | Choice | Alternatives | Why | Reversibility / cost to change | Evidence |
|---|---|---|---|---|---|---|
| D-a | Composition precedence ([§8.2](#82-class-slot-and-naming-conventions), [§10.4](#104-dialog-engine-backed-overlay)) | Adopted 2026-10-14 (builder default; the maintainer can override). With a `render` element, the part's presentational attributes win: `data-slot`, `data-variant`, `data-size`, `data-tone`, `data-full-width` (`PART_OWNED`). Every other prop merges with the element winning; `className` tokens are de-duplicated. `data-size` follows the part (`Select.Root size="lg"` with a Button trigger gives `data-size="lg"`). **Maintainer, 2026-10-14: "okay for now"** (confirmed for now). Week 2 additions (builder defaults): `PART_OWNED` has 13 names (D-j); children follow the same rule, so Button renders no children when it has nothing to show | The element wins everywhere; fix it inside Button only | Under RSC a server Button reaches the client part already rendered as a host element, so a fix inside Button cannot reach it. The Next fixture failed its trigger-slot check until this rule existed | One list in `contracts/render.ts`; a change shows in the DOM, so it is a minor in 0.x | `packages/react/src/contracts/render.ts`; `packages/react/test/unit/render.test.tsx`; `fixtures/next/RESULTS.md` (negative controls; `/select-composed` for the children case) |
| D-b | `render` scope (S-1, [§8.2](#82-class-slot-and-naming-conventions), [§10.3](#103-select-engine-backed-the-adapter-seam-end-to-end)) | Adopted 2026-10-14 (builder default; the maintainer can override). Every DOM-rendering part except the engine-owned positioned popups (`Select.Popup`, `Dialog.Popup`, `Tooltip.Popup`) and `Select.Root`; S-1 now says so. **Maintainer, 2026-10-14:** explained as having no visual difference; no change requested. Week 2 addition (builder default): only exported parts take `render`; a `data-slot` on an inner element of a single-root component (`alert-title`, `progress-bar-track`, …) is for CSS only, and ProgressBar's and Meter's native element takes none | `render` on every part, as S-1 said | The engine owns those elements in v0.1 (positioning, focus containment, portal), and a consumer element there would fight it. The plan's own §10.3 sketch already left it off | Adding `render` later is additive. Revisit with the v0.2 hooks adapter, which owns its DOM | W1 contracts (`select.contract.ts`, `dialog.contract.ts`, `tooltip.contract.ts`); the W2 components under `packages/react/src/` |
| D-c | `data-full-width` | Adopted 2026-10-14 (builder default; the maintainer can override). In the vocabulary's `presentational` group. This row decides `data-full-width` only; another presentational attribute (for example Card's `data-padding`) that joins the group also becomes part-owned under D-a, because a unit test keeps `PART_OWNED` equal to the group. Week 2 added eight (D-j) | The `local` group, in Button's manifest | §8.2's table lists it with the variant attributes, and that group is the `PART_OWNED` list D-a relies on | A vocabulary edit, free before 0.1.0 | `contracts/vocabulary.json` |
| D-d | Tooltip API ([§12.3](#123-per-type-rules)) | Adopted 2026-10-14 (builder default; the maintainer can override). The compound `Tooltip.Root` / `Trigger` / `Popup` is canonical. A `content` convenience prop and `shortcut` (needs Kbd) come in week 3 with IconButton's tooltip wiring. **Maintainer, 2026-10-14: "works"** (confirmed) | A single `content` prop, as the inventory had it | The trigger can be any focusable element, a server Button included; the shape matches Select and Dialog; `shortcut` needed Kbd, which landed in week 2 | Adding `content` later is additive | `tooltip.contract.ts`; [component-inventory.md](component-inventory.md) Tooltip row |
| D-e | Inverse inside inverse ([§7.4](#74-theme-mechanism)) | Adopted 2026-10-14 (builder default; the maintainer can override). A nested inverse surface stays inverse; it does not flip back. **Maintainer, 2026-10-14: "if current design does not use it let's not worry about it right now"** (set aside while the design has no nested case). The builder checked 6 pages of the Figma file: no inverse surface sits inside another; the only nesting is Card Inverse's slot, which uses `bg/inverse-elevated` | Flip back to the page's scheme | It is what the CSS does in every engine tested. Portaled overlays render outside the surface, so the common case (a Tooltip opened from a `tone="inverse"` Card) does not nest. Handoff Q36 is set aside; it reopens if a design nests one | One rule in `tokens.css` if design wants a flip | `fixtures/floor-lane/RESULTS.md` (plan gap) |
| D-f | Engine `data-*` ([§8.3](#83-the-state-vocabulary-one-list-engine-independent) rule 3 vs [§9.3](#93-contract-rules-keep-the-seam-honest) rule 6) | Adopted 2026-10-14 (builder default; the maintainer can override). Rule 3 wins. Adapters strip every engine `data-*` except an allowlist of what React Aria reads back from the DOM, for example `data-key` and `data-collection` (focus, scroll-into-view and typeahead), `data-react-aria-top-layer`, `data-live-announcer`, and the `data-href` family for Menu links (`dom-allowlist.json` is the full list: 14 entries in W1). An open trigger that React Aria reports as pressed is not mapped to `data-pressed` | Keep vocabulary-named engine attributes, as rule 6 said | Keeping them would let React Aria's own `data-invalid` and `data-pressed` reach the DOM with engine meaning. React Aria reads `data-key` and `data-collection` back from the DOM | The allowlist is internal and undocumented; a change is a patch | `_engines/react-aria/dom.ts`, `dom-allowlist.json` |
| D-g | CSS-only exit motion ([§13.2](#132-rules) rule 4) | Adopted 2026-10-14 (builder default; the maintainer can override). Entry with `@starting-style` on the whole floor. Exit to `display: none` is instant in every Firefox (129 to 157; bug 1834877), so a CSS-only component hides with `visibility` plus `allow-discrete` when its exit animation matters; otherwise the instant exit in Firefox is an accepted deviation (Deviations page entry D2, [§18.2](#182-docs-site-public)) | CSS-first exit everywhere, as rule 4 said; keep nodes mounted from JS | Measured on Firefox 129, 131, 132 and 157; Firefox cannot animate `display` | Component CSS only; the workaround goes when Firefox animates `display` | `fixtures/floor-lane/RESULTS.md` (degradation D2) |
| D-h | Component subpaths ([§5.2](#52-exports-maps), [§6](#6-repository-layout)) | Adopted 2026-10-14 (builder default; the maintainer can override). **Maintainer, 2026-10-15: "we can keep import path per components"** (confirmed; now a maintainer decision, M13). One subpath and one stylesheet per component: `./text`, `./heading`, `./stack`, `./inline`, `./grid` (Grid, GridItem), `./container`, `./separator`, `./progress-bar`, `./progress-ring` and `./meter`, each with its `css/<name>.css`, instead of §5.2's family subpaths `text` (Text, Heading), `layout` (Stack, Inline, Grid, GridItem, Container, Separator) and `progress` (ProgressBar, ProgressRing, Meter) | The family subpaths, through `component.json` `exports` | `nz gen`'s `componentMap()` maps every Figma node of a manifest with several exports to the first export (`values[0]`), with the merged variants: a `progress` family would attribute ProgressRing's `7275:13545` and `751:388` to ProgressBar. Families need per-export Figma ids in `component.json` first | Reversible before 0.1.0: extend the schema, fold the folders, rerun `nz gen` and update the fixture imports. Breaking after it, because exports keys and CSS paths are semver'd ([§5.4](#54-versioning-groups)) | `packages/react/package.json` exports; `packages/tooling/gen/generate.ts` (`componentMap`); `fixtures/next/app/t0/page.jsx` |
| D-i | Progress fills for tones Figma does not draw ([§15.3](#153-token-remediation-computed)) | Adopted 2026-10-14 (builder default; the maintainer can override). ProgressBar, Meter and ProgressRing paint `tone="neutral"` with `icon/secondary` and `tone="success"` with `icon/success` until design supplies the fills | `chart/neutral` for neutral; new code-owned proposals | `chart/neutral` is 1.36:1 (light) and 1.41:1 (dark) on `chart/track`, under 1.4.11's 3:1, and the neutral example shows no value text, so the fill is the only cue. `icon/secondary` reaches 3.75 / 5.32 and `icon/success` 4.06 / 5.87 on the track. Figma has no `chart/success` | One declaration per stylesheet; it changes when design supplies the colours ([figma-handoff §1.5](figma-handoff.md#15-asks-from-week-2-2026-10-14)) | `progress-bar.css`, `meter.css`, `progress-ring.css`; `packages/tokens/CONTRAST.md` |
| D-j | Eight more presentational attributes ([§8.2](#82-class-slot-and-naming-conventions), [§8.3](#83-the-state-vocabulary-one-list-engine-independent) rule 5) | Adopted 2026-10-14 (builder default; the maintainer can override). `data-padding`, `data-elevation`, `data-shape`, `data-gap`, `data-span`, `data-span-sm`, `data-span-lg` and `data-ratio` join the vocabulary's `presentational` group with `"values": null`, so each value set comes from the manifest's `variants` (Grid gained `spanSm` and `spanLg`). They are part-owned under D-a, which extends D-c; `PART_OWNED` has 13 names | The `local` group, with explicit value lists | §8.2 maps any other enumerated presentational prop to `data-<prop>`, and D-c foresaw `data-padding` joining the group. Card `padding` and `elevation`, Skeleton `shape`, the layout `gap` and `span`, and Image `ratio` need them | A vocabulary edit, free before 0.1.0 | `contracts/vocabulary.json`; `packages/react/src/contracts/render.ts`; `packages/react/test/unit/render.test.tsx` |
| D-k | Override metadata ([§15.4](#154-ownership-and-the-override-mechanism)) | Adopted 2026-10-14 (builder default; the maintainer can override). Three kinds: `contrast`, `ladder` and `pairing`. `issue` is required, as an `https` URL or `null` until an issue is filed (all 14 are `null`). `approvedBy` is `["maintainer"]` until a second owner and a CODEOWNERS file exist (2026-10-15: the second owner is Dayitava, M15; their GitHub username is pending; the tracker, GitHub Issues or Linear, is open) | Two kinds (`contrast`, `ladder`); `issue` optional; two named owners, as the §15.4 example had | The dark surface and border ladder and dark `icon/critical` are not contrast fixes, so as `contrast` entries the redundancy rule would delete them. No tracker issues exist yet, and the repo has one owner | Data edits: fill `issue`, add an approver | `packages/tokens/build/a11y.ts` (`OVERRIDE_KINDS`, the `issue` check); `packages/tokens/src/code-owned/a11y/*.overrides.tokens.json` |
| D-l | Uncached a11y gate ([§15.4](#154-ownership-and-the-override-mechanism) rule 4) | Adopted 2026-10-14 (builder default; the maintainer can override). The token a11y gate runs again outside Turbo's cache as the root `pnpm check:a11y` (`node packages/tokens/scripts/a11y.ts --check`), after `pnpm build` in `pnpm check` | Only inside the cached tokens build; a date among the Turbo task's inputs | A cached build replays a pass after an override expires, because the date is not a cache input, and the local `pnpm check` is the only gate while Actions is off | Drop the step if the tokens build stops being cached | root `package.json` (`check:a11y`, `check`); `packages/tokens/scripts/a11y.ts` |
| D-m | Flat elevations take no dark-mode ring ([§7.1](#71-pipeline-figma--dtcg--outputs), [§7.5](#75-sample-generated-css)) | Adopted 2026-10-14 (builder default; the maintainer can override). An `elevation.<n>` whose every layer has alpha 0 builds as Figma's layers alone (`0 0 0 0 transparent` for `Elevation/0 Flat`, and the same no-op layer when there are none): no `--nz-elevation-ring`, no `--nz-elevation-highlight`. Equal light and dark layer colours print once, as `lightDark()` does for colours | Skip the ring by level (`level === 0`); require zero geometry as well as alpha 0 | A layer at alpha 0 paints nothing at any size, and its dark alpha is 6 × 0, so the elevation is flat in both themes; the ring stands in for shadows that dark surfaces swallow, and there is none. Reading the layers, not the name, survives a rename or renumbering, and a visible level 0 takes the ring like any raised surface | A transform change; the goldens show it | `packages/tokens/build/css.ts` (`elevation()`); `packages/tokens/test/elevation.test.ts` |
| D-n | Docs component routes and example imports ([§18.2](#182-docs-site-public)) | Adopted 2026-10-14 (builder default; the maintainer can override). `apps/docs/scripts/generate.ts` writes one route per component from the exports map (`app/docs/(generated)/components/<name>/page.tsx`, gitignored), and each imports only its own example module. The examples are copied to `apps/docs/.generated/examples/` with their relative imports rewritten to the public subpaths (`./index` → `@nizivo/react/<name>`); an import it cannot map fails the build | One catch-all route that imports every example; importing the examples from `packages/react/src` as they are; a dynamic `import()` per example | Next bundles every client reference a route's server graph imports, rendered or not. With one route, every docs page loaded all four Nizivo client modules: 360.8 KiB gzip of JavaScript with the 39.5 KiB `noModule` polyfill (321.3 KiB without it), as the docs builder measured before the split. A dynamic `import()` per example gave 20 chunks and 367.9 KiB on every docs page, by the same builder, whose report does not say whether that figure includes the polyfill; either way it still loaded every client module. Neither figure was re-measured. Public imports render the examples through what a user installs (`dist`), so a packaging bug shows, and React context keeps one module identity | Docs only; a change touches the generator and the route component | `apps/docs/scripts/generate.ts`, `apps/docs/scripts/examples.ts`; `apps/docs/RESULTS.md` |
| D-o | Where the API records come from ([§18.1](#181-test-layers), [§18.2](#182-docs-site-public)) | Adopted 2026-10-14 (builder default; the maintainer can override). `nz api` reads props and types from the built `dist/*.d.ts` with ts-morph 28, each export's `client` flag from the built `.js`, slots and `data-*` attributes from the component source and the vocabulary, and hooks from the built `dist/css`, re-printed flat by Lightning CSS. It stops with "rebuild @nizivo/react" when a built entry's export names differ from its source barrel. A hook's description comes only from a `/** … */` doc comment in the source CSS. The root `pnpm gen:check` builds `@nizivo/react` (a cache hit in `pnpm check`) before `nz api --check` | Read `src` with the TypeScript checker; publish every CSS comment; run `nz api --check` as its own step after `pnpm build` | The contract is what ships: the schema describes types as written in the public `.d.ts`, `.d.ts` files drop the `'use client'` directive, and the built CSS has custom media substituted and has passed the build's checks. All six existing plain comments on hooks were internal Figma or plan notes. Building inside `gen:check` keeps it working on a clean checkout and keeps generator drift reported before the tests | Tooling only; the JSON carries `"version": 1` | `packages/tooling/api/` (`schema.ts`, `API-JSON.md`); root `package.json` (`gen:check`) |
| D-p | Install-script deny and the fumadocs-ui pin ([§19.1](#191-toolchain-registry-verified-2026-10-14-critique-s-c), [§19.3](#193-security)) | Adopted 2026-10-14 (builder default; the maintainer can override). `allowBuilds` is `{ 'esbuild@0.28.2': false }`: esbuild's postinstall is denied at that exact version, and no script runs. fumadocs-ui is pinned at 16.17.2 with fumadocs-core 16.17.2, and both are in `minimumReleaseAgeExclude` (published 2026-10-13T09:46Z), to be deleted once they are 3 days old (from 2026-10-17) | `allowBuilds: {}` as planned; a bare `esbuild: false`; `strictDepBuilds: false`; fumadocs-core and fumadocs-ui 16.17.1 with no exclusion | With `{}`, pnpm 12 fails every install (`ERR_PNPM_IGNORED_BUILDS` on esbuild 0.28.2, from fumadocs-mdx); the postinstall only validates a binary the JS API finds without it. A bare name would deny every later version's script unreviewed. fumadocs-ui pins its own fumadocs-core version exactly, so 16.17.2 is the only fumadocs-ui for the plan's core pin; the plan pinned only fumadocs-core before this step. 16.17.1 needs no exclusion but changes that pin, and its changes to 16.17.2 were not reviewed | Edit `pnpm-workspace.yaml` and re-lock; the exclusion lapses on its own date | `pnpm-workspace.yaml` (`allowBuilds`, `minimumReleaseAgeExclude`); the docs step's prep report |
| D-q | Field's server → client wiring ([§10.6](#106-field-and-a-form-library-recipe), [§16.1](#161-forms-gap-report-a-d16)) | Adopted 2026-10-14 (builder default; the maintainer can override). `Field` (no directive) calls only `useId` and hands serialisable props (ids, flags, label, description, error, messages, `validateOn`, root attributes) to one `'use client'` leaf, `FieldScope`, which provides the context, owns the native validation message and renders the **whole** anatomy (root, label, description, error) through `fieldRootProps()` from `field.tsx`. Controls read it with `useFieldControl()`; their own props win (an explicit `false` included) and `aria-describedby` is joined. A function child is the zero-JS path: the shell renders the same anatomy and passes ready-made control props. Native validation: `onInvalid` cancels the bubble, shows the message inline and focuses the form's first invalid control once the message is rendered (a layout effect, so `aria-invalid` and the error's id are on the control when focus lands); typing updates it silently. Open: a submit from inside the already-focused first invalid control moves no focus, so nothing announces the new error; the fix needs a narrow exception to §16.5 (a FieldScope-only announcer) and is the maintainer's call. A NativeSelect placed directly in a Field is recognised by an internal mark and wired as a function child would be (D-x) | FieldScope renders only the error slot (the §10.6 sketch); a context-free API where each control takes `field` props | With only the error slot, the root's `data-invalid` and the label could not follow a native message; owning the anatomy also leaves room for `labelBehavior: 'focus'`. Both paths print the same server HTML (tested). One hook keeps third-party controls on the same contract | Internal shape; `useFieldControl`'s return type is public, so a change to it is a minor in 0.x | `packages/react/src/field/` (`FIELD-CONTRACT.md`); `test/ssr/field.test.tsx`; `test/browser/field.spec.tsx`; `fixtures/next` `/forms` |
| D-r | Field and Fieldset subpaths ([§5.2](#52-exports-maps)) | Adopted 2026-10-14 (builder default; the maintainer can override). Two subpaths: `./field` (Field, `useFieldControl`) and `./fieldset` (Fieldset), each with its own stylesheet. Fieldset is a native `<fieldset>`/`<legend>` with no client leaf; its rows sit in a `.nz-fieldset-content` box | One `field` subpath with Field and Fieldset, as §5.2 listed | D-h: one subpath per component keeps the component map's Figma attribution right and lets a page that only groups switches skip FieldScope. The content box exists because a rendered legend is not a flex or grid item in every engine (WebKit ignores the float technique; measured) | Free before 0.1.0 (fold the folders, rerun `nz gen`) | `packages/react/package.json` exports; `src/fieldset/fieldset.css` |
| D-s | Labelling group controls in a Field ([§16.1](#161-forms-gap-report-a-d16)) | Adopted 2026-10-14 (builder default; the maintainer can override). `Field` takes `group`: its label renders with **no** `for`, and the group control (SegmentedControl; later ChipGroup and third-party pickers) names its `role="radiogroup"` root with `aria-labelledby={field.labelledBy}` | Keep `for` (it named no element: the integration fixture caught it as a dangling IDREF); point `for` at the root `div` (not a labelable element); detect the control inside Field | A label `for` must name a labelable element. Field cannot detect the control: under RSC the child reaches it as a client reference, and on the client it may still be a lazy one, so a detected answer could differ between the server HTML and hydration | Additive prop; removing it later is a minor in 0.x | `src/field/field.tsx`; `test/ssr/field.test.tsx` ("group"); `fixtures/runner/spec.ts` (`checkForms`) |
| D-t | SegmentedControl semantics ([§8.5](#85-the-a11y-floor-nzbase), [§9.5](#95-per-component-tier-table-core)) | Adopted 2026-10-14 (builder default; the maintainer can override). Native radios in `<label>`s under a `role="radiogroup"` root, one client leaf, no engine: arrows move and select, Tab enters at the checked item, the form submits and resets it, and it works before hydration. Inside a Field it follows D-s. No sliding thumb: selection changes with a colour fade, and a hidden bold copy of each label reserves its width. WebKit matches no `:focus-visible` on a radio reached by an arrow key, so the item sets `data-focus-visible` after a key, and the generated `nested-input` rule matches it. The attribute is written on the DOM, not through state: re-rendering a focused radio makes React re-write its `name`, after which Chromium gave every radio of an unchecked group its own Tab stop (a parent re-render while such a radio has focus still can). `onValueChange` reports `reason: 'input'` as RadioGroup and Checkbox do, and `value` takes `null` for a controlled empty group. Invalid paints a 1 px `--nz-border-critical` ring on the track | React Aria `ToggleButtonGroup` (toolbar focus, no `name` or form data, nothing before hydration); React Aria `RadioGroup` (engine bytes for what native radios do); a CSS-only sliding thumb (needs anchor positioning, beyond the floor) | The design calls it a range picker with no panels: a radio group (figma/06 §6.5). Native radios give the APG keyboard and forms for 1.2 KB of own code | Behaviour is native; a thumb or an engine later is additive | `src/segmented-control/`; `test/browser/segmented-control.spec.tsx`; `fixtures/floor-lane/results/w3-controls/` |
| D-u | Checkbox, RadioGroup and Switch API ([§16.1](#161-forms-gap-report-a-d16)) | Adopted 2026-10-14 (builder default; the maintainer can override). Native `<input>`s with `appearance: none`, so `:checked` and `:indeterminate` repaint with no JavaScript; no React Aria. Checkbox `checked` takes `true`, `false` or `'indeterminate'` (a DOM property, so the server HTML shows it unchecked until hydration). RadioGroup is a server `<Fieldset role="radiogroup">` around one client part that passes the group's name and value. No `CheckboxGroup`: a Fieldset holds checkboxes. `readOnly` is not supported on the three. Callbacks report `reason: 'input'` | React Aria `Checkbox`, `RadioGroup` and `Switch`; a `CheckboxGroup` export (figma/02) | Native inputs submit before hydration and keep the forced-colours and focus rules on the input itself (§8.5). `readOnly` has no effect on these inputs, and faking it needs `aria-readonly` plus a blocked change | A group export or `readOnly` later is additive | `src/checkbox/`, `src/radio-group/`, `src/switch/`; `test/browser/toggles.spec.tsx` |
| D-v | IconButton defaults ([§9.5](#95-per-component-tier-table-core)) | Adopted 2026-10-14 (builder default; the maintainer can override). `label` is required and is the `aria-label` and the tooltip text; the tooltip is on by default (`tooltip={false}` renders the server path, `{ side, align, delay }` tunes it). The button is **not** described by its tooltip, which only repeats the name; a `shortcut` is announced through `aria-keyshortcuts` instead (`mod+b` → `Meta+B Control+B`: the server does not know the platform, so both alternatives are listed). `pressed` makes it a toggle (`aria-pressed`; secondary and tertiary take the brand tint, border and glyph). Manifest tier `server` (split): its engine part is Tooltip's | Tooltip off by default; keep the Tooltip's `aria-describedby`; tier `engine` (component-inventory §1) | The design rule is "always paired with a tooltip". Describing the button by its own name makes screen readers say it twice. Tier `engine` requires the component's own adapter and contract (COMPONENT-JSON.md) | Defaults; a change is a minor in 0.x | `src/icon-button/`; `test/browser/icon-button.spec.tsx`; `fixtures/next` `/icon-button-tooltip` |
| D-w | Textarea auto-grow ([§16.1](#161-forms-gap-report-a-d16), [§4.1](#41-layers) L3 guard) | Adopted 2026-10-14 (builder default; the maintainer can override). `field-sizing: content` inside `@supports (field-sizing: content)`, with a minimum height rebuilt from `rows` (`[rows='1']` … `[rows='10']` set a private variable; no inline style, so CSP Profile B holds). The Lightning CSS guard accepts `field-sizing` only inside such a block (`SUPPORTS_GATED_PROPERTIES`, not under `not`); everywhere else it still fails the build | No auto-grow until the floor has `field-sizing`; a JavaScript auto-size | Chrome 123 (the floor) grows; Firefox 129 and Safari 17.5 keep `rows` and manual resize, measured on the floor lane. The guard stays strict for every other property | One block in `textarea.css` and one set in `floor.ts` | `src/textarea/textarea.css`; `scripts/css/floor.ts`, `compile.ts`; `test/css/build.test.ts`; `fixtures/floor-lane` `w3-controls` |
| D-x | NativeSelect tier and skin ([§9.5](#95-per-component-tier-table-core)) | Adopted 2026-10-14 (builder default; the maintainer can override). `server`, no directive: inside a Field it is wired as plain attributes, either placed directly (Field recognises it by an internal mark on the component and wires it as a function child; its own props win, its own `id` takes the label) or through the zero-JS function child (`<Field>{(c) => <NativeSelect {...c} />}</Field>`). Wrapped in a consumer's own component it is not recognised and needs the function child. It copies the shipped Select trigger's metrics (measured equal at sm, md and lg in Chromium and WebKit), takes `placeholder` and `leadingIcon`, accepts and drops `readOnly` so a Field function child spreads in, and omits `multiple` and native `size` | A client leaf that reads FieldScope (component-inventory §1: "every control is a thin client leaf") | NativeSelect exists for zero-JS server forms; a client leaf would ship code for a native element | A client variant later is additive | `src/native-select/`; `fixtures/next` `/native-select`, `/field-zero-js` |
| D-y | Input DOM ([§8.2](#82-class-slot-and-naming-conventions), [§8.5](#85-the-a11y-floor-nzbase)) | Adopted 2026-10-14 (builder default; the maintainer can override). The root is the bordered box, `span.nz-input[data-slot=input]` (`focusTarget: "within"`; `className`, `style` and `render` apply there), around `input.nz-input-control`, which takes every other prop and the `ref`. A press anywhere on the box focuses the input. `type` is one of `text`, `email`, `search`, `password`, `number`, `tel`, `url` | `.nz-input-group` around `.nz-input` (§8.5, COMPONENT-JSON.md) | `nz api` requires a component's root slot to be its own name (§8.2). The other types (checkbox, file, date, …) are other components | Renaming is breaking after 0.1.0 | `src/input/`; `contracts/api/react/input.json` |
| D-z | ThemeScript, platform half ([§7.4](#74-theme-mechanism)) | Adopted 2026-10-14 (builder default; the maintainer can override). `@nizivo/react/theme-script` exports `ThemeScript` (`nonce`) and the `themeScript` string (257 bytes). It sets `data-nz-platform` to `apple` when `navigator.userAgentData.platform`, else `navigator.platform`, matches `/mac\|iphone\|ipad\|ipod/i`, else `other`; it never reads the user-agent string, keeps a value already on `<html>` and never throws. The theme half is not built | Wait and ship both halves together | Kbd and IconButton shortcuts need the platform before first paint now; the theme half needs the storage key and `system` semantics settled with the docs switch | The script string is semver'd by its published hash (`sha256-HZHIu/4RWssbJrteyX51NbvdyR6ZSlZlY4BPl3yXw+I=`, in its JSDoc and the Next guide, pinned by a unit test); adding the theme half changes it (a minor in 0.x) | `src/theme-script/`; `test/ssr/theme-script.test.tsx`; `fixtures/next/app/layout.jsx` |
| D-aa | What the client-module gates assert ([§9.5](#95-per-component-tier-table-core), [§16.1](#161-forms-gap-report-a-d16), [§18.2](#182-docs-site-public)) | Adopted 2026-10-15 (builder default; the maintainer can override). The docs smoke (`CLIENT_PAGES`) and the Next fixture (`PageSpec.imports`) allow, and the smoke requires, every client module a page's server graph **imports**, not only those its examples **render**: Turbopack and `next dev` ship a leaf a server shell imports even when no example renders it (FieldScope behind a function child or a NativeSelect, about 2.7 KB min+gz bundled; the IconButton tooltip chain behind `tooltip={false}`, about 17 KB). Production webpack drops them | Client-import-free entries now (an `IconButton` static module, a Field shell module with no FieldScope import) so the render-only invariant holds | The bytes are recorded per page (W3-RESULTS.md, fixtures/next/RESULTS.md); separate entries add public subpaths, which is the maintainer's call before 0.1.0 | Restoring the render-only assertion is a gate change; the entries would be additive subpaths | `apps/docs/scripts/smoke.ts`; `fixtures/runner/spec.ts`; `fixtures/next/RESULTS.md` |
| D-ab | SegmentedControl over the own-leaf cap ([§17.2](#172-own-code-css-icons-and-charts)) | Adopted 2026-10-15 (builder default; the maintainer can override). SegmentedControl's client leaf is 1.18 KB min+gz of own code, over §17.2's 1 KB cap for an own input leaf; its budget is recorded at measured + 10% (1.3 KB) | Trim it under 1 KB now (drop the WebKit focus fallback or the reserved bold width) | Both carry a11y or layout behaviour the review asked for; the overrun is 0.2 KB on a page that already ships FieldScope | The limit is a number in `component.json`; nothing enforces it until `size-limit` lands (W5) | `src/segmented-control/component.json`; `packages/react/W3-RESULTS.md` |

---

## Appendices

### A. Companion documents

- [component-inventory.md](component-inventory.md) — every Figma component set, ghost master and missing component, mapped to its Nizivo export, subpath, tier, RSC class, release and variant mapping.
- [figma-handoff.md](figma-handoff.md) — the consolidated design backlog: questions, missing states, token requests, hygiene tasks and sign-off gates.

### B. Research reports (in this repo)

- [research/00-critique.md](research/00-critique.md) — contradictions C1–C36, suspect claims S1–S10, gaps G1–G22, missing components, decisions D1–D15, registry and plan checks.
- [research/r1-framework-compat.md](research/r1-framework-compat.md) — React 19.x, RSC, Next, Vite, Astro, React Router, TanStack Start.
- [research/r2-styling.md](research/r2-styling.md) — zero-runtime styling, layers, theming, Tailwind interop, browser floors.
- [research/r3-headless-primitives.md](research/r3-headless-primitives.md) — engine comparison and measurements, adapter boundary, tiering.
- [research/r4-build-release.md](research/r4-build-release.md) — monorepo, tsdown, exports, OIDC release.
- [research/r5-quality-docs.md](research/r5-quality-docs.md) — testing, a11y automation, visual regression, docs, governance, licence.
- [research/r6-heavy-modules.md](research/r6-heavy-modules.md) — charts, motion, icons, media, lab.
- [research/r7-token-pipeline.md](research/r7-token-pipeline.md) — DTCG, Terrazzo, extractors, drift, Figma plan limits.
- [research/r8-extensibility-distribution.md](research/r8-extensibility-distribution.md) — swap matrix, eject levels, registry experiments.

### C. Figma reports (in this repo)

- [figma/00-tokens-and-styles.md](figma/00-tokens-and-styles.md) — the token and style snapshot every value here comes from.
- [figma/01-foundations.md](figma/01-foundations.md), [figma/02-actions-forms.md](figma/02-actions-forms.md), [figma/03-data-viz.md](figma/03-data-viz.md), [figma/04-dashboard-widgets.md](figma/04-dashboard-widgets.md), [figma/05-commerce.md](figma/05-commerce.md), [figma/06-navigation.md](figma/06-navigation.md), [figma/07-feedback-overlays.md](figma/07-feedback-overlays.md), [figma/08-overview-dashboard.md](figma/08-overview-dashboard.md), [figma/09-lab.md](figma/09-lab.md), [figma/10-instagram-storefront.md](figma/10-instagram-storefront.md).
- [figma/11-w2-server-safe-components.md](figma/11-w2-server-safe-components.md) — week 2 facts for the server-safe components, including the ghost diffs of seven sets.

### D. Phase-2 evidence

Index: [research/phase2/README.md](research/phase2/README.md). Where a phase-2 file disagrees with this plan, this plan wins.
- **Gap reports:** [A](research/phase2/gaps/gap-a-forms-tables-dates.md) (forms, data tables, dates, command menu; D16–D20, bundle increments), [B](research/phase2/gaps/gap-b-i18n-security-states.md) (i18n/RTL, CSP matrix, supply chain, loading/empty/error contract), [C](research/phase2/gaps/gap-c-overlays-dark-a11y.md) (overlay layering model and O-01…O-25, dark elevation, contrast remediation with computed ratios; scripts in `research/phase2/scripts/contrast/`).
- **Spikes S1–S4:** [summary](research/phase2/spikes/README.md) plus scripts, configs and outputs: Lightning CSS and the `light-dark()` nesting matrix; the Next 16.4 RSC namespace export test and client-JS measurement; Terrazzo 2.8.0 permutations and the Tailwind plugin; the spring → `linear()` solver.
- **The three design proposals** ([lean](research/phase2/design/proposal-lean.md), [seams](research/phase2/design/proposal-seams.md), [velocity](research/phase2/design/proposal-velocity.md)) and **the three judge verdicts** ([swappability](research/phase2/design/verdict-swappability.md), [technical correctness, with re-runs V1–V13](research/phase2/design/verdict-correctness.md), [feasibility](research/phase2/design/verdict-feasibility.md)).

### E. Glossary

| Term | Meaning |
|---|---|
| T0 / T1 / T2 | Native or server-rendered (0 KB) / engine-backed (React Aria) / our own code on platform APIs |
| E0–E4 | Consumer customisation depth: theme, restyle, recompose, re-skin, replace |
| Hook | A public component CSS variable `--nz-<component>-*`, read but never assigned by Nizivo |
| Seam | A replaceable boundary with a contract file, a machine check, a price and a second implementation |
| Override / proposal | A time-boxed code value for an existing Figma variable (override) or for a variable Figma does not have yet (proposal); CI deletes each once Figma catches up |
| `OverlayEngine` | One engine family's shared overlay core: portal container, hide-outside, scroll lock, dismiss stack, focus return, `markTopLayer` |
| Server-safe | A module with no directive and no state, effect or context hooks; renders in a Server Component with zero client JS |
| Provisional | Shipped, but outside semver until design confirms (the `lg` breakpoint; Dialog `sm` and `lg` widths) |
| Preview | Shipped, but not yet design-reviewed (dark mode in v0.1) |
