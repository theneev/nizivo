# React Router fixture: results

React Router 8 framework mode on Vite 8 (ARCHITECTURE.md §18.1, §21.2 "Vite SSR and React Router 8
fixtures"; r1 §5.4). Added in week 17 (2026-10-23), run with `pnpm fixture:react-router` and as the
release lane `fixture-react-router`; `--record` rewrites `results/build.json`.

**How it is built.** The pages of fixtures/vite are framework-mode routes (`app/routes.js`).
`app/root.jsx` links every stylesheet through the `links` export with `?url` imports (Nizivo's
JavaScript never imports CSS) and puts the theme script in the Layout's `<head>`. `react-router build`
makes the client and the SSR build through Vite's Environment API; `server.js` serves `build/client`
and hands every other request to `@react-router/node`'s `createRequestListener`. The fixture writes its
own `entry.server.jsx` (`renderToPipeableStream`, waiting for `onAllReady`) and `entry.client.jsx`
(`hydrateRoot`, logging every recoverable error): with the default server entry, `react-router build`
tried to `npm install` isbot on its own, which the fixture must never do. **No `ssr.noExternal`**: the
server build keeps all 20 `@nizivo/*` imports external.

**Verdict: all 8 routes pass** (react-router and `@react-router/dev` 8.5.0, Vite 8.3.4,
React 19.3.0, Chromium 156.0.8078.4): the build prints no warning (no `MODULE_LEVEL_DIRECTIVE`); every route
hydrates with 0 console messages; axe finds nothing in light, dark, forced colours or with reduced
motion; the Next fixture's interactions pass after hydration; and each route ships exactly the client
modules of what it renders (the routes are code-split, so the marker checks run):

| Route            | Gzip JS over `/` | Nizivo client modules                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ---------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/button-only`   |           +1,638 | none                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `/t0-barrel`     |           +7,061 | none                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `/alert-dismiss` |           +2,150 | alert/alert-dismiss.client                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `/overlays`      |          +76,301 | _engines/react-aria/dialog.client, _engines/react-aria/locale.client, _engines/react-aria/open-state.client, _engines/react-aria/outside-press.client, _engines/react-aria/overlay.client, _engines/react-aria/popup.client, _engines/react-aria/select.client, _engines/react-aria/tooltip.client, _internal/modal.client, config/config.client, dialog/dialog.client, field/field-scope.client, select/select.client, tooltip/tooltip.client |
| `/forms`         |           +8,784 | checkbox/checkbox.client, field/field-scope.client, input/input.client, radio-group/radio-group.client, segmented-control/segmented-control.client, switch/switch.client, textarea/textarea.client                                                                                                                                                                                                                                             |
| `/menu`          |          +58,546 | _engines/react-aria/locale.client, _engines/react-aria/menu.client, _engines/react-aria/open-state.client, _engines/react-aria/outside-press.client, _engines/react-aria/overlay.client, _engines/react-aria/popup.client, config/config.client, menu/menu.client                                                                                                                                                                              |
| `/tabs`          |          +35,749 | _engines/react-aria/locale.client, _engines/react-aria/tabs.client, config/config.client, tabs/tabs.client                                                                                                                                                                                                                                                                                                                                     |

`/` (the route list, React and React Router) loads 115,191 B gzip. `/button-only` and `/t0-barrel` import
from the `@nizivo/react` barrel and ship no Nizivo client module. Negative control, not recorded: a
heading that renders "server" on the server and "client" in the browser fails the route with one
console message.

**Supply chain.** The fixture is its own pnpm workspace root with the monorepo's policy. One exception:
`trustPolicyExclude: semver@6.3.1` (`@react-router/dev > @babel/core > semver ^6.3.1`), a provenance
downgrade on semver's 6.x maintenance line published by an npm CLI maintainer (pnpm-workspace.yaml has
the reasoning). No dependency runs an install script.
