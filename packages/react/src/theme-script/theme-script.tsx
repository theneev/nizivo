// NO directive: server-safe (ARCHITECTURE.md §7.4, §19.3). An inline script that runs in <head>,
// before the body is parsed, so nothing paints before it. Both halves: the saved theme and the
// platform (D-z).
import type { ReactElement } from 'react';

/**
 * The script `ThemeScript` renders, for frameworks that inline it themselves (Astro:
 * `<script is:inline set:html={themeScript} />`; Vite: a `transformIndexHtml` tag) or that allow it
 * by hash under a strict CSP. It runs in `<head>`, before `<body>` exists, and sets two attributes on
 * `<html>`:
 *
 * - **`data-nz-theme`, the reader's saved theme.** It reads `localStorage` key `nz-theme`; when the
 *   value is `"light"`, `"dark"` or `"system"`, it sets `data-nz-theme` to that value, replacing what
 *   the server rendered (the server's value is the app's default; the stored one is the reader's
 *   choice). `"system"` is set as is, not resolved: CSS follows the operating system from it, live,
 *   with no listener. With nothing stored, any other value, or storage blocked (a sandboxed frame,
 *   disabled site data), the attribute is left as the server rendered it. A theme switch saves the
 *   choice with `localStorage.setItem('nz-theme', value)` and sets the attribute itself.
 * - **`data-nz-platform`**: `"apple"` when the platform string matches `/mac|iphone|ipad|ipod/i`,
 *   else `"other"`. The platform string is `navigator.userAgentData.platform` where the browser has
 *   it (Chromium: `"macOS"`, `"Windows"`, …), else `navigator.platform` (`"MacIntel"`, `"iPhone"`,
 *   `"iPad"`; iPadOS reports `"MacIntel"`, which is still Apple). It never reads the user-agent
 *   string. A value already on `<html>` (set by the server, or by a test) is kept. Kbd reads the
 *   attribute to show `⌘K` or `Ctrl+K`.
 *
 * Each half runs in its own `try`, so blocked storage never stops the platform half, and the script
 * never throws into the page.
 *
 * Under a strict CSP, allow it by hash: `script-src 'sha256-nA1HUQWDdDUFqqoxWbjzCzcYSjzWLEe0pwDdRCMGqOw='`.
 * The hash changes only when the script does, and a change is called out in the changelog.
 */
export const themeScript: string =
  '(function(d){try{var t=localStorage.getItem("nz-theme");if(/^(light|dark|system)$/.test(t))d.setAttribute("data-nz-theme",t)}catch(e){}try{if(!d.hasAttribute("data-nz-platform")){var n=navigator,p=(n.userAgentData&&n.userAgentData.platform)||n.platform||"";d.setAttribute("data-nz-platform",/mac|iphone|ipad|ipod/i.test(p)?"apple":"other")}}catch(e){}})(document.documentElement)';

export interface ThemeScriptProps {
  /** The CSP nonce for the inline script (`script-src 'nonce-…'`). Not needed with a hash allowlist. */
  nonce?: string;
}

/**
 * Sets page-level attributes before first paint, so nothing changes once the page has painted: the
 * reader's saved theme (`data-nz-theme` from `localStorage` key `nz-theme`: `light`, `dark` or
 * `system`) and `data-nz-platform` (`apple` or `other`). The rules are on `themeScript`. Render it in
 * `<head>` (`<head><ThemeScript nonce={nonce} /></head>` in a root layout), put the app's default
 * theme on `<html>` (`data-nz-theme="system"`, or none for light), and put `suppressHydrationWarning`
 * on `<html>`, whose attributes the script changes.
 */
export function ThemeScript({ nonce }: ThemeScriptProps): ReactElement {
  return (
    <script
      // Browsers hide a nonce from the DOM after load, so the hydrated value never matches.
      suppressHydrationWarning
      {...(nonce === undefined ? {} : { nonce })}
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}
