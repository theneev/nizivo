# Verdict: swappability and layer contracts

Date: 2026-10-14. Judge lens: **swappability and layer contracts.** For each layer, the question is whether a consumer, or the Nizivo team a year from now, can replace it without forking and without breaking the other layers. I also ask whether each seam is real (enforced by build, lint or tests) or only prose, and whether any seam costs more than it is worth.

## Inputs and evidence

**Proposals.** I read all three in full: `proposal-lean.md` (1,529 lines), `proposal-seams.md` (1,507) and `proposal-velocity.md` (1,386).

**Other inputs.**
- The critique: C, S and G lists, and the top-15 decisions.
- Gap-c §1.1–1.4 (overlays).
- r3 §8 (adapter boundary) and r8 §5.4–5.6 (primitive adapter, swap matrix, eject levels).

**Spike evidence.** `scratchpad/spikes/REPORT.md` **does not exist**. All three proposals note this and cite the raw artifacts instead. I checked those artifacts directly:

| Spike | What I checked | Result |
|---|---|---|
| **S2** (RSC namespace exports) | `build-turbopack-with-ns-a.log` and `build-webpack.log` | Both fail with "Element type is invalid … got: undefined" on `/ns-a`. CONFIRMED |
| **S2** | `build-turbopack.log`, `build-webpack-ok.log`, and `lib/src/sheet/sheet.parts.ts` | The build passes when a directive-free `sheet.parts.ts` re-exports `*.client.tsx` leaves directly. CONFIRMED. **No spike tested an extra directive-free hop** (lean's `parts.ts → engine.ts → adapter`) |
| **S1** (`light-dark()`) | `matrix-results.json`, 84 rows, Chromium 156 and WebKit 27.2 | Native nesting works (d1=D, d1-l2=L, d1-l2-d3=D). An unset or `normal` root under OS dark resolves to L. The lowered output and `@property` both break nesting, and the lowered output with an unset root is transparent. CONFIRMED. Firefox was not run |
| **S3** (Tailwind adapter) | `out/tailwind-theme.custom.css` | Emits `--color-bg-surface: var(--nz-bg-surface)` with **no `nz` namespace**. Seams and velocity propose `--color-nz-*`. That is a trivial plugin change, but it was not spike-verified |
| Lean's dialog spike | `design/dialog-spike/run.mjs` | Prints to the console only; no results were persisted. Treated as PLAUSIBLE, not verified |
| Lean's M-lean measurements | `design/measure/*.mjs` | These measure hook exports only (no own-DOM code); lean says so |

**Package naming.** All three proposals change what the user was told: the core package becomes **`@nizivo/react`**, so the import is `import { Button } from "@nizivo/react"` or `"@nizivo/react/button"`. **`@nizivo/ui` is not used** (lean L44, seams L38, velocity L40). I agree. A framework-named binding keeps `@nizivo/tokens`, and a future `@nizivo/css` or non-React port, from colliding with it, and the rename is free before the first publish.

---

## 1. Headline

| Rank | Proposal | Overall (lens) | One-line reason |
|---|---|---|---|
| 1 | **Seams** | **8.6** | Each seam has a contract file, a machine check and a price. The public part owns the CSS contract; the adapter owns only behaviour, through a typed `XEngine` interface. Theme logic is lint-confined to tokens. The a11y floor survives a re-skin. Some over-splitting (`@nizivo/motion`; tokens re-shipped inside `core.css`) |
| 2 | **Velocity** | **7.2** | Strong machine checks: a vocabulary check on *emitted* CSS, generated barrels and exports, CI fails on generator drift, and an icon-import lint. But the adapter *is* the public part, and the proposal states "Second-engine conformance: No swap is planned" (L1349). The engine seam is promised, never proven |
| 3 | **Lean** | **6.4** | It is the only proposal with a second adapter green from v0.1 (L163). But its overlay CSS contract is native-only (`::backdrop`, `[open]`, `:modal`, L871–881), so the break-glass adapter cannot satisfy it. Its own Card sketch assigns a public hook it says is never assigned (L944–946), and no lint enforces the rule |

The overall score is not the plain mean of the §3 rows (mean over D1 and D3–D15: lean 6.6, seams 8.6, velocity 7.4). It weights the three load-bearing seams more heavily: D1 (engine), D4 (CSS contract) and D8 (overlays). That is where lean and velocity lose most.

**No flaw found through this lens is fatal.** Every flaw below can be fixed inside the proposal's own structure, so I label them *serious* or *minor* rather than inflate them.

---

## 2. Layer-by-layer: is each seam enforced or only prose?

"Enforced" means a named build, lint or test step fails when the contract breaks. "Prose" means the proposal only states a rule.

| Layer | Lean | Seams | Velocity | Best seam |
|---|---|---|---|---|
| **Tokens and theme values** | Enforced: golden `dist`, a lint banning primitives in component CSS (L148), `normalize(raw)===figma-owned` | Enforced: golden files on every output; `contract.json` (public names and types); stylelint "token names must exist in `contract.json`" (L465); the `nz-check-theme` validator for consumer themes (L198) | Enforced: golden `dist`, the `api/tokens.json` diff, stylelint banning `--nz-p-*` outside tokens (L175) | **Seams** |
| **Theme mechanism** (`light-dark()` vs blocks) | Prose: "how a theme is computed is not public" (L141); no lint keeps theme logic out of component CSS | **Enforced**: stylelint bans `light-dark(`, `prefers-color-scheme` and `[data-nz-theme` outside `packages/tokens` (L66, L467). `tokens.blocks.css` ships as a real second output (S3 shape verified) | Prose, plus a config switch (D6a reverse); no lint | **Seams** |
| **Behaviour engine** | Partly enforced: guard on directive-free modules importing react-aria (L388). **Second adapter green from v0.1** (Dialog, Tooltip). But each adapter owns DOM and classes, and the CSS contract is native-specific (§4.1) | **Enforced**: dependency-cruiser and `no-restricted-imports` (only `_engines/**` may import react-aria); a packed `.d.ts` grep; a typed `XEngine` interface per component (L698); public leaves own classes and `data-slot` (L760–790). Second adapter promised by v0.3 (R1, L1469) | Enforced imports (oxlint) and an emitted-CSS vocabulary check (L392). The adapter **is** the public part (L627, L693). **No second engine ever planned** (L1349) | **Seams**, plus lean's continuously-green second adapter |
| **Styling / CSS** | Partly: class-name stylelint, `css-contract-diff`, hook extraction. **No lint against assigning public hooks, and the Card sketch violates the rule** (L944–946). Focus outline sits in component CSS, so it is lost on a re-skin | **Enforced**: manifest diff (`contracts/api/css`); stylelint for no hook assignment (L464), logical properties, spring pairing and layer-line-first. **a11y floor in `nz.base` survives a re-skin** (L210, L649–668) | **Enforced**: `check-css-vocabulary.mjs` on **emitted** CSS. No shipped CSS may target engine attributes such as `data-rac` (L392). It does not detect a variant that forgets to read a hook (L541–555) | **Seams**, plus velocity's emitted-CSS check |
| **A single component** | Recompose is limited: react-stately static collections need items as direct children, and "client wrappers are opaque" (L604–607). Public `./contracts` helpers let a consumer rebuild a part that emits the same contract (L176) | E0–E4 eject levels, each with what still flows from npm. Parts mirror APG and props mirror HTML. Typed `augment` maps (expect-type test) | Restyle, recompose, re-skin and replace levels (L216–220). `component.json` + `nz gen`: plug-out = delete the folder and regenerate (L437) | **Seams**, plus velocity's plug-out and lean's `./contracts` |
| **Heavy modules** (charts, motion, lab) | Slots; `ChartFrame` accepts any renderer. Charts **peers on `@nizivo/react`** (L193) | Slots, enforced by dependency-cruiser. `ScaleLike` structural interface (d3 scales plug in). **Charts imports nothing from `@nizivo/react`** (L276). Motion adapter via an optional peer | Slots; `ChartFrame` accepts a renderer. Charts peers on `@nizivo/react` exact (L244) | **Seams** |
| **Distribution channel** (npm ⇄ registry) | Registry from `registry/`, separate from docs examples. Immutable URLs, SHA manifest, private mirror possible. Forks import public `./contracts` | `patterns/**` is a single source for docs and registry; item-policy linter; forks and re-skins generated; graduation rule | Docs examples **are** the registry sources (L307). Registry deferred to v0.3, after the churn | Tie **seams/velocity**, plus lean's `./contracts` |
| **Icons** | Slots. Exact 1.6 px stroke via a CSS calc on `--_nz-icon-size`, which couples icons to component CSS | Slots plus dependency-cruiser (core never imports icons) | Slots, **a lint banning `@nizivo/icons`/`lucide*` in `packages/react`** (L181), and `aliases.json` for regenerating from another source (L229, L305) | **Velocity** |
| **Docs / registry / workshop** | `*.example.tsx` rendered by docs; stories live separately in the workshop | `*.example.tsx` consumed by both Fumadocs and Storybook, with a "both consumers build" check (K15). Props tables come from `contracts/api` | Examples feed docs, stories and registry. The generator stubs docs; props tables come from `api/` | Tie **seams/velocity** |

---

## 3. Scores per decision (0–10, this lens only)

L = lean, S = seams, V = velocity. Each line gives only the swappability reason.

| ID | L | S | V | Lens rationale | Recommended |
|---|---|---|---|---|---|
| **D1** Engine and seam | 6 | 9 | 6 | **S:** the public leaf owns classes, `data-slot` and Field wiring; the adapter implements a typed `XEngine` and maps render state through `stateAttrs` (L402: "never copy engine DOM attributes"). Engine swap is a **minor**; `'unknown'` is used where RAC gives no reason (L734). **L:** a second adapter exists, but adapters own DOM and classes; the hooks-altitude collection walk restricts composition; release class is "patch" (L161); a second swap point `_engines/current/attrs.ts` (L239); the `engine.ts` hop is not S2-tested. **V:** the adapter is the public part; conformance-lite checks vocabulary attributes but not classes or slots (L740); "No swap is planned" (L1349) | Seams structure + lean's always-green second adapter, moved early (a native Tooltip adapter is cheap) + velocity's emitted-CSS vocabulary check |
| **D3** Packages and distribution | 7 | 8 | 8 | **S:** a private `packages/css` keeps a future `@nizivo/css` split additive; charts is independent of react. But `@nizivo/motion` is a separate npm package for about 1 KB of hooks (L63, L277), which contradicts its own X3/X4 reasoning. **V:** three packages; motion is a subpath; registry and docs share one source. **L:** five packages; registry sources are separate from docs examples; the public `./contracts` export is a good fork seam | Velocity's package set (tokens, react, icons; charts in v0.2; motion at `@nizivo/react/motion`; lab independent and on demand) + seams' charts-without-react + lean's `./contracts` helpers |
| **D4** Styling contract | 5 | 9 | 7 | **S:** hooks are read at the property (`var(--nz-x, var(--_nz-x))`) and variants set only privates, so a variant can never shadow a hook. Stylelint forbids assignment. The a11y floor is in `nz.base`. `nz.patterns` is reserved for consumer and registry CSS. **L:** the same pattern on paper, but Card assigns `--nz-card-bg` (L944–946) with no lint; `:popover-open`, `:modal` and `[open]` are public CSS state carriers (L293–295), which ties re-skins to the native engine. **V:** the pattern re-wraps the hook inside every variant private, so the border hook is silently dead on four variants (L541, 544, 549, 555). Core patterns (KpiTile, AppShell) sit in `nz.patterns` (L349), where they tie with consumer or registry pattern CSS | Seams, plus velocity's check on emitted CSS and its `css/manifest.json` |
| **D5** Token pipeline | 8 | 9 | 8 | All three use an extractor adapter writing one raw format, a normalizer invariant, and golden files behind the Terrazzo builder. **S** adds a `contract` plugin (public names, types and layer, feeding stylelint and `nz-check-theme`) and states plainly that the Style Dictionary swap is untested. **V** has the most plan-robust v0.1 extractor path (web upload, no PAT) | Seams + velocity's v0.1 no-PAT upload |
| **D6** Theme mechanism | 7 | 9 | 7 | **S:** theme logic is lint-confined to tokens; `nz.themes` lets a theme win regardless of import order (L381); `tokens.blocks.css` is a real alternate output; inverse is handled by `data-nz-scheme`. **L, V:** same mechanism, but prose-only confinement | Seams; add velocity's "dark ships as preview" status valve |
| **D7** Floors | 7 | 8 | 7 | **S:** the consumer can import `tokens.blocks.css` to lower the *token* floor with no component change. **L:** per-feature fallbacks live inside own adapters and are deleted when the floor rises (a good swap habit). **V:** reverse by config only | Seams (17.5 floor, blocks compat output) + lean's fallback-deletion policy |
| **D8** Overlays and layering | 4 | 9 | 7 | **S:** the gap-c model; it **keeps `.nz-dialog-backdrop` as an element so a future native adapter must render it** (L68). That is the only proposal that protects the CSS contract across the native swap. **L:** a native top layer coexists with engine portal and inert behaviour plus a toast outlet watching consumer `<dialog>`s through a MutationObserver. The CSS uses `::backdrop`, `[open]` and `:modal` (L871–881), so the RAC break-glass adapter cannot honour it, and the D8 blast-radius column omits this (L76). **V:** the gap-c model, but the scrim class sits on the positioner and there is no Backdrop part, so a native swap would need re-mapping | Seams |
| **D9** Residual config | 8 | 8 | 8 | Identical in substance: no provider, an optional client `NizivoConfig`, an `I18nProvider` per engine root, and `render`/slots for links | Seams or velocity (tie) |
| **D10** Responsive and layout | 6 | 8 | 8 | **V:** `md`/`lg` are not emitted until design confirms, so no guess is frozen into semver. **S:** provisional breakpoints are marked `$extensions.status: "provisional"`, outside semver; parts-first nav, with config nav as a registry pattern. **L:** emits `lg` = 80rem and uses it in tokens, with no semver exemption | Velocity's "don't emit" + seams' provisional flag and parts-first nav |
| **D11** Charts | 7 | 9 | 7 | **S:** the `ScaleLike` structural seam (d3 scales plug in unchanged), a renderer child, an opt-in `./d3` subpath for time, and **no dependency on `@nizivo/react`**. **L, V:** renderer child only; charts peers on react | Seams |
| **D12** Motion | 7 | 8 | 7 | **S:** stylelint enforces spring-easing/duration pairing. That is a machine check on C10's rule. All three use one generator with golden values | Seams' lint and generator; hooks at `@nizivo/react/motion` (L, V), not a package |
| **D13** Icons | 7 | 8 | 9 | **V:** a lint banning icon imports in core + `aliases.json` for source swaps + `mirror.json`. **S:** dependency-cruiser. **L:** the CSS stroke calc couples the icon package to component CSS | Velocity |
| **D14** Toolchain and governance | 7 | 9 | 8 | **S:** a single `contracts/` directory (layers, vocabulary, react/css/token manifests) as the semver'd surface, CI-diffed. **V:** the generator keeps exports, size-limit and component-map consistent (CI fails on diff). **L:** manifests exist but are scattered | Seams `contracts/` + velocity `nz gen` for bookkeeping |
| **D15** A11y remediation | 7 | 9 | 7 | All share the same override file with expiry, drift and redundancy checks. **S** alone keys the a11y floor (focus outline, hit area, forced colours) to stable classes in `nz.base`, so replacing a component's CSS cannot remove it | Seams |
| **G11** Forms | 8 | 9 | 8 | **S:** a `useFieldControl()` hook lets third-party controls plug into Field (K12), with recipe tests. **L, V:** the zero-JS function child is also a good seam | Seams + the function child |
| **G12** Data table | 8 | 8 | 8 | Identical (gap-a D17): native parts in core, TanStack only in the registry | Tie |
| **G13** Dates | 8 | 8 | 8 | Identical: the public type is an ISO string, so internals can move to Temporal as a patch | Tie |
| **G14** i18n/RTL | 8 | 8 | 7 | A serializable `labels` seam in all three. **V** starts en-US-only and defers RTL VR to v1.0 | Seams |
| **G15** Overlay conformance | 8 | 8 | 5 | **L:** runs the same suite on own and break-glass adapters from v0.1, plus N-tests. **S:** the suite runs per engine. **V:** conformance-lite in v0.1; the full O-suite only at v1.0 (L127); no second engine ever | Lean's "every adapter, same suite" + seams' per-engine testkit |
| **G16** Dark elevation | 8 | 8 | 8 | Token values only, in all three | Tie |
| **G17** Security | 8 | 8 | 7 | **L:** Profile B is guaranteed for T0 and own overlays, enforced by a lint on `style=` in directive-free modules. **V:** Profile A/B fixtures only in v0.3 | Lean |
| **G18** Hotkeys | 8 | 8 | 8 | The same `registerHotkey` matcher seam | Tie |
| **G19** A11y ownership | 8 | 8 | 8 | The same RACI and CODEOWNERS | Tie |
| **G20** Status contract | 8 | 8 | 8 | The same `status` contract; the fallback is the same component | Tie |

Averages over D1 and D3–D15: lean 6.6, seams 8.6, velocity 7.4. The gap rows converge because all three adopt the gap reports, so they barely discriminate.

---

## 4. Per proposal: best idea to graft, flaws, over-engineered seams

### 4.1 Lean

**Best idea to graft: a second adapter, always green.** Keep a second implementation for the riskiest components compiling and passing the *same* conformance suite nightly from v0.1 (L50, L163, L1452). This is the only proposal where the engine seam is **proven**, not promised. A seam with one implementation is a hypothesis.

Runner-up: a public `@nizivo/react/contracts` entry (`render`, `mergeProps`, and the state vocabulary helpers) (L176). Registry forks, and consumers who replace a component outright, can then emit the exact class, slot and state contract without importing internals.

**Serious flaws.**
1. **The overlay CSS contract is bound to the native engine.**
   - Dialog CSS styles `::backdrop`, `@starting-style { &[open] }` and `:root:has(.nz-dialog-popup:modal)` (L869–881).
   - The vocabulary makes `[open]`, `:popover-open` and `:modal` public CSS state carriers (L293–295).
   - The vocabulary lists `data-open` on a "backdrop" (L301), yet the native Dialog renders no backdrop element.
   - The break-glass RAC adapter renders `div`s with no `::backdrop`, no `[open]` and no `:modal`. Flipping `engine.ts` would therefore drop the scrim, the entry animation and the scroll lock, and would break every consumer re-skin written against those selectors.
   - D8's blast-radius column says only "popup DOM placement … z tokens and parts are unchanged" (L76).
2. **The hook contract is prose, and the proposal's own sketch breaks it.**
   - §6.4 says public hooks are "read, never assigned by the library" (L344).
   - Card tone rules assign `--nz-card-bg` (L944–946). A consumer's ancestor or global `--nz-card-bg` is therefore ignored on subtle, brand and accent cards.
   - The CI list has a class-name stylelint (L336) and `css-contract-diff`, but no rule forbids assigning a hook.
3. **The hooks-altitude collections reduce recompose.**
   - `SelectItem` and `SelectGroup` are declaration-only parts found by walking children. "Client wrappers are opaque", and the rule is "items are direct children of SelectList" (L604–607).
   - A consumer cannot wrap an item in their own component, a pattern RAC's collection builder supports. This narrows the "single component" seam for every collection widget, and the walk under RSC client references is itself unverified (lean's verify-next #4).
4. **Two layering systems are coupled at runtime.**
   - These are the native top layer, react-aria portals with `inert`/scroll-lock, and a toast outlet that follows consumer `<dialog>`s through a MutationObserver (L76, L891–892).
   - The overlay layer therefore depends on app DOM and on engine internals, and lean's own risks 5–6 (L1509–1510) list the interactions.

**Minor flaws.**
- An engine swap ships as a **patch** (L161); r3/r8 and the other two say minor.
- `_engines/current/attrs.ts` is a second swap point (L239, L326).
- The `parts.ts → engine.ts → adapter` hop is not covered by S2; it was flagged, but not run.
- `details.reason` is fabricated: `o ? 'trigger' : 'item-press'` and always `'item-press'` (L636–638). A public field the default engine cannot honestly fill is a contract the next engine will "change".
- Charts peers on `@nizivo/react` (L193).

**Over-engineered seams:** none. Lean under-builds enforcement rather than over-building seams.

### 4.2 Seams

**Best idea to graft: split each engine-backed part.** The **public leaf** (`select-trigger.client.tsx`) owns classes, `data-slot`, hooks and Field wiring. The **adapter** implements a typed `XEngine` interface and receives a normalized `render` function, mapping engine render state through `stateAttrs` generated from `vocabulary.json` (L698–790, L402). A new engine then *cannot* change the styling contract, because it never touches it. This sits under a seam ledger rule: every kept seam has a contract file, a machine check, a price and a realistic second implementation (L19–24, L141–178).

**Serious flaws:** none.

**Minor flaws.**
- **`@nizivo/motion` as its own npm package** (L63, L277). It costs a trusted-publisher entry with 2FA for about 1 KB of hooks plus an optional adapter, contradicting the proposal's own X3/X4 cuts. A subpath (`@nizivo/react/motion`) gives identical tree-shaking.
- **`css/core.css` bundles tokens into `@nizivo/react`** (L274), so two token copies can skew (R14, L1482). This blurs the token/CSS layer boundary: a consumer who replaces the token set still loads Nizivo's tokens through `core.css`, because the a11y floor lives in the same file. Velocity's split is cleaner: `css/base.css` has no tokens, and tokens come only from `@nizivo/tokens`.
- **The second adapter only by v0.3** (R1, L1469). It should come earlier.
- Vocabulary stylelint runs on *source* CSS in `packages/css`. After an authoring-tool swap only the manifest diff guards the output, so velocity's emitted-CSS check is the stronger form.
- Selection `details('item-press')` is still fabricated for keyboard selection (L732).

**Over-engineered seams.**
- `@nizivo/motion` (above).
- The `nz-check-theme` bin (L198) is useful, but can wait until a consumer ships a theme.
- K6, the "CSS authoring tool" seam, has no planned second implementation. It is free only because it is the K5 output contract restated, so it should not count as a separate seam.

The `XEngine` interface, `contracts/` and `nz.themes` are **not** over-engineered: each one is cheap and closes a real failure mode.

### 4.3 Velocity

**Best idea to graft: check the contract on emitted CSS.** `check-css-vocabulary.mjs` parses every **shipped** CSS file with Lightning CSS and fails on any selector outside the documented vocabulary. Engine attributes such as `data-rac` may appear in the DOM, but no shipped CSS may target them (L392). Because it runs on the output, it survives both an engine swap and an authoring-tool swap.

Runner-up: `component.json` + `nz gen` with CI failing on generator drift. "Removing a component means deleting the folder and regenerating" (L408–437) makes plug-out mechanical.

**Serious flaws.**
1. **The engine seam is never exercised.**
   - "Second-engine conformance | No swap is planned" (L1349).
   - v0.1 has conformance-lite only (L737–744); the full O-suite comes at v1.0 (L127).
   - For a user who asked that "anything can be plugged in or plugged out later", an unexercised seam is the riskiest kind: contract drift toward RAC-only behaviour goes unnoticed. Velocity's own vocabulary is RAC-aligned "so the RAC adapter is mostly identity" (L358).
2. **The adapter is the public part.**
   - Generated barrels export parts straight from `_engines/react-aria/select.client` (L627, L630), and the adapter writes `nz-select-trigger`, `data-slot` and so on (L679, L693, L710).
   - Every new engine adapter must re-implement the class and slot contract.
   - Conformance-lite asserts vocabulary *attributes* but not classes or `data-slot` (L740). A Base UI adapter could pass conformance while breaking every consumer re-skin; only Argos (light, desktop) would notice.

**Minor flaws.**
- The hook pattern re-wraps `var(--nz-button-x, …)` inside every variant private, so forgetting to re-wrap silently kills a hook. The border hook is dead on primary, tertiary, critical and accent (L541, 544, 549, 555). The "no assignment" lint cannot detect this.
- Core patterns (KpiTile, TrendCard, AppShell) live in `nz.patterns` (L349), so registry or consumer pattern CSS in the same layer ties with them on order.
- `details.reason` is fabricated: `o ? 'trigger' : 'escape'` reports an outside press as `'escape'` (L673–674).
- Charts peers on `@nizivo/react` exact (L244).

**Over-engineered seams:** none. The generator is justified as velocity tooling, and its outputs are committed, so dropping it later costs nothing.

---

## 5. Recommended composite, through this lens

1. **Layer statement (semver'd, fixed once).** `@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;`
   - This is seams' order. `nz.themes` lets brand and consumer themes beat base tokens regardless of import order.
   - `nz.base` holds the a11y floor.
   - `nz.patterns` is **reserved for registry and consumer CSS**; core patterns ship in `nz.components`.
2. **Engine seam.**
   - Seams' structure: `<c>.contract.ts` plus the `XEngine` type; public `*.client.tsx` leaves own the CSS contract; `_engines/<family>/<c>.client.tsx` owns behaviour; `engine.ts` is the one-line swap point (or a generated import, per velocity), with namespaces built in directive-free `*.parts.ts` that re-export client leaves directly (the S2-verified shape).
   - Swaps ship as **minor**.
   - `details.reason` admits `'unknown'`.
   - Contract minimalism: a public prop must be satisfiable by two engines or by native.
3. **Prove the seam early (from lean).** One second adapter, a native `popover="manual"` Tooltip or a Base UI Select, passes the same testkit **by v0.2 at the latest**, and nightly afterwards. Conformance asserts classes and `data-slot`, not only `data-*`.
4. **CSS contract enforcement.**
   - Velocity's emitted-CSS vocabulary check.
   - Seams' stylelint (no hook assignment, token names in `contract.json`, theme logic only in tokens, spring pairing).
   - Hooks are read once at the property (`var(--nz-x, var(--_nz-x))`) and variants set only privates.
   - No native pseudo-classes (`:popover-open`, `:modal`, `[open]`, `::backdrop`) in the public vocabulary. Overlays render a backdrop element and emit `data-open`, `data-entering` and `data-exiting` regardless of engine.
5. **Tokens.**
   - Seams' `contract.json` and golden files.
   - `@nizivo/tokens` is the only source of token CSS: `@nizivo/react/css/base.css` carries no tokens (velocity's split). `styles.css` may bundle everything for convenience.
6. **Packages (v0.1).**
   - `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons`; `@nizivo/charts` follows in v0.2 with **no dependency on `@nizivo/react`** (seams).
   - Motion hooks at `@nizivo/react/motion`, with no package. `@nizivo/lab` is independent 0.x and on demand.
   - A public `@nizivo/react/contracts` entry for `render`/`mergeProps`/`stateAttrs` (lean).
   - **Import: `@nizivo/react`, not `@nizivo/ui`.**
7. **Distribution and docs.** One example and pattern source feeds docs, Storybook and the registry (seams/velocity). The registry is deferred to v0.3, behind an item-policy linter.
8. **Icons.** Velocity's lint, `aliases.json` and `mirror.json`, with `strokeWidth` 1.92 as an attribute and no CSS coupling.

## 6. Lens-specific things to verify next

1. Build an S2 variant that includes lean's extra `engine.ts` hop and seams' leaf→adapter chain, and record hydration (`hydrate.mjs` was never run).
2. Confirm RAC 1.22.1 `render` support and render-state names on Button, ListBoxItem, Popover, Modal and ModalOverlay. The `XEngine` adapter shape depends on them. Velocity read the type declarations; nobody compiled an adapter.
3. Run the second adapter (native Tooltip) through the testkit, and measure the seam's byte cost (`stateAttrs` + `EngineLocale` + `renderElement`). All three proposals estimate it; none measured it.
4. Run a stylelint/visitor dry run on the sketches to see whether the hook-assignment and emitted-vocabulary checks catch lean's Card and velocity's Button issues. If they do not, the rules are mis-specified.
5. Spike-verify the namespaced Tailwind mapping (`--color-nz-*`); the S3 output is un-namespaced.
