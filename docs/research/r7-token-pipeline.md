# R7: Design-token pipeline from Figma to code, and Figma/code tooling on Starter and Pro plans

Nizivo UI (`@nizivo/*`). Research date: 2026-10-14. Scope: getting tokens out of the Grove/Nizivo Figma file and into a versioned, swappable code pipeline on Figma **Starter/Professional** plans, with no Organization or Enterprise plan.

Input context: `scratchpad/figma/00-tokens-and-styles.md` and `01-foundations.md`, read from file `BIzJFf1wm8KP0YG2AVI1tP` on 2026-10-14.

Labels used below: **VERIFIED** means checked against a primary source today. **UNVERIFIED** means I could not confirm it. *(computed)* means I derived the number locally.

---

## 0. TL;DR

1. **On Pro, the Figma Variables REST API is not available.** `GET /v1/files/:key/variables/local` is "available to full members of Enterprise orgs" only. Code Connect needs Organization or Enterprise. The remote Figma MCP server is OAuth-only and restricted to catalog clients, so it cannot run headless in GitHub Actions. **A fully automatic Figma→CI pull is impossible on Pro.** Every sync starts with a human pressing a button inside Figma, either a designer in a plugin or an engineer running an agent with MCP.
2. **The source of truth is DTCG 2025.10 JSON in the repo.** The format has been stable since 2025-10-28. The repo holds one hand-authored `nizivo.resolver.json` with modifiers `theme` (light/dark), `motion` (default/reduced) and `viewport` (mobile/tablet/desktop), plus `.tokens.json` files split by tier and ownership. Figma is the authoring tool for the tiers Figma owns. The repo is the system of record for everything.
3. **Extraction uses one contract and several adapters.** Every extractor must produce the same normalized "figma-owned" DTCG files:
   - **Primary (designers):** the **TokensBrücke** plugin (MIT, v3.18.0, 2026-10-09). It exports DTCG 2025.10 with *split modes into separate files* and opens a **GitHub PR** directly.
   - **Secondary (engineers/agents):** Claude Code + Figma MCP `use_figma` dumps the raw Plugin API snapshot, then `tokens-bruecke --input` transforms it. No PAT and no Enterprise plan are needed.
   - **Future:** `tokens-bruecke --file-key` / `tz import` against the REST API, if the team ever moves to Enterprise.
4. **The transformer is Terrazzo 2.8.0 (2026-10-13).** It is the only tool with full DTCG 2025.10 support, including the **Resolver module**, since 2.0.0 (2026-03-17). `@terrazzo/plugin-css` maps resolver permutations to arbitrary selectors (`[data-theme]`, `prefers-color-scheme`, `prefers-reduced-motion`, `@media (width >= …)`) and takes a `variableName()` callback for the **configurable prefix** (`--nz-`). It also has built-in `a11y/min-contrast` linting. **Style Dictionary 5.6.1 is the documented swap target.** It is not the default because its Resolver-module support "not started" in tracking issue #1590 (still open 2026-10-12).
5. **Outputs:**
   - `tokens.css`, using `@layer nz.tokens`, `[data-theme]` plus system dark, a reduced-motion media query and viewport media queries
   - Tailwind v4 `@theme inline` that maps to `var(--nz-*)`
   - a tiny typed JS module of `var()` references
   - resolved JSON per permutation (charts, canvas, native)
   - a Figma-importable JSON plus a `use_figma` push script for the code→Figma direction, including rewriting Figma `codeSyntax` to `var(--nz-…)`
6. **Restyling without forks:** component tokens live in code first (Figma has none today). They are published as *public, undeclared* hooks (`--nz-button-bg`) that components read through the pseudo-private pattern `--_nz-button-bg: var(--nz-button-bg, var(--nz-bg-brand))`. Consumers can restyle globally, per subtree or per instance, nested theme scopes keep working, and nothing is forked.
7. **Drift detection on Pro has three parts:**
   - (a) A `LIBRARY_PUBLISH` webhook, whose payload carries `modified_variables`, goes through a small relay to `repository_dispatch`. CI then opens a "tokens out of sync — re-export" issue. CI **cannot fetch** the values on Pro.
   - (b) Every sync PR runs `normalize → diff → lint → build → visual test` and posts a token diff.
   - (c) Code-owned and Figma-owned files are split, and CI enforces the boundary.

---

## 1. What the Figma file gives us (inputs)

From `00-tokens-and-styles.md`:

| Figma collection | Modes | Vars | Maps to tier | Notes |
|---|---|---|---|---|
| Grove Primitives | Value | 54 | primitive | codeSyntax already `var(--grove-p-…)` |
| Grove Color | Light, Dark | 58 | semantic | aliases into primitives; gaps (no info/success solid, no scrim) |
| Grove Space | Value | 33 | foundation (space/radius/border-width/size) | px floats |
| Grove Motion | Default, Reduced | 20 | foundation (motion) | durations in ms; easings as **strings**, including `spring(1, 260, 24, 0)`, which is not CSS |
| Grove Responsive | Desktop, Tablet, Mobile | 10 | foundation (layout/type) | **no breakpoint thresholds** in Figma |
| Text styles (18) | n/a | n/a | typography composites | not bound to variables |
| Effect styles (11) | n/a | n/a | shadow / focus / glass | hard-coded colors; Figma GLASS has no CSS equivalent |
| Non-Grove collections (Clario, Pipkin, …) | n/a | n/a | **must be filtered out** | leftovers in the same file |

There is **no component tier in Figma today**, so component tokens start in code (§6.3).

---

## 2. Figma plan reality check (as of 2026-10-14)

