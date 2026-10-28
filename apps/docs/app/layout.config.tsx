// The options the home and docs layouts share. The site header (components/site-header.tsx, M90)
// replaces Fumadocs' nav on both and carries the brand, the sections, search, GitHub and the theme,
// so Fumadocs' own theme switch and search box are off: the sidebar would repeat them.
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  themeSwitch: { enabled: false },
  searchToggle: { enabled: false },
};

/** The home page uses the same options. */
export const homeOptions: BaseLayoutProps = baseOptions;
