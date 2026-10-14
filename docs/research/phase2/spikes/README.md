# Phase-2 spikes S1–S4

Status: evidence record · 2026-10-14

These are the hands-on experiments that [ARCHITECTURE.md](../../../ARCHITECTURE.md) cites as "spike S1–S4". Each entry gives the verdict, what was run and seen, and what it means for the plan. The scripts, configs and outputs sit next to this file (`s1-lightningcss/`, `s2-rsc/`, `s3-terrazzo/`, `s4-spring/`). Dependencies (`node_modules`, browser binaries, lockfiles and packed tarballs) were not copied, so run `npm i` with the versions listed in each `package.json` to reproduce.

Implications are recorded as written at the time. Where the plan later decided differently (for example S1b and S3 still recommend a generated `tokens.legacy.css`, which the plan deliberately does not build; see ARCHITECTURE §4.2), ARCHITECTURE.md wins. Scripts that launch browsers import `playwright-core` by bare name.

Environment: macOS, Node 24.16.0, npm 11.13.0. Browsers: Playwright Chromium 156 and WebKit 27.2. Firefox could not be launched in the sandbox (S1d).

| Spike | Topic | Verdict |
|---|---|---|
| [S1](#s1) | light-dark() nesting in browsers | verified-works |
| [S1b](#s1b) | Lightning CSS lowering below Safari 17.5 | verified-fails |
| [S1c](#s1c) | @property-registered colour tokens | verified-fails |
| [S1d](#s1d) | Firefox and real Safari coverage | unverified |
| [S2](#s2) | RSC namespace export from a 'use client' module (Next 16.4) | verified-fails |
| [S2b](#s2b) | Directive-free namespace target | verified-works |
| [S2c](#s2c) | Client JS measurement (Turbopack and webpack) | verified-works |
| [S3](#s3) | Terrazzo 2.8.0 output shapes | verified-works |
| [S3a](#s3a) | Terrazzo partial permutations | verified-fails |
| [S3c](#s3c) | Terrazzo stock Tailwind plugin | verified-fails |
| [S4](#s4) | spring() to CSS linear() | verified-works |
| [S4b](#s4b) | Figma spring() parameter order | unverified |

## S1

**light-dark() nesting in browsers** · verdict: `verified-works`

### Finding

HEADLINE: Native light-dark() inside UNREGISTERED custom properties works. Nested [data-theme] scopes are correct, and an unset or `normal` :root color-scheme resolves to LIGHT even when the OS is dark. This was measured in Chromium 156.0.8078.4 and Playwright WebKit 27.2; Firefox could not launch (see S1d). Lightning CSS lowering for <17.5 is a separate result, and it FAILS (see S1b).

ENV: Node 24.16.0, npm 11.13.0, lightningcss 1.33.0 (registry latest), @playwright/test 1.64.0.

COMMANDS (in spikes/s1-lightningcss):
- `npm i -D lightningcss@1.33.0 @playwright/test@1.64.0`
- `PLAYWRIGHT_BROWSERS_PATH=$PWD/.browsers npx playwright install chromium webkit firefox`
- `node compile.mjs`
- `TMPDIR=$PWD/tmp PLAYWRIGHT_BROWSERS_PATH=$PWD/.browsers node matrix.mjs` (84 cells per engine; output in matrix-results.json)
- `node matrix-varinside.mjs` (same matrix, with the token written as `light-dark(var(--nz-p-neutral-0), var(--nz-p-neutral-900))`)

SOURCE: `:root{--nz-bg-surface: light-dark(#ffffff,#181b19); color-scheme: light dark} [data-theme=dark]{color-scheme:dark} [data-theme=light]{color-scheme:light} .probe{background:var(--nz-bg-surface)}`

MATRIX (native output; L=#fff, D=#181b19; Chromium and WebKit identical). Columns are root / d1 / d1>l2 / d1>l2>d3 / d1>normal:
- root `light dark`, no attr, OS light: L / D / L / D / L
- root `light dark`, no attr, OS dark: D / D / L / D / L
- `html[data-theme=dark]`, OS light: D / D / L / D / L
- `html[data-theme=light]`, OS dark: L / D / L / D / L
- root color-scheme UNSET, OS dark: L / D / L / D / L
- root `color-scheme: normal`, OS dark: L / D / L / D / L

All cells are correct.

The var()-inside-light-dark form (exactly what the Terrazzo glue emits) gives cell-for-cell identical results in both engines, so the recommended token shape is verified end to end.

LIGHTNING CSS EMISSION:
- At target Safari 17.5 (`targets {safari:(17<<16)|(5<<8)}`), and with no targets, the output is unchanged: light-dark() is kept, including inside `--nz-*`.
- At Safari 16.4 it IS lowered inside custom properties. See S1b.

### Implication for the plan

- D6 holds. Use `light-dark()` in unregistered semantic custom properties, and have `[data-theme]` scopes set only `color-scheme`. Nesting comes for free.
- r2's non-intrusive default is valid: no color-scheme on :root means light values, and the page doesn't flip when the OS is dark. This closes the first half of S-b 3 for Chromium and WebKit; Firefox and real Safari 17.5 are still untested.
- The Safari 17.5 floor from light-dark() (D7) stands.
- Build rule (verified): pass `exclude: Features.LightDark` (value 1048576) to the Lightning CSS transform or bundle. With that, targets as low as Safari 16.4 keep light-dark() untouched while other features (for example logical properties) still get lowered. Alternatively, pin targets to Safari 17.5 or higher. Add a CI grep that fails if `--lightningcss-light` appears anywhere in dist.

## S1b

**Lightning CSS lowering below Safari 17.5** · verdict: `verified-fails`

### Finding

Lightning CSS 1.33.0 DOES lower light-dark() inside custom properties at Safari 16.4. It uses the space-toggle hack. The result is semantically WRONG for nested scopes and for an unset or `normal` root. No warnings are emitted.

EMITTED (targets {safari:(16<<16)|(4<<8)}):
```
:root{--nz-bg-surface: var(--lightningcss-light, #fff) var(--lightningcss-dark, #181b19); --lightningcss-light: initial; --lightningcss-dark: ; color-scheme: light dark}
@media (prefers-color-scheme: dark){:root{--lightningcss-light: ; --lightningcss-dark: initial}}
[data-theme="dark"]{--lightningcss-light: ; --lightningcss-dark: initial; color-scheme: dark}
[data-theme="light"]{--lightningcss-light: initial; --lightningcss-dark: ; color-scheme: light}
.direct{color: var(--lightningcss-light, #fff) var(--lightningcss-dark, #181b19)}
```
Toggles are injected only into rules that declare color-scheme. A rule with `color-scheme: normal` gets none. If :root has no color-scheme, no toggles are emitted at all.

MATRIX for the lowered CSS, run in Chromium 156 and WebKit 27.2 (identical). The output contains no light-dark(), so this approximates Safari 16.4; that is an inference, since no real Safari 16.4 was available. Columns are root / d1 / d1>l2 / d1>l2>d3 / d1>normal:
- root `light dark`, OS light: L / L(wrong) / L / L(wrong) / L
- root `light dark`, OS dark: D / D / D(wrong) / D / D(wrong)
- `html[data-theme=light]`, OS dark: L / L(wrong) / L / L(wrong) / L
- root UNSET or `normal`, no attr, any OS: every probe is TRANSPARENT (wrong). Both fallbacks are present, `#fff #181b19` is an invalid colour, so the value is invalid at computed-value time.
- root unset, `html[data-theme=dark]`: D / D / D(wrong) / D / D(wrong)

CAUSE: `--nz-bg-surface` substitutes its var() on :root. The resolved colour is what inherits, so descendant toggles never reach it.

When light-dark() is used directly on a property (not through a custom property), the lowered output does handle nesting. It still fails for `normal` (D instead of L) and for an unset root (transparent).

### Implication for the plan

- Do NOT use Lightning CSS lowering as the <Safari 17.5 legacy fallback. That claim in r2 §risk 'Lightning CSS can lower light-dark()' is technically true but unusable.
- The legacy file (`tokens.legacy.css`, r2 `colorStrategy: "blocks"`) must be generated by the token pipeline. It should re-declare plain values per `[data-theme]` block and per `prefers-color-scheme` block. Terrazzo can emit this; see S3a's working recipe.
- Main hazard: any browserslist or targets that include Safari <17.5, such as Tailwind's 16.4 floor or a 'defaults' query, will SILENTLY rewrite every token into this broken form. Mitigate with `exclude: Features.LightDark` (verified) plus the CI grep.

## S1c

**@property-registered colour tokens** · verdict: `verified-fails`

### Finding

`@property --nz-bg-surface { syntax: "<color>"; inherits: true; initial-value: transparent }` with native light-dark() breaks nested scopes. The pattern matches the lowered case. With OS light, d1 ([data-theme=dark]) computes L instead of D. With OS dark, d1>l2 computes D instead of L. Results were identical in Chromium 156 and WebKit 27.2. The registered `<color>` computes light-dark() on :root and inherits the resolved colour.

### Implication for the plan

r2's rule 'never @property-register semantic colour tokens' is now empirically confirmed for D6. If typed custom properties are wanted later, they may only be used for primitives or non-themed tokens. Add a lint rule that forbids `@property` on any token whose value contains light-dark().

## S1d

**Firefox and real Safari coverage** · verdict: `unverified`

### Finding

Firefox was NOT tested. Playwright's Firefox (build firefox-1555) would not launch in this sandbox: `[err] Could not find profile folder`, exit code 1. That happened even with TMPDIR and HOME redirected into the scratchpad. Real Safari 16.4 and 17.5 were also unavailable; Playwright WebKit 27.2 is current WebKit and validates only the native path.

### Implication for the plan

Before locking D6 and D7, run matrix.mjs and matrix-varinside.mjs on Firefox (128+ ESR and current) and on a real Safari 17.5 (BrowserStack or a device), especially the `color-scheme: normal`/unset → light row. The scripts can be reused as-is in CI with Playwright on Linux.

## S2

**RSC namespace export from a 'use client' module (Next 16.4)** · verdict: `verified-fails`

### Finding

HEADLINE: Namespace compound exports work from a Server Component ONLY IF the module targeted by `export * as X` has NO 'use client'. The layout specified in the brief (a 'use client' dialog.parts.tsx as the namespace target) FAILS `next build` in both Turbopack and webpack. The directive-free variant works (S2b). Zero library JS for a Button-only page is verified (S2c).

VERSIONS: next 16.4.0, react and react-dom 19.3.0, tsdown 0.23.1 (rolldown), Node 24.16.0.

COMMANDS:
- lib: `npm i -D tsdown@0.23.1 react@19.3.0 react-dom@19.3.0 @types/react typescript@5`, then `npx tsdown` (entry src/index.ts and src/b.ts, `format:['esm']`, `platform:'neutral'`, `unbundle:true`, `dts:false`, `external:[/^react/]`), then `npm pack`.
- app: `npm i next@16.4.0 react@19.3.0 react-dom@19.3.0 ../lib/nzspike-ui-0.0.1.tgz` (a real copy, not a symlink), then `NEXT_TELEMETRY_DISABLED=1 npx next build` and `npx next build --webpack`.
- Pages are plain .jsx. The app package.json must not be `"type":"commonjs"`: npm init's default caused a Turbopack 'Specified module format (CommonJs) is not matching' error, which was my setup error and was fixed.

TSDOWN DIST:
- 'use client' is preserved as line 1 in dist/dialog/dialog.parts.js, dist/sheet/sheet-root.client.js and dist/sheet/sheet-trigger.client.js.
- dist/index.js, dist/b.js and dist/button/button.js have no directive.
- tsdown still prints 3x `[MODULE_LEVEL_DIRECTIVE] ... may not be preserved when bundling` warnings; these are harmless in unbundle mode.

KEY FACT: rolldown puts the `export * as` namespace object INSIDE THE TARGET MODULE:
```
// dist/dialog/dialog.parts.js
"use client";
import { __exportAll } from "../_virtual/_rolldown/runtime.js";
var dialog_parts_exports = /* @__PURE__ */ __exportAll({ DialogPopup: () => DialogPopup, ..., Root: () => DialogRoot, Trigger: () => DialogTrigger });
... export { ..., dialog_parts_exports };
// dist/index.js
export { Button, dialog_parts_exports as Dialog, DialogPopup, DialogRoot, DialogTrigger };
```

BUILD RESULT for /ns-a, a Server Component rendering `<Dialog.Root defaultOpen><Dialog.Trigger/><Dialog.Popup/>`. Turbopack and webpack fail the same way:
```
Error occurred prerendering page "/ns-a".
Error: Element type is invalid: expected a string ... but got: undefined.
Export encountered an error on /ns-a/page: /ns-a, exiting the build.
```

The debug page /ns-a-debug shows what the server sees:
```
{"typeofDialog":"function","dialogDollarTypeof":"Symbol(react.client.reference)","dialogId":"[project]/node_modules/@nzspike/ui/dist/dialog/dialog.parts.js#dialog_parts_exports","keys":"","typeofDialogRoot":"undefined"}
```
The whole namespace object is one opaque client reference, and you cannot dot into it on the server.

On the client side the same namespace works: /client-ns, a 'use client' component using Dialog.*, works.

### Implication for the plan

D2 is decided empirically for Next 16.4. Keep namespace + flat exports, but under a HARD RULE:
- Put 'use client' only on leaf part files (e.g. dialog-root.client.tsx).
- Make the namespace target (dialog.parts.ts) a directive-free list of re-exports, so the __exportAll object is created in server-graph code. See S2b.
- Add a build or CI check that fails when a dist file starting with "use client" contains `__exportAll` or exports a `*_exports` binding.
- The exact phrasing in the brief (a 'use client' dialog.parts.tsx) must be changed in the design doc.

S-b 4 is closed for Next 16.4. It remains open for React Router 8 RSC, @vitejs/plugin-rsc and TanStack Start.

No package naming change follows from this; @nizivo/ui is still not final.

## S2b

**Directive-free namespace target** · verdict: `verified-works`

### Finding

Variant B layout:
- sheet-root.client.tsx and sheet-trigger.client.tsx each start with 'use client'.
- sheet.parts.ts is directive-free: `export { SheetRoot as Root } from './sheet-root.client'; export { SheetTrigger as Trigger, SheetPopup as Popup } from './sheet-trigger.client'`.
- src/b.ts has `export * as Sheet from './sheet/sheet.parts'`.
- Dist places `var sheet_parts_exports = __exportAll({Popup:()=>SheetPopup, Root:()=>SheetRoot, Trigger:()=>SheetTrigger})` in the directive-free dist/sheet/sheet.parts.js.

Results:
- /ns-b, a SERVER component rendering `<Sheet.Root defaultOpen><Sheet.Trigger/><Sheet.Popup/></Sheet.Root>` plus `<Button/>`, builds and is prerendered as static in both Turbopack and webpack.
- Playwright Chromium (hydrate.mjs) checked /ns-b, /flat-a, /flat-b and /client-ns: 0 console errors or warnings on each. Clicking the trigger toggles aria-expanded from true to false and the popup count from 1 to 0, which proves hydration and interactivity.
- Flat imports from the 'use client' file (/flat-a: DialogRoot/DialogTrigger/DialogPopup in a Server Component) also work.

### Implication for the plan

This is the recommended compound-export shape. It keeps both `<Dialog.Root>` (namespace) and `<DialogRoot>` (flat) usable from Server Components. tsdown `unbundle:true` preserves the structure 1:1, so the source-file convention is enough and no custom bundler plugin is needed.

## S2c

**Client JS measurement (Turbopack and webpack)** · verdict: `verified-works`

### Finding

Measured with measure.mjs. It runs `next start`, fetches each page's HTML, collects every `<script src>` plus every static/chunks/*.js referenced in the flight payload, fetches them, and greps for marker strings planted in each component.

TURBOPACK (brotli totals):
- / : 146.7 KB. This is the Next 16.4 + React 19.3 baseline.
- /button-only: 146.7 KB, identical to /. There is NO library JS; the Button marker appears only in the HTML.
- /flat-a: 147.2 KB. Dialog chunk is 1019 B raw / 591 B gz.
- /ns-b: 147.1 KB. Sheet chunk is 813 B raw / 470 B gz.

WEBPACK:
- / and /button-only: 142.5 KB br each, with no library markers.

WEBPACK-ONLY CAVEAT (barrel leak): /ns-b imports Button from the `@nzspike/ui` barrel. Its page chunk ALSO contains the never-rendered Variant A dialog module (marker nz-dialog-marker-91bc), because webpack bundles every 'use client' module reachable through the barrel into the page's client entry. /button-only escapes this only because it loads no page chunk at all. Turbopack did not leak. Setting `experimental.optimizePackageImports: ['@nzspike/ui']` removed the leak on webpack (marker count 0; verified).

Also confirmed: the Next 16.4 build output no longer prints First Load JS sizes, so the chunk-grep method is needed.

### Implication for the plan

- Server-safe components with no directive (Button, Card, typography) cost zero client JS through a directive-free barrel in both bundlers. This supports the T0/server-safe tier.
- Document `optimizePackageImports` for webpack users, or offer per-component subpath exports. Turbopack, the Next 16 default, needs nothing.
- Use the marker-grep approach as the size-limit/CI method for 'zero JS' assertions; the build table no longer reports it.

## S3

**Terrazzo 2.8.0 output shapes** · verdict: `verified-works`

### Finding

HEADLINE: Terrazzo 2.8.0 can produce the CSS shape the architecture needs. Per-mode selectors are fully user-controlled through `prepare()`. Reduced motion maps natively to @media. light-dark() is possible with about 15 lines of glue. Two r7 assumptions FAIL as written: S3a (partial permutations) and S3c (plugin-tailwind var refs).

VERSIONS: @terrazzo/cli, plugin-css and plugin-tailwind 2.8.0; tailwindcss and @tailwindcss/cli 4.3.3 (used to compile the output); style-dictionary 5.6.1 was inspected only.

COMMANDS (spikes/s3-terrazzo):
- `npm i -D @terrazzo/cli@2.8.0 @terrazzo/plugin-css@2.8.0 @terrazzo/plugin-tailwind@2.8.0 tailwindcss@4.3.3 @tailwindcss/cli@4.3.3`
- `MODE=blocks|only|lightdark npx tz build -c terrazzo.config.mjs`
- `npx tz build -c terrazzo.scoped.config.mjs`
- `MODE=blocks|lightdark npx tz build -c terrazzo.tw.config.mjs`
- `npx tz build -c terrazzo.twcustom.config.mjs`
- `npx @tailwindcss/cli -i out/tw-in.<m>.css -o out/tw-out.<m>.css`

TOKENS: a DTCG 2025.10 resolver (tokens/nizivo.resolver.json, with `version: "2025.10"` and no $schema) containing:
- set `primitives`: color.p.neutral-0 = #fff and neutral-900 = #181b19, written as colour objects {colorSpace, components, hex}
- modifier `theme` {light, dark}: color.bg.surface and color.text.primary alias the primitives
- modifier `motion` {default 140ms, reduced 0ms}: duration.fast written as {value, unit}
- resolutionOrder: primitives, then theme, then motion

Terrazzo parsed it without warnings and judged the resolver orthogonal. Prefix comes from `variableName: t => '--nz-' + ...`. The default id-to-name mapping keeps the group, so color.bg.surface becomes `--nz-color-bg-surface`; the spike stripped `color.` to get `--nz-bg-surface`.

LIGHT-DARK GLUE: plugin-css has no light-dark option (grep finds nothing). Its transform hook does receive `resolver`, so:
1. A 3-line companion plugin `{name, transform({resolver}){ref=resolver}}` captures it.
2. A permutation-level `transform` calls `ref.apply({...permutation, theme:'light'|'dark'})` and then `transformCSSValue` for each.

Output:
```
:root { color-scheme: light dark;
  --nz-color-bg-surface: light-dark(var(--nz-color-p-neutral-0), var(--nz-color-p-neutral-900));
  --nz-color-text-primary: light-dark(var(--nz-color-p-neutral-900), var(--nz-color-p-neutral-0));
  --nz-duration-fast: 140ms; --nz-color-p-neutral-0: #fff; --nz-color-p-neutral-900: #181b19; }
[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
@media (prefers-reduced-motion: reduce) { :root { --nz-duration-fast: 0ms; ... } }
```
This exact var()-inside form passed the S1 browser matrix.

REDUCED MOTION: `{input:{motion:'reduced'}, only:{modifiers:['motion']}, include:[...], prepare: c => '@media (prefers-reduced-motion: reduce){:root:not([data-motion="full"]){'+c+'}} [data-motion="reduced"]{'+c+'}'}` produces exactly `--nz-duration-fast: 0ms` in both blocks.

Cosmetic: the first declaration's indentation depends on the prepare template.

STYLE DICTIONARY 5.6.1: not run, because Terrazzo did not block. A static grep of style-dictionary/lib finds no `resolutionOrder` (DTCG resolver) and no light-dark handling, so it would need one build per context.

### Implication for the plan

- D5 and D6: keep Terrazzo. The recommended generated shape is one :root block with light-dark() semantic colours, and [data-theme] scopes that set only color-scheme. It needs the ~15-line glue, which lives in our config and can be swapped out.
- Use the duplicated-block permutations (S3a recipe) only to generate tokens.legacy.css for browsers below Safari 17.5.
- Typography sub-variable names were not tested; there was no typography token in this spike, so that part of S-b 1 is still open.
- Style Dictionary is not a better fallback for modes.

## S3a

**Terrazzo partial permutations** · verdict: `verified-fails`

### Finding

r7 §7.4 assumed that a partial permutation input emits only the theme tokens. As written (`{input:{theme:'dark'}}` with no `only`), it does NOT. Terrazzo fills the other modifiers with their defaults and re-emits EVERY token:
```
[data-theme="dark"] { color-scheme: dark; --nz-color-bg-surface: var(--nz-color-p-neutral-900); --nz-color-p-neutral-0: #fff; --nz-color-p-neutral-900: #181b19; --nz-color-text-primary: var(--nz-color-p-neutral-0); --nz-duration-fast: 140ms; }
```
The last declaration is a motion token at its DEFAULT value. Inside a reduced-motion context, a nested scope would undo it.

THREE MORE GOTCHAS:
1. `only: {modifiers:['theme']}` (an advanced Permutation option; it warns if the resolver is non-orthogonal) drops other modifiers but STILL emits the primitive sets.
2. `only.sets: []` breaks alias resolution: `x parser:init: Could not resolve alias {color.p.neutral-0}`.
3. Permutation-ID collision. getPermutationID merges defaults (`{...inputDefaults, ...input}`), so `{theme:'light'}` gets the same ID as the base `{theme:'light', motion:'default'}` and their transforms merge. The `[data-theme="light"]` block therefore still got `--nz-duration-fast: 140ms`, even with only.modifiers. This was confirmed in parser/dist/resolver/load.js line 216.

WORKING RECIPE (verified; out/tokens.scoped-include.css): add `only:{modifiers:[own]}` plus a per-permutation `include` glob for that modifier's tokens (and `exclude:['color.p.**']`). Output:
```
[data-theme="light"] { color-scheme: light; --nz-bg-surface: var(--nz-p-neutral-0); --nz-text-primary: var(--nz-p-neutral-900); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --nz-bg-surface: var(--nz-p-neutral-900); --nz-text-primary: var(--nz-p-neutral-0); } }
[data-theme="dark"] { color-scheme: dark; --nz-bg-surface: var(--nz-p-neutral-900); --nz-text-primary: var(--nz-p-neutral-0); }
@media (prefers-reduced-motion: reduce) { :root:not([data-motion="full"]) { --nz-duration-fast: 0ms; } }
[data-motion="reduced"] { --nz-duration-fast: 0ms; }
```

### Implication for the plan

- Fix r7 §7.4. Every scoped permutation (theme, motion, viewport) must carry `only:{modifiers:[its own]}` AND an `include` glob limited to that modifier's token groups. Without the glob, the light scope inherits the base permutation's tokens through the ID collision.
- Add a CI assertion that [data-theme] and [data-motion] blocks contain only tokens from their own modifier.
- This closes the partial-permutation half of S-b 1.

## S3c

**Terrazzo stock Tailwind plugin** · verdict: `verified-fails`

### Finding

@terrazzo/plugin-tailwind 2.8.0 is driven by a template file containing `@tz (theme: "light", motion: "default");` at-rules, so `@theme inline {...}` IS possible: the template author picks the wrapper. It DOES emit var(--nz-*) references, but they point to the ALIAS TARGET (the primitive), never to the semantic runtime variable. The values are plugin-css's transform for that permutation. Output:
```
@theme inline { --color-bg-surface: var(--nz-p-neutral-0); --color-text-primary: var(--nz-p-neutral-900); }
@variant dark { --color-bg-surface: var(--nz-p-neutral-900); ... }
```

Compiling this with Tailwind 4.3.3 gives `.bg-bg-surface { background-color: var(--nz-p-neutral-0) }`. Because the value is inlined, the dark re-declaration of --color-bg-surface never reaches the utility. Dark mode silently does nothing for utilities, and --nz-bg-surface overrides and nested scopes are bypassed.

With the light-dark permutation the result is `@theme inline { --color-bg-surface: light-dark(var(--nz-p-neutral-0), var(--nz-p-neutral-900)) }`. That compiles to a working utility, but it still bypasses the semantic var. The template's leftover empty `@variant dark {}` also makes Tailwind error (`@custom-variant dark has no selector or body`).

The custom adapter WORKS (verified; terrazzo.twcustom.config.mjs, ~15 lines). It is an `enforce:'post'` plugin whose build() calls `getTransforms({format:'css', id:'color.bg.*', input:{theme:'light',motion:'default'}})` and writes `--color-bg-surface: var(${t.localID})`. Output: `@theme inline { --color-bg-surface: var(--nz-bg-surface); --color-text-primary: var(--nz-text-primary); }`. Tailwind 4.3.3 compiles that to `.bg-bg-surface { background-color: var(--nz-bg-surface) }`.

### Implication for the plan

- D4: do not use plugin-tailwind for the adapter. Ship the small custom Terrazzo plugin, which r7 already listed as the fallback; 15 lines are enough, not 40. With it, Tailwind utilities read the single runtime variable set and follow [data-theme], light-dark() and consumer overrides automatically.
- This closes S-b 2.

## S4

**spring() to CSS linear()** · verdict: `verified-works`

### Finding

SOLVER: a closed-form damped oscillator for a 0-to-1 step. With w0 = sqrt(k/m), z = c/(2*sqrt(km)) and wd = w0*sqrt(1 - z^2):
  x(t) = 1 - e^(-z*w0*t) * (cos(wd*t) + (z*w0 - v0)/wd * sin(wd*t))
Settle time is the last instant where |x - 1| exceeds the threshold, found with a 0.1 ms sweep. The PARAMETER ORDER spring(mass, stiffness, damping, velocity) is ASSUMED; see S4b.

COMMANDS (spikes/s4-spring): `npm i -D motion@14.2.0` (motion-dom 14.2.0); `node spring.mjs > spring-results.json`; `node check-css.mjs`. Every string passed CSS.supports('transition-timing-function') in Chromium 156 and WebKit 27.2 (12 of 12).

spring(1,260,24,0): w0 = 16.125 rad/s, zeta = 0.744 (under-damped)
- Overshoot: 3.02%, peaking at 292 ms.
- Settle: ±0.1% = 492.3 ms; ±0.5% = 444.4 ms; ±2% = 359 ms.
- Adaptive (RDP, eps 0.004), ±0.1%, duration 493 ms, 19 points, max error 0.0037, 224 B:
  `linear(0, 0.007 1.5%, 0.027 3.1%, 0.06 4.8%, 0.108 6.7%, 0.211 10%, 0.559 20.2%, 0.658 23.5%, 0.742 26.7%, 0.811 29.8%, 0.868 32.9%, 0.916 36.1%, 0.954 39.4%, 0.985 43%, 1.007 46.9%, 1.022 51.1%, 1.029 55.9%, 1.029 63.7%, 1)`
- Uniform 25 points, ±0.1%, 493 ms (max error 0.0104):
  `linear(0, 0.046, 0.157, 0.296, 0.442, 0.579, 0.699, 0.798, 0.876, 0.934, 0.975, 1.002, 1.019, 1.027, 1.03, 1.029, 1.026, 1.022, 1.018, 1.014, 1.01, 1.007, 1.004, 1.002, 1)`
- Uniform 30 points, ±0.5%, 445 ms (max error 0.0063):
  `linear(0, 0.027, 0.095, 0.189, 0.295, 0.404, 0.51, 0.608, 0.696, 0.772, 0.837, 0.89, 0.932, 0.965, 0.989, 1.007, 1.018, 1.025, 1.029, 1.03, 1.029, 1.027, 1.025, 1.021, 1.018, 1.015, 1.012, 1.009, 1.007, 1)`

spring(1,170,26,0): w0 = 13.038 rad/s, zeta = 0.997 (about critical; overshoot about 1e-18)
- Settle: ±0.1% = 701.7 ms; ±0.5% = 565.6 ms; ±2% = 444.8 ms.
- Adaptive (eps 0.004), ±0.1%, 702 ms, 18 points, max error 0.0039, 211 B:
  `linear(0, 0.006 1.2%, 0.021 2.4%, 0.083 5.2%, 0.161 7.8%, 0.462 17%, 0.555 20.3%, 0.637 23.6%, 0.706 26.9%, 0.766 30.3%, 0.817 33.9%, 0.86 37.7%, 0.898 42.1%, 0.929 47%, 0.953 52.5%, 0.971 58.7%, 0.991 73.9%, 1)`
- Uniform 25 points, ±0.1%, 702 ms (max error 0.0125):
  `linear(0, 0.057, 0.178, 0.318, 0.451, 0.569, 0.668, 0.747, 0.81, 0.858, 0.895, 0.923, 0.944, 0.959, 0.97, 0.979, 0.985, 0.989, 0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1)`
- Uniform 30 points, ±0.5%, 566 ms (max error 0.0061):
  `linear(0, 0.027, 0.093, 0.178, 0.271, 0.364, 0.452, 0.533, 0.605, 0.668, 0.723, 0.77, 0.81, 0.844, 0.872, 0.895, 0.915, 0.931, 0.944, 0.955, 0.963, 0.97, 0.976, 0.981, 0.985, 0.988, 0.99, 0.992, 0.994, 1)`

The 40-point uniform strings are in spring-results.json.

r7's ≈492 ms and ≈701 ms at ±0.1%, and its 3.0% overshoot, REPRODUCE. Its 25-point strings match to ±0.002.

MOTION 14.2.0 `spring({keyframes:[0,1],...}).toString()`:
- It gives '600ms linear(...)' with 20 points for the first spring and '750ms' with 25 points for the second.
- The internal done flags fire at 554 ms and 718 ms.
- Its granular defaults are restDelta 0.005 AND restSpeed 0.01. Durations are quantized to 50 ms steps (calcGeneratorDuration), and points are sampled at 30 ms resolution.

### Implication for the plan

- D12, S9 and C10: the up-to-36% disagreement between reports comes from the threshold and generator choice. Motion's 600/750 ms include a velocity criterion and 50 ms quantization; the plain ±0.1% band gives 492/702 ms.
- Adopt ONE build-time solver (about 40 lines, no runtime dependency) with ONE threshold. I recommend ±0.1%, and emitting the duration token next to the easing.
- Use adaptive RDP sampling. It gives 18–19 points and about 220 B per curve at ≤0.4% error, versus about 1% error for 25 uniform points, where the error concentrates in the fast initial rise.
- So the same Figma spring takes the same time in CSS and in JS, pass Motion `restDelta: 0.001` (or use the token durations). Otherwise JS springs run about 50–110 ms longer than the CSS tokens.

## S4b

**Figma spring() parameter order** · verdict: `unverified`

### Finding

The Figma spring() parameter order (S-b 7) was not verifiable here, because no Figma calls were allowed. Every S4 number assumes spring(mass, stiffness, damping, velocity) = (1,260,24,0) and (1,170,26,0). If the order were different (for example stiffness first), the curves would change completely.

### Implication for the plan

Get designer confirmation of the parameter order before generating the motion tokens (D12). The S4 solver and outputs can be re-run in seconds once it is confirmed.
