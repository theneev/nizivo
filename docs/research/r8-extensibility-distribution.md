# R8: Distribution model and plug-in / plug-out extensibility architecture

**Project:** Nizivo UI (`@nizivo/*`, Neev Technologies). React-only for now. Targets: Next.js App Router (RSC, SSR, streaming), Vite SPA, Astro React islands, React Router framework mode, TanStack Start.
**Researched:** 2026-10-14.

**Sources.**
- Versions and dates come from the npm registry (`https://registry.npmjs.org/<pkg>`, `dist-tags.latest` + `time`), queried today.
- Behaviour claims come from primary docs, cited inline.
- **EMPIRICAL** marks a result I reproduced locally today: shadcn CLI 4.21.4 run against throw-away consumer projects, plus inspection of published tarballs. The commands are in §11.8.
- **UNVERIFIED** marks a claim I could not confirm from a primary source.

**Builds on the sibling reports. This report does not re-derive them:**
- `r1-framework-compat.md`:
  - ESM-only.
  - Per-component subpath exports.
  - Per-file `'use client'`, unbundled build.
  - Namespace re-exports instead of static properties.
  - JS never imports CSS.
  - Provider-free design (external store).
- `r2-styling.md`:
  - Plain CSS compiled by Lightning CSS.
  - `@layer nz.*`.
  - `nz-*` classes and `data-variant` / `data-size` attributes.
  - Global `data-nz-*` attributes.
  - Per-component `--nz-<component>-*` hook variables that the library reads but never assigns.
- `r5-quality-docs.md`:
  - Changesets, npm trusted publishing (OIDC), a Fumadocs docs site and a props manifest.

**Not decided here:** which headless primitive library to use (Base UI vs React Aria vs Radix). That belongs to another topic. This report designs the **seam**, so the choice can change later. Base UI is the illustrative default in the sketches because r1 already assumes its patterns, and shadcn made it the default in July 2026.

---

## 0. TL;DR: decisions

| # | Decision | Recommendation | Confidence |
|---|---|---|---|
| D1 | Distribution model | **Hybrid, npm-first.** npm packages are the source of truth for everything with behaviour, accessibility or a contract: tokens, components, CSS. A shadcn-compatible **registry** ships the things consumers are expected to own: patterns/blocks, CSS "re-skin" recipes, themes, and (rarely) full forks. Registry items **import from `@nizivo/react`**, so ejected code still receives accessibility and behaviour fixes through `npm update`. | High |
| D2 | Package map | `@nizivo/tokens` (framework-agnostic), `@nizivo/react` (all core components, one subpath each, CSS files included), and opt-in heavy packages `@nizivo/charts`, `@nizivo/motion` and `@nizivo/lab`. Later: `@nizivo/codemod`, and `@nizivo/css` when a second framework appears. **Fixed (lock-step) versioning** across all `@nizivo/*` packages. | High (map). Medium (exact names) |
| D3 | Registry format and hosting | **shadcn registry schema** (`registry.json` + `registry-item.json`), built with `shadcn build` from the docs site. Items reference files by path, not inline `content`. Served at `/r/{name}.json` with **immutable versioned snapshots** at `/r/v{major}.{minor}/{name}.json`. Namespace **`@nizivo`** is listed in the shadcn registry directory. Do **not** build a Nizivo CLI in v0. | High |
| D4 | Tailwind-free registry use | **Works.** EMPIRICAL: universal `registry:item`s install into a project with no Tailwind and no `components.json`. `registry:ui` items with `@ui/…` aliases install once a `components.json` exists, which a Nizivo `init` universal item can write. `shadcn init` itself **refuses** projects without Tailwind (EMPIRICAL), so the docs must not tell non-Tailwind users to run it. | High |
| D5 | Layering | **L0 tokens → L1 primitive adapter (internal) → L2 components (parts + class/attribute contract) → L3 CSS (separate files) → L4 patterns (registry) → L5 heavy packages.** Dependencies only point downward, enforced by `dependency-cruiser` in CI. | High |
| D6 | Primitive seam | **Only `src/primitives/*` may import the headless engine.** No engine type, callback signature, data attribute or CSS variable appears in Nizivo's public API: the adapter normalizes all of them. Contract tests (ARIA tree, keyboard, `data-*`) guard any swap. | High |
| D7 | Composition | **`render` prop** (element form, plus function form `(props, state)`) on every part that renders a DOM element. **No `asChild`, no polymorphic `as`.** | High |
| D8 | Compound API | **Namespace export plus flat exports** (`Select.Trigger` and `SelectTrigger`), as in r1 D5. Never `Object.assign(Root, {...})` (HeroUI does this, see §4). The primary API is styled parts. Pre-assembled "field" conveniences start in the registry and graduate into npm later. | High |
| D9 | Styling hooks | **Stable `nz-<component>[-<part>]` classes, plus `data-*` attributes for variants and states**, as in r2. No cva or tailwind-variants in core: cva has been on 0.7.1 since 2024-11, and tailwind-variants requires Tailwind and tailwind-merge as peers. | High |
| D10 | Passthrough | Every part accepts `className`, `style`, `ref` (React 19 prop), `id`, and `data-*`/`aria-*` rest props. Merge rule: Nizivo classes first, consumer last. `style` is shallow-merged and the consumer wins. Handlers are chained, the consumer runs first, and `preventDefault()` skips the internal handler. | High |
| D11 | Theming API | Semantic `--nz-*` tokens plus per-component `--nz-<component>-<prop>[-<state>]` hooks are **public, semver'd API**. Primitive `--nz-p-*` tokens are **not**. | High |
| D12 | Unstyled escape hatch | Two levels. (1) Don't import a component's CSS: per-component CSS files, and JS never imports CSS. (2) The `unstyled` prop drops `nz-*` classes. On client compounds it is inherited from Root through context; on server-safe parts it is set per part. Data attributes and behaviour stay. | Medium-high |
| D13 | Providers | **No required provider.** An optional `<NizivoConfig>` (client) sets locale, direction, portal container and label overrides. Global appearance stays in CSS and `data-nz-*`, per r1 D10. | High |
| D14 | State | Every stateful prop follows `x` / `defaultX` / `onXChange(value, details)`. `details` is a Nizivo-owned object (`{ reason, event }`), so callbacks can grow without breaking. Implemented with one in-house `useControllableState`. | High |
| D15 | Refs | React 19 ref-as-prop. No `forwardRef` (peer `react ^19.2`, as in r1 D1). | High |
| D16 | Extending variants | **TypeScript interface-merging maps** (`ButtonVariantMap`, `ToneMap`, `SizeMap`) declared in one module, `@nizivo/react/augment`. A consumer adds a variant with one `declare module` plus CSS, without forking. | Medium (needs a type test in CI) |
| D17 | Deprecation and codemods | Deprecate in a minor: JSDoc `@deprecated`, a once-only dev warning, a docs entry and a codemod. Remove in the next major at the earliest, with at least one minor of overlap. CSS renames ship aliases (`:is(.old,.new)`, `var(--new, var(--old))`). Token renames use DTCG `$deprecated`. Codemods go in `@nizivo/codemod`, written with jscodeshift or ast-grep and also publishable to the Codemod registry. | High (policy). Medium (tooling) |
| D18 | Work-in-progress valve | `@nizivo/react/unstable/<name>` subpaths, outside semver (Base UI ships `./unstable-use-media-query`, EMPIRICAL). A `next` dist-tag for previews. Patterns live in the registry until their API settles. | High |

**Consistency issues to fix across the reports:**
1. **Cascade layer name.** r1 D7 writes `@layer nizivo.*`; r2 writes `@layer nz.*`. Pick **`nz`** to match `--nz-` and `.nz-`.
2. **Package name.** The Figma notes and r2 write `@nizivo/ui`; r1 writes `@nizivo/react`. Pick **`@nizivo/react`**. It names the framework, which leaves `@nizivo/tokens`, a future `@nizivo/css` and any future `@nizivo/vue` unambiguous.
3. **Composition prop.** The Figma notes (02-actions-forms §5.1) propose `asChild`. This report recommends `render` (§6.2).

---

## 1. What "plug-in / plug-out" has to mean (criteria)

| # | Criterion | Concretely, for Nizivo |
|---|---|---|
| C1 | **Updatability while the design is a work in progress** | Figma will keep changing. Consumers must receive fixes (accessibility, behaviour, token values) without re-copying files or hand-merging. |
| C2 | **Swappability of internal layers** | We can replace the token pipeline, the behaviour engine, the CSS authoring tool, one component's implementation, or a heavy module (charts, 3D) **without a consumer-visible breaking change**. |
| C3 | **Consumer ownership / eject** | A consumer can take over a component's look, markup, or the whole thing, at the granularity they need, without forking the repo. |
| C4 | **Zero-runtime and RSC friendliness** | Server-safe components stay server-safe. Customization must not need a runtime style engine or a required provider. |
| C5 | **Consumer toolchain burden** | No Tailwind, compiler, preset or scan config is required. Tailwind users get a first-class path too (r2). |
| C6 | **Tree-shaking and payload** | Per-component entries for JS and CSS. Heavy modules (charts, motion, shader lab) are never in the default graph. |
| C7 | **Accessibility by default (WCAG 2.2 AA)** | Customization paths must not make it easy to break roles, labels, focus or keyboard support. |
| C8 | **OSS and company ownership** | The public GitHub repo and npm org stay the canonical source. Releases go through GitHub Actions with OIDC trusted publishing (r5). Third parties can build on Nizivo. |
| C9 | **Agent and tooling friendliness** | It works with the 2026 tooling people use: the shadcn CLI and MCP, v0, coding agents reading registry JSON. |
| C10 | **Maintenance cost for a small team** | Few packages, one version line, no bespoke CLI to maintain. |

---

## 2. State of the art (verified 2026-10-14)

### 2.1 Versions

