// Shiki themes for every code block on the site: MDX code fences (source.config.ts) and the
// generated snippets (ServerCodeBlock). Fumadocs' defaults, github-light and github-dark, put some
// token colours under WCAG 1.4.3's 4.5:1 on Nizivo's surfaces (axe: #e36209 at 3.48:1 on
// --nz-bg-surface in light, comments at 3.6:1 in dark). With these two, every token colour used for
// code is at least 5.04:1 on #ffffff (light) and 5.64:1 on #181b19 (dark).
export const CODE_THEMES = {
  light: 'github-light-high-contrast',
  dark: 'github-dark-default',
} as const;