| Capability | Starter | Professional | Org / Ent | Source / status |
|---|---|---|---|---|
| Variables REST API (`GET …/variables/local`, `…/published`, `POST …/variables`) | ✗ | ✗ | **Enterprise only** ("available to full members of Enterprise orgs") | VERIFIED [Figma variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/). Terrazzo's import guide also states "An Enterprise plan to access Variables (with free accounts, only Styles are importable)" ([source](https://github.com/terrazzoapp/terrazzo/blob/main/www/src/pages/docs/guides/import-from-figma.md)) |
| Variable **modes** | cannot create modes | ✓ (**10 modes/collection**, per staff forum reply, Jun 2026) | more; **extended collections = Enterprise only** | Plan header "Education, Professional, Organization, and Enterprise" VERIFIED ([Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)). Extended collections "Available on the Enterprise plan" VERIFIED ([Extend a collection](https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection)). The 10-mode figure is PARTIALLY VERIFIED (forum only) |
| Native variable import/export (JSON) | n/a | ✓ (right-click mode/collection → *Export mode(s)* / *Import mode*) | ✓ | VERIFIED that it exists ([help](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)). Import requires DTCG. Export format is **not stated**. A forum report says export does **not** use DTCG naming, and composites and descriptions are missing ([thread, Feb–Jun 2026](https://forum.figma.com/suggest-a-feature-11/dtcg-composite-token-export-support-51314)) |
| Dev Mode | ✗ ("not available on the Starter plan") | Full ($16/mo) or Dev ($12/mo) seat; Collab = basic inspect | ✓ | VERIFIED ([pricing](https://www.figma.com/pricing/), [help](https://help.figma.com/hc/en-us/articles/19813618057623)) |
| Code Connect (custom mappings) | ✗ | ✗ (pre-built UI kits only) | ✓ "Available on the Organization and Enterprise plans. Requires a Full or Dev seat." | VERIFIED ([Code Connect help](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)). `@figma/code-connect` is 2.0.1 (2026-09-10, npm) |
| MCP server tool-call limits | 20 calls/**month** (all seats) | Dev/Full: **200/day, 10/min**. View/Collab: 20/month | Org 200/day, 15/min. Ent 600/day, 20/min | VERIFIED ([MCP rate limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)). Exempt tools: `add_code_connect_map`, `create_new_file`, `whoami` |
| MCP auth / CI use | OAuth only, catalog clients only (Claude Code, Cursor, VS Code, Codex, Xcode) | same | same | VERIFIED ([remote server install](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)). Forum threads say PATs are rejected ([thread](https://forum.figma.com/suggest-a-feature-11/support-for-pat-personal-access-token-based-auth-in-figma-remote-mcp-47465)). **Not usable headless in GitHub Actions** |
| `use_figma` (Plugin-API JS via MCP) | counts against 20/month | counts against 200/day | ✓ | Remote-only, VERIFIED ([tools](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)). Plan gating or exemption is not documented (UNVERIFIED). This project's extraction session saw **3 calls rejected for exceeding a ~20 KB return payload** (`01-foundations.md`), which is an observed limit, not a documented one |
| REST rate limits (other endpoints) | A Starter-plan file is limited to **6 req/month** even with a Full seat elsewhere (the page's own example) | Dev/Full: Tier 1 **10/min**, Tier 2 **25/min**, Tier 3 **50/min**. View/Collab: Tier 1 20/month | Org 15/50/100 per min; Ent 20/100/150 per min | Effective 2025-11-17. The governing plan is the plan **where the file lives** ([rate limits](https://developers.figma.com/docs/rest-api/rate-limits/)). PARTIALLY VERIFIED: the extracted table lost its column alignment. The plan mapping of the three Dev/Full values follows a secondary reading (Tier 2 is "25/min Professional, 50 Org, 100 Ent") |
| Webhooks v2 | UNVERIFIED | ✓ file webhooks (limit 150) | 300 / 600 | VERIFIED ([webhooks](https://developers.figma.com/docs/rest-api/webhooks/)). `LIBRARY_PUBLISH` payload includes `created_/modified_/deleted_variables` ([events](https://developers.figma.com/docs/rest-api/webhooks-events/)) |
| Plugin API variables (read/write, `addMode`, codeSyntax) | ✓ | ✓ | ✓ | No plan restriction stated, except extended collections = Enterprise ([plugin docs](https://developers.figma.com/docs/plugins/working-with-variables/)) |
| Branching / merging | n/a | n/a | listed on pricing page | Plan mapping UNVERIFIED (historically Org+) |

**Implications for Nizivo:**

- **Keep the design-system file in the Professional team, not the Starter team.** A Starter file cannot create modes, gets 6 REST requests per month, and the MCP limits there are prohibitive.
- **The person who syncs needs a Full or Dev seat on Pro.** That gives 200 MCP calls/day and Dev Mode.
- **Do not plan on Code Connect until an Organization upgrade.** Ship a repo-local `component-map.json` instead (§11), which converts to Code Connect later.
- **Multi-brand can't rely on Figma extended collections.** Model brands as a resolver `brand` modifier in code. In Figma, use extra modes (≤10) or separate files.

---

## 3. State of the art: standards and tools (versions checked against the npm registry today)

### 3.1 W3C Design Tokens Community Group (DTCG) format

- **2025.10 is the first stable version, published 2025-10-28**, as a Final Community Group Report, not a W3C Recommendation ([announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/), [TR](https://www.designtokens.org/tr/2025.10/)).
- It has three modules: **Format**, **Color**, **Resolver**.
- **Format** ([spec](https://www.designtokens.org/TR/2025.10/format/)):
  - Files are `.tokens.json`, media type `application/design-tokens+json`.
  - Token properties: `$value`, `$type` (inherited from groups), `$description`, `$extensions` (tools **must preserve** unknown keys), `$deprecated`.
  - Groups support `$extends` and `$root`.
  - Aliases use `{a.b}`. JSON Pointer `$ref` must also be supported.
  - **Dimension** is `{value, unit: "px"|"rem"}`. **Duration** is `{value, unit: "ms"|"s"}`. **cubicBezier** is a 4-tuple.
  - Composite types: border, transition, shadow, gradient, typography.
- **Color** ([spec](https://www.designtokens.org/TR/2025.10/color/)): an object `{colorSpace, components, alpha?, hex?}` covering CSS Color 4 spaces (srgb, display-p3, oklch, …).
- **Resolver** ([spec](https://www.designtokens.org/TR/2025.10/resolver/)):
  - Files are `*.resolver.json`, with `version: "2025.10"`.
  - `sets` hold token sources. `modifiers` hold `contexts` and a `default`. `resolutionOrder` lists the merge order, and later entries win.
  - The spec **prescribes no CSS output**, so mapping to selectors is the tool's job.
  - It recommends **orthogonal** modifiers, meaning each modifier owns distinct tokens. Permutations = the product of context counts.
- There is **no spring easing type** in DTCG. Springs need `$extensions` (§9).

### 3.2 Transformers

| Tool | Latest (npm) | Released | DTCG 2025.10 | Resolver / modes | Notes |
|---|---|---|---|---|---|
| **Terrazzo** (`@terrazzo/cli`, `parser`, `plugin-css`, `plugin-tailwind`, `plugin-js`, `plugin-css-in-js`, `plugin-sass`, `plugin-vanilla-extract`, `plugin-swift`) | **2.8.0** | 2026-10-13 | **Full**, since 2.0.0 (2026-03-17) ([CHANGELOG](https://github.com/terrazzoapp/terrazzo/blob/main/packages/cli/CHANGELOG.md)) | ✓ resolver; `permutations` → arbitrary CSS wrappers; orthogonality detection (2.4.0) | Lints include `a11y/min-contrast` and `a11y/min-font-size` ([linting](https://terrazzo.app/docs/linting/)). Commands: `tz check`, `tz format`, `tz bundle`. `tz import` (Figma) needs Enterprise for variables. MIT. ~475★, 67 open issues |
| **Style Dictionary** | **5.6.1** | 2026-10-10 (v5.0.0: 2025-05-16) | Partial. Color object (5.3.0), dimension object (5.4.0); gradient/duration in progress | **Resolver not started** ([#1590](https://github.com/style-dictionary/style-dictionary/issues/1590), open, last activity 2026-10-12) | Node ≥22. Largest ecosystem (~4.9k★). Themes = run one SD instance per theme by hand. Its DTCG page says "2025.10 does not have full support yet… work in progress in v5" ([docs](https://styledictionary.com/info/dtcg/)) |
| `@tokens-studio/sd-transforms` | 2.0.3 | 2025-12-10 | n/a | `permutateThemes` for Tokens Studio themes | only relevant if Tokens Studio is the source |
| Theo (Salesforce) | 8.1.5 | last publish 2022-06-27 | ✗ | ✗ | **stale; rejected** |

### 3.3 Figma→JSON extractors

| Tool | Version / date | Works on Pro? | Output | Notes |
|---|---|---|---|---|
| **TokensBrücke** plugin + CLI ([repo](https://github.com/tokens-bruecke/figma-plugin)) | **v3.18.0, 2026-10-09**. MIT. Active (3 releases in Oct 2026) | **Yes.** The plugin uses the Plugin API. The CLI `--input` snapshot mode needs no token or Enterprise plan. `--file-key` REST mode needs Enterprise | DTCG 2025.10 (default on). Options: **split modes into `{Collection}/{Mode}.tokens.json`**, split collections, include text/effect/grid styles, scopes, Figma metadata (`variableId`, `codeSyntax`, collection). Color formats include sRGB DTCG, OKLCH DTCG and HEX | **Push targets: GitHub (commit), GitHub PR (branch `tokens-bruecke/update-tokens`), GitLab**, using a classic PAT with `repo` scope (fine-grained PAT UNVERIFIED). Import back to Figma is beta. Ships an agent SKILL and a snapshot JSON schema |
| **Tokens Studio** for Figma ([pricing](https://tokens.studio/pricing), page dated 2026-10-13) | plugin 2.11.x (changelog) | Yes | Its own format, with a W3C DTCG option | **Free:** no multi-file Git sync (read-only on an existing folder) ([docs](https://docs.tokens.studio/token-storage/remote-multi-file-sync)). **Team €39/mo per editor** for Git sync and multi-dimensional theming. Tokens live in plugin storage, a second source of truth beside native Variables |
| **Figma native** *Export mode(s)* | n/a | Yes | JSON per mode/collection. Format unclear and reportedly not DTCG-named. No composites. Descriptions reportedly missing | Manual download only. **Import** is DTCG and well specified: only px dimensions, durations in **s**, sRGB/HSL colors, cross-collection aliases via `com.figma.aliasData` |
| lukasoppermann/design-tokens | n/a | Yes | "standard (W3C draft)" | README: "only partially supported… no capacity to add features" ([repo](https://github.com/lukasoppermann/design-tokens)). **Rejected** |
| Terrazzo `tz import` | 2.8.0 | **Styles only** on non-Enterprise | resolver JSON | good on Enterprise; preserves Figma `key` in `$extensions` (2.8.0) |
| Custom Nizivo plugin / `use_figma` dump | n/a | Yes | raw Plugin API snapshot | Same Plugin API calls TokensBrücke documents for snapshot mode |

### 3.4 Relevant CSS platform status

| Feature | Status | Source |
|---|---|---|
| `light-dark()` | **Baseline 2024, newly available since May 2024.** Widely-available status would land around Nov 2026 by the 30-month rule *(computed, not confirmed)*. Requires `color-scheme` | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) |
| `linear()` easing | **Baseline, widely available** (cross-browser since Dec 2023) | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear) |
| Tailwind CSS | **4.3.3** (2026-07-16). `@theme`, `@theme inline` (needed when a theme var references another var), `@theme static`, `--ns-*: initial` | [docs](https://tailwindcss.com/docs/theme), npm |

---

## 4. Options compared

### 4.1 Extraction (Figma → repo) on Pro

Criteria: works on Pro (P), cost (C), DTCG fidelity incl. modes, aliases and styles (F), automation / PR flow (A), designer UX (U), lock-in risk (L), maintenance burden on us (M).

| Option | P | C | F | A | U | L | M | Verdict |
|---|---|---|---|---|---|---|---|---|
| **A. TokensBrücke plugin → GitHub PR** | ✓ | free | **high**: DTCG 2025.10, split modes, styles, metadata | **one click → PR** | good | low (MIT, outputs standard DTCG; we normalize anyway) | low | **Primary** |
| **B. Agent: MCP `use_figma` dump → `tokens-bruecke --input`** | ✓ (Full/Dev seat; ~5–10 calls per sync) | free | high (same transformer as A) | engineer-run, local; not CI | n/a (engineer) | low | low–med (keep dump script working through the ~20 KB return cap) | **Secondary** (engineers, audits, code→Figma push) |
| C. Custom "Nizivo Sync" Figma plugin | ✓ (run as a development plugin; private org publishing is Org+, UNVERIFIED) | free | whatever we build | PR via GitHub API | best (our UX) | none | **high** (we own a plugin) | Later, only if A stops fitting |
| D. Tokens Studio (Team) | ✓ | €39/editor/mo | high | Git sync | good but **a parallel token model** | **med–high** (second source of truth, proprietary themes JSON) | med | Rejected as primary |
| E. Figma native Export modes | ✓ | free | **low–med**: no composites, reportedly no descriptions, non-DTCG naming | manual download + commit | OK | low | med (we'd parse an undocumented shape) | Fallback only |
| F. Manual export (copy values) | ✓ | free | low | none | poor | none | high | Rejected |
| G. REST API (`tz import` / `tokens-bruecke --file-key`) in CI | **✗ (Enterprise)** | Enterprise | high | **fully automatic** | n/a | low | low | Future adapter only |

### 4.2 Transformation (DTCG → platform outputs)

Criteria: DTCG 2025.10 conformance (S), resolver/modes→CSS selectors (R), configurable prefix (X), Tailwind v4 output (T), TS output (J), a11y lint (Y), ecosystem/bus factor (E), extensibility (Z).

| Option | S | R | X | T | J | Y | E | Z | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **Terrazzo 2.8** | **full** | **native** (`permutations` with `prepare()` → any selector or at-rule) | `variableName(token)` | `plugin-tailwind` (`@theme`, custom variants via `@tz`) | `plugin-js` generates a server-side **resolver API** with `.d.ts`, not a light client object; we add a ~60-LOC plugin | **`a11y/min-contrast`**, naming, required-modes | smaller (~475★); 0.10→2.0 jump in Mar 2026 | plugin API | **Recommended** |
| Style Dictionary 5.6 | partial | manual per-theme runs (no resolver yet) | `prefix` / custom name transform | custom format | `javascript/es6`, `typescript/es6-declarations` | none built in | **large** (~4.9k★) | rich hooks | **Swap target** once #1590 lands |
| Custom script (~800 LOC) | what we write | what we write | ✓ | ✓ | ✓ | ✓ | none | n/a | Rejected (we would be re-implementing Terrazzo) |
| Tokens Studio + sd-transforms | depends on TS format | `permutateThemes` | ✓ | custom | ✓ | ✗ | med | med | Only if D chosen |
| Theo | ✗ | ✗ | n/a | ✗ | n/a | ✗ | dead (2022) | n/a | Rejected |

---

## 5. Recommendation: the pipeline architecture

### 5.1 The pieces and their contracts

```
 FIGMA (Pro team)                                   REPO  (packages/tokens)
 ───────────────                                    ───────────────────────────────────────────────────────────
 Variables + Text/Effect styles
        │
        │  EXTRACT (adapter; human-triggered on Pro)
        ├─ A. TokensBrücke plugin ──► PR branch: tokens/figma/raw/{Collection}/{Mode}.tokens.json
        ├─ B. Claude Code + MCP use_figma ─► snapshot.json ─► tokens-bruecke --input ─► same raw files
        └─ G. (Enterprise someday) tokens-bruecke --file-key / tz import in CI ─► same raw files
                                                       │
                                     NORMALIZE (ours, deterministic, ~300 LOC)
                                     scripts/figma-normalize.ts
                                       • allowlist "Grove *" collections, drop leftovers
                                       • rename → tier paths, strip brand ("grove" → none)
                                       • FLOAT → dimension{px} | duration{ms} | number (by scope/group rules)
                                       • strings: cubic-bezier() → cubicBezier, spring() → $extensions spring
                                       • text styles → typography; effect styles → shadow / extensions
                                       • keep Figma ids/keys under $extensions["dev.nizivo.figma"]
                                       • tz format → stable key order
                                                       │
                                                       ▼
                              SOURCE OF TRUTH (DTCG 2025.10, reviewed in PRs)
                              src/figma-owned/**   (written ONLY by normalize)
                              src/code-owned/**    (written ONLY by engineers: component tier,
                                                    breakpoints, z-index, scrim, deprecations)
                              src/nizivo.resolver.json (hand-authored: sets + modifiers)
                                                       │
                                     BUILD (adapter; Terrazzo today, SD later)
                                     terrazzo.config.ts  (prefix from NZ_TOKEN_PREFIX, default "nz")
                                                       │
     ┌──────────────┬──────────────┬───────────────┬───┴──────────┬──────────────────┬───────────────────┐
     ▼              ▼              ▼               ▼              ▼                  ▼                   ▼
 dist/css/      dist/css/      dist/tailwind/  dist/js/        dist/json/        dist/css/components/ dist/figma/
 tokens.css     (granular:     theme.css       index.js+d.ts   <perm>.json       <name>.vars.css      <Coll>/<Mode>
 (@layer        primitives,    (@theme inline  (var() refs,    (resolved values  (pseudo-private      .tokens.json
  nz.tokens)    theme, motion, → var(--nz-*))  typed ids)      for charts/canvas) --_nz-* hooks)     (Figma import)
                viewport)
```

**Swap points and the contract at each one:**

| Swap point | Contract | Today | Could become |
|---|---|---|---|
| Extractor | `tokens/figma/raw/**` in TokensBrücke DTCG split-mode shape (or its snapshot schema `schemas/tokens-snapshot.schema.json`) | TokensBrücke plugin; MCP dump | custom plugin, REST on Enterprise, Tokens Studio export |
| Normalizer | raw → `src/figma-owned/**` (pure function, golden-file tested) | ours | n/a |
| Source of truth | DTCG 2025.10 + resolver | Terrazzo-validated | any DTCG tool |
| Builder | `src/**` → `dist/**` with stable file names | Terrazzo 2.8 | Style Dictionary 5.x/6 once resolver lands, or custom |
| Output strategy | per-modifier selector map in **one** config object (`themeSelectors`) | `[data-theme]` + media | `light-dark()` mode, `@scope`, extra modifiers (brand, contrast, density) |
| Consumers | `@nizivo/tokens` exports map (§7.6) | CSS vars, Tailwind, JS | other frameworks; native via plugin-swift/SD |

### 5.2 Ownership rules (what makes plug-in and plug-out safe)

- **Figma-owned:** primitives, semantic color (light/dark), space/radius/border/size, motion, responsive values, text styles, effect styles. Engineers never hand-edit `src/figma-owned/**`. CI checks that `normalize(raw) == figma-owned`.
- **Code-owned:**
  - the component tier
  - breakpoints (Figma has none; proposed 768/1280px, designer sign-off pending)
  - z-index, opacity, overlay/scrim and the info/success solids that Figma lacks
  - `$deprecated` aliases
  - "code-first" proposals waiting for a Figma push
- **Resolver:** code-owned, so adding a modifier (brand, high-contrast, density) is a code PR that doesn't break anyone.
- **Public API:** semantic, foundation and component token **names** are semver-governed. Primitives are exported but documented as "reference — may change in minor versions". Renames ship a `$deprecated: "Use {bg.surface}"` alias for one major version, and the CSS output emits `--nz-old: var(--nz-new)`.

---

## 6. Token architecture: tiers, naming, restyling

### 6.1 Tiers

| Tier | DTCG path (examples) | CSS var (prefix `nz`) | Owner | Public? |
|---|---|---|---|---|
| Primitive (reference) | `p.green.500`, `p.neutral.900`, `p.viz.teal-500` | `--nz-p-green-500` | Figma | exported, "reference" |
| Foundation (single-mode scales) | `space.4`, `space.0-5`, `radius.md`, `border-width.focus`, `size.control-md` | `--nz-space-4`, `--nz-radius-md` | Figma | ✓ |
| Semantic (moded) | `bg.surface`, `text.primary`, `border.focus`, `icon.brand`, `chart.cat-1` | `--nz-bg-surface` | Figma | ✓ (the main styling API) |
| Motion (moded) | `duration.fast`, `easing.standard`, `easing.spring`, `distance.lift`, `scale.press` | `--nz-duration-fast` | Figma | ✓ |
| Responsive (moded) | `grid.columns`, `layout.sidebar`, `type.display` | `--nz-grid-columns` | Figma | ✓ |
| Typography / effects (composite) | `font.heading.h1`, `elevation.2`, `focus.ring` | `--nz-font-heading-h1-font-size`, … (sub-var naming per plugin-css, UNVERIFIED), `--nz-elevation-2` | Figma | ✓ |
| Component | `button.primary.bg`, `card.radius`, `kpi-tile.value.font-size` | public hook `--nz-button-primary-bg`, private `--_nz-button-primary-bg` | **code** | ✓ |

The naming keeps the Figma `codeSyntax` shape already in the file (`--grove-p-green-500` becomes `--nz-p-green-500`, and `--grove-bg-surface` becomes `--nz-bg-surface`), so designers' Dev Mode output stays recognisable. The normalizer maps `/` to `.`, and `variableName()` maps `.` to `-` and adds the prefix.

### 6.2 Modifiers (all orthogonal, enforced by lint)

| Modifier | Contexts | Default | CSS mapping |
|---|---|---|---|
| `theme` | light, dark (later: light-hc, dark-hc) | light | `:root,[data-theme=light]` light. `@media (prefers-color-scheme: dark){:root:not([data-theme=light])}` dark. `[data-theme=dark]` dark. Each block also sets `color-scheme` |
| `motion` | default, reduced | default | `@media (prefers-reduced-motion: reduce){:root:not([data-motion=full])}` plus `[data-motion=reduced]` |
| `viewport` | mobile, tablet, desktop | mobile (mobile-first) | `:root` mobile; `@media (width >= 768px)` tablet; `@media (width >= 1280px)` desktop. **Thresholds need designer sign-off.** Optional `@container` variant (§10) |
| `brand` (later) | default, … | default | `[data-brand=x]`. Avoids Figma extended collections (Enterprise) |

The permutation count is 2×2×3 = 12, but because the modifiers are orthogonal the CSS emits **one block per context**, not 12 combinations.

### 6.3 Component tokens let consumers restyle without forking

**The trap to avoid.** An unregistered custom property that references another one is substituted where it is *declared*, and its children inherit the substituted value. Suppose `:root { --nz-button-bg: var(--nz-bg-brand) }`. It freezes the **root** theme's brand color, and a nested `<div data-theme="dark">` gets the light value. Many token pipelines ship this bug when they emit component tokens at `:root`.

**The pattern.** Use Lea Verou's pseudo-private custom properties ([2021-10-15](https://lea.verou.me/blog/2021/10/custom-properties-with-defaults/)):

```css
/* generated: dist/css/components/button.vars.css, emitted by a small Terrazzo plugin from src/code-owned/component/button.tokens.json */
@layer nz.components {
  .nz-button {
    --_nz-button-bg:        var(--nz-button-bg,        var(--nz-bg-brand));
    --_nz-button-bg-hover:  var(--nz-button-bg-hover,  var(--nz-bg-brand-hover));
    --_nz-button-fg:        var(--nz-button-fg,        var(--nz-text-on-brand));
    --_nz-button-radius:    var(--nz-button-radius,    var(--nz-radius-md));
    --_nz-button-height:    var(--nz-button-height,    var(--nz-size-control-md));
  }
}
/* hand-written component CSS uses only the private vars */
.nz-button { background: var(--_nz-button-bg); color: var(--_nz-button-fg); border-radius: var(--_nz-button-radius); block-size: var(--_nz-button-height); }
```

**How this works:**

- The public `--nz-button-*` is **never declared by the library**, so it is free for consumers.
- The private var is declared **on the component element**. It resolves against the nearest theme scope, so nested themes work.
- Consumers have four ways to restyle:
  1. **Globally:** `:root, [data-theme] { --nz-button-bg: var(--nz-bg-accent); }`. Including `[data-theme]` makes the alias re-resolve inside every nested theme scope. Document this recipe.
  2. **By subtree:** `.checkout { --nz-button-radius: var(--nz-radius-full); }`
  3. **By instance:** `<Button style={{'--nz-button-bg': 'hotpink'}}>`
  4. **By swapping the semantic layer:** a `[data-brand=acme]` block. No component code changes.

The component tier lives in code only for now. Since the Figma file has no component variables, the code owns it. If designers later add a "Component" collection, the normalizer can write it into `figma-owned` and the code-owned file shrinks. The public names stay the same, so consumers notice nothing.

---

## 7. Repo layout, example DTCG, configs

### 7.1 Layout

```
packages/tokens/
  src/
    nizivo.resolver.json
    figma-owned/                       # written only by scripts/figma-normalize.ts
      primitives.tokens.json
      foundation.tokens.json           # space, radius, border-width, size
      color/light.tokens.json
      color/dark.tokens.json
      motion/default.tokens.json
      motion/reduced.tokens.json
      viewport/mobile.tokens.json
      viewport/tablet.tokens.json
      viewport/desktop.tokens.json
      typography.tokens.json           # from text styles
      effects.tokens.json              # elevation, focus ring (+ $extensions for glass)
    code-owned/
      breakpoints.tokens.json
      layers.tokens.json               # z-index, scrim/overlay
      component/button.tokens.json ... # component tier
      deprecated.tokens.json
  tokens/figma/raw/                    # extractor drop zone (committed for audit)
  scripts/
    figma-normalize.ts  figma-diff.ts  figma-push.ts (code→Figma via use_figma)  spring.ts
  plugins/
    terrazzo-plugin-nizivo-js.ts       # var() refs + types
    terrazzo-plugin-nizivo-components.ts  # --_nz-* component hook files
    terrazzo-plugin-nizivo-tailwind.ts    # @theme inline → var(--nz-*), if plugin-tailwind can't
    terrazzo-plugin-nizivo-figma.ts       # Figma-importable JSON
  terrazzo.config.ts
  package.json
```

### 7.2 Example DTCG source (2025.10)

`src/figma-owned/primitives.tokens.json` (excerpt):

```json
{
  "$description": "Reference palette. Generated from Figma 'Grove Primitives'. Do not edit.",
  "p": {
    "$type": "color",
    "green": {
      "500": {
        "$value": { "colorSpace": "srgb", "components": [0.1804, 0.5137, 0.3451], "hex": "#2e8358" },
        "$extensions": { "dev.nizivo.figma": { "variableId": "VariableID:…", "key": "…", "collection": "Grove Primitives" } }
      },
      "700": { "$value": { "colorSpace": "srgb", "components": [0.1020, 0.3412, 0.2275], "hex": "#1a573a" } }
    },
    "neutral": {
      "0":   { "$value": { "colorSpace": "srgb", "components": [1, 1, 1], "hex": "#ffffff" } },
      "900": { "$value": { "colorSpace": "srgb", "components": [0.0941, 0.1059, 0.0980], "hex": "#181b19" } }
    }
  }
}
```

`src/figma-owned/color/light.tokens.json` / `dark.tokens.json` (same paths, different aliases):

```json
{
  "bg": {
    "$type": "color",
    "surface": { "$value": "{p.neutral.0}", "$description": "Default card/panel surface." },
    "brand":   { "$value": "{p.green.700}" }
  },
  "text": {
    "$type": "color",
    "primary":  { "$value": "{p.neutral.900}" },
    "on-brand": { "$value": "{p.neutral.0}" }
  }
}
```

`src/figma-owned/foundation.tokens.json`:

```json
{
  "space": {
    "$type": "dimension",
    "0-5": { "$value": { "value": 2, "unit": "px" } },
    "4":   { "$value": { "value": 16, "unit": "px" } }
  },
  "radius": {
    "$type": "dimension",
    "md":   { "$value": { "value": 12, "unit": "px" } },
    "full": { "$value": { "value": 999, "unit": "px" } }
  },
  "size": { "$type": "dimension", "control-md": { "$value": { "value": 40, "unit": "px" } } }
}
```

`src/figma-owned/motion/default.tokens.json` (reduced has the same paths: durations 0/120/160 ms, easings `[0,0,1,1]`, distances 0, scales 1):

```json
{
  "duration": {
    "$type": "duration",
    "fast": { "$value": { "value": 140, "unit": "ms" } },
    "base": { "$value": { "value": 220, "unit": "ms" } },
    "spring-settle": {
      "$value": { "value": 490, "unit": "ms" },
      "$description": "Computed by the normalizer from easing.spring physics (settle to ±0.1%). Pair with easing.spring."
    }
  },
  "easing": {
    "standard": { "$type": "cubicBezier", "$value": [0.2, 0, 0, 1] },
    "spring": {
      "$type": "cubicBezier",
      "$value": [0.3, 0, 0, 1],
      "$description": "Spring (m=1, k=260, c=24). CSS output uses linear(); $value is the cubic fallback for tools without the extension.",
      "$extensions": {
        "dev.nizivo.spring": { "mass": 1, "stiffness": 260, "damping": 24, "velocity": 0 }
      }
    }
  },
  "distance": { "$type": "dimension", "lift": { "$value": { "value": 4, "unit": "px" } } },
  "scale":    { "$type": "number", "press": { "$value": 0.98 } }
}
```

Why the spring token is typed as `cubicBezier` with an extension:

- The token stays **spec-valid**, which `tz check` requires.
- Any tool that ignores the extension gets a reasonable curve.
- Our CSS transform emits `linear(…)` (§9).
- The JS output exposes `{mass, stiffness, damping}` for a JS spring library in `@nizivo/motion`.

`src/figma-owned/viewport/mobile.tokens.json`:

```json
{
  "grid": {
    "columns": { "$type": "number", "$value": 4 },
    "gutter":  { "$type": "dimension", "$value": { "value": 16, "unit": "px" } }
  },
  "type": { "display": { "$type": "dimension", "$value": { "value": 36, "unit": "px" } } }
}
```

`src/figma-owned/typography.tokens.json` (from the text style "Grove/Display/L": Geist SemiBold 56 / 104% / −3%):

```json
{
  "font": {
    "display": {
      "l": {
        "$type": "typography",
        "$value": {
          "fontFamily": ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
          "fontWeight": 600,
          "fontSize": { "value": 56, "unit": "px" },
          "lineHeight": 1.04,
          "letterSpacing": { "value": -1.68, "unit": "px" }
        },
        "$extensions": { "dev.nizivo.figma": { "styleName": "Grove/Display/L", "letterSpacingPercent": -3 } }
      }
    }
  }
}
```

DTCG dimensions allow only `px` or `rem`. The −3% letter-spacing is therefore resolved to px. The original percent is kept in `$extensions` so the CSS transform can emit `-0.03em` and track font-size changes. Confirm this transform on day one.

`src/figma-owned/effects.tokens.json` (Elevation/2 Raised):

```json
{
  "elevation": {
    "$type": "shadow",
    "2": {
      "$value": [
        { "color": { "colorSpace": "srgb", "components": [0.0627, 0.0745, 0.0667], "alpha": 0.04 }, "offsetX": { "value": 0, "unit": "px" }, "offsetY": { "value": 2, "unit": "px" }, "blur": { "value": 4, "unit": "px" }, "spread": { "value": 0, "unit": "px" } },
        { "color": { "colorSpace": "srgb", "components": [0.0627, 0.0745, 0.0667], "alpha": 0.05 }, "offsetX": { "value": 0, "unit": "px" }, "offsetY": { "value": 8, "unit": "px" }, "blur": { "value": 16, "unit": "px" }, "spread": { "value": -4, "unit": "px" } }
      ]
    }
  },
  "surface": {
    "glass": {
      "$type": "shadow",
      "$value": [ { "color": { "colorSpace": "srgb", "components": [0.0627, 0.0745, 0.0667], "alpha": 0.1 }, "offsetX": { "value": 0, "unit": "px" }, "offsetY": { "value": 16, "unit": "px" }, "blur": { "value": 40, "unit": "px" }, "spread": { "value": -8, "unit": "px" } } ],
      "$extensions": { "dev.nizivo.backdrop": { "blur": 24 }, "dev.nizivo.figma": { "styleName": "Grove/Surface/Glass" } }
    }
  }
}
```

The dark-mode elevation gap is a design debt: shadows are light-tuned. Fix it later by moving elevation colors into the `theme` modifier files as aliases, for example `{shadow.tint}`.

`src/code-owned/component/button.tokens.json`:

```json
{
  "button": {
    "$description": "Component tier. Public hooks: --nz-button-*. Defaults alias semantic tokens.",
    "primary": {
      "bg":       { "$type": "color", "$value": "{bg.brand}" },
      "bg-hover": { "$type": "color", "$value": "{bg.brand-hover}" },
      "fg":       { "$type": "color", "$value": "{text.on-brand}" }
    },
    "radius": { "$type": "dimension", "$value": "{radius.md}" },
    "height": {
      "sm": { "$type": "dimension", "$value": "{size.control-sm}" },
      "md": { "$type": "dimension", "$value": "{size.control-md}" }
    }
  }
}
```

### 7.3 Resolver (`src/nizivo.resolver.json`)

```json
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/resolver.json",
  "name": "Nizivo UI",
  "version": "2025.10",
  "sets": {
    "primitives": { "sources": [{ "$ref": "figma-owned/primitives.tokens.json" }] },
    "foundation": { "sources": [
      { "$ref": "figma-owned/foundation.tokens.json" },
      { "$ref": "figma-owned/typography.tokens.json" },
      { "$ref": "figma-owned/effects.tokens.json" },
      { "$ref": "code-owned/breakpoints.tokens.json" },
      { "$ref": "code-owned/layers.tokens.json" }
    ] },
    "components": { "sources": [
      { "$ref": "code-owned/component/button.tokens.json" },
      { "$ref": "code-owned/deprecated.tokens.json" }
    ] }
  },
  "modifiers": {
    "theme": {
      "description": "Figma 'Grove Color' modes",
      "contexts": {
        "light": [{ "$ref": "figma-owned/color/light.tokens.json" }],
        "dark":  [{ "$ref": "figma-owned/color/dark.tokens.json" }]
      },
      "default": "light"
    },
    "motion": {
      "description": "Figma 'Grove Motion' modes",
      "contexts": {
        "default": [{ "$ref": "figma-owned/motion/default.tokens.json" }],
        "reduced": [{ "$ref": "figma-owned/motion/reduced.tokens.json" }]
      },
      "default": "default"
    },
    "viewport": {
      "description": "Figma 'Grove Responsive' modes (mobile-first)",
      "contexts": {
        "mobile":  [{ "$ref": "figma-owned/viewport/mobile.tokens.json" }],
        "tablet":  [{ "$ref": "figma-owned/viewport/tablet.tokens.json" }],
        "desktop": [{ "$ref": "figma-owned/viewport/desktop.tokens.json" }]
      },
      "default": "mobile"
    }
  },
  "resolutionOrder": [
    { "$ref": "#/sets/primitives" },
    { "$ref": "#/sets/foundation" },
    { "$ref": "#/modifiers/theme" },
    { "$ref": "#/modifiers/motion" },
    { "$ref": "#/modifiers/viewport" },
    { "$ref": "#/sets/components" }
  ]
}
```

The `$schema` URL is illustrative (UNVERIFIED). Use whatever schema Terrazzo or the DTCG publish. File-path `$ref`s are optional in the spec, and Terrazzo supports them per its guide.

### 7.4 `terrazzo.config.ts`

```ts
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
import tailwind from "@terrazzo/plugin-tailwind";
import nizivoJs from "./plugins/terrazzo-plugin-nizivo-js";
import nizivoComponents from "./plugins/terrazzo-plugin-nizivo-components";
import nizivoFigma from "./plugins/terrazzo-plugin-nizivo-figma";
import { springToLinear } from "./scripts/spring";

/** Single knob for the CSS prefix. Build-time only; consumers who need another prefix rebuild from ./dtcg. */
const PREFIX = process.env.NZ_TOKEN_PREFIX ?? "nz";
const cssVar = (id: string) => `--${PREFIX}-${id.replace(/\./g, "-")}`;

/** One place that maps resolver contexts → selectors. Swap strategies here (e.g. light-dark(), @scope). */
const BLOCK = (sel: string) => (c: string) => `${sel} {\n${c}\n}`;
const MEDIA = (q: string, sel = ":root") => (c: string) => `@media ${q} {\n  ${sel} {\n${c}\n  }\n}`;

export default defineConfig({
  tokens: ["./src/nizivo.resolver.json"],
  outDir: "./dist/",
  lint: {
    rules: {
      "core/consistent-naming": ["error", { format: "kebab-case" }],
      "core/required-type": "error",
      "core/descriptions": ["warn", { ignore: ["p.**"] }],
      "a11y/min-contrast": ["error", {
        level: "AA",
        pairs: [
          { foreground: "text.primary",   background: "bg.surface" },
          { foreground: "text.secondary", background: "bg.surface" },
          { foreground: "text.tertiary",  background: "bg.surface" },   // known failure today → tracked
          { foreground: "text.on-brand",  background: "bg.brand" },
          { foreground: "text.critical",  background: "bg.surface" },
          { foreground: "border.default", background: "bg.surface", largeText: true } // 3:1 proxy for non-text (1.4.11)
        ],
      }],
      "a11y/min-font-size": ["error", { minSizePx: 12 }],
    },
  },
  plugins: [
    css({
      filename: "css/tokens.css",
      variableName: (token) => cssVar(token.id),
      // Spring easings → CSS linear(); px stays px (rem conversion optional per group)
      transform(token) {
        const s = token.$extensions?.["dev.nizivo.spring"];
        if (s) return springToLinear(s);            // e.g. "linear(0, 0.046, … , 1)"
      },
      permutations: [
        // base: every default context at :root ONLY (never on [data-theme] scopes, or a nested
        // light scope would reset motion/viewport tokens for its subtree)
        { input: { theme: "light", motion: "default", viewport: "mobile" },
          prepare: (c) => `@layer nz.tokens {\n:root {\n  color-scheme: light;\n${c}\n}\n}` },
        // theme: explicit light scope re-declares ONLY theme tokens (mirrors the dark entry)
        { input: { theme: "light" },
          prepare: (c) => `@layer nz.tokens {\n${BLOCK('[data-theme="light"]')(`  color-scheme: light;\n${c}`)}\n}` },
        { input: { theme: "dark" },
          prepare: (c) => `@layer nz.tokens {\n${MEDIA("(prefers-color-scheme: dark)", ':root:not([data-theme="light"])')(`  color-scheme: dark;\n${c}`)}\n${BLOCK('[data-theme="dark"]')(`  color-scheme: dark;\n${c}`)}\n}` },
        // motion
        { input: { motion: "reduced" },
          prepare: (c) => `@layer nz.tokens {\n${MEDIA("(prefers-reduced-motion: reduce)", ':root:not([data-motion="full"])')(c)}\n${BLOCK('[data-motion="reduced"]')(c)}\n}` },
        // viewport (thresholds pending designer sign-off)
        { input: { viewport: "tablet" },  prepare: (c) => `@layer nz.tokens {\n${MEDIA("(width >= 768px)")(c)}\n}` },
        { input: { viewport: "desktop" }, prepare: (c) => `@layer nz.tokens {\n${MEDIA("(width >= 1280px)")(c)}\n}` },
      ],
    }),
    tailwind({
      filename: "tailwind/theme.css",
      theme: {
        color: ["bg.*", "text.*", "border.*", "icon.*", "chart.*"],
        spacing: ["space.*"],
        radius: ["radius.*"],
        shadow: ["elevation.*"],
        ease: ["easing.*"],
      },
    }),
    nizivoJs({ filename: "js/index.js", prefix: PREFIX }),             // var() refs + types (§7.5)
    nizivoComponents({ outDir: "css/components", prefix: PREFIX }),     // --_nz-* hooks (§6.3)
    nizivoFigma({ outDir: "figma", durationUnit: "s" }),                // Figma import requires seconds
  ],
});
```

**Caveats to confirm on day one:**

- The `permutations` and `prepare()` mechanics are VERIFIED from [plugin-css docs](https://terrazzo.app/docs/integrations/css/). Two behaviours are UNVERIFIED and need checking against Terrazzo 2.8:
  - whether a **partial** `input` (e.g. `{ theme: "dark" }` alone) emits only the tokens that context changes, which the orthogonality detection added in 2.4.0 suggests
  - the exact sub-variable names for typography composites
- It is UNVERIFIED whether `plugin-tailwind` can emit `var(--nz-*)` references as `@theme inline`, rather than raw values. If it can't, use the 40-line custom plugin (§7.5). The aim is **one** set of runtime variables, so Tailwind utilities follow `[data-theme]` automatically.

**Style Dictionary swap sketch** (keeps the same `src/**`; runs once per context until resolver support lands):

```js
// sd.config.mjs (style-dictionary@5)
import StyleDictionary from "style-dictionary";
const PREFIX = process.env.NZ_TOKEN_PREFIX ?? "nz";
const themes = { light: ':root, [data-theme="light"]', dark: '[data-theme="dark"]' };
for (const [name, selector] of Object.entries(themes)) {
  const sd = new StyleDictionary({
    source: ["src/figma-owned/primitives.tokens.json", "src/figma-owned/foundation.tokens.json",
             `src/figma-owned/color/${name}.tokens.json`],
    platforms: { css: { transformGroup: "css", prefix: PREFIX, buildPath: "dist/css/",
      files: [{ destination: `theme-${name}.css`, format: "css/variables",
                options: { selector, outputReferences: true },
                filter: (t) => t.filePath.includes(`/color/${name}`) }] } },
  });
  await sd.buildAllPlatforms();
}
```

### 7.5 Generated outputs (illustrative)

`dist/css/tokens.css` (excerpt):

```css
@layer nz.tokens {
:root {
  color-scheme: light;
  --nz-p-green-700: #1a573a;
  --nz-p-neutral-0: #ffffff;
  --nz-space-4: 16px;
  --nz-radius-md: 12px;
  --nz-bg-surface: var(--nz-p-neutral-0);
  --nz-bg-brand: var(--nz-p-green-700);
  --nz-duration-fast: 140ms;
  --nz-easing-spring: linear(0, 0.046, 0.156, 0.295, 0.441, 0.578, 0.697, 0.796, 0.874, 0.933, 0.974, 1.002, 1.019, 1.027, 1.03, 1.029, 1.026, 1.022, 1.018, 1.014, 1.01, 1.007, 1.004, 1.002, 1);
  --nz-duration-spring-settle: 490ms;
  --nz-grid-columns: 4;
  --nz-type-display: 36px;
}
}
@layer nz.tokens {
[data-theme="light"] { color-scheme: light; --nz-bg-surface: var(--nz-p-neutral-0); --nz-bg-brand: var(--nz-p-green-700); }
}
@layer nz.tokens {
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --nz-bg-surface: var(--nz-p-neutral-900); --nz-bg-brand: var(--nz-p-green-400); } }
[data-theme="dark"] { color-scheme: dark; --nz-bg-surface: var(--nz-p-neutral-900); --nz-bg-brand: var(--nz-p-green-400); }
}
@layer nz.tokens {
@media (prefers-reduced-motion: reduce) { :root:not([data-motion="full"]) { --nz-duration-fast: 0ms; --nz-easing-spring: linear; --nz-distance-lift: 0px; } }
[data-motion="reduced"] { --nz-duration-fast: 0ms; --nz-easing-spring: linear; --nz-distance-lift: 0px; }
}
@layer nz.tokens { @media (width >= 768px) { :root { --nz-grid-columns: 8; --nz-type-display: 44px; } } }
@layer nz.tokens { @media (width >= 1280px) { :root { --nz-grid-columns: 12; --nz-type-display: 56px; } } }
```

**How this output behaves:**

- It has **zero JS and is RSC-safe.** "System" theme needs no script. An explicit user choice is rendered on the server as `<html data-theme="dark">` from a cookie, so there is no flash and no hydration mismatch.
- Nested `<div data-theme="dark">` scopes work, because semantic vars alias *constant* primitives.
- Everything sits in `@layer nz.tokens`, so any unlayered consumer CSS wins without specificity fights.
- Estimated size for ~185 tokens: ~8–10 KB raw, ~2–3 KB brotli. This is *(estimate)*; enforce it with a size budget in CI.
- **Known limit.** Per-viewport tokens use media queries, which follow the viewport, not the component's width. For container-driven layouts, ship an **opt-in** `dist/css/viewport.container.css` that wraps the same context blocks as `@container nz-layout (width >= 768px) { .nz-cq { … } }`. A container query only styles **descendants** of the container, so the app marks a wrapper `.nz-cq` inside a `container: nz-layout / inline-size` element.

`dist/tailwind/theme.css` (goal shape):

```css
@theme inline {
  --color-bg-surface: var(--nz-bg-surface);
  --color-bg-brand: var(--nz-bg-brand);
  --color-text-primary: var(--nz-text-primary);
  --spacing: 4px;                       /* Tailwind v4 multiplies --spacing: p-4 = 16px = space/4 */
  --radius-md: var(--nz-radius-md);
  --shadow-raised: var(--nz-elevation-2);
  --ease-standard: var(--nz-easing-standard);
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --breakpoint-md: 768px;               /* static; must equal code-owned breakpoints */
  --breakpoint-lg: 1280px;
}
```

Tailwind's own `prefix()` option affects consumer utility classes. I did not verify how it interacts with `@theme` variable names. It is independent of our `--nz-` runtime variables.

`dist/js/index.js` + `index.d.ts` (custom plugin output; tree-shakable, no runtime):

```ts
// index.d.ts
export type TokenId = "bg.surface" | "bg.brand" | "text.primary" | "space.4" | /* … */ never;
export declare const vars: { readonly bg: { readonly surface: "var(--nz-bg-surface)"; readonly brand: "var(--nz-bg-brand)" }; /* … */ };
export declare function cssVar<T extends TokenId>(id: T): string;   // "var(--nz-…)"
export declare const springs: { readonly spring: { mass: 1; stiffness: 260; damping: 24 }; readonly "spring-soft": { mass: 1; stiffness: 170; damping: 26 } };
```

`dist/json/theme-light.json`, `theme-dark.json`, … hold resolved values, produced at build time with `@terrazzo/plugin-js`'s resolver (`resolver.apply({theme:"dark"})`). They are for canvas/WebGL charts, email, native, and docs. They are **never** needed by the CSS path.

`dist/figma/<Collection>/<Mode>.tokens.json` is written within the constraints of Figma's native **Import mode**: px dimensions, durations in **seconds**, sRGB colors, `com.figma.aliasData` for cross-collection aliases ([help](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)). It is also TokensBrücke-import compatible. It is mainly used for bootstrapping new files and brand experiments. Day-to-day pushes go through `figma-push.ts` (§8.4).

### 7.6 `packages/tokens/package.json` (exports)

```json
{
  "name": "@nizivo/tokens",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".":               { "types": "./dist/js/index.d.ts", "default": "./dist/js/index.js" },
    "./css":           "./dist/css/tokens.css",
    "./css/*":         "./dist/css/*",
    "./tailwind.css":  "./dist/tailwind/theme.css",
    "./values/*":      "./dist/json/*",
    "./dtcg/*":        "./src/*",
    "./figma/*":       "./dist/figma/*",
    "./package.json":  "./package.json"
  },
  "files": ["dist", "src"]
}
```

Shipping `./dtcg/*` (the source and resolver) is what makes **"plug in your own tokens"** possible. A consumer or a white-label build can extend the resolver with a brand context, or rebuild with `NZ_TOKEN_PREFIX=acme`, without forking. Prefix changes are **build-time**: component CSS in `@nizivo/ui` references `--nz-*`. A different prefix therefore means rebuilding the component CSS with the same env var. Document this, and keep `nz` as the published default.

---

## 8. Figma ↔ code workflow, review and drift detection

### 8.1 Designer → code (normal path)

1. **Designer edits Variables in Figma**, in the Pro-team file, and publishes the library.
2. **Designer runs TokensBrücke** → *Push to server → GitHub PR*. Settings live in a checked-in `tokens/figma/tokensbruecke.settings.md`:
   - DTCG 2025.10 **on**
   - **split modes on**
   - include text and effect styles
   - include scopes and Figma metadata
   - color "sRGB DTCG"
   - target folder `tokens/figma/raw`

   The plugin commits to branch `tokens-bruecke/update-tokens` and opens or updates the PR.
3. **CI (`tokens-sync.yml`) on that PR:**
   1. `pnpm tokens:normalize` → if `src/figma-owned/**` changed, commit the normalized result back to the PR branch with `GITHUB_TOKEN`.
   2. `tz check` / `tz lint`: DTCG validity, naming, required modes, **WCAG contrast pairs**.
   3. `tz build` plus a CSS size budget.
   4. `pnpm tokens:diff` posts a sticky PR comment with a table of added, removed and changed tokens. It shows old → new per mode, color swatches as inline SVG data URIs, and contrast deltas. It flags **removed or renamed public tokens as breaking**, which requires a `major` changeset.
   5. Visual regression, from Storybook/Playwright screenshots of the affected components, across the light/dark × default/reduced matrix.
4. **Review:**
   - CODEOWNERS: `src/figma-owned/**` → design-system designers + one engineer; `src/code-owned/**` and `nizivo.resolver.json` → engineers.
   - Label `tokens:design` is set automatically.
   - Merge → Changesets → release via **npm trusted publishing (OIDC)**. GitHub restricted bypass-2FA granular tokens on 2026-07-31 and plans to remove their direct publishing in Jan 2027 ([GitHub changelog](https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens)).

**Security of the plugin push.** TokensBrücke documents a classic PAT with `repo` scope pasted into the plugin. Use a **dedicated bot GitHub account** with write access to this repo only. Protect `main`, require PRs, and restrict the bot to the `tokens-bruecke/*` branch pattern (rulesets). Test a fine-grained PAT (Contents + Pull requests: write, single repo) on day one; support for it is UNVERIFIED.

### 8.2 Engineer/agent path (audits, no PAT in Figma)

`pnpm tokens:pull:agent` is a documented Claude Code prompt and script:

- **Snapshot via `use_figma`.** Run Plugin API code that returns plain objects in the TokensBrücke snapshot shape. Return **one collection per call** and text/effect styles separately, to stay under the observed ~20 KB return cap. That is ~6–8 calls per sync, well inside Pro's 200/day and 10/min. Plugin API objects are live proxies, so copy the fields into plain objects before `JSON.stringify`, as the TokensBrücke README warns.
- **Merge the chunks** into `tokens/figma/snapshot.json`.
- Run `tokens-bruecke --input tokens/figma/snapshot.json --split-by-mode --output tokens/figma/raw --config tokens/figma/tb.config.json`.
- Run `pnpm tokens:normalize && pnpm tokens:diff`, then open a PR as in §8.1.

This path is **not usable from GitHub Actions on Pro**, because the remote MCP server is OAuth-only and limited to catalog clients.

### 8.3 Drift detection (what can and cannot be automated on Pro)

| Signal | Mechanism | Automatable on Pro? |
|---|---|---|
| "Figma changed, repo didn't" | `LIBRARY_PUBLISH` file webhook (Pro: up to 150 file webhooks) → tiny relay (Vercel/Cloudflare function verifies `passcode`) → GitHub `repository_dispatch` → workflow opens or updates an issue "Figma library published: N variables modified (keys …) — run sync". It matches `modified_variables[].key` against `$extensions["dev.nizivo.figma"].key` in `src/figma-owned/**` | **Yes, notification only.** It cannot fetch values (Variables REST is Enterprise) |
| Cheap fallback | Nightly `GET /v1/files/:key/meta` (Tier 3) compares `version`/`lastModified` to the version recorded at the last sync | Yes. Noisy, since any edit counts |
| Value drift (true diff) | Every extractor PR runs normalize → diff. The **CI invariant** is `normalize(raw) === src/figma-owned` | Yes, once a human has exported |
| Code-first edits to Figma-owned tokens | CI fails if `src/figma-owned/**` changes without matching `raw/**`, **unless** the PR has label `tokens:code-first`. That label adds a required checklist item: "pushed to Figma via `pnpm tokens:push-figma`". The next sync must show zero diff | Yes |
| `codeSyntax` drift (Dev Mode shows the wrong var names) | `figma-push.ts` sets `variable.setVariableCodeSyntax('WEB', 'var(--nz-…)')` from the build. The diff step warns when the raw export's `codeSyntax` ≠ the generated name | Agent-run |
| Raw values in components (unbound fills, radii) | Periodic `use_figma` audit script (the foundations audit already found unbound radii and stroke weights) | Agent-run |

**If the team ever upgrades to Enterprise**, swap the extractor adapter for `tokens-bruecke --file-key` or `tz import` in a scheduled workflow. Everything after `raw/**` stays the same. That gives fully automatic drift PRs.

### 8.4 Code → Figma

There are two code→Figma tools:

- **`pnpm tokens:push-figma`** (agent, `use_figma`) reads `dist/figma/**` and updates variables by `variableId`. It creates missing ones and **never deletes** them; it lists orphans instead. It also rewrites `codeSyntax.WEB` and syncs descriptions. A dry-run prints the plan first.
- **Figma's native Import mode** works for bootstrapping a new file or brand.

The reason the `codeSyntax` matters: once WEB is `var(--nz-…)`, the MCP `get_design_context` and `get_variable_defs` output, and Dev Mode, reference **our real CSS variables**. That raises the quality of AI-assisted and human implementation.

---

## 9. Springs: from Figma `spring()` to CSS `linear()` *(computed)*

Figma stores `spring(mass, stiffness, damping, velocity)` strings. We sample the damped harmonic oscillator at build time (`scripts/spring.ts`; Python prototype in `scratchpad/r7/spring.py`):

| Token | ζ (damping ratio) | Settle (±0.1%) | Overshoot | 25-point `linear()` |
|---|---|---|---|---|
| `spring(1, 260, 24, 0)` | 0.744 (under-damped) | ≈ 492 ms | 3.0% | `linear(0, 0.046, 0.156, 0.295, 0.441, 0.578, 0.697, 0.796, 0.874, 0.933, 0.974, 1.002, 1.019, 1.027, 1.03, 1.029, 1.026, 1.022, 1.018, 1.014, 1.01, 1.007, 1.004, 1.002, 1)` |
| `spring(1, 170, 26, 0)` (soft) | 0.997 (≈ critical) | ≈ 701 ms | 0% | `linear(0, 0.057, 0.178, 0.317, 0.451, 0.568, 0.667, 0.746, 0.809, 0.858, 0.895, 0.922, 0.943, 0.959, 0.97, 0.978, 0.984, 0.989, 0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1)` |

**Emitted tokens:**

- `--nz-easing-spring` holds the `linear(…)` string, from a `transform()` on the `easing.spring` token.
- `--nz-duration-spring-settle` holds the settle time, because a spring's duration is a property of the physics. A `transform()` can only rewrite existing tokens, not create new ones, so the **normalizer** writes this as a real `duration.spring-settle` token in the source.
- Reduced mode sets `linear` and `0ms`/`120ms`.
- `@nizivo/motion` imports the `{mass, stiffness, damping}` from JS for gesture-driven tilt and magnetic effects.
- Use adaptive sampling (fewer points where the curve is flat) to keep CSS small. `linear()` is Baseline widely available, so no fallback is needed for modern targets.

---

## 10. Theming runtime notes (React/RSC-neutral)

- **`ThemeScope`** is a server component that renders `<div data-theme="dark">`. There is no context and no client JS. `useTheme()` is client-only and is only needed for toggles.
- **No-flash SSR:**
  - The default "system" theme relies purely on the media query.
  - For an explicit preference, the server sets `data-theme` on `<html>` from a cookie (Next.js App Router, React Router v7, TanStack Start).
  - Static or Astro sites use a ≤300-byte inline head script.
- **Reduced motion** combines the OS setting and a user override through `[data-motion]`. Components read `--nz-duration-*` and `--nz-distance-*`, so they need **no JS check** for CSS-driven motion.
- **`light-dark()` mode (later, optional).** The output strategy could emit `--nz-bg-brand: light-dark(var(--nz-p-green-700), var(--nz-p-green-400))` once at `:root`, with `[data-theme]` only switching `color-scheme`. The upsides: half the color CSS, and consumer `:root` overrides become theme-safe automatically, because unregistered custom properties carry the unevaluated `light-dark()` down the tree. The downsides: it handles only 2 schemes, and it is **not built into Terrazzo plugin-css** (UNVERIFIED as a plugin option), so it needs a custom transform or post-process. Keep it behind the single `themeSelectors` strategy switch.

---

## 11. Code Connect on Pro: what to do instead

- Custom Code Connect is **Organization/Enterprise only**. Until an upgrade, keep `design/component-map.json` in the repo, mapping each Figma component-set key and node id to the package export, props mapping and Storybook URL. Source the node ids from the foundations notes, e.g. Button `7275:11244`.
- Feed it to agents through the MCP prompt `create_design_system_rules` or an `AGENTS.md`/`CLAUDE.md` section. Add Dev Mode **dev resource links** (Storybook URLs) on component sets. The dev resources endpoint is Tier 2; plan availability on Pro is UNVERIFIED.
- The map converts mechanically to `*.figma.tsx` Code Connect files after an upgrade.

---

## 12. Rejected alternatives (and why)

- **Tokens Studio as source of truth:**
  - It costs €39/editor/mo for Git sync.
  - It creates a **second token model** inside plugin storage that competes with the native Variables the designers already use.
  - Its theme JSON is proprietary (`$themes`).
  - It adds a vendor to the critical path of a work-in-progress system.

  Revisit only if designers want token math or expressions that native Variables lack.
- **Figma native Export modes as the primary path:**
  - The export format is undocumented and reportedly not DTCG-named.
  - Composites (typography, shadow) are missing, and descriptions are reportedly missing.
  - It is manual download only.
- **Style Dictionary as the default builder:** it lacks Resolver-module support (#1590, not started) and its 2025.10 support is partial. We would hand-roll the theme permutation logic that Terrazzo already ships. It stays the documented swap target, and the DTCG source keeps that swap cheap.
- **Fully custom builder:** we would re-implement DTCG parsing, alias resolution, the resolver and lints for no gain.
- **Terrazzo `tz import` / TokensBrücke REST mode in CI:** both need the Enterprise Variables API.
- **Figma MCP from GitHub Actions:** OAuth-only and limited to catalog clients; PATs are rejected.
- **lukasoppermann/design-tokens and Theo:** unmaintained (partially supported / last publish 2022).
- **Component tokens declared at `:root`:** this breaks nested theme scopes (§6.3).
- **Runtime-configurable prefix:** impossible with zero-runtime CSS. It is a build-time env var.

---

## 13. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Terrazzo bus factor / churn.** ~475★; 0.10→2.0 breaking jump in Mar 2026; 8 minors since | med | med | Pin exact versions plus Renovate. Golden-file tests on `dist/**`. Custom code lives in **our plugins** behind the plugin API. The DTCG source is tool-neutral, and the SD swap config is kept compiling in CI (optional job) |
| **TokensBrücke output shape vs Terrazzo 2.x strictness.** 2.0 rejects string dimensions and editors-draft colors | med | low | Run `tz format` + our normalizer on every import. Golden test with a real export **on day one** |
| TokensBrücke single maintainer / plugin removed | low–med | med | Its output is standard DTCG and our normalizer owns the mapping. Fallback is the MCP dump with our own transformer, or a custom plugin (option C) |
| Drift goes unnoticed (Pro can't pull) | med | med | `LIBRARY_PUBLISH` webhook → issue. Nightly `/meta` version check. A PR template checklist for designers. Sync runs before each release (release workflow blocks if the open "sync needed" issue is younger than the last publish) |
| `use_figma` ~20 KB return cap / MCP budget | med | low | Chunk per collection; ~8 calls per sync vs 200/day |
| PAT pasted into a Figma plugin | med | med | Bot account, single-repo scope, branch ruleset, rotate every 90 days |
| Mode cap: Pro = 10 per collection (forum figure); extended collections = Enterprise | low now | med later | Brands and contrast handled as resolver modifiers in code. In Figma, use separate files per brand if needed |
| Breakpoints undefined in Figma | high | med | Code-owned `breakpoints.tokens.json` (768/1280 proposed) with a designer sign-off ticket. Mirror back as Figma number variables |
| Accessibility debt in tokens (`text/tertiary`, dark `text/critical`, borders < 3:1, `icon/warning`) | **certain** | high (WCAG 2.2 AA) | `a11y/min-contrast` at **error** severity, with an explicit, expiring allowlist. Fixes land in Figma and flow through sync |
| Dark-mode elevation (shadows light-tuned) | high | low–med | Alias shadow colors to a themed `shadow.tint`. Raise with design |
| `light-dark()` not widely-available Baseline until ~Nov 2026 | n/a | n/a | Not used by default |
| Consumer overrides with semantic aliases at `:root` freeze the theme | med | med | Document the `:root, [data-theme]` recipe. Later, `light-dark()` mode removes the footgun for colors |
| Figma plan changes (limits "Figma reserves the right to change") | med | med | Every Figma dependency sits behind the extractor adapter. Nothing in build or consume touches Figma |

---

## 14. Open questions (need a human decision)

1. **Breakpoint thresholds.** Is 768/1280 px (mobile <768, tablet 768–1279, desktop ≥1280) acceptable? Should viewport tokens also ship as container-query variants by default?
2. **Ownership boundary.** Who approves `src/figma-owned/**` PRs (design lead + 1 engineer)? Is `tokens:code-first` allowed at all, or must all value changes originate in Figma?
3. **Bot account** for the TokensBrücke GitHub PR push: acceptable, or should designers download and engineers commit?
4. **Webhook relay hosting** (Vercel function vs Cloudflare Worker) and who owns the secret.
5. **Units policy.** Keep px in source and output, or convert type and space to rem in CSS output? DTCG supports both, but the Figma native import requires px.
6. **Primitive naming.** Keep the `--nz-p-*` short form (matches existing Figma codeSyntax) or rename to `--nz-palette-*`?
7. **Figma file hygiene.** Remove the non-Grove collections and text styles from the DS file, so extractors don't need allowlists. Also restore the deleted icon and logo masters (from `01-foundations.md`).
8. **Organization upgrade.** Is it on the roadmap? That decides whether Code Connect and branching get planned or permanently replaced.

## 15. Day-one verification checklist (things I could not confirm today)

- [ ] Export the Grove file with TokensBrücke (split modes, styles on) and confirm `tz check` passes after `tz format`, or note which normalizations are needed.
- [ ] Terrazzo plugin-css with a **partial** permutation `input` emits only the changed tokens. Confirm the typography sub-var names and `transform()` precedence over aliases.
- [ ] `plugin-tailwind` can emit `@theme inline` with `var(--nz-*)` references; otherwise ship the custom plugin.
- [ ] `a11y/min-contrast` evaluates **every** theme permutation, not just the default.
- [ ] Whether `core/duplicate-values` is on by default. If so, configure `ignore` for intentional duplicates such as reduced-motion zeros and cubic fallbacks.
- [ ] A nested `[data-theme="light"]` inside a dark page re-declares **only** theme tokens. This depends on the partial-`input` behaviour above.
- [ ] TokensBrücke GitHub PR push works with a **fine-grained** PAT.
- [ ] `use_figma` return-size cap (observed ~20 KB) and whether `use_figma` counts against MCP limits on Pro.
- [ ] Pro mode cap (10/collection) and Starter mode availability, against the current Figma "plans and features" page.
- [ ] `LIBRARY_PUBLISH` webhook fires for a variables-only publish on a **Pro** team library, and `modified_variables` carries `key`s.

---

## Sources

Figma (official):
- Variables REST endpoints (Enterprise-only): https://developers.figma.com/docs/rest-api/variables-endpoints/
- REST rate limits (effective 2025-11-17): https://developers.figma.com/docs/rest-api/rate-limits/
- File endpoints: https://developers.figma.com/docs/rest-api/file-endpoints/
- Webhooks v2 / events: https://developers.figma.com/docs/rest-api/webhooks/ · https://developers.figma.com/docs/rest-api/webhooks-events/
- MCP rate limits & access: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/
- MCP tools: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
- MCP remote install (OAuth, catalog clients): https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/
- Plugin API variables: https://developers.figma.com/docs/plugins/working-with-variables/
- Code Connect plans: https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect
- Modes for variables (plans, import/export JSON): https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
- Extended collections (Enterprise): https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection
- Dev Mode plans: https://help.figma.com/hc/en-us/articles/19813618057623
- Pricing: https://www.figma.com/pricing/

Figma community / forum (secondary):
- Native DTCG export gaps: https://forum.figma.com/suggest-a-feature-11/dtcg-composite-token-export-support-51314
- Native export rollout: https://forum.figma.com/ask-the-community-7/native-variable-export-feature-47831
- MCP PAT not supported: https://forum.figma.com/suggest-a-feature-11/support-for-pat-personal-access-token-based-auth-in-figma-remote-mcp-47465
- Enterprise gating complaint (Jan 2026): https://forum.figma.com/share-your-feedback-26/enterprise-plan-required-to-access-variables-via-api-50294

DTCG:
- Stable announcement (2025-10-28): https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- TR index / Format / Color / Resolver: https://www.designtokens.org/tr/2025.10/ · https://www.designtokens.org/TR/2025.10/format/ · https://www.designtokens.org/TR/2025.10/color/ · https://www.designtokens.org/TR/2025.10/resolver/

Terrazzo:
- Docs: https://terrazzo.app/docs/ · Resolvers: https://terrazzo.app/docs/guides/resolvers/ · CSS: https://terrazzo.app/docs/integrations/css/ · Tailwind: https://terrazzo.app/docs/integrations/tailwind/ · JS: https://terrazzo.app/docs/integrations/js/ · Linting: https://terrazzo.app/docs/linting/ · CLI: https://terrazzo.app/docs/reference/cli
- CHANGELOG: https://github.com/terrazzoapp/terrazzo/blob/main/packages/cli/CHANGELOG.md
- Import-from-Figma guide (Enterprise note): https://github.com/terrazzoapp/terrazzo/blob/main/www/src/pages/docs/guides/import-from-figma.md
- npm: https://www.npmjs.com/package/@terrazzo/cli (2.8.0, 2026-10-13)

Style Dictionary:
- DTCG page: https://styledictionary.com/info/dtcg/
- CHANGELOG: https://github.com/style-dictionary/style-dictionary/blob/main/CHANGELOG.md
- 2025.10 tracking issue #1590: https://github.com/style-dictionary/style-dictionary/issues/1590
- npm: https://www.npmjs.com/package/style-dictionary (5.6.1, 2026-10-10)

Extractors:
- TokensBrücke: https://github.com/tokens-bruecke/figma-plugin (v3.18.0, 2026-10-09) · https://www.figma.com/community/plugin/1254538877056388290/tokens-bruecke · npm `tokens-bruecke` 3.18.0
- Tokens Studio pricing: https://tokens.studio/pricing · multi-file sync: https://docs.tokens.studio/token-storage/remote-multi-file-sync
- lukasoppermann/design-tokens: https://github.com/lukasoppermann/design-tokens

CSS / Tailwind / other:
- light-dark(): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- linear(): https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear
- Tailwind @theme: https://tailwindcss.com/docs/theme (tailwindcss 4.3.3, 2026-07-16)
- Pseudo-private custom properties: https://lea.verou.me/blog/2021/10/custom-properties-with-defaults/
- npm bypass-2FA restriction: https://github.blog/changelog/2026-07-31-restricting-npm-bypass-2fa-granular-access-tokens

Versions and dates for `style-dictionary`, `@terrazzo/*`, `@tokens-studio/sd-transforms`, `@figma/code-connect`, `tailwindcss`, `theo` and `tokens-bruecke` were read with `npm view` on 2026-10-14.
