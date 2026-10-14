# R1: Framework compatibility for Nizivo UI (`@nizivo/*`)

React 19.x and the React Compiler, Server Components, Next.js App Router, Astro islands, React Router, TanStack Start, Vite SSR

Research date: 2026-10-14. Versions were checked against the npm registry and primary docs on that date. Claims marked **UNVERIFIED** could not be confirmed from a primary source. Claims marked **EMPIRICAL** come from local tests run for this report; the commands are in §11.

---

## 0. TL;DR (decisions)

| # | Decision | Recommendation | Confidence |
|---|---|---|---|
| D1 | React peer range | `react` / `react-dom` **`^19.2.0`** for core packages. Opt-in heavy modules (motion/3D lab) may require **`^19.3.0`**. Do not support React 18. | High |
| D2 | Ship React Compiler output? | **Not in v0.x.** Write code that passes the compiler's lint rules (eslint-plugin-react-hooks 7.x). Later, compile **only `*.client.tsx` files**. Never compile server-safe modules: the compiled code crashes under `react-server` (EMPIRICAL). | Medium-high |
| D3 | Keeping `'use client'` through the build | Put a per-file directive in source and build **unbundled** (tsdown `unbundle: true`, which means preserveModules). No `banner`. A single-entry `'use client'` is not allowed. Add a CI check on directives. | High |
| D4 | Module format | **ESM-only** (`"type": "module"`, `exports` map, fully specified `.js` specifiers). No CJS twin, which avoids the dual-package and duplicate-context hazard. | High |
| D5 | Compound components across the RSC boundary | **No static properties** (`Menu.Item = …`). Use a namespace re-export (`export * as Dialog from './parts'`, the Base UI pattern) **plus** flat named exports (`DialogRoot`, `DialogTrigger`). | High |
| D6 | Import surface | **Per-component subpath exports** as the main style (`@nizivo/react/button`), plus a root barrel. Set `"sideEffects": ["**/*.css"]`. Neither `transpilePackages` nor `optimizePackageImports` is needed. | High |
| D7 | CSS delivery (packaging only) | **Published JS never imports CSS.** Ship static `.css` files that consumers import once: an all-in-one file and a per-component file, both in `@layer nizivo.*`. This avoids `ssr.noExternal`, `transpilePackages` and Astro config. | High |
| D8 | Theme flash | **CSS first**: `color-scheme: light dark` with `light-dark()` tokens and a `[data-nz-theme]` override give no flash and need no JS. For a persisted override, ship a **tiny blocking inline script string** plus a server-safe `<ThemeScript>`, or let SSR apps set the attribute from a cookie. Do not depend on next-themes. | High |
| D9 | Overlays and portals | **Top-layer first**: native `popover` / `<dialog>` render in place and work with SSR. Use `createPortal` only as an opt-in fallback after mount. All transient overlays close in a `useLayoutEffect` cleanup so they cooperate with Activity. | Medium-high |
| D10 | Cross-tree state (toasts, theme, global config) | Use an **external store** (`useSyncExternalStore`) plus **CSS variables and data attributes**. Do not require a Provider. Context is for intra-compound wiring only. | High |

The test that ties all of this together is a CI job asserting two things. Every server-safe entry must `import()` cleanly in plain Node under `--conditions=react-server`. Every entry must also load and render in plain Node under the default condition. Passing both means consumers need **no** `transpilePackages`, `ssr.noExternal`, `serverExternalPackages` or `optimizePackageImports`. That zero-config setup is the strongest compatibility claim the library can make.

---

## 1. State of the art (versions and dates)

Sources are the npm registry `latest` dist-tags and publish times (`https://registry.npmjs.org/<pkg>`), queried 2026-10-14, cross-checked against official posts.

