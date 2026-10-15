// The site's theme. Before first paint, Nizivo's own ThemeScript (@nizivo/react/theme-script, in
// <head>, app/layout.tsx) restores the reader's choice: it reads localStorage `nz-theme` (`light`,
// `dark` or `system`) and sets `data-nz-theme` on <html>, over the server's `data-nz-theme="system"`.
// With nothing stored, `system` follows `prefers-color-scheme` in CSS. It also sets
// `data-nz-platform`, which Kbd reads to spell `mod` as ⌘ or Ctrl (contracts/vocabulary.json).
//
// The theme switch is Fumadocs' own, on next-themes (components/provider.tsx). It stores the choice
// under the same key with the same three values, so ThemeScript reads what the switch wrote. next-themes
// writes only the `dark` class: its own script, at the top of <body>, would copy any stored value onto
// <html> unchecked, so an unknown one (a foreign or corrupt `nz-theme`) would undo ThemeScript's
// `system` and paint the page light under a dark OS (week 6 review). `data-nz-theme` is ThemeScript's
// until hydration; then components/provider.tsx writes the resolved theme (`light` or `dark`) and puts
// an unknown stored value back to `system`. The paint does not change at hydration, because `system`
// resolves to that same scheme in CSS. Nothing visible depends on the `dark` class before next-themes'
// script sets it: the colours, code highlighting included, follow `data-nz-theme` through
// `light-dark()` (app/global.css).

/** The attribute next-themes writes on <html>: Fumadocs' `dark` class. */
export const THEME_ATTRIBUTE = 'class';
/** The values ThemeScript applies; any other stored value is ignored. */
export const THEME_VALUES: readonly string[] = ['light', 'dark', 'system'];
/** ThemeScript's key: the switch must store the choice where ThemeScript reads it. */
export const THEME_STORAGE_KEY = 'nz-theme';
