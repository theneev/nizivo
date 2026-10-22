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