| Package | Latest | Published | Notes |
|---|---|---|---|
| react / react-dom | **19.3.0** | 2026-09-09 | Stable `<ViewTransition>`, Fragment refs, `browser()`, Trusted Types, `<Context>` renderable from Server Components ([react.dev blog](https://react.dev/blog/2026/09/09/react-19-3), [GitHub releases](https://github.com/react/react/releases)). Backports 19.2.8 / 19.1.9 / 19.0.8 shipped 2026-07-21. No React 20 has been announced. |
| babel-plugin-react-compiler | **1.0.0** | 2025-10-07 | React Compiler 1.0 stable ([blog](https://react.dev/blog/2025/10/07/react-compiler-1)). `react-compiler-runtime@1.0.0` is for targets 17 and 18. |
| eslint-plugin-react-hooks | 7.1.1 | 2026-04-17 | Compiler-powered rules ship in its `recommended` / `recommended-latest` presets ([blog](https://react.dev/blog/2025/10/07/react-compiler-1)). |
| next | **16.4.0** | 2026-10-06 | Turbopack is the default bundler (since 16.0). `reactCompiler` is stable but opt-in. Cache Components / PPR. The experimental Rust React Compiler arrived in 16.3 ([16.0](https://nextjs.org/blog/next-16), [16.3 Turbopack](https://nextjs.org/blog/next-16-3-turbopack), [v16.4.0 release](https://github.com/vercel/next.js/releases/tag/v16.4.0)). Peer `react: ^18.2.0 \|\| ^19.0.0`, but the App Router uses Next's built-in React canary ([Next 16 blog](https://nextjs.org/blog/next-16#react-192-and-canary-features)). |
| astro | **7.3.8** | 2026-10-08 | Astro 7.0 (2026-06-22) brought a Rust `.astro` compiler and Vite 8/Rolldown ([blog](https://astro.build/blog/astro-7/), [InfoQ](https://www.infoq.com/news/2026/08/astro-7-release-speed/)). |
| @astrojs/react | **7.0.1** | 2026-10-06 | Moved to `@vitejs/plugin-react` v6 (Oxc). The Babel option was removed. Adds an opt-in Oxc React Compiler option ([release](https://github.com/withastro/astro/releases/tag/%40astrojs/react%407.0.0), [docs](https://docs.astro.build/en/guides/integrations-guide/react/)). Peer React 17–19. |
| react-router | **8.4.0** | 2026-09-15 | **v8 is current**; the 7.x line is at 7.18.4. v8 requires `react@19.2.7+`, `node@22.22+`, and Vite 7+ for framework mode. RSC is still unstable ([upgrade guide](https://reactrouter.com/upgrading/v7), [changelog](https://reactrouter.com/changelog)). |
| @tanstack/react-start | **1.169.1** | 2026-10-13 | Peer `react >=18`, `vite >=8`. RSC is **experimental** and opt-in through `@vitejs/plugin-rsc`, needs React 19+ ([docs](https://tanstack.com/start/latest/docs/framework/react/guide/server-components)). |
| vite | **8.3.4** | 2026-10-08 | Rolldown-based. SSR externalizes deps by default ([SSR guide](https://vite.dev/guide/ssr)). |
| @vitejs/plugin-react | 6.1.2 | 2026-10-05 | Babel is no longer bundled. The React Compiler runs through `@rolldown/plugin-babel` + `reactCompilerPreset()` ([README](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md)). |
| tsdown / rolldown | 0.23.1 / 1.2.13 | 2026-10-10 / 2026-10-07 | `unbundle` mode does a 1:1 source-to-output build ([docs](https://tsdown.dev/options/unbundle)). |
| typescript | 7.0.2 | 2026-07-08 | Native (Go) compiler line. Relevant to `.d.ts` emit and attw/publint (owned by another research topic). |

How much React 18 is still in use: on npm last week, React 19.x was about **73.8%** of downloads (19.2 at 47.1%, 19.3 at 21.6%, 19.1 at 3.7%, 19.0 at 1.4%). **React 18 was 22.6%**, React 17 was 1.7% and React 16 was 1.5% ([api.npmjs.org/versions/react/last-week](https://api.npmjs.org/versions/react/last-week), queried 2026-10-14). Downloads include CI and transitive installs, so they are a proxy only.

---

## 2. React 19.x: what it means for a component library

### 2.1 `ref` as a regular prop, and `forwardRef`
- Since React 19, function components receive `ref` as a prop. `forwardRef` "is no longer necessary" and "**will be deprecated in a future release**". No version or date is given ([forwardRef docs](https://react.dev/reference/react/forwardRef)).
- Library rule: author `function Button({ ref, ...props }: ButtonProps)` with `ref?: React.Ref<HTMLButtonElement>`. Do not use `forwardRef`. This alone rules out React 18, because there `ref` is stripped from props.
- React 19 ref callbacks may return a cleanup function. Use it for observers and listeners attached to DOM nodes. Next's own guide uses this to reset forms when Activity hides them ([Next preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state)).
- React 19.3 **Fragment refs** (`<Fragment ref>` giving a `FragmentInstance` with `focus`, `focusLast`, `observeUsing`, `addEventListener`) let a library attach focus management and observers to children it does not own, with no wrapper `<div>` ([19.3 post](https://react.dev/blog/2026/09/09/react-19-3)). These are good for RovingFocus, FocusScope and "click outside", but they need a **19.3** floor (see D1).

### 2.2 Context, `use()`
- `<Context value>` replaces `<Context.Provider>` (React 19). In 19.3, **Server Components can render a Context** imported from a `'use client'` module ([19.3 post](https://react.dev/blog/2026/09/09/react-19-3)). Server Components still **cannot read** context. Any configuration that server-safe components need must therefore arrive as props, CSS variables or data attributes, not through context.
- `use(promise)` and `use(context)` are both usable. `use(context)` can be called conditionally, which helps optional providers.

### 2.3 Actions, `<form action>`, `useActionState`, `useFormStatus`
- Server and client Actions passed to `<form action>` work without a Client Component when the browser does the work. Next's boundary guide explicitly lists "a `<form>` can submit through a Server Function passed to its `action` prop" as interactivity that needs no client JS ([Next boundary guide](https://nextjs.org/docs/app/guides/server-and-client-boundary)).
- Library implications:
  - `Button`, `Input`, `Checkbox`, `Select` and the rest must be **real form controls**: native `name`/`value`/`form` attributes and a hidden `<input>` for custom controls such as Switch and Select. This lets `FormData` and progressive enhancement work with React Actions, Astro Actions (`withState`, `getActionState` in [@astrojs/react](https://docs.astro.build/en/guides/integrations-guide/react/)) and React Router / TanStack server functions.
  - A `SubmitButton` (client) may read `useFormStatus()` to show a pending state automatically. Keep it a separate export so the plain `Button` stays server-safe.
  - React 19.3 fires `onReset` after a Server Action auto-reset and includes `submitter` in `submit` events ([19.3 post](https://react.dev/blog/2026/09/09/react-19-3)). Controlled custom inputs must listen for form `reset` and go back to their default value.

### 2.4 `useId`
- The format has changed twice: `:r:` in 19.0, `«r»` in 19.1, and **`_r_`** since 19.2, so that IDs are valid for `view-transition-name` and XML names ([19.2 post](https://react.dev/blog/2025/10/01/react-19-2)). The docs specify **no format** ([useId](https://react.dev/reference/react/useId)). Never parse ids or build CSS selectors from them. Sanitize if one is used as a dashed-ident, for example for `anchor-name`.
- With SSR, `useId` "requires an identical component tree on the server and the client". It **cannot be used in async Server Components**. Multiple roots need a per-root `identifierPrefix` ([useId](https://react.dev/reference/react/useId)).
- Astro is already safe here. **EMPIRICAL / verified in source:** `@astrojs/react@7.0.1` passes a per-island `identifierPrefix` to both server rendering (`dist/server.js`, `identifierPrefix: prefix`) and `hydrateRoot` (`dist/client.js`, `identifierPrefix: element.getAttribute("prefix")`). So two form fields in two islands will not collide.
- Library rule: every a11y id (`aria-labelledby`, `aria-describedby`, `aria-controls`) comes from `useId()` and can be overridden by an `id` prop. Server-safe components cannot call hooks, so a server-safe `Field` must take explicit ids or render label wrapping (`<label><input/></label>`).

### 2.5 `<Activity>` (stable since 19.2) and Next.js navigation
- In hidden mode Activity applies `display: none`, **destroys Effects** and keeps state and DOM. The docs say to treat hidden content as unmounted and to use `useLayoutEffect` for cleanup that is tied to visibility ([Activity](https://react.dev/reference/react/Activity)).
- With `cacheComponents: true`, **Next.js 16 wraps routes in Activity** and keeps up to 3 routes hidden instead of unmounting them ([cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents), [preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state)). Next's guidance is effectively a requirement for the library:
  - Transient overlays (Menu, Popover, Tooltip, Select listbox, Combobox, context menu) must **close in a `useLayoutEffect` cleanup**. This is safe only for state that defaults to closed and was opened by the user. Gate it on a ref, because Strict Mode runs setup, cleanup, setup on mount (§11.8).
  - Scroll locks, `inert` on siblings, focus traps and global listeners must release in a layout-effect cleanup. Otherwise a hidden route leaves the visible page locked.
  - Global `<style>` or CSS variables injected by a component must be disabled when hidden. Next suggests toggling `media="not all"`.
  - Next advises against broad `:root:has(...)` selectors and recommends React-owned `data-*` attributes, for example `html[data-modal-open]`.
  - Dialogs that run "on open" logic, such as autofocus, must re-run it when they become visible again.
- React 19.3 also **double-invokes Effects during hydration in Strict Mode** ([19.3 post](https://react.dev/blog/2026/09/09/react-19-3)). Every effect must be idempotent: use reference-counted scroll lock and inert, and avoid duplicate live-region announcements.

### 2.6 `useEffectEvent` (stable since 19.2)
Use it for non-reactive callbacks inside effects, for example `onOpenChange` inside a document listener. This removes most `useRef(callback)` "latest ref" patterns. 19.3 fixed `useEffectEvent` inside `forwardRef`/`memo` ([19.3 post](https://react.dev/blog/2026/09/09/react-19-3)).

### 2.7 Metadata, stylesheet and `<style>` hoisting with `precedence`
- Document metadata: React 19 hoists `<title>`, `<meta>` and `<link>` rendered anywhere. **Library components never render `<title>` or `<meta>`**, because metadata belongs to the app or framework (Next `metadata`, React Router `meta`, Astro head). The only head-bound output the library emits is the optional `<ThemeScript>` (§11.7) and, for heavy modules, a `<style href precedence>`.
- `<link rel="stylesheet" precedence>` and `<style href precedence>` are hoisted to `<head>` and de-duplicated by `href`. Ordering follows the first-seen precedence. React may leave the element in the DOM after unmount, and it **drops extra props** ([style docs](https://react.dev/reference/react-dom/components/style)). Next confirms `<link rel="stylesheet">` is usable in React 19 ([Next CSS](https://nextjs.org/docs/app/getting-started/css)).
- Library use: this is **not** the primary CSS channel (see D7). A component cannot know the public URL of a CSS file across bundlers, and inline `<style>` text costs JS bytes. It is a good fallback for **self-contained heavy modules** such as the shader/3D lab and Instagram storefront embeds, which can inline a small `<style href="nz-lab-v1" precedence="nizivo">`. Because these elements can linger after unmount, scope their selectors to the module's root class.
- Inline `<script>` is not de-duplicated or hoisted ([script docs](https://react.dev/reference/react-dom/components/script)). React 19.x logs a dev-only "Encountered a script tag while rendering React component" error when a `<script>` is **client-rendered**, for example on a remount. This is the well-known next-themes false positive ([next-themes #387](https://github.com/pacocoursey/next-themes/issues/387), [#397](https://github.com/pacocoursey/next-themes/issues/397), [shadcn #10104](https://github.com/shadcn-ui/ui/issues/10104)). This shapes D8.

### 2.8 React 19.3 additions worth designing for
- **`browser()`** (react-dom): `use(browser(reason?))` makes a component browser-only during SSR. The nearest `<Suspense>` fallback is emitted, and **a Suspense boundary is required** ([browser docs](https://react.dev/reference/react-dom/browser)). This is the correct primitive for the 3D/shader lab, for "relative time since now" and for anything that reads `localStorage`. It replaces `useEffect(() => setMounted(true))` hacks and `next/dynamic({ ssr: false })`. It needs a 19.3 floor, so keep it in the opt-in lab package, or feature-detect it through a namespace import (`import * as ReactDOM from 'react-dom'; const browser = (ReactDOM as any).browser`).
- **`<ViewTransition>`** is stable. It animates only Transitions, Suspense reveals and `useDeferredValue`, and it is DOM-only for now. It is a candidate for Tabs, Segmented control and Toast stack motion, but it is coupled to `startTransition`, so make it opt-in.
- **Trusted Types:** React no longer stringifies TrustedHTML/Script/ScriptURL. The ThemeScript helper should accept a `TrustedScript` (via `nonce`) under strict CSP.

### 2.9 React Compiler 1.0: should the library ship compiled output?
- React's official guidance is that library authors *may* compile before publishing ("performance improvements for all users… no configuration required"). Targets below 19 need `react-compiler-runtime` as a **dependency** ([compiling libraries](https://react.dev/reference/react-compiler/compiling-libraries), [target](https://react.dev/reference/react-compiler/target)). App pipelines do not compile `node_modules`: the tsdown and plugin-react presets skip `node_modules` by default ([tsdown React recipe](https://tsdown.dev/recipes/react-support)).
- **There is a blocking problem for RSC-mixed libraries.**
  - **EMPIRICAL:** under `node --conditions=react-server` with `react@19.3.0`, `react` resolves to `react.react-server.js`. That module exposes only `__SERVER_INTERNALS_…`. `react/compiler-runtime` maps `react-server` to the same file, which reads `__CLIENT_INTERNALS_….H`. Calling `c(1)` throws **`TypeError: Cannot read properties of undefined (reading 'H')`**.
  - So **any compiled component without `'use client'` crashes when rendered as a Server Component**. This matches the still-**open** [react/react#31702](https://github.com/facebook/react/issues/31702). There the maintainer says the compiler "is not supported in a React Server environment" and suggests separate compiled and uncompiled entries. Commenters report that the conditional-exports workaround produced **duplicate contexts**.
- What the market does: **EMPIRICAL:** 0 of 7 inspected tarballs ship compiler output. Checked: `@base-ui/react@1.9.0`, `@radix-ui/react-dialog@1.3.1`, `@mantine/core@9.7.2`, `@mui/material@9.5.0`, `@heroui/react@3.2.6`, `@ark-ui/react@5.39.3`, `react-aria-components@1.22.1`. None references `compiler-runtime`.
- **Decision (D2):** ship uncompiled source in v0.x. Write code that passes the compiler's rules: eslint-plugin-react-hooks 7.x `recommended-latest` and no mutation during render. Keep the `*.client.tsx` naming convention (§4.1) so that phase 2 is a config flip that compiles only client modules with `target: '19'`. Next.js app authors can turn on `reactCompiler: true` themselves. Whether Next applies it to `node_modules` is **UNVERIFIED** (likely not).

---

## 3. Peer-dependency policy (React 18 or not?)

Peer ranges from npm `latest` manifests, 2026-10-14:

| Library | Version | `react` peer |
|---|---|---|
| Radix (`radix-ui`, `@radix-ui/*`) | 1.8.1 | `^16.8 \|\| ^17 \|\| ^18 \|\| ^19` |
| React Aria Components | 1.22.1 | `^16.8 \|\| ^17 \|\| ^18 \|\| ^19` |
| Base UI (`@base-ui/react`) | 1.9.0 | `^17 \|\| ^18 \|\| ^19` |
| MUI (`@mui/material`) | 9.5.0 | `^17 \|\| ^18 \|\| ^19` |
| Headless UI | 2.2.10 | `^18 \|\| ^19` |
| Ark UI / Chakra v3 | 5.39.3 / 3.37.0 | `>=18` |
| TanStack Start | 1.169.1 | `>=18` |
| **Mantine** | 9.7.2 | **`^19.2.0`** |
| **HeroUI** | 3.2.6 | **`>=19.0.0`** |
| **React Router** | 8.4.0 | **`>=19.2.7`** |
| Next.js | 16.4.0 | `^18.2 \|\| ^19` (App Router uses built-in canary) |

How to read this: the incumbents (Radix, Base UI, MUI, RAC) keep wide ranges because they have years of installed base. The newer or freshly majored libraries (Mantine 9, HeroUI 3, React Router 8) moved to 19-only. Nizivo has **no installed base**, and it ships in late 2026.

What actually sets the floor is **what the library imports**, not the `package.json` range. A static named import that does not exist in an older minor fails when native ESM links, or when the bundler checks the import:
- 19.0: `ref`-as-prop, `<Context value>`, `use`, `useActionState`, `useFormStatus`, `useOptimistic`, `<style precedence>`
- 19.2: `Activity`, `useEffectEvent`, the `_r_` id format, batched SSR Suspense reveals
- 19.3: `browser()`, stable `ViewTransition`, Fragment refs, `<Context>` rendered from Server Components

**Decision (D1):**
- Core packages use `"react": "^19.2.0", "react-dom": "^19.2.0"`. This matches Mantine 9 and the React Router 8 floor. It gives `useEffectEvent` and Activity-era semantics. Next App Router users get 19.x canary regardless.
- Opt-in packages that use 19.3 APIs (motion lab, 3D, ViewTransition helpers) declare `^19.3.0`. This plug-in/plug-out split lets the heavy modules move faster than core.
- **Supporting React 18 would cost** `forwardRef` on every component, `.Provider`, no `use()`/`useFormStatus`, `react-compiler-runtime` as a dependency for any future compiled output, and a second test matrix. That is about 22.6% of downloads, mostly legacy apps that are unlikely to adopt a brand-new design system. Revisit only if a paying consumer needs it. If so, add a separate `@nizivo/react18` compatibility shim rather than widening core.

---

## 4. Authoring an RSC-friendly library

### 4.1 Classify every module (the core convention)

| Class | File naming | Directive | May contain | Examples (from the Figma inventory) |
|---|---|---|---|---|
| **Server-safe** | `*.tsx` | none | Pure render from props only. No hooks, no context reads, no event handlers in its own logic, no browser APIs. | Card, Badge, Skeleton, EmptyState (static), Delta, KPI tile (static), Legend item, ProgressBar (static), Order row, Product row, Banner (static), static SVG Sparkline, Area/Bar/Donut chart body (SVG) |
| **Client entry** | `*.client.tsx` | `'use client'` (first statement) | Hooks, context, events, effects | Button with ripple/press motion, Input, Select, Checkbox, Radio, Switch, Menu, Tabs, SegmentedControl, Toast/Toaster, Modal, Tooltip, ChartTooltip, Upload, SearchField |
| **Client-internal** | `*.client.tsx` or `internal/*.ts` | `'use client'` only if imported by a server-safe file | Shared hooks and context used only by client entries | `useControllableState`, `DialogContext` |
| **Pure utilities** | `*.ts` | **never** | Pure functions and constants (`cx`, `formatCurrency`, token maps) | Must stay importable from Server Components. A function exported from a `'use client'` file becomes a client reference and cannot be called on the server. |
| **Browser-only heavy** | separate package | `'use client'` + `use(browser())` (19.3) | WebGL, shaders, 3D, Motion lab | `@nizivo/lab` |

Notes:
- `'use client'` marks an **entry into the client graph**. Everything a client entry imports is pulled in, so the directive is not needed on every file ([use client](https://nextjs.org/docs/app/api-reference/directives/use-client), [boundary guide](https://nextjs.org/docs/app/guides/server-and-client-boundary)). For a library it is still safest to mark **every** file that uses hooks or context, as Base UI does. A consumer may deep-import any public subpath from a Server Component, and per-file directives keep each file a valid entry.
- Props of client entries used from Server Components must be **serializable**. Functions cannot cross the boundary, except Server Functions ([use client](https://nextjs.org/docs/app/api-reference/directives/use-client)). Prefer **data-driven APIs plus slots**: `items`, `value`, `defaultValue`, `name`, `href`, `action`, and `children` / `ReactNode` slots that Server Components can fill. Keep `on*` callbacks optional.
- Server-safe components can be used inside client components too, since they join the client graph. They therefore **must not import `server-only`** or anything that is server-only.
- Enforce with lint. A custom ESLint rule (or `eslint-plugin-react-server-components`, **UNVERIFIED** maintenance status) should flag three things: hooks in a non-`.client.tsx` file, `'use client'` in a non-`.client.tsx` file, and non-component exports from `.client.tsx`.

### 4.2 Directives that survive bundling
- Bundlers merge modules into chunks and drop module-level directives. Rolldown documents that it **emits** a top-level directive only for entry modules or when `output.preserveModules` is on, and it suggests `output.banner` for adding one globally ([Rolldown directives](https://rolldown.rs/in-depth/directives)). [rolldown#7809](https://github.com/rolldown/rolldown/issues/7809) (closed 2026-09-10) confirms directives are **kept with `preserveModules: true`** and dropped in shared chunks. The "fix" was a `MODULE_LEVEL_DIRECTIVE` warning, not preservation.
- **EMPIRICAL (tsdown 0.23.1, `unbundle: true`, `format: ['esm']`, `platform: 'neutral'`):**
  - Every `*.client.tsx` became `dist/**/*.client.js` starting with `"use client";`.
  - Server-safe `card.js` had no directive.
  - Specifiers were fully specified (`./button.client.js`).
  - Rolldown still printed spurious `MODULE_LEVEL_DIRECTIVE` warnings. Silence them with Rolldown's `checks.moduleLevelDirective: false`.
- Rejected approaches:
  - `banner: "'use client'"` on everything would make server-safe components client components.
  - A single root `'use client'` entry (Next's "Advice for Library Authors" covers all-client libraries via esbuild/tsup) would throw away the zero-JS server components ([Next docs](https://nextjs.org/docs/app/getting-started/server-and-client-components#third-party-components)).
  - Bundling with `rollup-plugin-preserve-directives` is unnecessary when output is 1:1.
- Prior art: Base UI ships per-file `'use client'` in 865 of its 1,682 JS/MJS files, while barrels and type files have none. Mantine has it in 686 of 703 ESM files. MUI 444, Ark 1,593, HeroUI 88. Radix bundles one file per package with `"use client"` at the top. React Aria Components instead uses **`import "client-only"`** with no directive, so consumers must wrap it in their own client file. (All EMPIRICAL, tarball inspection.)
- **CI guard:** after the build, a script must assert that `dist/**/*.client.js` all start with `"use client"` and that no other file contains it (§11.4).

### 4.3 Compound components across the server/client boundary
- Next.js documents that `Menu.Item`-style **static properties break**. A Server Component importing a client component receives a client reference, so `Menu.Item` is `undefined`, which throws "Element type is invalid". The fix is to "expose them as named exports instead of static properties" ([boundary guide](https://nextjs.org/docs/app/guides/server-and-client-boundary)).
- Base UI's pattern: `dialog/index.mjs` has **no directive** and contains `export * as Dialog from "./index.parts.mjs"`. Each part (`DialogRoot`, `DialogTrigger`, …) is its own `'use client'` file. `Dialog` is then a module namespace, not a component with static properties. In the server graph each member is a client reference, so `<Dialog.Root>` works from a Server Component.
- **EMPIRICAL:** tsdown/Rolldown rewrites `export * as Dialog from './parts'` into a runtime object (`__exportAll({ Root: () => DialogRoot, … })`) in a directive-free `parts.js`. The getters return the imported client references, so the pattern still holds under RSC. In plain Node SSR, `renderToString(<Dialog.Root><Dialog.Trigger/></Dialog.Root>)` rendered correctly. Confirm with a real Next.js fixture in CI, because only the static-property form is documented as broken (§11.5).
- **Recommendation:** export both `Dialog` (namespace) and flat names (`DialogRoot`, `DialogTrigger`, …). Flat names are the most robust in every bundler and also tree-shake best.

### 4.4 Context at module boundaries; ESM-only
- With an unbundled build, each `createContext` lives in exactly one module, which provider and consumers both import. No accidental duplication occurs inside a version.
- The **dual-package hazard** is when CJS and ESM copies of the same module are loaded in one process, giving two Context objects. It is a real failure mode in RSC setups, where server and SSR graphs resolve differently (reported in [#31702](https://github.com/facebook/react/issues/31702)). **Ship ESM only.**
- Node 22.12+ / 20.19+ can `require()` ESM without a flag ([Node 22.12 announcement](https://alternativeto.net/news/2024/12/node-js-22-12-lts-brings-native-es-module-loading-buffer-fixes-updated-root-certificates)). Next 16 requires Node 20.9+, and React Router 8 requires Node 22.22+. Do not use top-level await anywhere in the graph, because it breaks `require(esm)`.
- Minimize providers. A **zero-provider default** must work. Optional `NizivoProvider` (client) is only for locale/direction defaults, portal container and reduced-motion override. Theme, density and radius come through CSS variables and data attributes. Toasts use a module-level external store (`useSyncExternalStore`) with `toast()` plus `<Toaster/>`. This works across Astro islands because island scripts share ES module instances on a page, the same mechanism Astro recommends with Nano Stores ([Astro sharing state](https://docs.astro.build/en/recipes/sharing-state-islands/)).

### 4.5 Barrel files, `sideEffects`, `optimizePackageImports`, Turbopack
- Barrels slow builds because the compiler must parse each one to check for side effects ([Next local dev](https://nextjs.org/docs/app/guides/local-development)). `optimizePackageImports` is still **experimental**. "**Turbopack automatically analyzes imports and optimizes them. It does not require this configuration**" (same page; [option docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)).
- Recommendations:
  - The main documented import style is per-component subpaths: `import { Button } from '@nizivo/react/button'`. These are cheap everywhere (webpack, Vite dev, Jest/Vitest, Astro).
  - Keep a root barrel for convenience. The output is unbundled ESM and `"sideEffects": ["**/*.css"]` is declared, so bundlers can prune it.
  - Mark the barrel's export list as pure re-exports only, with no code in barrels.
  - `sideEffects` must **not** be `false` if consumers import CSS from the package. Some bundlers (webpack among them) would then drop the bare `import '@nizivo/react/styles.css'`. Use `["**/*.css"]`, which Mantine (`["*.css"]`) and React Aria do.

### 4.6 CSS from `node_modules` in the Next.js App Router; `transpilePackages`
- In the App Router, "stylesheets published by external packages can be imported anywhere in the `app` directory, including colocated components". Ordering follows import order. Global styles are not removed on navigation, which "can lead to conflicts" ([Next CSS](https://nextjs.org/docs/app/getting-started/css)). Wrapping all library CSS in **cascade layers** (`@layer nizivo.reset, nizivo.tokens, nizivo.components`) makes order-of-import issues irrelevant against unlayered app CSS.
- `transpilePackages` is needed only when a package ships raw TS/JSX or modern syntax that needs compiling, or for Pages-router bundling. App Router already bundles Server Component deps ([transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)). Shipping plain ES2022 JS with no JSX and no TS means **no `transpilePackages`**.

---

## 5. Framework-by-framework

### 5.1 Next.js 16.4 App Router (RSC + SSR + streaming)
- Works with zero config given §4. Server-safe components render with no client JS. Client entries hydrate.
- With `cacheComponents` and PPR: the static shell plus streaming means library components must not read request data. They do not. The theme must not force dynamic rendering (§6.1).
- Activity-preserved routes: see §2.5 and the close-on-hide rule.
- Optional consumer opt-ins: `reactCompiler: true` (stable) and `experimental.turbopackRustReactCompiler` (16.3+) for app code ([16.3 post](https://nextjs.org/blog/next-16-3-turbopack)).
- Pages Router: works as a plain SSR React app. Global CSS from `node_modules` in the Pages Router historically had to be imported from `_app`. **UNVERIFIED** for 16.x, so document importing `styles.css` in `_app`.

### 5.2 Vite 8 SPA (and Vite SSR)
- An SPA needs nothing. Vite 8 consumers may see Rolldown `MODULE_LEVEL_DIRECTIVE` warnings for `'use client'` in dependencies, which several projects report since Rolldown 1.2.9 ([example](https://github.com/open-workflow-specification/editor/issues/465), [silverwind PR](https://github.com/silverwind/tsdown-config-silverwind/pull/2)). Document `build.rolldownOptions.checks.moduleLevelDirective = false` (**UNVERIFIED** exact config path in Vite 8; whether Vite already filters `node_modules` is also **UNVERIFIED**).
- Vite SSR externalizes dependencies by default ([ssr options](https://vite.dev/config/ssr-options)). An externalized dependency that does `import './x.css'` crashes Node with `ERR_UNKNOWN_FILE_EXTENSION ".css"`. The documented workaround is `ssr.noExternal` ([TanStack/router#5447](https://github.com/TanStack/router/issues/5447), [Vike](https://vite-plugin-ssr.com/broken-npm-package)). D7 avoids this entirely.

### 5.3 Astro 7 (React islands)
- `client:load | idle{timeout} | visible{rootMargin} | media | only="react"`. With no directive, a component renders HTML with **zero JS** ([directives](https://docs.astro.build/en/reference/directives-reference/)).
- Props to hydrated islands must be serializable (plain objects, numbers, strings, Arrays, Map, Set). **Functions are not supported** ([framework components](https://docs.astro.build/en/guides/framework-components/)).
- Children from `.astro` reach React as a **static HTML wrapper** (`StaticHtml`) unless `experimentalReactChildren` is set ([React integration](https://docs.astro.build/en/guides/integrations-guide/react/); also verified in `@astrojs/react/dist/server.js`). Consequences:
  - Compound components (`Dialog.Root` … `Dialog.Popup`) must be **composed inside one `.tsx` island**. Parts placed in `.astro` markup cannot share context, and `asChild`/Slot cloning of Astro children does not work.
  - Context never crosses islands. Each island is its own `hydrateRoot`. Cross-island state (toasts, cart, theme) needs the external-store approach (§4.4).
- CSS: `import '@nizivo/react/styles.css'` (with the `.css` extension) "should work like any local stylesheet". Extensionless CSS exports need `vite.ssr.noExternal` ([Astro styling](https://docs.astro.build/en/guides/styling/)). Always publish CSS export keys **with `.css`**. Imported CSS applies even if a component is unused, which is expected for the all-in-one file. The per-component files let Astro users import only what a page needs.
- `@astrojs/react@7` offers an opt-in Oxc React Compiler for **client** components. Server rendering is not compiled ([release](https://github.com/withastro/astro/releases/tag/%40astrojs/react%407.0.0)).
- A per-island `identifierPrefix` is already handled (§2.4).

### 5.4 React Router 8 framework mode (and 7.x)
- v8 floors: React 19.2.7+, Node 22.22+, Vite 7+ with the Environment API. `react-router-dom` was removed. Middleware is on by default. RSC stays **unstable/opt-in** ([upgrade guide](https://reactrouter.com/upgrading/v7), [changelog](https://reactrouter.com/changelog)). D1 (`^19.2.0`) lines up with this.
- Non-RSC mode treats `'use client'` as a no-op string. SSR uses Vite, so the same D7 reasoning applies.
- CSS goes in `root.tsx` through a side-effect import or the `links` export with `?url`. The theme script goes in the root `Layout` `<head>`.
- React Router 7.x users on React 18 are out of scope under D1.

### 5.5 TanStack Start 1.169
- SSR/streaming on Vite 8 or Rsbuild 2. RSC is experimental behind `rsc: { enabled: true }` and `@vitejs/plugin-rsc`. Server components support CSS Modules and global CSS ("styles are extracted and sent to the client"). RSC output can be composed via `createCompositeComponent` ([docs](https://tanstack.com/start/latest/docs/framework/react/guide/server-components), [blog](https://tanstack.com/blog/react-server-components)).
- Whether `@vitejs/plugin-rsc` honors `'use client'` in `node_modules` packages without extra config is **UNVERIFIED**. Add a TanStack RSC fixture to CI.
- CSS: `import nzCss from '@nizivo/react/styles.css?url'` → `head().links`. Theme script in the root route head. A `ScriptOnce` helper exists in TanStack Router (**UNVERIFIED** name and API).

---

## 6. SSR pitfalls and their solutions

### 6.1 Theme flash (FOUC) for light and dark

| Option | Flash? | JS | Works static/PPR? | Explicit user choice? | Verdict |
|---|---|---|---|---|---|
| A. `prefers-color-scheme` media blocks only | No | 0 | Yes | No | Too limited |
| **B. `color-scheme: light dark` + `light-dark()` tokens + `[data-nz-theme]` override** | **No** (system) | **0** | **Yes** | Via attribute | **Default** |
| C. B plus a cookie read on the server that sets `<html data-nz-theme>` | No | 0 | Makes root layout dynamic (cookies) under Cache Components | Yes | Optional for fully dynamic SSR apps |
| D. B plus a blocking inline `<head>` script reading `localStorage` | No | ~250 B inline | Yes | Yes | **Recommended for persisted choice** |
| E. next-themes / JS ThemeProvider | No (script) | provider + script | Yes | Yes | Rejected: an extra dependency, React 19 script-tag warnings, and the repo appears unmaintained ([shadcn #10104](https://github.com/shadcn-ui/ui/issues/10104)) |

- `light-dark()` is Baseline 2024 (May 2024): Chrome/Edge 123, Firefox 120, Safari 17.5, about 91% global. It **requires `color-scheme: light dark`** ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark), [caniuse](https://caniuse.com/mdn-css_types_color_light-dark)).
- Next 16's browser floor is Safari 16.4 ([Next 16](https://nextjs.org/blog/next-16)). The token build should therefore emit an `@supports not (color: light-dark(#000,#fff))` fallback block (§11.6).
- Because unregistered custom properties substitute at the point of use, `--nz-bg-canvas: light-dark(…)` declared on `:root` resolves against the **element's own** `color-scheme`. Nested `[data-nz-theme="dark"]` sections, such as an inverse sidebar or the "glass" hero, therefore work without duplicating tokens. Do **not** register color tokens with `@property { syntax: '<color>' }`, because that forces resolution at the declaring element. (This follows from the CSS custom-properties spec and should be verified in the visual test suite.)
- Map the Figma `Motion` "Reduced" mode to `@media (prefers-reduced-motion: reduce)` in CSS, not JS. Map `Responsive` modes to container or media queries. The spring easings need `linear()` approximations, which is outside this report.
- On the React side: put `suppressHydrationWarning` on `<html>` (it only applies one level deep) whenever a script or cookie may set `data-nz-theme` before hydration. Render `<ThemeScript>` from a **Server Component in the root layout's `<head>`**, never inside a client provider. That avoids the client-render script warning (§2.7). Accept a `nonce` prop and publish the script's SHA-256 so hash-based CSP works.

### 6.2 Hydration mismatches

| Source | Library rule |
|---|---|
| `useId` | Use it for all generated ids. Never `Math.random()` or counters. Never derive selectors or keys from it (§2.4). |
| `Date`, "now", time zones | Never call `Date.now()` or `new Date()` in render. Components such as OrderRow, ShipmentTracker and relative "2h ago" text accept `now`, `locale` and `timeZone` props. Client-only variants use `use(browser())` (19.3) or `useSyncExternalStore` with an explicit `getServerSnapshot`. |
| `Intl` number/currency (KPI, Delta, Plan card) | Always pass an explicit `locale` (prop or provider default). The server ICU and the browser can differ. A missing locale must fall back to a deterministic default (`'en-US'`), never `navigator.language` during render. |
| `window` / `matchMedia` / `localStorage` | Only in effects, event handlers or `useSyncExternalStore` with a server snapshot. Responsive variants are **CSS** (container queries), not JS breakpoints. |
| Extensions and injected attributes | `suppressHydrationWarning` only on `<html>`/`<body>`, which the consumer controls. Never on library internals. |
| Strict Mode double effects on hydration (19.3) | Effects must be idempotent (§2.5). |

### 6.3 Portals and overlays in SSR
- `createPortal` needs a live DOM node ("The node must already exist"). Portal children keep React context and React-tree event bubbling ([createPortal](https://react.dev/reference/react-dom/createPortal)). There is no server-side portal, so the overlay content of a portaled `defaultOpen` dialog cannot be SSR'd.
- Prefer the **top layer**. `popover` is supported in Chrome 114, Firefox 125, Safari 17 and iOS 18.3, about 93.6% ([caniuse](https://caniuse.com/mdn-api_htmlelement_popover)). Native `<dialog>.showModal()` is also available. Both render in place, so SSR, streaming and Activity all keep the DOM where React put it, with no z-index wars.
- CSS anchor positioning is still **partial** everywhere: Chrome 125+, Firefox 147+, Safari 26 partial, full only in Safari 27, about 87% partial ([caniuse](https://caniuse.com/css-anchor-positioning)). Keep a JS positioning engine (Floating UI or equivalent, chosen in another topic) and use anchor positioning as progressive enhancement.
- Portal fallback: `container` prop plus a mount-gate (`useSyncExternalStore(() => () => {}, () => true, () => false)`) so the server renders nothing and the client portals after hydration.
- Toasts: render a `<Toaster>` live region (`role="status"` / `aria-live`) **in the SSR HTML** so screen readers register it before the first announcement. Populate it from the external store.

### 6.4 Streaming and Suspense
- React 19.2 batches SSR Suspense reveals ([19.2 post](https://react.dev/blog/2025/10/01/react-19-2)). Library components should not suspend unless asked. `Skeleton` is the designated Suspense fallback and must match the final layout box to avoid CLS.
- `<style precedence>` and `<link precedence>` hoist correctly in streamed HTML. Use them only for the self-contained heavy modules (§2.7).
- `use(browser())` needs a Suspense boundary. The lab components should export a ready-made `<LabBoundary fallback>`.

---

## 7. Options compared against the criteria

Criteria: **RSC** (works from Server Components, zero JS when static), **Isl** (Astro islands), **0cfg** (no consumer config in Next, Vite SSR, Astro, RR, TanStack), **Perf** (client JS, tree-shaking), **Plug** (swap or plug pieces later), **Reach** (audience), **Risk** (maintenance and ecosystem risk). ++ strong, + good, 0 neutral, − weak, −− blocking.

| Decision | Option | RSC | Isl | 0cfg | Perf | Plug | Reach | Risk |
|---|---|---|---|---|---|---|---|---|
| D1 React peer | `^18.3 \|\| ^19` | + | + | + | 0 | − (forwardRef everywhere) | ++ | − |
| | `^19.0` | + | + | + | + | + | + | 0 |
| | **`^19.2` core, `^19.3` for lab modules** | ++ | + | + | + | ++ | + | + |
| | `^19.3` everywhere | ++ | + | + | + | + | 0 (needs latest) | 0 |
| D2 Compiler | **Uncompiled, compiler-clean code** | ++ | + | ++ | 0 | ++ | ++ | ++ |
| | Compile everything | −− (crashes in RSC) | + | + | + | 0 | + | −− |
| | Compile `*.client.tsx` only (phase 2) | ++ | + | ++ | + | + | ++ | 0 |
| | Dual build with `react-server` condition | + | + | − | + | − | + | − (duplicate contexts reported) |
| D3 Directives | **Per-file + unbundle** | ++ | + | ++ | ++ | ++ | ++ | + |
| | Bundle + `banner` | −− | + | + | − | − | + | 0 |
| | Single `'use client'` entry | − (all client) | + | + | − | − | + | + |
| | Bundle + preserve-directives plugin | + | + | + | + | 0 | + | − |
| D4 Format | **ESM-only** | ++ | + | + | + | + | + (Node ≥20.19) | + |
| | Dual ESM + CJS | − (hazard) | + | + | 0 | 0 | ++ | − |
| D5 Compound API | Static props (`Menu.Item`) | −− | − | + | 0 | 0 | + | − |
| | **Namespace + flat named** | ++ | + | + | ++ | ++ | + | + |
| D6 Imports | Root barrel only | + | + | − (barrel cost) | − | 0 | + | 0 |
| | **Subpaths + root barrel + `sideEffects`** | ++ | + | ++ | ++ | ++ | + | + |
| D7 CSS | JS imports its own CSS | + | − | −− (`ssr.noExternal`) | + | + | + | − |
| | **Consumer imports static CSS (all-in-one + per-component), `@layer`** | ++ | ++ | ++ | + | ++ | ++ | + |
| | Runtime CSS-in-JS | −− | − | 0 | −− | 0 | + | −− |
| | React `<style href precedence>` inline | + | + | ++ | − (JS bytes) | + | + | 0 (heavy modules only) |
| D8 Theme | next-themes | + | − | 0 | − | − | + | −− |
| | **CSS `light-dark()` + attr + optional inline script** | ++ | ++ | ++ | ++ | ++ | + (fallback block for Safari <17.5) | + |
| | Cookie-only SSR | 0 (dynamic shell) | − | − | ++ | + | + | 0 |
| D9 Overlays | Portal after mount (only) | + | + | ++ | 0 | + | ++ | 0 |
| | **Top layer first, portal fallback** | ++ | ++ | ++ | + | + | + (93% popover) | 0 |
| D10 Cross-tree state | Required Provider/context | − | −− | − | 0 | − | + | 0 |
| | **External store + CSS vars, optional provider** | ++ | ++ | ++ | + | ++ | + | + |

---

## 8. Recommendation

1. **D1:** core `@nizivo/*` React packages peer on `react`/`react-dom` `^19.2.0`, with `@types/react` as an optional peer. Opt-in `@nizivo/lab` (3D, shader, motion) and any ViewTransition helpers peer on `^19.3.0`. No React 18.
2. **D2:** ship uncompiled ES2022. Lint with `eslint-plugin-react-hooks` `recommended-latest`. Reserve compilation of `*.client.tsx` with `target: '19'` for after a benchmark and a fixture matrix pass. Never compile server-safe modules while [#31702](https://github.com/facebook/react/issues/31702) is open.
3. **D3:** directive per file. `*.client.tsx` naming is enforced by lint. Build with tsdown `unbundle: true`, `format: ['esm']`, `platform: 'neutral'`. Run the CI directive audit.
4. **D4:** ESM-only. Use `exports` with `types` and `default`. No `main`/`module` duplication beyond what tooling needs. publint and `@arethetypeswrong/cli` (tsdown peers both) run in CI.
5. **D5:** compound components use a namespace re-export (`export * as Dialog from './parts'`) plus flat named exports. No static properties, ever.
6. **D6:** per-component subpath exports are primary, with a root barrel as a convenience. `"sideEffects": ["**/*.css"]`. Tell users they need none of `transpilePackages`, `optimizePackageImports` or `ssr.noExternal`.
7. **D7:** no CSS imports inside published JS. Ship `styles.css` (all-in-one), `styles/<component>.css` (granular) and `tokens.css`, all wrapped in `@layer nizivo.*`. Export keys end in `.css`.
8. **D8:** default theming is CSS-only with no flash. Ship `@nizivo/react/theme-script`, which exports the `themeScript` string, a `createThemeScript(opts)` function and a server-safe `<ThemeScript nonce>`. Document cookie SSR as an alternative for non-PPR apps.
9. **D9:** overlays use the top layer (`popover`, `<dialog>`) where semantics allow, with JS positioning and anchor positioning as enhancement. Portals are an opt-in fallback after mount. Every transient overlay is Activity-aware (layout-effect close) and Strict-Mode-idempotent.
10. **D10:** a zero-provider default. External stores for toasts and global UI. CSS variables and data attributes for theme, density, radius and motion.

How this serves "plug in / plug out": every component is its own subpath entry with its own CSS file and its own client/server classification. Heavy modules are separate packages with their own peer floors. Tokens are plain CSS variables that any styling layer can consume. Behavior can be swapped inside a `*.client.tsx` file without touching the public import path or the server-safe shell.

---

## 9. Rejected alternatives and why

- **Supporting React 18:** costs `forwardRef`, `.Provider` and no `use`/`useFormStatus` everywhere, plus a runtime dependency for any future compiled output. The 22.6% share is mostly legacy apps. New-major peers (Mantine 9, HeroUI 3, React Router 8) already dropped 18.
- **Shipping compiler output now:** crashes for server-safe components under `react-server` (EMPIRICAL; [#31702](https://github.com/facebook/react/issues/31702)). No peer library does it.
- **Dual compiled/uncompiled builds via the `react-server` export condition:** reported duplicate contexts, double the artifacts, and confusing debugging.
- **`output.banner: "'use client'"` or a single client entry:** forfeits server components, which are the main zero-JS lever for cards, KPI tiles and static charts.
- **CJS + ESM dual publish:** dual-package hazard (two React contexts). Node ≥20.19 and every target framework handle ESM.
- **Static-property compound APIs (`Menu.Item`):** documented as broken across the RSC boundary ([Next boundary guide](https://nextjs.org/docs/app/guides/server-and-client-boundary)).
- **JS-side CSS imports (`import './button.css'` in dist):** require `ssr.noExternal` in Vite SSR, TanStack Start, React Router and Astro (extensionless case) ([TanStack/router#5447](https://github.com/TanStack/router/issues/5447), [Astro styling](https://docs.astro.build/en/guides/styling/)).
- **Runtime CSS-in-JS:** incompatible with RSC zero-JS and with streaming without registries, and it adds runtime cost. Styling-layer selection itself is another topic.
- **next-themes dependency:** React 19 dev script warnings, unmaintained, and a client provider requirement ([next-themes #387](https://github.com/pacocoursey/next-themes/issues/387), [#397](https://github.com/pacocoursey/next-themes/issues/397)).
- **Required global `<NizivoProvider>`:** breaks Astro islands (no shared tree) and blocks Server Components from configuration, and it adds client JS for theming that CSS can do.

---

## 10. Risks

1. **React Compiler and RSC:** if a consumer's toolchain one day compiles `node_modules`, server-safe modules could hit the `H` crash. Mitigation: add `'use no memo'` at the top of server-safe modules once that is verified to work at module level (**UNVERIFIED**: the docs describe function-level opt-out only), and keep the CI react-server import test.
2. **Rolldown or tsdown behavior drift:** directive preservation with `unbundle` is documented ([Rolldown](https://rolldown.rs/in-depth/directives)) and EMPIRICALLY confirmed on 0.23.1, but tsdown is pre-1.0. Pin versions and keep the CI directive audit.
3. **Namespace export becoming a runtime object (`__exportAll`)** rather than a native namespace: works in RSC in theory and in plain-Node SSR (EMPIRICAL), but has not been tested in a Next build in this report. Run the Next fixture.
4. **Vite 8 `MODULE_LEVEL_DIRECTIVE` noise** for SPA consumers. This is cosmetic but could fail builds that use `failOnWarn`. Document the opt-out.
5. **`light-dark()` in Safari <17.5:** needs the `@supports not` fallback block, which grows CSS by roughly one extra dark token set.
6. **Activity semantics** (Next `cacheComponents`): overlays left open in hidden routes and scroll-lock leaks are subtle bugs. Add Playwright tests that navigate away and back with a menu open.
7. **React 19.3-only APIs leaking into core** (`browser`, Fragment refs, `ViewTransition`) would silently raise the floor. Add a lint rule (`no-restricted-imports`) in core packages for those names.
8. **TanStack Start and React Router RSC** are experimental or unstable. Their `'use client'` handling in packages is **UNVERIFIED**. Keep them as non-blocking CI fixtures.
9. **The Next.js App Router uses canary React**, not the installed `react`. Behavior can change between Next minors. Test against Next `latest` and `canary`.
10. **npm 2FA-bypass token restrictions** (Aug 2026 / Jan 2027) affect CI publishing. The fix is trusted publishing (OIDC) with provenance, owned by the release-pipeline topic.

---

## 11. Implementation notes and config snippets

### 11.1 Source layout (per component)
```
packages/react/src/
  index.ts                         # root barrel: re-exports only
  button/
    index.ts                       # export { Button } from './button.client'; export type {...}
    button.client.tsx              # 'use client' (press/ripple/motion)
    button.css                     # @layer nizivo.components { .nz-button {...} }
  card/
    index.ts
    card.tsx                       # server-safe, no directive
    card.css
  dialog/
    index.ts                       # export * as Dialog from './parts'; export * from './parts-flat'
    parts.ts                       # export { DialogRoot as Root, DialogTrigger as Trigger, ... }
    parts-flat.ts                  # export { DialogRoot, DialogTrigger, ... }
    dialog-root.client.tsx         # 'use client'; owns DialogContext
    dialog-trigger.client.tsx      # 'use client'
    dialog-popup.client.tsx        # 'use client'; <dialog> top layer; layout-effect close-on-hide
  utils/
    cx.ts                          # pure, never 'use client'
  theme-script/
    index.tsx                      # themeScript string + createThemeScript() + <ThemeScript> (server-safe)
```

### 11.2 `package.json` (core)
```jsonc
{
  "name": "@nizivo/react",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "files": ["dist"],
  "exports": {
    ".":               { "types": "./dist/index.d.ts",        "default": "./dist/index.js" },
    "./button":        { "types": "./dist/button/index.d.ts", "default": "./dist/button/index.js" },
    "./card":          { "types": "./dist/card/index.d.ts",   "default": "./dist/card/index.js" },
    "./dialog":        { "types": "./dist/dialog/index.d.ts", "default": "./dist/dialog/index.js" },
    "./theme-script":  { "types": "./dist/theme-script/index.d.ts", "default": "./dist/theme-script/index.js" },
    "./styles.css":    "./dist/styles.css",
    "./tokens.css":    "./dist/tokens.css",
    "./styles/*.css":  "./dist/styles/*.css",
    "./package.json":  "./package.json"
  },
  "peerDependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@types/react": "^19.2.0"
  },
  "peerDependenciesMeta": { "@types/react": { "optional": true } },
  "engines": { "node": ">=22.12" }
}
```
- Node 20 reached end of life in April 2026. `>=22.12` is the honest floor: it has `require(esm)` unflagged, and it covers `fs.globSync`, which the CI scripts use.
- Generate the subpath map from `src/*/index.ts` with a script, or with tsdown's exports generation (**UNVERIFIED** with `unbundle`), to keep it in sync. Do not use a `"./*"` wildcard, because it exposes internals as public API.
- The `@nizivo/lab` package uses the same layout with `"react": "^19.3.0"`.

### 11.3 `tsdown.config.ts`
```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/*/index.ts'], // each component folder is an entry
  format: ['esm'],
  platform: 'neutral',
  target: 'es2022',
  unbundle: true,          // 1:1 output => per-file 'use client' survives (EMPIRICAL on 0.23.1)
  dts: true,
  sourcemap: true,
  clean: true,
  // Spurious in unbundle mode: each file keeps its own directive.
  // Option path UNVERIFIED for tsdown; Rolldown's input option is `checks.moduleLevelDirective`.
  inputOptions: { checks: { moduleLevelDirective: false } },
});
```
Phase-2 compiler (client files only). This is **not for v0.x**:
```ts
import pluginBabel from '@rolldown/plugin-babel';
import { reactCompilerPreset } from '@vitejs/plugin-react';

const compiler = reactCompilerPreset({ target: '19' });
// Path-based filters are documented (exclude); `include` override is UNVERIFIED -> verify, else invert with exclude.
compiler.rolldown.filter.id.include = [/\.client\.tsx$/];
export const compilerPlugin = pluginBabel({ presets: [compiler] });
```

### 11.4 CI: directive audit (`scripts/check-directives.mjs`)
```js
import { readFileSync, globSync } from 'node:fs'; // fs.globSync: Node 22+
let bad = 0;
for (const file of globSync('dist/**/*.js')) {
  const src = readFileSync(file, 'utf8');
  const has = /^\s*["']use client["'];?/.test(src);
  const shouldHave = file.endsWith('.client.js');
  if (has !== shouldHave) { console.error(`${shouldHave ? 'MISSING' : 'UNEXPECTED'} 'use client': ${file}`); bad++; }
}
process.exit(bad ? 1 : 0);
```

### 11.5 CI: plain-Node loadability (the "zero-config" guarantee)
```bash
# 1) Every entry loads and SSR-renders under the default condition (Vite SSR externalization, RR, TanStack, Astro SSR)
node --input-type=module -e "for (const e of ['./dist/index.js','./dist/button/index.js','./dist/dialog/index.js']) await import(e)"
# 2) Every SERVER-SAFE entry loads under react-server (Next RSC graph, TanStack/RR RSC)
node --conditions=react-server --input-type=module -e "await import('./dist/card/index.js')"
# (Client entries are expected to FAIL here in plain Node, e.g. "does not provide an export named 'useState'".
#  RSC bundlers replace them with client references. That is why the list is server-safe only.)
```
EMPIRICAL on the prototype: (1) printed `[ 'Button', 'Card', 'Dialog' ]` and `renderToString(<Dialog.Root><Dialog.Trigger/></Dialog.Root>)` rendered `<button aria-expanded="false">t</button>`. (2) printed `ok [ 'Card' ]`.

Also add **framework fixtures** (build plus Playwright smoke) for:
- Next 16 App Router, with and without `cacheComponents`; a Server Component page uses `<Dialog.Root>` and server-safe `<Card>`.
- Vite 8 SPA.
- Vite SSR (no `ssr.noExternal`).
- Astro 7 (`client:visible` island, `client:only="react"` lab).
- React Router 8 framework mode.
- TanStack Start (SSR, and RSC experimental as non-blocking).

### 11.6 Token CSS shape (generated from Figma variables; the prefix is configurable)
```css
@layer nizivo.reset, nizivo.tokens, nizivo.components, nizivo.utilities;

@layer nizivo.tokens {
  :root {
    color-scheme: light dark;
    --nz-bg-canvas:   light-dark(#f6f7f4, #101311); /* neutral/50  | neutral/950 */
    --nz-text-primary: light-dark(#181b19, #f6f7f4); /* neutral/900 | neutral/50 */
    --nz-duration-base: 220ms;
    --nz-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  }
  [data-nz-theme="light"] { color-scheme: light; }
  [data-nz-theme="dark"]  { color-scheme: dark; }

  @media (prefers-reduced-motion: reduce) {
    :root { --nz-duration-base: 120ms; --nz-easing-standard: linear; } /* Figma Motion "Reduced" mode */
  }

  /* Fallback for engines without light-dark() (e.g., Safari 16.4–17.4, inside Next 16's floor) */
  @supports not (color: light-dark(#000, #fff)) {
    :root, [data-nz-theme="light"] { --nz-bg-canvas: #f6f7f4; --nz-text-primary: #181b19; }
    @media (prefers-color-scheme: dark) {
      :root:not([data-nz-theme="light"]) { --nz-bg-canvas: #101311; --nz-text-primary: #f6f7f4; }
    }
    [data-nz-theme="dark"] { --nz-bg-canvas: #101311; --nz-text-primary: #f6f7f4; }
  }
}
```

### 11.7 Theme script (server-safe, CSP-friendly)
```tsx
// src/theme-script/index.tsx  (no 'use client')
export interface ThemeScriptOptions { storageKey?: string; attribute?: string }
export function createThemeScript({ storageKey = 'nz-theme', attribute = 'data-nz-theme' }: ThemeScriptOptions = {}) {
  return `(()=>{try{var t=localStorage.getItem(${JSON.stringify(storageKey)});` +
         `if(t==="light"||t==="dark")document.documentElement.setAttribute(${JSON.stringify(attribute)},t)}catch(e){}})()`;
}
export const themeScript = createThemeScript();
export function ThemeScript(props: ThemeScriptOptions & { nonce?: string }) {
  const { nonce, ...opts } = props;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: createThemeScript(opts) }} />;
}
// Publish SHA-256 of `themeScript` in docs for hash-based CSP.
```
Placement for each framework:
- **Next** `app/layout.tsx` (Server Component): `<html suppressHydrationWarning><head><ThemeScript nonce={nonce} /></head>…`
- **Vite SPA:** paste `themeScript` into `index.html` `<head>`.
- **Astro:** `<script is:inline set:html={themeScript} />` in the layout `<head>`.
- **React Router 8:** `root.tsx` `Layout` `<head>`.
- **TanStack Start:** root route head.
- Setting the theme on the client (`setTheme`) is a tiny client helper. It writes `localStorage` and the attribute, and optionally a cookie for SSR apps that prefer option C.

### 11.8 Activity- and Strict-Mode-safe overlay skeleton
```tsx
'use client';
import { useLayoutEffect, useRef, useState } from 'react';
// Transient overlays (Menu/Popover/Tooltip/Select listbox) ALWAYS mount closed: no defaultOpen param.
// Overlays that may be open on first paint (Dialog with defaultOpen, URL-driven sheets) must NOT use this hook;
// derive their open state from props/URL as Next.js recommends.
export function useTransientOpen() {
  const [open, setOpenState] = useState(false);
  const userOpened = useRef(false);
  const setOpen = (next: boolean) => { userOpened.current = next; setOpenState(next); };
  // Close when an <Activity> (e.g. Next cacheComponents route) hides us; runs before display:none applies.
  // Gated on a user-initiated open so Strict Mode's mount-time setup→cleanup→setup (and 19.3's
  // double-invoke during hydration) cannot cause a dev/prod divergence.
  useLayoutEffect(() => () => {
    if (userOpened.current) { userOpened.current = false; setOpenState(false); }
  }, []);
  return [open, setOpen] as const;
}
// Scroll-lock / inert: reference-counted module-level store so double-invoked effects (19.3 Strict Mode hydration) stay balanced.
```
Rule: closing on hide through a layout-effect cleanup is only safe for state that **defaults to closed** and was opened by the user.

### 11.9 Consumer config summary (what we promise)

| Framework | Required config | Optional |
|---|---|---|
| Next 16 App Router | none; `import '@nizivo/react/styles.css'` in root layout | `reactCompiler: true` for app code |
| Next Pages Router | import CSS in `_app` (**UNVERIFIED** rule still applies in 16) | none |
| Vite 8 SPA | none | silence `MODULE_LEVEL_DIRECTIVE` |
| Vite SSR / RR 8 / TanStack Start | none (no `ssr.noExternal`) | `?url` CSS links |
| Astro 7 | none (CSS import with `.css`) | `experimentalReactChildren` only if Astro children must be real React nodes |

---

## 12. Compatibility checklist (per component PR)

**Classification and RSC**
- [ ] Is the file server-safe (`.tsx`, no hooks, context, handlers or browser APIs) or a client entry (`.client.tsx` with `'use client'` first)?
- [ ] No pure utilities or constants are exported from `.client.tsx`.
- [ ] Props usable from Server Components are serializable. Callbacks are optional, and slots are `ReactNode`.
- [ ] Compound parts are exported as namespace plus flat names, with no static properties.
- [ ] No 19.3-only imports in core (`browser`, `ViewTransition`, Fragment refs) unless the package floor allows them.

**SSR and hydration**
- [ ] All a11y ids come from `useId()` with an `id` override. No ids are derived into selectors.
- [ ] No `Date.now()`, `new Date()`, `Math.random()`, `navigator`, `window` or `matchMedia` in render.
- [ ] `Intl` formatting takes an explicit `locale` (and `timeZone`).
- [ ] Responsive behavior is CSS (container or media queries), not JS breakpoints.
- [ ] Renders identical markup on server and client with default props (fixture test).

**Overlays, Activity, Strict Mode**
- [ ] Transient open state closes in a `useLayoutEffect` cleanup. This is only for state that defaults to closed and was opened by the user (Strict Mode safe, see §11.8).
- [ ] Scroll-lock, inert and focus-trap are reference-counted and released in cleanup. Effects are idempotent under double invocation.
- [ ] Uses the top layer (`popover` / `<dialog>`) where semantics allow. Portals happen only after mount, with a `container` prop.
- [ ] The toast live region is present in the SSR HTML.

**Forms and Actions**
- [ ] Native `name`/`value`/`form` are supported. Custom controls render a hidden native input. `form.reset()` and React's auto-reset restore `defaultValue`.
- [ ] Works inside `<form action={serverFn}>` with no client JS where the browser suffices.

**Packaging**
- [ ] The component folder has `index.ts`, its own `.css` in `@layer nizivo.components`, and a subpath export.
- [ ] The CI directive audit passes. The plain-Node default and react-server loadability tests pass.
- [ ] publint and attw pass. No CSS import exists in any `dist/**/*.js`.

**Astro**
- [ ] The docs show the component composed inside a single `.tsx` island. No function props are passed across `client:*`.

**Theme and motion**
- [ ] Colors only through `--nz-*` tokens that resolve via `light-dark()`. No hard-coded hex, so nested `[data-nz-theme]` sections work.
- [ ] Motion durations and easings come from tokens, and `prefers-reduced-motion` is honored in CSS.

---

## 13. Recommended package conventions (summary)

- **Scope and split:**
  - `@nizivo/tokens`: CSS variables, TS token maps, no React.
  - `@nizivo/react`: core components, React `^19.2`.
  - Heavy or optional packages, each with its own floor and CSS: `@nizivo/charts` (if charts grow heavy), `@nizivo/lab` (3D/shader/motion, React `^19.3`, browser-only via `use(browser())`), `@nizivo/commerce` and `@nizivo/storefront` if they bring third-party deps.
- **Files:** `*.client.tsx` means `'use client'`. Plain `.tsx` is server-safe. Plain `.ts` holds pure utilities.
- **Build:** tsdown `unbundle`, ESM-only, ES2022, `platform: 'neutral'`, `.d.ts`, sourcemaps.
- **Exports:** an explicit subpath per component, root barrel, CSS keys ending in `.css`, `"sideEffects": ["**/*.css"]`.
- **CSS:** `@layer nizivo.reset, nizivo.tokens, nizivo.components, nizivo.utilities`, shipped as `styles.css`, `tokens.css` and `styles/<component>.css`. JS never imports CSS.
- **Peers:** `react` and `react-dom` `^19.2.0`, `@types/react` optional. No `react-compiler-runtime` dependency.
- **CI gates:** lint (react-hooks `recommended-latest` plus the custom client/server rules), unit tests, directive audit, Node loadability (default and react-server), publint and attw, framework fixtures (Next, Vite SPA, Vite SSR, Astro, RR8, TanStack), and visual tests for light, dark and nested themes.

---

## 14. Items marked UNVERIFIED (to confirm during implementation)
1. Whether Next.js `reactCompiler: true` compiles `node_modules` packages. Likely not.
2. Whether `'use no memo'` works at module scope as a whole-file opt-out.
3. tsdown option path for Rolldown `checks.moduleLevelDirective` (`inputOptions.checks`), and tsdown's `exports` generation with `unbundle`.
4. Whether `reactCompilerPreset().rolldown.filter.id.include` can be overridden. Only `exclude` is shown in the README.
5. The Vite 8 config path to silence `MODULE_LEVEL_DIRECTIVE`, and whether Vite already filters warnings from `node_modules`.
6. Whether `@vitejs/plugin-rsc` (TanStack Start RSC) and React Router 8 RSC honor `'use client'` inside `node_modules` packages without config.
7. TanStack Router `ScriptOnce` helper name and API for the theme script.
8. Whether Pages Router in Next 16 still restricts global CSS imports from `node_modules` to `_app`.
9. The namespace-object (`__exportAll`) compound pattern in a real Next 16 RSC build. Plain-Node SSR is verified; the RSC build is not.
10. React's exact hydration behavior for an `<html>` attribute added by a pre-hydration script without `suppressHydrationWarning` in 19.3. Recommend always setting it.

## 15. Empirical tests run for this report (2026-10-14)
- **Compiler runtime under `react-server`.** Setup: `react@19.3.0` from npm. Command: `NODE_ENV=production node --conditions=react-server t.cjs`. Results: CLIENT internals were false and SERVER internals true; `require('react/compiler-runtime').c(1)` threw `Cannot read properties of undefined (reading 'H')`.
- **tsdown unbundle prototype.** Setup: `tsdown@0.23.1`, `unbundle: true`, ESM, `platform: 'neutral'`. Results: the `"use client"` directive was preserved on every `*.client.js`; server-safe `card.js` had no directive; `export * as Dialog` was emitted as an `__exportAll` getter object; `MODULE_LEVEL_DIRECTIVE` warnings were still printed.
- **Plain-Node loadability.** Default condition: the barrel loaded, and the `Dialog` namespace rendered through `react-dom/server`. `--conditions=react-server`: the server-safe entry loaded, and the client entry failed as expected (`does not provide an export named 'useState'`).
- **Tarball inspection** of `@base-ui/react@1.9.0`, `@radix-ui/react-dialog@1.3.1`, `@mantine/core@9.7.2`, `@mui/material@9.5.0`, `@heroui/react@3.2.6`, `@ark-ui/react@5.39.3` and `react-aria-components@1.22.1`:
  - No package references `compiler-runtime`.
  - Per-file `'use client'` is the norm. Radix bundles one file per package with the directive. React Aria Components uses `import "client-only"` instead.
  - Base UI uses `export * as Dialog from "./index.parts.mjs"`.
  - Mantine ships `styles.css`, `styles.layer.css` and `styles/*.css` with `sideEffects: ["*.css"]`.
- **`@astrojs/react@7.0.1` source:** a per-island `identifierPrefix` is set on both server and client.