| Project | Latest | Published | Notes |
|---|---|---|---|
| `shadcn` (CLI) | **4.21.4** | 2026-10-07 | 4.0.0 on 2026-03-06, 3.0.0 on 2025-08-27 (npm). |
| `@base-ui/react` | **1.9.0** | 2026-10-09 | 1.0.0 on 2025-12-11. Roughly monthly minors. Peer `react ^17 \|\| ^18 \|\| ^19`. `sideEffects: false`. 80 subpath exports, including `./merge-props`, `./use-render`, `./direction-provider` and `./unstable-use-media-query` (EMPIRICAL, tarball). |
| `radix-ui` (unified) | **1.8.1** | 2026-10-12 | 1.7.0 on 2026-10-05. Maintained by WorkOS ([repo](https://github.com/radix-ui/primitives)). |
| `@radix-ui/react-slot` | 1.5.0 | 2026-10-12 | Its types now include a `Slottable` render-function form, `{ child, children: (slottable) => ReactNode }` (EMPIRICAL, `dist/index.d.ts`). |
| `@radix-ui/themes` | **3.3.0** | 2026-01-31 | Previous release 3.2.1 on 2025-02-27, so cadence is slow. Release notes: Kbd soft variant, layout props, breakpoints array deprecated ([release](https://github.com/radix-ui/themes/releases)). |
| `@mantine/core` | **9.7.2** | 2026-10-11 | **The brief says "Mantine 8", but 9.x is current.** 9.0.0 on 2026-03-31; 8.0.0 on 2025-05-05. Peer `react ^19.2.0` and an exact `@mantine/hooks 9.7.2` (lock-step). `sideEffects: ["*.css"]`. |
| `@chakra-ui/react` | **3.37.0** | 2026-08-28 | 3.0.0 on 2024-10-22. Peer `@emotion/react >=11`, so it has a runtime style engine. |
| `@ark-ui/react` | **5.39.3** | 2026-10-05 | A `next` tag points to `6.0.0-next.0` (Ark 6 in preview; contents UNVERIFIED). |
| `@park-ui/cli` | 1.0.1 | 2025-11-20 | Park UI joined the Chakra UI GitHub org on 2025-11-27 ([blog](https://park-ui.com/blog/park-ui-joins-the-chakra-ui-organization)). |
| `@heroui/react` / `@heroui/styles` | **3.2.6** | 2026-09-17 | 3.0.0 on 2026-03-21. Peers `react-aria-components ^1.21.1` and `tailwindcss >=4.0.0` (EMPIRICAL, `package.json`). |
| `react-aria-components` | **1.22.1** | 2026-10-09 | `sideEffects: ["*.css"]`. Uses `import "client-only"` (r1). |
| `untitledui` (CLI) | 0.1.69 | 2026-10-02 | Copy-paste CLI. Components use React Aria and Tailwind v4 ([CLI docs](https://www.untitledui.com/react/docs/cli)). |
| `@tremor/react` | 3.18.7 | **2025-01-13** | **Frozen.** Peer `react ^18.0.0`. A `beta-tremor-v4` tag was never promoted. Tremor moved to copy-paste "Tremor Raw" (Tailwind v4) after Vercel acquired it on 2025-01-22 ([Vercel](https://vercel.com/blog/vercel-acquires-tremor), [install](https://tremor.so/docs/getting-started/installation)). |
| `@mui/material` | 9.5.0 | 2026-10-09 | 9.0.0 on 2026-04-07 (v8 was skipped). `next` tag is `10.0.0-alpha.0`. Peer Emotion. |
| `class-variance-authority` | 0.7.1 | **2024-11-26** | Stale. The `cva` package has a `1.0.0-beta.12` on its beta tag and has never shipped a 1.0 latest. |
| `tailwind-variants` | 3.3.1 | 2026-08-03 | Peers `tailwindcss *` and `tailwind-merge >=3.0.0`. |
| `cn` | 0.4.0 | 2026-09-22 | Published by `shadcn` ([repo](https://github.com/shadcn-ui/cn)). A drop-in for `twMerge(clsx())`. |
| `@shadcn/helpers` | 0.2.0 | 2026-08-11 | |
| `jscodeshift` / `@ast-grep/cli` / `codemod` | 17.4.0 / 0.50.0 / 1.18.3 | 2026-07-15 / 2026-10-09 / 2026-09-11 | Codemod tooling. |
| `@changesets/cli` | 3.0.3 | 2026-09-14 | |
| `dependency-cruiser` / `eslint-plugin-boundaries` | 18.6.0 / 7.2.0 | 2026-10-11 / 2026-08-09 | Layer-boundary enforcement. |
| `stylelint-use-logical` | 2.1.3 | 2026-02-04 | Enforces logical properties (RTL). |

### 2.2 Shifts in 2025–2026 that drive this recommendation

1. **The shadcn registry is now a general distribution protocol, not just "the shadcn components".** All of the following come from the [changelog](https://ui.shadcn.com/docs/changelog):
   - Namespaced registries with auth headers and env-var expansion ([namespace docs](https://ui.shadcn.com/docs/registry/namespace)).
   - A public **registry directory**: listed namespaces resolve with no config, and the CLI adds them to `components.json` automatically ([registry index](https://ui.shadcn.com/docs/registry/registry-index)).
   - **Universal items** that need "no framework, no components.json, no tailwind, no react" (July 2025, [changelog](https://ui.shadcn.com/docs/changelog/2025-07-universal-registry)).
   - `registry:base` (an entire design system in one payload) and `registry:font` (CLI v4, March 2026, [changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)).
   - Package imports and **target aliases** such as `"target": "@ui/…"` (May 2026, shadcn 4.7.0, [changelog](https://ui.shadcn.com/docs/changelog/2026-05-package-imports-target-aliases)).
   - `include` and `shadcn registry validate` (May 2026, [changelog](https://ui.shadcn.com/docs/changelog/2026-05-registry-include)).
   - **GitHub repos as registries**: public in June 2026, private in August 2026 ([June](https://ui.shadcn.com/docs/changelog/2026-06-github-registries), [Aug](https://ui.shadcn.com/docs/changelog/2026-08-private-github-registries)).
   - Server-side dynamic search (July 2026).
2. **shadcn is multi-engine.**
   - **Base UI became the default** in July 2026 ("Base UI is the default component library in shadcn/ui"). Radix is still supported, not deprecated ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)).
   - **React Aria** became a third base with `--base aria` (July 2026, [changelog](https://ui.shadcn.com/docs/changelog/2026-07-react-aria)).
   - Takeaway: the market treats the headless engine as swappable underneath a stable styled API. Nizivo should be built the same way (D6).
3. **Even shadcn is drifting toward a hybrid model.**
   - Shared foundations now ship as npm packages: `shadcn/tailwind.css` (imported by `init`), the `cn` package (Sept 2026) and `@shadcn/helpers`.
   - `shadcn eject` exists to *inline* `shadcn/tailwind.css` and drop the npm dependency ([eject](https://ui.shadcn.com/docs/changelog/2026-05-shadcn-eject), [cn](https://ui.shadcn.com/docs/changelog/2026-09-cn)).
   - So the leading copy-paste project now keeps shared, updatable foundations in npm and offers an explicit eject. That is the hybrid this report recommends.
4. **There is still no update or merge story for copied code.**
   - The CLI offers `--overwrite`, `--dry-run`, `--diff [path]` and `--view`. It has no `update` command and no three-way merge ([CLI docs](https://ui.shadcn.com/docs/cli)).
   - Namespaced registries have **no built-in version pinning**. Versioning is "something you implement through URL params" ([namespace docs](https://ui.shadcn.com/docs/registry/namespace)).
   - Untitled UI's update path is the same: re-run `add --overwrite`, which "replaces your local files with the latest version, so commit first if you've customized them" ([CLI docs](https://www.untitledui.com/react/docs/cli)).
5. **Composition APIs are converging on a `render` prop.**
   - Base UI: `render` as an element or as `(props, state)` ([composition](https://base-ui.com/react/handbook/composition)).
   - React Aria Components: `render={(domProps, state) => …}` ([customization](https://react-aria.adobe.com/customization.md)).
   - Radix and Ark keep `asChild` ([Ark composition](https://ark-ui.com/docs/guides/composition)).
   - Chakra v3 supports both `as` and `asChild` and notes that TypeScript doesn't infer props from `as`.
   - Mantine keeps `component` plus `renderRoot` and documents a tsserver cost ([polymorphic](https://mantine.dev/guides/polymorphic/)).
6. **The "behaviour package + CSS package" split has arrived in mainstream libraries.**
   - HeroUI v3 (March 2026) split into `@heroui/react` (behaviour, built on React Aria) and `@heroui/styles` (CSS with BEM classes) ([InfoQ](https://www.infoq.com/news/2026/07/heroui-v3-rewrite/)).
   - Its CSS is authored with Tailwind `@apply`, which makes `tailwindcss >=4` a consumer peer (EMPIRICAL). That is the coupling Nizivo avoids.
7. **Copy-paste-only has a failure mode.** Tremor's npm package has been frozen since January 2025 with a React 18-only peer. Users who installed from npm were stranded when the project moved to copy-paste. Nizivo should never make npm a second-class channel.

---

## 3. Distribution models compared

### 3.1 The three models

- **(a) Classic npm package.** Used by Mantine, Chakra v3, MUI, HeroUI, Radix Themes. Consumers `npm i` and import. The library owns all source. Customization goes through props, CSS hooks, theme objects or the Styles API.
- **(b) Copy-paste source registry.** Used by shadcn/ui, Untitled UI, Tremor Raw, Park UI. A CLI writes source into the consumer's repo. After that, the consumer owns it, and updates mean overwriting or hand-merging.
- **(c) Hybrid.** npm packages for tokens, behaviour and utilities, plus a shadcn-compatible registry for styled components and recipes, so consumers can eject. Chakra v3 is a partial example: core from npm, `chakra snippet add` copies compositions, and `chakra eject` copies theme tokens and recipes ([Chakra CLI](https://chakra-ui.com/docs/get-started/cli)). shadcn in 2026 is the mirror image: copy-paste first, with npm foundations.

### 3.2 Scored against the criteria

| Criterion | (a) npm only | (b) registry only | (c) hybrid, npm-first (recommended) |
|---|---|---|---|
| C1 Updatability for a WIP design | **Excellent.** `npm update`, semver, changesets. | **Poor.** Overwrite or hand-merge only. No three-way merge (EMPIRICAL §3.3). No built-in version pinning. | **Excellent for npm layers.** Ejected items still import updatable parts, so only the ejected styling or markup is frozen. |
| C2 Internal swappability | Good if the public API is disciplined. | **Poor.** The engine is in consumer code, so swapping Radix for Base UI means every consumer re-copies (shadcn needed `migrate radix` and per-base registries). | Good. The engine lives behind the adapter in npm. Ejected items never import the engine directly, except L4 forks. |
| C3 Consumer ownership | Medium. Limited to hooks the library exposes (Styles API, CSS vars). | **Excellent.** Full source. | **Excellent, and graduated:** restyle, recompose, re-skin or fork (§5.6). |
| C4 Zero-runtime / RSC | Depends on the library. Emotion-based libraries (Chakra, MUI) fail this. | Good: whatever the copied code does. | Good. Plain CSS (r2) and server-safe parts. |
| C5 Toolchain burden | Low. | Medium to high. shadcn `init` **requires Tailwind** (EMPIRICAL), and the shadcn components are Tailwind-styled. | Low by default. The registry path also works without Tailwind (EMPIRICAL). |
| C6 Payload | Good with subpaths. | Excellent: only what you copy. | Good. Subpaths plus per-component CSS. |
| C7 A11y by default | **Strong.** Fixes propagate. | **Weak over time.** Copied a11y bugs persist forever. | Strong. A11y lives in npm parts that ejected code still imports. |
| C8 OSS / company ownership | Strong. A single canonical artifact. | Medium. Many divergent copies in the wild, so bug reports are against code you no longer control. | Strong. npm is canonical; registry items are versioned snapshots. |
| C9 Tooling and agents | Good (llms.txt, MCP via docs). | **Excellent.** shadcn MCP, v0, `shadcn docs`, agents. | **Excellent.** Gets the same registry tooling. |
| C10 Maintenance | Low. | Medium. Registry plus docs per base. | Medium. Registry files are generated from the npm source (§11.6), so there is one source of truth. |

### 3.3 Empirical checks of the registry path (shadcn 4.21.4)

All of these ran today in throw-away projects under `scratchpad/r8/shadcn-test/`. Commands are in §11.8.

| # | Test | Result |
|---|---|---|
| E1 | `shadcn add ./button-item.json` with `type: "registry:item"`, files with explicit `target`, plain `.tsx` + `.css`, and `dependencies: ["clsx@2"]`, into a folder with **no Tailwind, no components.json and no framework** | **Installed.** Both files were written, and `package.json` gained `"clsx": "^2.1.1"`. |
| E2 | The same item with `--path app/ui` | **Installed into `app/ui/`.** The explicit target was relocated. |
| E3 | `registry:ui` item (`target: "@ui/nizivo/button.tsx"`) with no components.json | The CLI prompted "You need to create a components.json file to add components." |
| E4 | `shadcn init --defaults --yes` in a Vite + React project **without Tailwind** | **Failed:** "No Tailwind CSS configuration found … Install Tailwind CSS then try again." |
| E5 | E3 again, after hand-writing a `components.json` (a `tailwind.css` path pointing at a plain CSS file and a `registries.@nizivo` entry), still **no Tailwind** | **Installed** into `src/components/ui/nizivo/`. |
| E6 | A universal item whose only file targets `~/components.json`, installed into a Tailwind-free Vite project, followed by E3 | **Both worked.** A Nizivo `init` item can bootstrap the config that `shadcn init` refuses to create. |
| E7 | Re-`add` a changed item over a locally edited file | The CLI asked "The file button.css already exists. Would you like to overwrite? (y/N)". Declining kept the local edit, with "Skipped 2 files … use --overwrite". **No merge.** |
| E8 | `add … --diff <file>` without components.json | The CLI prompted to create components.json, so I saw no diff output. `--diff` against a real update is **not exercised**. |

Caveat: these tests used inline `content` in hand-written item files. The registry **directory** requirement that `files` carry **no `content` property** ([registry index](https://ui.shadcn.com/docs/registry/registry-index)) applies to the *index* (`registry.json`), where `files` list only `path` / `type` / `target`. The per-item `{name}.json` files produced by `shadcn build` do carry inlined content; that is what the CLI downloads. So the production registry is authored path-based, and `shadcn build` produces both artifacts. How the directory validator treats each file is **UNVERIFIED** beyond the quoted requirement.

### 3.4 Lessons from prior art

- **Tremor:** keep npm first-class. A project that moved to copy-paste stopped publishing its package, and npm users were stranded on React 18 peers.
- **Untitled UI and shadcn:** copy-paste updates are destructive overwrites ("commit first"). For a design that will keep changing, every Figma revision becomes a merge chore for every consumer. **This is the decisive argument against (b) for Nizivo's core.**
- **Chakra snippets:** copy *compositions* (provider wiring, a toaster, a tooltip wrapper) and keep the *components* in npm. That is the right granularity. Nizivo extends it to patterns and CSS recipes.
- **shadcn 2026:** even the reference copy-paste system moved shared foundations to npm and added an explicit eject. Go hybrid from day one rather than retrofitting it.
- **HeroUI v3:** splitting behaviour from styles makes styles swappable. Do it, but don't make the CSS depend on the consumer's Tailwind.

### 3.5 Verdict

**Use (c), hybrid and npm-first.** Everything a consumer should *receive updates for* ships on npm. Everything a consumer is *expected to own* ships through the registry. Registry items depend on npm parts and never on the engine (except labelled L4 forks).

---

## 4. Library survey: how the incumbents handle extensibility

| Library (version) | Distribution | Styling engine | Variant mechanism | Composition | Compound pattern | Required provider | CSS var API | Unstyled path |
|---|---|---|---|---|---|---|---|---|
| **Radix Themes 3.3.0** | npm | Plain CSS, split `tokens.css` / `components.css` / `utilities.css` / `layout.css` (EMPIRICAL) | **Classes** `rt-variant-solid` and responsive `lg:rt-r-size-2`. Colour via `data-accent-color` (EMPIRICAL) | `asChild` (Radix Slot) | Separate exports | **Yes, `<Theme>`.** `useThemeContext` throws outside it (EMPIRICAL) | `--accent-9` scales. No per-component hook vars documented | None. Uses `:where(.radix-themes)` scoping and **no `@layer`** (0 occurrences, EMPIRICAL) |
| **Base UI 1.9.0** | npm | None (headless) | `data-*` state attrs (`data-popup-open`, `data-highlighted`, `data-selected`, `data-starting-style`) | **`render`**: element or `(props, state)`. `className` and `style` can be functions of state ([styling](https://base-ui.com/react/handbook/styling)) | Namespace (`export * as Select`) | No. `DirectionProvider` is optional and "does not affect HTML and CSS" ([docs](https://base-ui.com/react/utils/direction-provider)) | Positioning vars `--anchor-width`, `--available-height`, `--transform-origin` ([select](https://base-ui.com/react/components/select)) | n/a (it is unstyled) |
| **Mantine 9.7.2** | npm (+ `styles.layer.css`) | CSS Modules → static CSS | Static classes `.mantine-Button-root` (prefix configurable). `data-*` modifiers. `mod` prop ([data attrs](https://mantine.dev/styles/data-attributes/)) | `component` plus `renderRoot`, with a tsserver cost ([polymorphic](https://mantine.dev/guides/polymorphic/)) | Static properties (`Tabs.Tab`) | `MantineProvider` (wrap), or `HeadlessMantineProvider` | Per-component vars (`--button-bg`, `--button-height`) through the `vars` resolver ([Styles API](https://mantine.dev/styles/styles-api/)) | `unstyled` is root-only, "not supported by compound components", and CSS still ships ([unstyled](https://mantine.dev/styles/unstyled/)) |
| **Chakra 3.37 / Ark 5.39** | npm + CLI snippets + `eject` + Pro blocks | Emotion runtime (Chakra). Headless (Ark) | Recipes and slot recipes ([slot recipes](https://chakra-ui.com/docs/theming/slot-recipes)) | `as` and `asChild` (Chakra). `asChild` and the `ark` factory (Ark) | Slot-recipe contexts | Chakra: yes (`Provider` composing `ChakraProvider` and next-themes, [install](https://chakra-ui.com/docs/get-started/installation)). Ark: no (UNVERIFIED for its optional locale/env providers) | Tokens as vars. Recipes are not var hooks | Ark is the unstyled layer |
| **HeroUI 3.2.6** | npm: `@heroui/react` + `@heroui/styles` | Tailwind v4 `@apply` in shipped CSS, so the consumer needs Tailwind ≥4 (EMPIRICAL) | **BEM classes** `.button--primary`, mapped from props by `tailwind-variants` (EMPIRICAL) | React Aria `render` / children render props | **`Object.assign(CardRoot, {Header,…})`** in `'use client'` files (EMPIRICAL) | No (v3 removed the provider wrapper, per [InfoQ](https://www.infoq.com/news/2026/07/heroui-v3-rewrite/)) | `--button-bg` etc. **assigned on the element** (EMPIRICAL), so overrides must target the same element | Use behaviour without `@heroui/styles` |
| **Park UI (CLI 1.0.1)** | Copy-paste (Ark + Panda) | Panda CSS (build-time) | Panda recipes | `asChild` | Ark parts | Panda config | Panda tokens | Ark |
| **Untitled UI React** | Copy-paste CLI (free + PRO login) | Tailwind v4 | Tailwind classes | React Aria | RAC | No | Tailwind theme vars | n/a (consumer owns source) |
| **Tremor** | npm frozen (3.18.7). Copy-paste Tremor Raw | Tailwind v4 | Tailwind | Radix/Headless UI (Raw: UNVERIFIED) | — | No | Tailwind | n/a |
| **shadcn/ui (CLI 4.21.4)** | Registry (+ npm foundations) | Tailwind v4 | cva → `cn` | Base UI `render` / Radix `asChild` / RAC `render`, per base | Flat exports with `data-slot` | No | shadcn CSS vars (`--background`, `--primary`) | n/a |
| **React Aria Components 1.22.1** | npm | None (`client-only`) | Render props plus `data-*` states | **`render(domProps, state)`** with rules: same element type, single root, spread props ([customization](https://react-aria.adobe.com/customization.md)) | Contexts and **slots** (`slot="increment"`, `useContextProps`) | No (`I18nProvider` optional) | — | n/a |

**What to copy:**
- Base UI's `render` and its state data attributes.
- RAC's `render` rules and the *idea* of slot contexts (internally only).
- Mantine's per-component CSS variables and `data-*` modifiers.
- Radix Themes' split CSS files.
- HeroUI's separate styles package (later, as `@nizivo/css`).
- Chakra's snippet/eject granularity.

**What to avoid:**
- Required providers (Radix Themes, Chakra, Mantine).
- Static-property compounds in client files (HeroUI, Mantine). From a Server Component you cannot "dot into" a client module (r1 D5).
- Variants as classes generated by a Tailwind-dependent tool (HeroUI, shadcn).
- Component CSS variables **assigned** on the element (HeroUI). They defeat ancestor-scoped overrides.
- Root-only `unstyled` (Mantine).
- Polymorphic `as` typing (Mantine, Chakra).

---

## 5. Recommended architecture

### 5.1 Layers

```
                      ┌──────────────────────────────────────────────────────────┐
 consumer app         │ restyle (CSS hooks) · recompose · re-skin · fork (§5.6)   │
                      └──────────────▲───────────────────────▲───────────────────┘
                                     │ imports               │ copied by registry
 L5 heavy, opt-in     @nizivo/charts · @nizivo/motion · @nizivo/lab   (own packages, own peers)
                                     │
 L4 patterns          registry only: insight card, plan/product cards, order row, shipment
                      tracker, storefront set, dashboard layouts (TSX+CSS that import L2)
                                     │
 L3 CSS               @nizivo/react/styles.css · /css/core.css · /css/<name>.css  (@layer nz.*)
                      (later extractable to @nizivo/css; framework-neutral contract)
                                     │ styles the contract of ↓ (never imported by JS)
 L2 components        @nizivo/react/<name>: parts, props, nz-* classes, data-* attrs,
                      --nz-<component>-* hooks, render prop, controlled/uncontrolled
                                     │ internal import only
 L1 primitive adapter src/primitives/<name>.tsx (NOT exported): wraps the engine
                      (Base UI today) and normalizes props, details, data-*, CSS vars
                                     │
 L0 tokens            @nizivo/tokens: tokens.css (light-dark()), themes, tailwind.css
                      adapter, tokens.json (DTCG), tokens.ts. Generated from Figma.
```

Dependency rules (CI-enforced, §11.5):
- L2 may import L1 and L0 (TS constants only).
- L1 may import the engine.
- **Nothing else may import the engine.**
- L5 may import L2's public entries only.
- Registry sources (L4) may import only `@nizivo/*` public entries.
- No layer imports CSS from JS (r1 D7).

### 5.2 Packages and entry points

| Package | Contents | Entry points | Depends on | Why separate |
|---|---|---|---|---|
| `@nizivo/tokens` | Generated token CSS (`tokens.css`, `themes/*.css`), `tailwind.css` adapter (r2), `tokens.json` (DTCG 2025.10), `tokens.ts` (typed names, no values needed at runtime) | `./tokens.css`, `./themes/*`, `./tailwind.css`, `./tokens.json`, `.` | none | Framework-agnostic. Usable from Astro without React, from plain HTML, and in a future Vue port. Changes when Figma changes, not when React code changes. |
| `@nizivo/react` | All core components (§5.3), each with its CSS file. `styles.css` is a self-contained bundle (tokens + base + components). `css/core.css` holds tokens + base. Also `augment` (type maps), `config` (optional provider), `unstable/*` | `.` (barrel), `./<name>`, `./styles.css`, `./css/*`, `./augment`, `./config`, `./unstable/*`, `./package.json` | `@nizivo/tokens` (exact version, via fixed group) and the engine (`@base-ui/react`, as a regular dependency, not a peer) | One package keeps version skew impossible inside the core, the same reasoning as Radix's unified `radix-ui` package and its 2026 shadcn migration ([changelog](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)). Subpaths keep tree-shaking (r1 D6). |
| `@nizivo/charts` | Area, bar, donut, sparkline, legend, chart tooltip, progress ring (if SVG-heavy) | `./<name>`, `./css/*` | `@nizivo/react` (peer, same version) plus any chart math deps | Heavy deps (scales, path generation) never enter the core graph. Can swap its rendering engine with its own major. |
| `@nizivo/motion` | Count-up, spring `linear()` helpers, magnetic/tilt hooks, stagger | `./<name>` | `@nizivo/react` (peer) | Motion is optional. The CSS-only motion tokens stay in tokens. |
| `@nizivo/lab` | 3D, shader and motion-lab components (browser-only, `use(browser())` per r1) | `./<name>` | `@nizivo/react` (peer). `three`/`ogl` as **optional peers** | Isolates React 19.3 floors (r1 D1) and WebGL peers. |
| `@nizivo/codemod` (later) | jscodeshift / ast-grep transforms per release | CLI `npx @nizivo/codemod <transform> <path>` | — | Migration tooling. |
| `@nizivo/css` (later) | Extraction of L3 when a second framework or a plain-HTML consumer appears | same paths as `@nizivo/react/css/*` | `@nizivo/tokens` | Non-breaking: `@nizivo/react/css/*` keeps working by re-shipping the same files. |
| Registry (not npm) | `/r/*.json` on the docs site and `registry.json` at the repo root | `@nizivo/<item>` via the shadcn CLI | items list `@nizivo/react@~x.y.0` in `dependencies` | Owned-by-consumer artifacts. |

Why not one npm package per component (`@nizivo/button`, …)?
- With ~50 component sets, that would be ~50 version lines and inter-package peer ranges.
- It also lets a consumer combine mismatched versions.
- Radix moved *away* from this model.
- Subpath exports from one package give the same tree-shaking.

Why not a separate `@nizivo/primitives` (headless) package now?
- It would make the adapter a public API: a second, unstyled API to design, document and semver.
- Nizivo's L2 components are already effectively headless when their CSS is not imported (D12). That covers the "bring your own styles" use case without a second surface.
- Revisit if there is demand. Base UI, React Aria and Radix already serve the headless market.

### 5.3 Where each Figma component set goes

| Destination | Component sets (Figma pages 02–10) | Reasoning |
|---|---|---|
| `@nizivo/react` (core, semver'd) | Button, Icon Button, Badge, Input, Select (plus Menu/MenuButton sharing the trigger recipe), Checkbox, Radio, Switch, Menu Item (as `Menu.Item`), Upload (FileTrigger/Dropzone), Card, Delta, KPI Tile, Progress Bar, Skeleton, Empty State, Toast, Alert, Banner, Modal (Dialog), Tooltip, Tabs, Segmented control, Nav Item, Search Field, Variant Option (as a generic "ChoiceCard"/radio-card) | Reusable building blocks with real a11y behaviour. People expect them to be updated. |
| `@nizivo/charts` | Area Chart, Bar Chart, Donut Chart, Sparkline, Chart Legend Item, Chart Tooltip, Progress Ring | Heavy SVG and math. Different release risk. |
| `@nizivo/motion` / `@nizivo/lab` | Count-up numerics, spring easings, magnetic/tilt. The 3D/Shader/Motion Lab page | Opt-in, browser-only, heavy. |
| Registry patterns (L4) | Insight Card, Product Card, Product Row, Order Row, Discount Card, Payment Method, Shipment Tracker, Plan Card, Sidebar (as a layout recipe), Mobile Tab Bar, dashboard compositions (page 08), Instagram Storefront set (Collection Circle, Shoppable Post, Product Tag, Tagged Product, Storefront Bar) | Domain compositions that change most while the design evolves and that consumers most often customize. They are built from core parts, so ejecting them loses no a11y updates. They can **graduate** to `@nizivo/react` (or a `@nizivo/commerce`) once their API is stable. |
| `@nizivo/react/unstable/*` | Anything new from Figma not yet reviewed (e.g. a first Date Range Picker) | Ship early without a semver promise. |

### 5.4 The primitive adapter (the seam that makes the engine swappable)

Rules:
1. **One adapter file per behaviour family** (`src/primitives/select.tsx`, `menu.tsx`, `dialog.tsx`, `tooltip.tsx`…). Each is the only place that imports the engine, and each is `'use client'`.
2. **The adapter normalizes four things.**
   - Prop names: HTML-aligned `disabled`, `readOnly`, `required`, `invalid`. Not RAC's `isDisabled`.
   - Callback signatures: `(value, details)` with Nizivo's `ChangeDetails`.
   - State attributes, onto Nizivo's canonical set (r2): `data-open`, `data-checked`, `data-highlighted`, `data-selected`, `data-disabled`, `data-invalid`, `data-starting-style`, `data-ending-style`.
   - CSS variables, re-exposed as `--nz-anchor-width`, `--nz-available-height`, `--nz-transform-origin`.
3. **No engine types in public `.d.ts`.** Enforce it with an `attw`/`tsd`-style check: a grep of the packed `.d.ts` files for `@base-ui` must return nothing except the adapter's internal chunk.
4. **Contract tests** live next to each component and are engine-agnostic:
   - ARIA role and name tree.
   - Keyboard map (WAI-ARIA APG).
   - `data-*` presence.
   - Focus return.
   - Form submission (hidden input).

   Swapping the engine is "make these tests pass again".
5. **Pure-HTML components need no engine:** Button, Badge, Card, Delta, KPI Tile, Skeleton, Empty State, Banner, Alert (static), Progress Bar (`<progress>`/`role=progressbar`). These are **server-safe** (no `'use client'`), per r1 and the Figma notes.

### 5.5 Swap matrix: what changes if you swap layer X

| Swap | Where the change happens | Consumer impact | Release type |
|---|---|---|---|
| Token **values** (Figma edits) | `@nizivo/tokens` regenerated | Visual only | patch/minor with a "visual" changelog label and visual-regression review (r5) |
| Token **names** (rename or removal) | tokens + alias layer | Consumer CSS referencing the old name keeps working through aliases during deprecation | minor (deprecate) → major (remove) |
| Token pipeline (Terrazzo ⇄ Style Dictionary) | build only | none | none / patch |
| CSS authoring (plain CSS → vanilla-extract or Panda `cssgen`) | build only. The output is still static layered CSS with the same selectors (r2) | none | patch |
| Behaviour engine (Base UI → React Aria / Radix / in-house) | `src/primitives/*` | none if contract tests pass. Subtle a11y differences go in the changelog | minor (engine change is internal), unless behaviour changes visibly |
| One component's implementation (e.g. Select from Floating UI to CSS anchor positioning) | that component | none | minor |
| Heavy module engine (e.g. chart path generation library) | `@nizivo/charts` only | none if the props contract holds | minor. If the charts contract must break, it is a major, and under fixed versioning all packages share that major number (§5.7 explains when to switch to `linked`) |
| Remove a component | deprecate → remove | codemod or registry fork offered | minor → major |
| Consumer swaps *our* component for *theirs* | consumer code | Our props mirror HTML and our parts mirror WAI-ARIA, so their replacement can keep the same call sites | — |
| Consumer swaps *our styling* for theirs | skip our CSS for that component (per-component imports) or `unstyled` | Behaviour, classes and attributes stay, so they style the same hooks | — |

### 5.6 Ejection levels (what the registry is for)

| Level | Name | What the consumer gets | Still receives from npm | Registry item |
|---|---|---|---|---|
| L1 | **Restyle** | Nothing copied. Override with `--nz-*` hooks, `className`, consumer layer CSS (r2) | everything | none (docs) |
| L2 | **Recompose** | Pattern/recipe TSX + CSS that compose `@nizivo/react` parts (e.g. `PlanCard`, `SelectField` = Label + Select + Description + Error) | behaviour, a11y, base component CSS, tokens | `registry:block` / `registry:component` |
| L3 | **Re-skin** | A copy of one component's **CSS file** (`button.css`) into their project. They stop importing ours for that component. Optionally a thin TSX wrapper setting their own defaults or variant names | behaviour, markup, classes, data attributes, a11y | `registry:item` (CSS) + optional `registry:component` |
| L4 | **Fork** | Full component source **including the adapter**, importing the engine directly. Labelled "no further updates" | tokens only | `registry:ui`, a small, explicitly marked set |

**Precondition for L3:** the consumer must use the granular CSS entries (`css/core.css` plus per-component files), not the all-in-one `styles.css`. With `styles.css` our `button.css` rules still load. The ejected copy would then only *override* them, and any property the copy doesn't redeclare would leak through from ours. The docs and the `button-css` item's `docs` message must say "switch to granular imports first".

The design point: L3 works only because **JS never imports CSS and the class/attribute contract is semver'd**. An ejected `button.css` keeps working across every minor release, because the selectors it targets are public API (§8.1). This is the main difference from shadcn, where ejecting means owning behaviour too.

### 5.7 Version coupling

- **Changesets `fixed` group for every `@nizivo/*` npm package.** All packages share one version number. Mantine does this: `@mantine/core` 9.7.2 peers on `@mantine/hooks` **exactly** 9.7.2.
  - Consumers reason about one number.
  - Registry items pin one range (`@nizivo/react@~0.4.0`).
  - The cost: a charts-only major also bumps core's major number. Pre-1.0 this is cheap. Post-1.0, revisit by moving heavy packages to `linked` instead of `fixed` (Changesets supports both). Changesets 3.0.3 is current; the config shape for `fixed`/`linked` is assumed unchanged from 2.x (UNVERIFIED for 3.x).
- **Registry snapshots.** On each release, the docs build writes `/r/v{major}.{minor}/*.json` (immutable) alongside `/r/*.json` (latest). Consumers who want reproducibility point their namespace at a versioned URL template (§11.4). shadcn has no native pinning, so this is the documented workaround ([namespace docs](https://ui.shadcn.com/docs/registry/namespace)).
- **Registry items pin npm deps with tilde ranges** (`~0.4.0` pre-1.0, `^1.2.0` post-1.0), so a copied pattern is installed alongside a compatible core.

---

## 6. Public API conventions (the rulebook)

### 6.1 Components and parts
1. **Every multi-element component is a compound of parts**, exported two ways from its subpath: as a namespace (`Select.Root`, `Select.Trigger`) and flat (`SelectRoot`, `SelectTrigger`). The barrel `@nizivo/react` re-exports both.
2. **`index.ts` has no directive and contains `export * as Select from './index.parts'`.** Parts files carry `'use client'` only if they use hooks (r1 D3/D5). Never static properties.
3. **Single-element components are plain functions** (`Button`, `Badge`, `Delta`). Their **slots are props** typed `ReactNode` (`leadingIcon`, `trailingIcon`), matching the Figma finding that there is no INSTANCE_SWAP.
4. **Pre-assembled conveniences** (e.g. `SelectField`, `KpiTile` with a built-in sparkline) are built from public parts only. They start in the registry and graduate to npm.

### 6.2 Composition: `render`, not `asChild` or `as`

`render?: ReactElement | ((props, state) => ReactElement)` on every part that renders a DOM element.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| `asChild` (Radix Slot) | Familiar. Simple JSX | Single child only. Hidden prop merge order. Needs `Slottable` for siblings. The child's type isn't reflected in props. Ties us to Radix semantics | Rejected |
| `render` (Base UI / RAC / shadcn-default) | Explicit. Function form exposes **state** (`render={(p, s) => <motion.button {...p} animate={…}/>}`). Element form is **serializable from RSC**: JSX elements are valid Server→Client props, functions are not ([react.dev](https://react.dev/reference/rsc/use-client#serializable-types)). Same API whichever engine is underneath | Slightly more verbose than `asChild` | **Chosen** |
| Polymorphic `as` / `component` | Short | tsserver cost (Mantine docs). Chakra notes TS "doesn't infer" props from `as`. Generic components can't be passed (Mantine) | Rejected |

Rules, adapted from React Aria's:
- Render the same element *semantics*. The consumer must spread the props.
- Single root, no fragments.
- Merge refs.

Two rules specific to RSC:
- Element-form `render` and string `className` work from Server Components into every part.
- Function-form `render`, `className(state)` and `style(state)` are **client-only** when the part is a client component. Document this per part.

### 6.3 Styling hooks
1. **Classes:** `nz-<component>` on the root, `nz-<component>-<part>` on parts (`nz-select-trigger`, `nz-select-item`). Static, unhashed, prefix fixed (§12).
2. **Variant attributes on the element:** `data-variant`, `data-size`, `data-tone`, plus booleans such as `data-full-width` and `data-loading`. The value set is the TS union. Never classes for variants.
3. **State:** native first (`:disabled`, `:focus-visible`, `[aria-invalid="true"]`, `[aria-expanded]`), then the canonical `data-*` state set (§5.4).
4. **Global attributes** use the `data-nz-*` namespace and live on ancestors only (`data-nz-theme`, `data-nz-brand`, `data-nz-density`, `data-nz-motion`), as in r2.
5. **No cva or tailwind-variants in core.** Mapping a prop to an attribute is one line. tv and cva add a dependency, and tv adds a Tailwind peer (2.1). Consumers may still use them in their own wrappers.

### 6.4 `className` / `style` / props merge
- Order: `cx('nz-…', consumerClassName)`. Our selectors sit inside `@layer nz.components`, so consumer CSS wins regardless of order or specificity (r2).
- `style`: `{ ...internal, ...consumer }`. Internal inline styles are limited to positioning outputs.
- Handlers: the consumer runs first. If it calls `event.preventDefault()`, the internal handler is skipped (Radix `composeEventHandlers` semantics).
- `ref`: merged with any internal ref (callback-ref composition).
- Rest props (`id`, `data-*`, `aria-*`, `title`, native attributes) land on the part's main DOM element. Documented per part.
- Never spread unknown props onto a non-DOM element.
- **Client parts** (those with `'use client'`) additionally accept `className` and `style` as functions of the part's state (`className={(s) => s.open ? 'is-open' : undefined}`), the Base UI convention. These forms are client-only (§6.2). Server-safe components (Button, Card, Badge) accept strings and objects only.

### 6.5 Component CSS variables as public API
- Naming: `--nz-<component>-<property>[-<state>]`, for example `--nz-button-bg`, `--nz-button-bg-hover`, `--nz-select-popup-max-height`.
- **Read with fallback, never assigned by the library** (r2). That way a hook works when set on the element *or* on any ancestor:
  ```css
  .nz-button { background: var(--nz-button-bg, var(--nz-color-bg-brand)); }
  ```
- Each component documents its hooks in the props manifest (r5). They are **public API**, so adding one is minor and renaming one is major.

### 6.6 Unstyled
1. **Per app or per component:** import only `css/core.css` plus the per-component CSS you want, and skip the rest. Components without CSS render semantic markup with classes and attributes only.
2. **Per instance:** `unstyled` drops all `nz-*` classes. On client compounds `Root` puts it in context so every part inherits it. On server-safe compounds (Card) it must be set on each part, because there is no context without client JS. Data attributes, ARIA and behaviour remain.
3. Better than Mantine's root-only `unstyled`, which "is not supported by compound components".

### 6.7 Providers
- **Nothing requires a provider.** IDs use `useId` (SSR-stable). Theme, brand, density and motion come from CSS and `data-nz-*` (r1 D8/D10, r2).
- **Optional `<NizivoConfig>`** (client, `@nizivo/react/config`):
  - `locale` (formatting in KPI Tile, Delta, numeric text).
  - `direction` (forwarded to the engine's direction provider).
  - `portalContainer`.
  - `labels` (string overrides).
  - `toast` defaults.

  Nested configs merge.
- **Determinism rule:** with no config, formatting uses a fixed default locale (`'en-US'`), **never** `navigator.language` during render, to avoid hydration mismatches. Per-component `locale` props override.

### 6.8 State: controlled and uncontrolled
- Triplet: `value` / `defaultValue` / `onValueChange(value, details)`. The same shape for `open`, `checked`, `pressed`, `expanded`.
- `details: { reason: string; event?: Event; cancel?(): void }`. The `reason` union is per component and **extensible in a minor**. Mirrors Base UI's `(value, eventDetails)` ([select API](https://base-ui.com/react/components/select)). Adding a field to an object never breaks callers, unlike adding positional arguments.
- One in-house `useControllableState({ prop, defaultProp, onChange })`, ~30 lines. A dev-only warning fires when switching between controlled and uncontrolled. (Radix's `@radix-ui/react-use-controllable-state` 1.3.0 has the same shape plus a `caller` name for warnings, EMPIRICAL.)
- Forms: every value component renders a hidden or native input when `name` is set. Native `form` and `required` semantics.

### 6.9 Refs
- `ref` is a normal prop typed through `React.ComponentProps<'button'>` (React 19). No `forwardRef`, which React says "will be deprecated in a future release" ([forwardRef](https://react.dev/reference/react/forwardRef)).
- Server-safe components pass `ref` through only when defined. Refs are client-only.

### 6.10 i18n and RTL
- **Zero-runtime first:** CSS uses logical properties only (`margin-inline-start`, `inset-inline-end`), enforced by `stylelint-use-logical` 2.1.3. Direction-sensitive icons flip with `:dir(rtl)` or `[dir="rtl"]` selectors. Apps set `dir` on `<html>`.
  - Prior art: shadcn shipped RTL and "inline start/end styles" in January 2026 ([changelog](https://ui.shadcn.com/docs/changelog)). Mantine 9 added logical style props `mis`/`mie`/`pis`/`pie` ([9.0](https://mantine.dev/changelog/9-0-0/)).
- **Behaviour direction** (arrow keys in Tabs, Slider, Menu) comes from `NizivoConfig.direction`, which falls back to `'ltr'`, and is forwarded to the engine. Base UI's provider "does not affect HTML and CSS", so the app's `dir` attribute is still required ([docs](https://base-ui.com/react/utils/direction-provider)).
- **Strings:** no hard-coded English. Each component that renders text it does not get from children (Toast close, Upload "Browse", Pagination, Skeleton labels, Delta "increase/decrease" SR text) takes a `labels?: Partial<XLabels>` prop with English defaults. Overridable globally through `NizivoConfig.labels`.
- **Numbers and dates:** `Intl` with an explicit locale (6.7). Dates use `@internationalized/date` only inside `@nizivo/react/date-*` entries (not the core graph).

### 6.11 Extending variants without forking (TS augmentation)

All open unions are declared as interface maps in one module, `@nizivo/react/augment`:

```ts
// @nizivo/react/augment (types only)
export interface ButtonVariantMap { primary: true; secondary: true; tertiary: true; critical: true; accent: true }
export interface SizeMap { sm: true; md: true; lg: true }
export interface ToneMap { neutral: true; brand: true; success: true; warning: true; critical: true; info: true }
export type ButtonVariant = keyof ButtonVariantMap;
```

Consumer adds a variant:

```ts
// app/nizivo.d.ts
import '@nizivo/react/augment';
declare module '@nizivo/react/augment' {
  interface ButtonVariantMap { ai: true }      // add
  // removal is not supported by merging; use a wrapper component for narrowing
}
```

```css
/* app.css (consumer layer wins over @layer nz.*) */
.nz-button[data-variant="ai"] { --nz-button-bg: linear-gradient(…); }
```

MUI uses the same mechanism (`ButtonPropsVariantOverrides`). Augmentation must target the **declaring** module. Re-exports are a known TypeScript sharp edge, which is why there is one dedicated `augment` module. CI must keep an expect-type test proving augmentation flows through `@nizivo/react/button` and the barrel (UNVERIFIED until that test exists).

### 6.12 Naming conventions

| Thing | Convention | Example |
|---|---|---|
| npm packages | `@nizivo/<kebab>` | `@nizivo/react`, `@nizivo/charts` |
| Subpaths | kebab, one per component family | `@nizivo/react/select`, `/kpi-tile`, `/unstable/date-range-picker` |
| Components | PascalCase, noun. Parts `<Component><Part>` | `Select`, `SelectTrigger`, `Select.Trigger` |
| Boolean props | HTML-aligned adjectives, no `is` prefix | `disabled`, `readOnly`, `invalid`, `loading`, `fullWidth` |
| Value props | `value` / `defaultValue` / `onValueChange` | `open` / `defaultOpen` / `onOpenChange` |
| Enumerations | lowercase string unions from Figma | `size: 'sm' \| 'md' \| 'lg'`, `tone: 'critical'` (not `danger`) |
| Slots | `<position>Icon`, or a part | `leadingIcon`, `trailingIcon`, `Card.Header` |
| Classes | `nz-<component>[-<part>]` | `nz-kpi-tile-value` |
| Data attributes | `data-<prop>` on components. `data-nz-<global>` on ancestors | `data-variant="primary"`, `data-nz-theme="dark"` |
| CSS vars | semantic `--nz-<group>-<name>`. Hooks `--nz-<component>-<prop>[-<state>]`. Primitive `--nz-p-*` (not public) | `--nz-color-bg-brand`, `--nz-button-bg-hover` |
| Cascade layers | `nz.reset`, `nz.tokens`, `nz.base`, `nz.components`, `nz.patterns` | |
| Registry items | `<name>` for patterns, `<component>-css` for re-skin, `<component>-source` for forks, `theme-<name>`, `init` | `@nizivo/plan-card`, `@nizivo/button-css` |

---

## 7. Code sketches

### 7.1 Shared internals (server-safe, no hooks)

```ts
// packages/react/src/internal/merge-props.ts  (no directive: usable on server and client)
type AnyProps = Record<string, unknown>;
export const cx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(' ') || undefined;

/** Compose refs. Returns the single ref untouched when only one exists (keeps server-safe paths ref-free). */
export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.Ref<T> | undefined {
  const list = refs.filter((r): r is React.Ref<T> => r != null);
  if (list.length <= 1) return list[0];
  const set = (r: React.Ref<T>, v: T | null) => {
    if (typeof r === 'function') return r(v);
    (r as React.RefObject<T | null>).current = v;
  };
  return (node: T | null) => {
    const cleanups = list.map((r) => set(r, node));
    // React 19 callback-ref cleanup: undo every ref on detach
    return () => list.forEach((r, i) => (typeof cleanups[i] === 'function' ? (cleanups[i] as () => void)() : set(r, null)));
  };
}

/** Nizivo props first, consumer props second (consumer wins, handlers chained consumer-first). */
export function mergeProps(ours: AnyProps, theirs: AnyProps): AnyProps {
  const out: AnyProps = { ...ours, ...theirs };
  for (const key in theirs) {
    const a = ours[key], b = theirs[key];
    if (key === 'className') out[key] = cx(a as string, b as string);
    else if (key === 'style') out[key] = { ...(a as object), ...(b as object) };
    else if (key === 'ref') out[key] = mergeRefs(a as React.Ref<unknown>, b as React.Ref<unknown>);
    else if (/^on[A-Z]/.test(key) && typeof a === 'function' && typeof b === 'function') {
      out[key] = (e: { defaultPrevented?: boolean }, ...rest: unknown[]) => {
        (b as Function)(e, ...rest);
        if (!e?.defaultPrevented) (a as Function)(e, ...rest);
      };
    }
  }
  return out;
}
```

```tsx
// packages/react/src/internal/render-element.ts  (no directive, no hooks → server-safe)
import { cloneElement, createElement, isValidElement, type ReactElement } from 'react';
import { mergeProps } from './merge-props';

export type RenderProp<S> = ReactElement | ((props: Record<string, unknown>, state: S) => ReactElement);

export function renderElement<S>(
  tag: keyof React.JSX.IntrinsicElements,
  render: RenderProp<S> | undefined,
  state: S,
  props: Record<string, unknown>,
): ReactElement {
  if (typeof render === 'function') return render(props, state);          // full control
  if (isValidElement(render)) return cloneElement(render, mergeProps(props, render.props as Record<string, unknown>));
  return createElement(tag, props);
}
```

### 7.2 Button: server-safe, `render`, data attributes, CSS hooks

```tsx
// packages/react/src/button/button.tsx   ← no 'use client': renders in RSC with zero JS
import type * as React from 'react';
import type { ButtonVariant, SizeMap } from '../augment';
import { cx } from '../internal/merge-props';
import { renderElement, type RenderProp } from '../internal/render-element';

export interface ButtonState { variant: ButtonVariant; size: keyof SizeMap; loading: boolean; disabled: boolean }

export interface ButtonProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  /** @default 'secondary'  (Figma default is Primary; guidance says "one primary per view") */
  variant?: ButtonVariant;
  /** @default 'md' */
  size?: keyof SizeMap;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  /** Drop nz-* classes (keeps data-* + a11y). */
  unstyled?: boolean;
  /** Render a different element/component, e.g. render={<Link href="/pricing" />}. */
  render?: RenderProp<ButtonState>;
  children?: React.ReactNode;
}

export function Button({
  variant = 'secondary', size = 'md', leadingIcon, trailingIcon, loading = false,
  fullWidth = false, unstyled = false, disabled = false, render, className, type, children, ...rest
}: ButtonProps) {
  const isNativeButton = render === undefined;
  const state: ButtonState = { variant, size, loading, disabled };
  const k = (c: string) => (unstyled ? undefined : c);

  return renderElement('button', render, state, {
    ...rest,
    className: cx(k('nz-button'), className),
    type: isNativeButton ? (type ?? 'button') : undefined,
    // keep focusable while loading; native disabled only for real <button>
    disabled: isNativeButton && disabled ? true : undefined,
    'aria-disabled': (!isNativeButton && disabled) || loading ? true : undefined,
    'aria-busy': loading || undefined,
    'data-variant': variant,
    'data-size': size,
    'data-loading': loading ? '' : undefined,
    'data-full-width': fullWidth ? '' : undefined,
    children: (
      <>
        {leadingIcon != null && <span className={k('nz-button-icon')} data-position="start" aria-hidden="true">{leadingIcon}</span>}
        <span className={k('nz-button-label')}>{children}</span>
        {trailingIcon != null && <span className={k('nz-button-icon')} data-position="end" aria-hidden="true">{trailingIcon}</span>}
      </>
    ),
  });
}
```

```css
/* packages/react/src/button/button.css → dist/css/button.css */
@layer nz.components {
  .nz-button {
    display: inline-flex; align-items: center; justify-content: center;
    gap: var(--nz-button-gap, var(--nz-space-2));
    block-size: var(--nz-button-height, var(--nz-size-control-md));
    padding-inline: var(--nz-button-padding-inline, var(--nz-space-4));
    border-radius: var(--nz-button-radius, var(--nz-radius-md));
    background: var(--nz-button-bg, var(--nz-color-bg-surface));
    color: var(--nz-button-fg, var(--nz-color-text-primary));
    transition: background-color var(--nz-duration-fast) var(--nz-easing-standard),
                transform var(--nz-duration-fast) var(--nz-easing-standard);
    &:hover:not(:disabled, [aria-disabled="true"]) { background: var(--nz-button-bg-hover, var(--nz-color-bg-hover)); }
    &:active:not(:disabled, [aria-disabled="true"]) { transform: scale(var(--nz-scale-press)); }
    &:focus-visible { outline: none; box-shadow: var(--nz-button-focus-ring, var(--nz-focus-ring)); }
    &:is(:disabled, [aria-disabled="true"]) { background: var(--nz-button-bg-disabled, var(--nz-color-bg-disabled)); color: var(--nz-color-text-disabled); }
  }
  .nz-button[data-variant="primary"] {
    --_bg: var(--nz-color-bg-brand); --_fg: var(--nz-color-text-on-brand);
    background: var(--nz-button-bg, var(--_bg)); color: var(--nz-button-fg, var(--_fg));
    &:hover:not(:disabled, [aria-disabled="true"]) { background: var(--nz-button-bg-hover, var(--nz-color-bg-brand-hover)); }
  }
  .nz-button[data-size="sm"] { block-size: var(--nz-button-height, var(--nz-size-control-sm)); }
  .nz-button[data-size="lg"] { block-size: var(--nz-button-height, var(--nz-size-control-lg)); }
  .nz-button[data-full-width] { inline-size: 100%; }
  /* touch hit-area expansion to 44px without changing layout (Figma: "44px via padding on touch") */
  @media (pointer: coarse) { .nz-button { position: relative; &::before { content: ""; position: absolute; inset: min(0px, calc((var(--nz-size-touch-min) - 100%) / -2)) 0; } } }
}
```

Usage across all hooks:

```tsx
// Server Component (Next.js App Router), no client JS for the button itself
import Link from 'next/link';
import { Button } from '@nizivo/react/button';

<Button variant="primary" render={<Link href="/pricing" />}>See plans</Button>       // element-form render: RSC-safe
<Button className="checkout-cta" style={{ minInlineSize: 200 }}>Pay</Button>         // passthrough
<section style={{ ['--nz-button-radius' as string]: '999px' }}>…</section>          // ancestor-scoped hook
```

### 7.3 Select: adapter seam, namespace parts, controlled/uncontrolled

```tsx
// packages/react/src/primitives/select.tsx  ← the ONLY file that imports the engine
'use client';
import { Select as Engine } from '@base-ui/react/select';
import { cloneElement, createElement, isValidElement, type ReactElement } from 'react';
import { mergeProps } from '../internal/merge-props';

export type SelectChangeReason = 'item-press' | 'keyboard' | 'outside-press' | 'escape' | 'unknown';
export interface ChangeDetails<R extends string = string> { reason: R; event?: Event }

export const toDetails = (d: { reason?: string; event?: Event } | undefined): ChangeDetails<SelectChangeReason> =>
  ({ reason: (d?.reason as SelectChangeReason) ?? 'unknown', event: d?.event });

type EngineState = { open?: boolean; highlighted?: boolean; selected?: boolean; disabled?: boolean };
type UserRender<S> = ((p: Record<string, unknown>, s: S) => ReactElement) | ReactElement | undefined;

/** Map engine state → Nizivo canonical data-* set (r2), then hand off to the consumer's render prop. */
export function withCanonicalState<S extends EngineState>(userRender: UserRender<S>, tag: string) {
  return (props: Record<string, unknown>, state: S): ReactElement => {
    const canonical = mergeProps(props, {
      'data-open': state.open ? '' : undefined,
      'data-highlighted': state.highlighted ? '' : undefined,
      'data-selected': state.selected ? '' : undefined,
      'data-disabled': state.disabled ? '' : undefined,
    });
    if (typeof userRender === 'function') return userRender(canonical, state);
    if (isValidElement(userRender)) return cloneElement(userRender, mergeProps(canonical, userRender.props as Record<string, unknown>));
    return createElement(tag, canonical);
  };
}

export const P = {
  Root: Engine.Root, Trigger: Engine.Trigger, Value: Engine.Value, Icon: Engine.Icon,
  Portal: Engine.Portal, Positioner: Engine.Positioner, Popup: Engine.Popup, List: Engine.List,
  Item: Engine.Item, ItemText: Engine.ItemText, ItemIndicator: Engine.ItemIndicator,
  Group: Engine.Group, GroupLabel: Engine.GroupLabel, Separator: Engine.Separator,
};
```

Notes:
- The engine's own state attributes (e.g. Base UI's `data-popup-open`) still appear in the DOM, but Nizivo CSS and docs only reference the canonical set.
- Whether Base UI's `render` callback state uses exactly the keys `open`, `highlighted` and `selected` per part should be checked against each part's API page when implementing (UNVERIFIED per part; the Select docs list `data-popup-open`, `data-highlighted` and `data-selected`).

```tsx
// packages/react/src/select/select.parts.tsx
'use client';
import { createContext, use, type ReactNode } from 'react';
import { P, toDetails, withCanonicalState, type ChangeDetails, type SelectChangeReason } from '../primitives/select';
import { cx } from '../internal/merge-props';
import type { SizeMap } from '../augment';
import type { RenderProp } from '../internal/render-element';
import { useNizivoConfig } from '../config/nizivo-config';

interface Ctx { size: keyof SizeMap; invalid: boolean; unstyled: boolean }
const SelectCtx = createContext<Ctx>({ size: 'md', invalid: false, unstyled: false });
const k = (u: boolean, c: string) => (u ? undefined : c);

export interface SelectRootProps<V> {
  value?: V | null; defaultValue?: V | null;
  onValueChange?: (value: V | null, details: ChangeDetails<SelectChangeReason>) => void;
  open?: boolean; defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ChangeDetails<SelectChangeReason>) => void;
  name?: string; required?: boolean; disabled?: boolean; readOnly?: boolean; invalid?: boolean;
  size?: keyof SizeMap; unstyled?: boolean; children?: ReactNode;
}

export function SelectRoot<V>({ onValueChange, onOpenChange, size = 'md', invalid = false, unstyled = false, children, ...rest }: SelectRootProps<V>) {
  return (
    <SelectCtx value={{ size, invalid, unstyled }}>
      <P.Root
        {...rest}
        onValueChange={onValueChange && ((v: V | null, d: unknown) => onValueChange(v, toDetails(d as never)))}
        onOpenChange={onOpenChange && ((o: boolean, d: unknown) => onOpenChange(o, toDetails(d as never)))}
      >
        {children}
      </P.Root>
    </SelectCtx>
  );
}

export interface SelectTriggerProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  leadingIcon?: ReactNode; placeholder?: ReactNode; render?: RenderProp<{ open: boolean }>;
}
export function SelectTrigger({ className, leadingIcon, placeholder, render, ...rest }: SelectTriggerProps) {
  const { size, invalid, unstyled } = use(SelectCtx);
  return (
    <P.Trigger
      {...rest}
      className={cx(k(unstyled, 'nz-select-trigger'), className)}
      data-size={size}
      aria-invalid={invalid || undefined}
      render={withCanonicalState(render as never, 'button')}
    >
      {leadingIcon != null && <span className={k(unstyled, 'nz-select-icon')} aria-hidden="true">{leadingIcon}</span>}
      <P.Value className={k(unstyled, 'nz-select-value')} placeholder={placeholder} />
      <P.Icon className={k(unstyled, 'nz-select-chevron')} aria-hidden="true" />
    </P.Trigger>
  );
}

export interface SelectPopupProps extends React.ComponentProps<'div'> {
  /** Portal target; defaults to NizivoConfig.portalContainer, then document.body. */
  container?: HTMLElement | null;
  sideOffset?: number;
}
/** One Nizivo part = engine Portal + Positioner + Popup + List (smaller public surface, engine-agnostic). */
export function SelectPopup({ className, container, sideOffset = 6, children, ...rest }: SelectPopupProps) {
  const { unstyled } = use(SelectCtx);
  const config = useNizivoConfig();
  return (
    <P.Portal container={container ?? config.portalContainer}>
      <P.Positioner className={k(unstyled, 'nz-select-positioner')} sideOffset={sideOffset}>
        <P.Popup {...rest} className={cx(k(unstyled, 'nz-select-popup'), className)}>
          <P.List className={k(unstyled, 'nz-select-list')}>{children}</P.List>
        </P.Popup>
      </P.Positioner>
    </P.Portal>
  );
}

export interface SelectItemProps<V> extends Omit<React.ComponentProps<'div'>, 'children'> {
  value: V; disabled?: boolean; icon?: ReactNode; children: ReactNode;
}
export function SelectItem<V>({ className, icon, children, ...rest }: SelectItemProps<V>) {
  const { unstyled } = use(SelectCtx);
  return (
    <P.Item {...rest} className={cx(k(unstyled, 'nz-select-item'), className)} render={withCanonicalState(undefined, 'div')}>
      {icon != null && <span className={k(unstyled, 'nz-select-item-icon')} aria-hidden="true">{icon}</span>}
      <P.ItemText className={k(unstyled, 'nz-select-item-text')}>{children}</P.ItemText>
      <P.ItemIndicator className={k(unstyled, 'nz-select-item-indicator')} aria-hidden="true" />
    </P.Item>
  );
}
// SelectGroup, SelectGroupLabel, SelectSeparator follow the same shape.
```

```ts
// packages/react/src/select/index.parts.ts
export {
  SelectRoot as Root, SelectTrigger as Trigger, SelectPopup as Popup,
  SelectItem as Item, SelectGroup as Group, SelectGroupLabel as GroupLabel, SelectSeparator as Separator,
} from './select.parts';

// packages/react/src/select/index.ts   ← no directive (r1 D5)
export * as Select from './index.parts';
export * from './select.parts';           // flat: SelectRoot, SelectTrigger, … + prop types
```

```css
/* select.css: positioning vars are re-exposed under Nizivo names so the engine is swappable */
@layer nz.components {
  .nz-select-positioner { --nz-anchor-width: var(--anchor-width); --nz-available-height: var(--available-height); --nz-transform-origin: var(--transform-origin); }
  .nz-select-popup {
    min-inline-size: var(--nz-select-popup-min-width, var(--nz-anchor-width));
    max-block-size: var(--nz-select-popup-max-height, min(320px, var(--nz-available-height)));
    transform-origin: var(--nz-transform-origin);
    background: var(--nz-select-popup-bg, var(--nz-color-bg-surface-raised));
    box-shadow: var(--nz-elevation-3); border-radius: var(--nz-radius-md);
    &[data-starting-style], &[data-ending-style] { opacity: 0; scale: 0.98; }
  }
  .nz-select-trigger[data-open] { border-color: var(--nz-color-border-focus); box-shadow: var(--nz-focus-ring); }
  .nz-select-item[data-highlighted] { background: var(--nz-color-bg-hover); }
  .nz-select-item[data-selected] { background: var(--nz-color-bg-brand-subtle); }
}
```

Consumer:

```tsx
'use client';
import { useState } from 'react';
import { Select } from '@nizivo/react/select';
import { CalendarIcon } from 'my-icons';

export function RangePicker() {
  const [range, setRange] = useState<'7d' | '30d' | null>('30d');
  return (
    <Select.Root value={range} onValueChange={(v, { reason }) => { setRange(v); track('range', reason); }}>
      <Select.Trigger leadingIcon={<CalendarIcon />} placeholder="Pick a range" />
      <Select.Popup>
        <Select.Item value="7d">Last 7 days</Select.Item>
        <Select.Item value="30d">Last 30 days</Select.Item>
      </Select.Popup>
    </Select.Root>
  );
}
```

Swapping Base UI for React Aria later means rewriting `primitives/select.tsx`:
- RAC `Select`, `Button`, `SelectValue`, `Popover`, `ListBox`, `ListBoxItem`.
- Map `onSelectionChange` → `(value, details)`.
- Map RAC's `data-focused`/`data-selected` → the canonical set.
- Map `--trigger-width` → `--nz-anchor-width`. (The RAC variable name is from memory, UNVERIFIED.)

`select.parts.tsx`, `select.css`, the docs and every consumer stay untouched.

### 7.4 Registry pattern item (L2) and re-skin item (L3)

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "plan-card",
  "type": "registry:block",
  "title": "Plan card",
  "description": "Pricing plan card composed from @nizivo/react Card, Badge, Button. You own the markup; parts stay updatable.",
  "dependencies": ["@nizivo/react@~0.4.0"],
  "files": [
    { "path": "registry/patterns/plan-card/plan-card.tsx", "type": "registry:component", "target": "@components/nizivo/plan-card.tsx" },
    { "path": "registry/patterns/plan-card/plan-card.css", "type": "registry:file", "target": "@components/nizivo/plan-card.css" }
  ],
  "docs": "Import './plan-card.css' once (or move it into your global CSS inside @layer nz.patterns).",
  "categories": ["commerce"],
  "meta": { "nizivo": { "layer": "pattern", "since": "0.4.0", "figmaNode": "7275:14284", "level": "recompose" } }
}
```

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "button-css",
  "type": "registry:item",
  "title": "Button styles (re-skin)",
  "description": "Copies Nizivo's button.css so you can own the look. Stop importing @nizivo/react/css/button.css afterwards. Selectors (.nz-button, data-variant, data-size, --nz-button-*) are semver-stable.",
  "dependencies": ["@nizivo/react@~0.4.0"],
  "files": [{ "path": "packages/react/src/button/button.css", "type": "registry:file", "target": "src/styles/nizivo/button.css" }],
  "meta": { "nizivo": { "layer": "css", "level": "re-skin" } }
}
```

### 7.5 Optional config provider

```tsx
// packages/react/src/config/nizivo-config.tsx
'use client';
import { createContext, use, type ReactNode } from 'react';
import { DirectionProvider } from '../primitives/direction';   // adapter wraps the engine's provider

export interface NizivoConfigValue {
  locale: string;                         // deterministic default, never navigator.language during render
  direction: 'ltr' | 'rtl';
  portalContainer?: HTMLElement | null;
  labels?: Partial<NizivoLabels>;
}
const defaults: NizivoConfigValue = { locale: 'en-US', direction: 'ltr' };
const ConfigCtx = createContext<NizivoConfigValue>(defaults);
export const useNizivoConfig = () => use(ConfigCtx);

export function NizivoConfig({ children, ...value }: Partial<NizivoConfigValue> & { children: ReactNode }) {
  const parent = useNizivoConfig();
  const merged = { ...parent, ...value, labels: { ...parent.labels, ...value.labels } };
  return <ConfigCtx value={merged}><DirectionProvider direction={merged.direction}>{children}</DirectionProvider></ConfigCtx>;
}
```

---

## 8. Deprecation, codemods and semver for CSS

### 8.1 What counts as public API

I found no primary-source class-name semver policy from Primer, Carbon, Polaris or Spectrum in this session. The secondary guidance agrees that token renames and class renames are breaking ([EightShapes](https://medium.com/eightshapes-llc/versioning-design-systems-48cceb5ace4d), [Steve Kinney](https://stevekinney.com/courses/enterprise-ui/versioning-and-release-management)). Nizivo's own policy:

| Surface | Public? | Notes |
|---|---|---|
| Exported components, parts, props, prop value unions, callback `details` fields | **Yes** | The props manifest (r5) is the reference. |
| Subpath entry points and CSS file paths (`/css/button.css`, `styles.css`) | **Yes** | |
| `nz-*` class names on documented parts | **Yes** | |
| `data-*` attribute **names and values** (variants and canonical state set). Global `data-nz-*` | **Yes** | |
| Semantic tokens `--nz-<group>-*` and component hooks `--nz-<component>-*` | **Yes** | |
| Cascade layer names (`nz.*`) and their order | **Yes** | Consumers import into named layers (r2). |
| Primitive tokens `--nz-p-*`, internal `--_*` variables | No | Documented as private. |
| DOM structure beyond documented parts (wrapper elements, child order) | No | Structural selectors (`>`, `:nth-child`) on our markup are unsupported. Say so in the docs. |
| Visual output (token values, spacing, motion curves) | Not semver-breaking | Ship as minor/patch with a "visual" label and visual-regression review (r5). |
| Anything under `/unstable/*` or tagged `@experimental` | No | |

### 8.2 Change classification

| Change | Release |
|---|---|
| New component, part, prop, variant value, hook variable, token, `details.reason` value | minor |
| Default value change that alters appearance only | minor (labelled) |
| Default value change that alters behaviour (e.g. `modal` default) | major |
| Rename or remove anything in §8.1 "Yes" | **deprecate in minor → remove in major** |
| Engine swap with passing contract tests | minor |
| Pre-1.0 (0.x) | Breaking changes are allowed only in `0.MINOR` bumps, always with a changeset "BREAKING" section and a codemod when mechanical. Patches are never breaking. |

### 8.3 Deprecation lifecycle

1. **Introduce the replacement and keep an alias.** The release is a minor.

   ```ts
   export interface BadgeProps {
     tone?: Tone;
     /** @deprecated Use `tone`. Removed in 1.0. Codemod: `npx @nizivo/codemod badge-color-to-tone` */
     color?: Tone;
   }
   const tone = props.tone ?? props.color;
   if (process.env.NODE_ENV !== 'production' && props.color !== undefined) warnOnce('Badge: `color` is deprecated; use `tone`.');
   ```

   - `@deprecated` gives editor strikethrough.
   - `warnOnce` is a module-level `Set` so it fires once per message.
2. **CSS aliases** for renamed classes, attributes and variables:

   ```css
   :is(.nz-kpi, .nz-kpi-tile) { … }                                       /* class rename */
   .nz-button:is([data-variant="danger"], [data-variant="critical"]) { … } /* value rename */
   .nz-button { background: var(--nz-button-bg, var(--nz-button-background, var(--nz-color-bg-brand))); } /* var rename */
   ```

   The component emits **both** attribute values during the deprecation window when cheap (`data-tone="critical" data-legacy-tone="danger"`), or only the new one if consumer CSS can be migrated by codemod.
3. **Token renames:**
   - Mark the old token `"$deprecated": "Use color.bg.critical"` in `tokens.json`. DTCG 2025.10 §5.2.4 allows `true`, a string, or `false`, and groups can be deprecated too ([DTCG 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)).
   - The generator then emits the old name as `--nz-old: var(--nz-new)` plus a docs entry.
   - A stylelint rule (`@nizivo/stylelint-config`, later) flags deprecated `--nz-*` names and classes in consumer CSS. It reads the same token JSON.
4. **Codemods for anything mechanical** (prop renames, import path moves, compound restructuring, consumer CSS selector renames):
   - **Tool:** jscodeshift 17.4.0 for TSX ASTs, plus ast-grep 0.50.0 for fast pattern rewrites and CSS.
   - Package them as `@nizivo/codemod` (`npx @nizivo/codemod@latest <version>/<transform> <path>`) and optionally mirror them to the Codemod registry, which supports publishing and `npx codemod <pkg>` runs, including multi-step workflows and jssg transforms ([Codemod registry](https://docs.codemod.com/platform/registry), [CLI](https://docs.codemod.com/cli)).
   - Each transform ships with fixture tests (input/output).
   - **Precedent:** MUI ships `npx @mui/codemod@latest deprecations/all <path>`, which "you can run … as often as necessary", plus per-component transforms ([MUI deprecations](https://next.mui.com/material-ui/migration/migrating-from-deprecated-apis/)). shadcn ships `shadcn migrate` (`cn`, `icons`, `rtl`, `radix`) ([CLI](https://ui.shadcn.com/docs/cli)). Copy both ideas: a rolling **`deprecations/all`** transform, plus per-release transforms.
5. **Removal** happens in the next major, at least one minor (and ≥ 3 months post-1.0) after the deprecation shipped. The release notes list every removal with its codemod.
6. **Registry items** are regenerated from the new source on every release. Pinned snapshots (`/r/v0.4/…`) keep old consumers reproducible.

### 8.4 Work-in-progress valves (so a changing Figma doesn't force majors)

- `@nizivo/react/unstable/<name>` subpaths and the `@experimental` JSDoc tag. Excluded from semver, and named so consumers notice.
- `next` dist-tag prereleases from a `next` branch (Changesets pre mode).
- Patterns stay registry-only until they stabilize. Registry content can change shape between minors because consumers own the copy.
- Prefer **additive** changes: a new variant value, a new hook variable or a new part are all minor.

---

## 9. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| **Registry-only (shadcn model) for everything** | No update path beyond overwrite (EMPIRICAL E7). No version pinning. A11y fixes never reach consumers. Requires Tailwind for the standard `init` (E4). Engine swaps force every consumer to re-copy. Wrong for a design that is still changing. |
| **npm-only with no registry** | Loses consumer ownership of patterns, plus the 2026 agent and tooling ecosystem (shadcn MCP, v0, registry directory). Domain patterns (commerce, storefront) would bloat the semver surface while their design is still moving. |
| **Own CLI (`npx nizivo add`)** like Untitled UI, HeroUI, Chakra and Park UI | Maintenance cost with no added capability. The shadcn CLI already does namespaces, auth, GitHub registries, `--path`, `--dry-run`, `--view`, search and MCP. Revisit only if we need a three-way merge updater. |
| **One npm package per component** | Version-skew matrix. Radix consolidated into `radix-ui` for this reason. Subpaths give the same tree-shaking. |
| **Public headless package (`@nizivo/primitives`) now** | Doubles the API surface to design and semver. Nizivo components without CSS already act as a headless layer. Base UI, RAC and Radix serve pure-headless users better. |
| **`asChild`** | Single-child constraint, implicit merge, Radix-specific semantics. See §6.2. |
| **Polymorphic `as`/`component`** | tsserver cost, poor inference, no generic components (Mantine docs). |
| **cva or tailwind-variants for variants** | cva is stale (0.7.1, 2024-11). tv requires Tailwind and tailwind-merge peers. Data attributes need neither and are readable from CSS, devtools and tests. |
| **Static-property compounds** (`Card.Header` via `Object.assign`) | Breaks from Server Components (r1 D5). HeroUI 3.2.6 does it in `'use client'` files (EMPIRICAL). |
| **Required provider** (Radix Themes `<Theme>`, Chakra `Provider`, `MantineProvider`) | Forces a client boundary at the root and couples theme to React. Nizivo theming is CSS (r2). |
| **Component CSS variables assigned on the element** (HeroUI `--button-bg: transparent`) | An ancestor-scoped override can't win without targeting the element. Read with fallback instead (r2). |
| **Consumer-configurable class/variable prefix** (Mantine `classNamesPrefix`) | Classes are API. A runtime-configurable prefix breaks registry items, docs, ejected CSS and Tailwind recipes. If isolation is ever needed (micro-frontends with two Nizivo versions), do a build-time rewrite of the published CSS rather than a runtime option (open question §12). |

---

## 10. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The shadcn registry protocol changes incompatibly (it moved fast: v3→v4 in seven months, with new item types) | Medium | Medium | The registry is a *generated artifact*. Pin the `shadcn` devDependency used for `shadcn build` and `registry validate`. Fixture installs in CI (§11.6). Items use stable types only (`registry:item`, `registry:block`, `registry:component`, `registry:ui`, `registry:file`). |
| shadcn tooling assumes Tailwind (`init` refuses non-Tailwind projects, E4) | High | Low | Ship a universal `@nizivo/init` item that writes `components.json` (E6). For one-offs, document URL + `--path` installs (E1/E2). |
| The adapter leaks engine behaviour: focus, typeahead and dismiss rules differ subtly across engines | Medium | High (a11y) | Engine-agnostic contract tests (ARIA tree, APG keyboard map, focus return), plus Guidepup screen-reader runs on Select, Menu, Dialog and Tabs (r5). Swap behind a canary release. |
| The `render` function form is used from an RSC parent on a client part, causing a serialization error | Medium | Low | Document per part. Provide element-form examples first. Type-level hint: a `@remarks client-only` JSDoc tag on function overloads. |
| Ejected CSS (L3) drifts from new markup when a minor adds a part | Medium | Medium | New parts must degrade gracefully unstyled. Release notes list new parts and hooks. `--diff` can't help non-components.json users, so publish a per-release "CSS contract diff" generated from the manifest. |
| Fixed versioning causes "empty" bumps for charts/lab-only changes | High | Low | Acceptable pre-1.0. Re-evaluate `linked` after 1.0. |
| TS augmentation silently fails through re-exports | Medium | Medium | Single `augment` module plus expect-type tests through every export path (r5 type tests). |
| Fragmentation: many divergent forks (L4) create support load | Medium | Medium | Keep the L4 set small and labelled. Issue templates ask "npm or registry fork?" |
| npm token restrictions (2FA-bypass tokens restricted: account changes Aug 2026, direct publishing Jan 2027, per the brief's banner) | Certain | High if ignored | Trusted publishing (OIDC) from GitHub Actions, as recommended in r5. The registry is static hosting and isn't affected. |
| Figma prefix `grove` leaking into code | Medium | Medium | The token generator renames `grove` → `nz` at build (§12). Lint for `grove` in `packages/**`. |

---

## 11. Implementation notes and config snippets

### 11.1 Repo layout

```
nizivo/
├─ packages/
│  ├─ tokens/                 # @nizivo/tokens: generated from Figma (other report owns the pipeline)
│  ├─ react/                  # @nizivo/react
│  │  └─ src/
│  │     ├─ internal/         # merge-props, render-element, use-controllable-state, warn-once
│  │     ├─ primitives/       # ← ONLY place importing @base-ui/react (adapter)
│  │     ├─ augment.ts        # interface maps (types only)
│  │     ├─ config/           # NizivoConfig (optional)
│  │     ├─ button/           # button.tsx, button.css, button.contract.test.tsx, button.example.tsx
│  │     ├─ select/           # select.parts.tsx, index.parts.ts, index.ts, select.css, …
│  │     └─ unstable/
│  ├─ charts/  motion/  lab/
│  └─ codemod/                # later
├─ registry/
│  ├─ registry.json           # root (name, homepage, include)
│  ├─ patterns/registry.json  # plan-card, order-row, shipment-tracker, storefront-*
│  ├─ css/registry.json       # <component>-css re-skin items (paths point into packages/react/src)
│  ├─ themes/registry.json
│  └─ patterns/<name>/*.tsx|css
├─ apps/docs/                 # Fumadocs (r5); serves /r/*.json and /r/v{x.y}/*.json
└─ fixtures/                  # r5 framework apps + registry-install fixtures
```

### 11.2 `@nizivo/react` package.json (relevant parts)

```json
{
  "name": "@nizivo/react",
  "version": "0.4.0",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".":              { "types": "./dist/index.d.ts",          "default": "./dist/index.js" },
    "./augment":      { "types": "./dist/augment.d.ts",        "default": "./dist/augment.js" },
    "./config":       { "types": "./dist/config/index.d.ts",   "default": "./dist/config/index.js" },
    "./unstable/*":   { "types": "./dist/unstable/*/index.d.ts", "default": "./dist/unstable/*/index.js" },
    "./styles.css":   "./dist/styles.css",
    "./css/*":        "./dist/css/*",
    "./*":            { "types": "./dist/*/index.d.ts",        "default": "./dist/*/index.js" },
    "./package.json": "./package.json"
  },
  "peerDependencies": { "react": "^19.2.0", "react-dom": "^19.2.0" },
  "dependencies": { "@nizivo/tokens": "workspace:*", "@base-ui/react": "^1.9.0" }
}
```

- `"./*"` is listed last so specific keys win.
- `@base-ui/react` is a **dependency**, not a peer: the engine is an implementation detail. Consumers who also use Base UI directly may get two copies. That is acceptable because Nizivo never shares engine context with consumer code. Revisit if size-limit flags it (r5).
- Base UI 1.9.0's own peers `date-fns ^4` and `@date-fns/tz ^1.2` are marked `optional: true` in `peerDependenciesMeta` (EMPIRICAL, tarball `package.json`). Depending on it therefore puts no date library and no unmet-peer warning on Nizivo consumers.

### 11.3 Changesets (fixed group)

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "fixed": [["@nizivo/*"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@nizivo/docs", "@nizivo/fixtures-*"]
}
```

(The `$schema` URL and field names are from Changesets 2.x. Confirm them against 3.0.3 before use: UNVERIFIED.)

### 11.4 Registry source and consumer config

```json
// registry/registry.json  (root; built by `shadcn build -o apps/docs/public/r`)
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "nizivo",
  "homepage": "https://ui.nizivo.dev",
  "include": ["patterns/registry.json", "css/registry.json", "themes/registry.json"],
  "items": [
    {
      "name": "init",
      "type": "registry:item",
      "title": "Nizivo registry setup (works without Tailwind)",
      "files": [{ "path": "setup/components.json", "type": "registry:file", "target": "~/components.json" }]
    }
  ]
}
```

`ui.nizivo.dev` is a placeholder domain and has not been checked.

Consumer, Tailwind or not, after `npx shadcn@latest add https://ui.nizivo.dev/r/init.json` (EMPIRICAL E6 pattern), or a hand-written file. (`"rsc": true` is believed to make the CLI keep `'use client'` directives in copied TSX. That is harmless in Vite and needed in Next.js. UNVERIFIED: not exercised in E1–E7.)

```json
// components.json (consumer)
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "src/styles/global.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "ui": "@/components/ui", "lib": "@/lib", "utils": "@/lib/utils", "hooks": "@/hooks" },
  "registries": {
    "@nizivo": "https://ui.nizivo.dev/r/v0.4/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @nizivo/plan-card          # L2 recompose
npx shadcn@latest add @nizivo/button-css         # L3 re-skin
npx shadcn@latest add https://ui.nizivo.dev/r/plan-card.json --path src/ui   # no components.json at all (universal items only)
```

Directory listing:
1. Add `@nizivo` to `apps/v4/registry/directory.json` in `shadcn-ui/ui`.
2. Run `pnpm validate:registries`.
3. Open a PR.

Requirements: open source, flat, and no `content` in `files` ([registry index](https://ui.shadcn.com/docs/registry/registry-index)). Once listed, `shadcn add @nizivo/x` works without the `registries` entry.

**GitHub fallback (zero hosting):** a root `registry.json` in the public repo makes `npx shadcn add <org>/<repo>/<item>` work. There is no documented ref or tag pinning ([GitHub registries](https://ui.shadcn.com/docs/changelog/2026-06-github-registries)), so prefer the versioned URL template for reproducibility.

### 11.5 Layer boundaries (dependency-cruiser)

```js
// .dependency-cruiser.cjs (excerpt)
module.exports = {
  forbidden: [
    { name: 'engine-only-in-adapter', severity: 'error',
      from: { path: '^packages/react/src/(?!primitives/)' },
      to:   { path: 'node_modules/(@base-ui|react-aria-components|radix-ui|@radix-ui)/' } },
    { name: 'no-css-from-js', severity: 'error',
      from: { path: '^packages/.+\\.(t|j)sx?$' }, to: { path: '\\.css$' } },
    { name: 'heavy-packages-use-public-entries', severity: 'error',
      from: { path: '^packages/(charts|motion|lab)/' }, to: { path: '^packages/react/src/(internal|primitives)/' } },
    { name: 'registry-uses-public-api-only', severity: 'error',
      from: { path: '^registry/' }, to: { path: '^packages/.+/src/(internal|primitives)/' } }
  ]
};
```

Add a post-pack check that `grep -R "@base-ui" dist/**/*.d.ts` matches only `dist/primitives/**`, and that no public `.d.ts` re-exports from there.

### 11.6 CI: keep registry and npm from drifting

1. `shadcn registry validate`, then `shadcn build` with a **pinned** shadcn devDependency.
2. For each registry item:
   - Create a temp fixture: Vite + React, **no Tailwind**, with the universal `init` item.
   - `npm i` the **packed** `@nizivo/*` tarballs.
   - `shadcn add <built item json>`.
   - `tsc --noEmit` and `vite build`.
   - Smoke render in the browser (r5 Vitest browser mode).
3. The same with a Tailwind v4 fixture, to catch layer-order issues (r2).
4. Re-skin items: assert that the copied CSS file is byte-identical to `packages/react/src/<c>/<c>.css` at that release.
5. Write `/r/v{major}.{minor}/` on release only, never overwriting an existing snapshot.

### 11.7 Contract test sketch (engine-agnostic)

```tsx
// select.contract.test.tsx (Vitest browser mode, r5)
test('select-only combobox contract', async () => {
  render(<Fixture />);                                   // uses public API only
  const trigger = page.getByRole('combobox', { name: 'Range' });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.keyboard('{ArrowDown}');               // APG: opens + highlights
  await expect.element(page.getByRole('listbox')).toBeVisible();
  await expect.element(trigger).toHaveAttribute('data-open', '');
  await userEvent.keyboard('{End}{Enter}');
  await expect.element(trigger).toHaveTextContent('Last 30 days');
  await expect.element(trigger).toHaveFocus();          // focus returns
  expect(onValueChange).toHaveBeenCalledWith('30d', expect.objectContaining({ reason: expect.any(String) }));
});
```

### 11.8 Commands used for the EMPIRICAL results

```bash
# E1/E2/E7: universal item, no Tailwind, no components.json
cd scratchpad/r8/shadcn-test/consumer
npx -y shadcn@4.21.4 add ../registry/button-item.json --yes
npx -y shadcn@4.21.4 add ../registry/button-item-3.json --yes --path app/ui
npx -y shadcn@4.21.4 add ../registry/button-item-v2.json --yes          # → overwrite? (y/N) → skipped
# E3: registry:ui without components.json → prompt to create components.json
npx -y shadcn@4.21.4 add ../registry/button-ui.json --yes
# E4: init in Vite+React without Tailwind → "No Tailwind CSS configuration found"
cd ../vite-consumer && npx -y shadcn@4.21.4 init --defaults --yes
# E5: hand-written components.json (no Tailwind) → registry:ui installs
npx -y shadcn@4.21.4 add ../registry/nz-button-ui.json --yes
# E6: universal item writes ~/components.json, then registry:ui installs
cd ../vite2 && npx -y shadcn@4.21.4 add ../registry/nizivo-init.json --yes && npx -y shadcn@4.21.4 add ../registry/nz-button-ui.json --yes
# Tarball inspections
curl -sL <tarball of @heroui/styles@3.2.6> | tar xz     # BEM classes, @apply, --button-bg assigned
curl -sL <tarball of @radix-ui/themes@3.3.0> | tar xz   # rt-variant-* classes, no @layer, Theme context throws
curl -sL <tarballs of @radix-ui/react-slot@1.5.0, @radix-ui/react-use-controllable-state@1.3.0>
```

---

## 12. Open questions

1. **Which primitive engine** (Base UI, React Aria or Radix) is owned by another research topic. This architecture works with any of them. Only `src/primitives/*` and the contract-test expectations around engine-specific details (e.g. RAC's `client-only`, r1) change.
2. **Prefix configurability.** The token snapshot says "every `grove` prefix … must become configurable (e.g. `--nz-`)". This report reads that as a **build-time rename `grove` → `nz`**, fixed for consumers. If the owner wants a consumer-configurable prefix (micro-frontends or two versions on one page), the option is a published "prefix rewrite" build step (Lightning CSS visitor), not a runtime prop. That needs a decision.
3. **Final package names** need reconciling across r1, r2, the Figma notes and this report. Proposal: `@nizivo/react` and `@nizivo/tokens`; layer `nz`.
4. **Default Button variant.** Figma's default is Primary, but the guidance says "Secondary for everything else". This report's sketch defaults to `secondary`. A design decision.
5. **Should patterns ever become npm?** Proposed graduation criteria: API unchanged for 2 minors, used in ≥ 2 internal products, and no open design questions in Figma. Then the item moves to `@nizivo/react/<name>` (or `@nizivo/commerce`) and the registry item becomes a thin re-export.
6. **Registry hosting domain** (`ui.nizivo.dev` is a placeholder) and whether to list in the shadcn directory from v0.1 or wait for 1.0.
7. **Changesets 3.x config schema** for `fixed` groups (UNVERIFIED; written from 2.x knowledge).
8. **`shadcn add --diff` on a real update** was not exercised (E8). If it produces a useful diff for path-based items, recommend it in the "updating ejected code" docs.

---

## 13. Sources

**npm registry** (versions and dates, queried 2026-10-14): `https://registry.npmjs.org/` +
- shadcn, @base-ui/react, radix-ui
- @radix-ui/react-slot, @radix-ui/react-use-controllable-state, @radix-ui/themes
- @mantine/core, @mantine/hooks
- @chakra-ui/react, @chakra-ui/cli, @ark-ui/react, @park-ui/cli
- @heroui/react, @heroui/styles, heroui-cli
- react-aria-components, react-aria, @react-aria/i18n, @internationalized/date
- untitledui, @tremor/react, @mui/material
- class-variance-authority, cva, tailwind-variants, tailwind-merge, cn, clsx
- @shadcn/helpers, @zag-js/react, @base-ui/utils
- jscodeshift, @ast-grep/cli, codemod, @codemod.com/jssg-types
- @changesets/cli, dependency-cruiser, eslint-plugin-boundaries, knip, publint, @arethetypeswrong/cli, stylelint-use-logical

**shadcn:**
- Changelog: https://ui.shadcn.com/docs/changelog
- Entries:
  - [cli-v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
  - [base-ui-default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
  - [react-aria](https://ui.shadcn.com/docs/changelog/2026-07-react-aria)
  - [eject](https://ui.shadcn.com/docs/changelog/2026-05-shadcn-eject)
  - [package-imports-target-aliases](https://ui.shadcn.com/docs/changelog/2026-05-package-imports-target-aliases)
  - [registry-include](https://ui.shadcn.com/docs/changelog/2026-05-registry-include)
  - [shadcn-apply](https://ui.shadcn.com/docs/changelog/2026-04-shadcn-apply)
  - [component-composition](https://ui.shadcn.com/docs/changelog/2026-04-component-composition)
  - [github-registries](https://ui.shadcn.com/docs/changelog/2026-06-github-registries)
  - [private-github-registries](https://ui.shadcn.com/docs/changelog/2026-08-private-github-registries)
  - [cn](https://ui.shadcn.com/docs/changelog/2026-09-cn)
  - [universal-registry](https://ui.shadcn.com/docs/changelog/2025-07-universal-registry)
  - [unified radix-ui](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)
- Registry docs:
  - [overview](https://ui.shadcn.com/docs/registry)
  - [namespace](https://ui.shadcn.com/docs/registry/namespace)
  - [registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json)
  - [registry index](https://ui.shadcn.com/docs/registry/registry-index)
  - [examples](https://ui.shadcn.com/docs/registry/examples)
- CLI: https://ui.shadcn.com/docs/cli

**Base UI:**
- [composition](https://base-ui.com/react/handbook/composition)
- [useRender / mergeProps](https://base-ui.com/react/utils/use-render)
- [styling](https://base-ui.com/react/handbook/styling)
- [select](https://base-ui.com/react/components/select)
- [direction provider](https://base-ui.com/react/utils/direction-provider)

**Mantine:**
- [9.0 changelog](https://mantine.dev/changelog/9-0-0/)
- [Styles API](https://mantine.dev/styles/styles-api/)
- [polymorphic](https://mantine.dev/guides/polymorphic/)
- [unstyled](https://mantine.dev/styles/unstyled/)
- [data attributes](https://mantine.dev/styles/data-attributes/)
- [getting started](https://mantine.dev/getting-started/)

**Chakra / Ark / Park:**
- [Chakra CLI](https://chakra-ui.com/docs/get-started/cli)
- [installation](https://chakra-ui.com/docs/get-started/installation)
- [slot recipes](https://chakra-ui.com/docs/theming/slot-recipes)
- [Ark composition](https://ark-ui.com/docs/guides/composition)
- [Park UI home](https://park-ui.com/)
- [Park UI joins Chakra org](https://park-ui.com/blog/park-ui-joins-the-chakra-ui-organization)

**HeroUI:**
- [InfoQ on v3](https://www.infoq.com/news/2026/07/heroui-v3-rewrite/)
- [v3 getting started](https://heroui.com/en/docs/react/getting-started) (returned 404 to the fetcher; claims rely on InfoQ and tarball inspection)

**Radix:**
- [primitives repo](https://github.com/radix-ui/primitives)
- [Themes releases](https://github.com/radix-ui/themes/releases)
- [Themes getting started](https://www.radix-ui.com/themes/docs/overview/getting-started)
- [Themes theme overview](https://www.radix-ui.com/themes/docs/theme/overview)

**React Aria:** [customization](https://react-aria.adobe.com/customization.md)

**React:**
- [forwardRef](https://react.dev/reference/react/forwardRef)
- ['use client' serializable types](https://react.dev/reference/rsc/use-client#serializable-types)

**Untitled UI:** [CLI](https://www.untitledui.com/react/docs/cli)

**Tremor:**
- [installation](https://tremor.so/docs/getting-started/installation)
- [Vercel acquires Tremor](https://vercel.com/blog/vercel-acquires-tremor)

**MUI:**
- [migrating from deprecated APIs](https://next.mui.com/material-ui/migration/migrating-from-deprecated-apis/)
- [system v9 upgrade](https://mui.com/system/migration/upgrade-to-v9/)

**Codemod:**
- [registry](https://docs.codemod.com/platform/registry)
- [CLI](https://docs.codemod.com/cli)
- [repo](https://github.com/codemod/codemod)

**DTCG:**
- [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)
- [stable announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)

**Versioning guidance (secondary):**
- [EightShapes, Versioning Design Systems](https://medium.com/eightshapes-llc/versioning-design-systems-48cceb5ace4d)
- [Steve Kinney, Versioning and Release Management](https://stevekinney.com/courses/enterprise-ui/versioning-and-release-management)

**Sibling reports (local):**
- `scratchpad/research/r1-framework-compat.md`
- `scratchpad/research/r2-styling.md`
- `scratchpad/research/r5-quality-docs.md`
- `scratchpad/figma/00-tokens-and-styles.md`
- `scratchpad/figma/02-actions-forms.md`
