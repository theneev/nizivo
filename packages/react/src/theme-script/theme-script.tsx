// NO directive: server-safe (ARCHITECTURE.md §7.4, §19.3). An inline script that runs in <head>,
// before the body is parsed, so nothing paints before it.
import type { ReactElement } from 'react';

/**
 * The script `ThemeScript` renders, for frameworks that inline it themselves (Astro:
 * `<script is:inline set:html={themeScript} />`) or that allow it by hash under a strict CSP.
 *
 * It sets `data-nz-platform` on `<html>`: `"apple"` when the platform string matches
 * `/mac|iphone|ipad|ipod/i`, else `"other"`. The platform string is
 * `navigator.userAgentData.platform` where the browser has it (Chromium: `"macOS"`, `"Windows"`, …),
 * else `navigator.platform` (`"MacIntel"`, `"iPhone"`, `"iPad"`; iPadOS reports `"MacIntel"`, which is
 * still Apple). It never reads the user-agent string. An attribute already on `<html>` (set by the
 * server, or by a test) is kept. Kbd reads the attribute to show `⌘K` or `Ctrl+K`.
 *
 * Persisting the user's theme choice (§7.4) is not in this script yet.
 *
 * Under a strict CSP, allow it by hash: `script-src 'sha256-HZHIu/4RWssbJrteyX51NbvdyR6ZSlZlY4BPl3yXw+I='`.
 * The hash changes only when the script does, and a change is called out in the changelog.
 */
export const themeScript: string =
  '(function(d){try{if(!d.hasAttribute("data-nz-platform")){var n=navigator,p=(n.userAgentData&&n.userAgentData.platform)||n.platform||"";d.setAttribute("data-nz-platform",/mac|iphone|ipad|ipod/i.test(p)?"apple":"other")}}catch(e){}})(document.documentElement)';

export interface ThemeScriptProps {
  /** The CSP nonce for the inline script (`script-src 'nonce-…'`). Not needed with a hash allowlist. */
  nonce?: string;
}

/**
 * Sets page-level attributes before first paint, so nothing changes once the page has painted. Render
 * it in `<head>` (`<head><ThemeScript nonce={nonce} /></head>` in a root layout), and put
 * `suppressHydrationWarning` on `<html>`, whose attributes the script changes. Today it sets
 * `data-nz-platform` (`apple` or `other`; the detection rule is on `themeScript`).
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
