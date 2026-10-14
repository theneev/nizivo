// The site's theme, applied in <head> before <body> exists, so there is no flash on load
// (ARCHITECTURE.md §7.4). It resolves the reader's choice exactly as next-themes 0.4.6 does (the
// theme switch's store, components/provider.tsx): the value in localStorage under `theme`, else
// `system`; `system` follows `prefers-color-scheme`. It then writes what next-themes writes, so
// next-themes' own script, which runs later inside <body>, changes nothing:
// - the `light` or `dark` class, which Fumadocs' styles key on;
// - `data-nz-theme="light"` or `"dark"`, Nizivo's own theme scope;
// - `style.colorScheme`, so form controls and scrollbars match.
// Then Nizivo's own `themeScript` (@nizivo/react/theme-script) sets `data-nz-platform` (`apple` or
// `other`), which Kbd reads to spell `mod` as ⌘ or Ctrl (contracts/vocabulary.json). The theme half
// stays here until ThemeScript persists the theme choice too (§7.4).
import { themeScript } from '@nizivo/react/theme-script';

/** Both attributes the theme switch writes on <html>. */
export const THEME_ATTRIBUTES = ['class', 'data-nz-theme'] as const;
export const THEME_STORAGE_KEY = 'theme';

export const THEME_SCRIPT = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.classList.remove("light","dark");d.classList.add(t);d.setAttribute("data-nz-theme",t);d.style.colorScheme=t})();${themeScript}`;
