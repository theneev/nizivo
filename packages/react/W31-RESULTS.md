# Week 31 results (v0.3 week 9: CSP and Trusted Types, and RTL geometry)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 31 status", §19.3, R13, §16.4, §23.4 D-dl).
Every number below comes from a command run on the maintainer's Mac.

## What was built

- **Lane `fixture-csp`** (28 release lanes; D-dl): the Vite SSR fixture's server HTML under five
  policies in Chromium, WebKit and Firefox. Details and the recorded run:
  `fixtures/vite-ssr/RESULTS.md` ("CSP Profile A/B and Trusted Types") and `results/csp.json`.
- **A unit test** pins the theme script's published SHA-256 (`test/ssr/theme-script.test.tsx`).
- **`test/overlay/rtl.spec.tsx`**: 16 cases, run by every overlay lane.

## Results

| Check                                                                   | Chromium | WebKit | Firefox |
| ----------------------------------------------------------------------- | -------- | ------ | ------- |
| Profile A: no violation, overlays open                                  | pass     | pass   | pass    |
| Theme script by its published hash                                      | pass     | pass   | pass    |
| Without the csp-nonce meta, React Aria's `<style>` is blocked (control) | yes      | yes    | yes     |
| Profile B on the server-safe pages                                      | pass     | pass   | pass    |
| `style-src-attr` enforced (control page)                                | yes      | yes    | yes     |
| Trusted Types reports (report-only)                                     | 0        | n/a    | n/a     |
| RTL geometry, 16 cases                                                  | pass     | pass   | pass    |

- **Profile B, engine pages:** the server renders one `style=` attribute, on React Aria's visually
  hidden wrapper of the Select's hidden `<select>` (`/overlays`); all three engines block it, and the
  Select still opens (whether the hidden control then shows was not checked). WebKit also reports `style-src-attr` on every `<select>` element with no
  attribute in the HTML (its own form-control rendering).
- **Firefox enforces `style-src-attr`**, so §19.3's matrix is now verified in all three engines.

## Found on the way (test-side, not bugs)

- An HTML comment in the SSR template contains the text `<head>`, so the first version of the
  runner put the nonce meta inside the comment and Profile A failed on every pressable page.
- A transform does not apply to an inline box, and WebKit then computes `scale` as `none`: the RTL
  glyph case loads `pagination.css` (the arrows are `inline-flex` there).
- The overlay lane's viewport is 414 px wide, so a popup placed on the narrow side of a centred
  trigger flips; the side cases place the trigger with room on the expected side.

## For the maintainer

1. **R13 stays open:** under Profile B, React Aria's server-rendered wrapper of the Select's hidden
   `<select>` loses its inline clipping, so that control may show on the page until hydration
   (or after it: hydration does not repair a blocked attribute). Not checked visually. The fix is
   an adapter change: render that wrapper with Nizivo's `.nz-visually-hidden` class.

## Unverified

- Trusted Types in WebKit and Firefox (neither enforces it).
- Profile B on a Next app with streaming; this lane is Vite SSR's `renderToString`.
