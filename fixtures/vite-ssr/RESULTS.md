# Vite SSR fixture: results

Vite 8 server rendering without a framework (ARCHITECTURE.md §18.1, §21.2 "Vite SSR and React Router 8
fixtures"; r1 §5.2, §11.5). Added in week 17 (2026-10-23), run with `pnpm fixture:vite-ssr` and as the
release lane `fixture-vite-ssr`; `--record` rewrites `results/build.json`.

**How it is built.** `vite build` makes the client (`dist/client`, the pages of fixtures/vite with the
same stylesheet imports), `vite build --ssr src/entry-server.jsx` the server (`dist/server`), and
`server.js` (node:http) renders each path with `renderToString` into the client's `index.html`. The
client entry hydrates with `hydrateRoot` and logs every recoverable error. **No `ssr.noExternal`**: the
server bundle keeps all 19 `@nizivo/*` imports external (`@nizivo/react`, `@nizivo/react/alert`, `@nizivo/react/button`, `@nizivo/react/checkbox`, `@nizivo/react/dialog`, `@nizivo/react/field`, `@nizivo/react/fieldset`, `@nizivo/react/heading`, `@nizivo/react/input`, `@nizivo/react/menu`, `@nizivo/react/native-select`, `@nizivo/react/radio-group`, `@nizivo/react/segmented-control`, `@nizivo/react/select`, `@nizivo/react/stack`, `@nizivo/react/switch`, `@nizivo/react/tabs`, `@nizivo/react/textarea`, `@nizivo/react/tooltip`), so Node loads the
published files as they are; a package whose JavaScript imported its own CSS would crash there with
`ERR_UNKNOWN_FILE_EXTENSION ".css"` (decision D7 keeps CSS out of Nizivo's JavaScript).

**Verdict: all 8 pages pass** (Vite 8.3.4, React 19.3.0, react-aria-components
1.22.1, Chromium 156.0.8078.4): both builds print no warning (no `MODULE_LEVEL_DIRECTIVE`); every page
hydrates with 0 console messages; axe finds nothing in light, dark, forced colours or with reduced
motion; and the interactions the Next fixture runs on the same pages pass after hydration (Select,
Dialog and Tooltip; the dismissible Alert; the forms' native submit; a Menu open on first render;
Tabs). Negative control, not recorded: a heading that renders "server" on the server and "client" in
the browser fails the page with one console message.

Not measured here: which client modules each page ships. The pages share one client bundle, because
`renderToString` does not wait for lazy chunks; fixtures/vite and fixtures/next measure tree-shaking.

## CSP Profile A/B and Trusted Types (v0.3, 2026-10-27)

`fixtures/runner/csp.ts` (lane `fixture-csp`; ARCHITECTURE.md §19.3, R13) serves this fixture's
server HTML under each policy, with a fresh nonce per response on the header, every `<script>` and
modulepreload, and `<meta property="csp-nonce">`, and checks Chromium, WebKit and Firefox.
`results/csp.json` is the recorded run.

**Verdict: Profile A holds on every page in all three engines; so does the theme script allowed by
its published SHA-256 instead of a nonce; Profile B holds on the server-safe pages. Trusted Types
(report-only, Chromium) reports nothing.**

- **Profile A** (`style-src-attr 'unsafe-inline'`): no violation, no console message, the Dialog and
  the Select open. The csp-nonce meta matters: without it, React Aria's injected `<style>` (its
  `touch-action` rule for pressables) is blocked on every page with a pressable, in every engine.
- **Profile B** (`style-src-attr 'none'`): the server renders one `style=` attribute on these pages:
  React Aria's visually hidden wrapper around the Select's hidden `<select>` on `/overlays` (R13).
  All three engines block it; the Select still opens and submits (its hidden control is off screen
  either way). WebKit also reports `style-src-attr` on every `<select>` element (the NativeSelect on
  `/forms`, the hidden one on `/overlays`) with no `style` attribute in the HTML: its own form
  control rendering, recorded and not failed.
- **All three engines enforce `style-src-attr`** (the control page's attribute is blocked), so the
  plan's matrix is now verified in Firefox too.
- **The theme script's hash** in its JSDoc is checked by a unit test
  (`test/ssr/theme-script.test.tsx`) and allowed by the `hash` policy here.
