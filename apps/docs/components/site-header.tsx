'use client';
// The site's header (Figma's Docs Header 7416:78, on the Website and Docs Site pages; M90): the
// sprout mark and the version, the section tabs, search, GitHub, the theme and "Get started". It
// replaces Fumadocs' own nav on the home page and the docs pages alike. The current section's tab
// carries aria-current (lib/sections.ts); below 1024 px the tabs go into a menu, and on a docs page
// a second button opens the sidebar, the current section's pages. Search opens the docs'
// static-index dialog (components/search-dialog.tsx), as ⌘K does. The theme button steps Light, Dark, System, so a reader who picked one can follow the
// OS again (Fumadocs' three-way switch did the same).
import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { useTheme } from 'fumadocs-ui/provider/base';
import { Button } from '@nizivo/react/button';
// IconButtonStatic: IconButton ships its tooltip chain even with tooltip={false} (its own docs)
import { IconButtonStatic } from '@nizivo/react/icon-button';
import { Kbd } from '@nizivo/react/kbd';
import { List } from '@nizivo/icons/list';
import { Monitor } from '@nizivo/icons/monitor';
import { Moon } from '@nizivo/icons/moon';
import { PanelLeft } from '@nizivo/icons/panel-left';
import { Search } from '@nizivo/icons/search';
import { Sun } from '@nizivo/icons/sun';
import { REPO_URL } from '../lib/repo-url';
import { SECTIONS, sectionOf } from '../lib/sections';
import { Mark } from './site-mark';
import { VERSION } from '../lib/version';

/** GitHub's mark, decorative: the link carries the name. */
function GitHubMark(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const THEMES = ['light', 'dark', 'system'] as const;
const THEME_NAMES: Record<(typeof THEMES)[number], string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/** The theme now and the one the button steps to: Light → Dark → System. */
function useThemeStep(): { now: string; next: string; icon: JSX.Element; step: () => void } {
  const { theme, setTheme } = useTheme();
  const now = THEMES.find((t) => t === theme) ?? 'system';
  const next = THEMES[(THEMES.indexOf(now) + 1) % THEMES.length] ?? 'light';
  const icon = now === 'light' ? <Sun /> : now === 'dark' ? <Moon /> : <Monitor />;
  return { now: THEME_NAMES[now], next: THEME_NAMES[next], icon, step: () => setTheme(next) };
}

/** One button that steps the theme; its name says which it is and what comes next. */
function ThemeButton(): JSX.Element {
  const { now, next, icon, step } = useThemeStep();
  return (
    <IconButtonStatic
      aria-label={`Theme: ${now}. Switch to ${next}`}
      icon={icon}
      className="nz-site-icon nz-site-wide"
      data-site-theme=""
      onClick={step}
    />
  );
}

/** The same, as a row of the narrow menu. */
function ThemeItem(): JSX.Element {
  const { now, next, icon, step } = useThemeStep();
  return (
    <button type="button" className="nz-site-menu-item" onClick={step}>
      {icon}
      {`Theme: ${now}`}
      <span className="nz-visually-hidden">{`. Switch to ${next}`}</span>
    </button>
  );
}

/** The search field's look, as a button: it opens the search dialog, as ⌘K does. */
function SearchButton(): JSX.Element {
  const { setOpenSearch, enabled } = useSearchContext();
  return (
    <button
      type="button"
      className="nz-site-search"
      // the smoke's search checks find the trigger by this (scripts/smoke.ts)
      data-search-full=""
      disabled={!enabled}
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => setOpenSearch(true)}
    >
      <Search aria-hidden="true" />
      <span className="nz-site-search-text">Search docs…</span>
      <Kbd keys="mod+k" aria-hidden="true" className="nz-site-wide" />
    </button>
  );
}

/** On a docs page below 1024 px: opens the sidebar, the current section's pages. */
function SidebarButton(): JSX.Element {
  const { open, setOpen } = useSidebar();
  return (
    <IconButtonStatic
      aria-label="Pages"
      icon={<PanelLeft />}
      className="nz-site-icon nz-site-narrow"
      aria-expanded={open}
      // DrawerFocus finds the drawer's opener by this, to give focus back on close
      aria-controls="nd-sidebar-mobile"
      onClick={() => setOpen(!open)}
    />
  );
}

export function SiteHeader({ docs = false }: { docs?: boolean }): JSX.Element {
  const path = usePathname();
  const active = sectionOf(path)?.label;
  return (
    <header className="nz-site-header" data-docs={docs ? '' : undefined}>
      <div className="nz-site-brand">
        <Link href="/" className="nz-site-home">
          <Mark />
          <span className="nz-visually-hidden">Nizivo UI home</span>
        </Link>
        <Link href="/docs/changelog/" className="nz-site-version">
          <span className="nz-visually-hidden">Version </span>v{VERSION}
        </Link>
      </div>
      <nav aria-label="Sections" className="nz-site-tabs">
        {SECTIONS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="nz-site-tab"
            aria-current={active === s.label ? 'page' : undefined}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <span className="nz-site-spacer" />
      <SearchButton />
      <IconButtonStatic
        aria-label="GitHub"
        icon={<GitHubMark />}
        className="nz-site-icon nz-site-wide"
        render={<a href={REPO_URL} aria-label="GitHub" />}
      />
      <ThemeButton />
      <Button
        variant="primary"
        className="nz-site-cta nz-site-wide"
        render={<Link href="/docs/" />}
      >
        Get started
      </Button>
      {docs ? <SidebarButton /> : null}
      <details className="nz-site-menu nz-site-narrow">
        <summary className="nz-site-menu-button" aria-label="Menu">
          <List aria-hidden="true" />
        </summary>
        <nav aria-label="Sections" className="nz-site-menu-list">
          {SECTIONS.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="nz-site-menu-item"
              aria-current={active === s.label ? 'page' : undefined}
            >
              {s.label}
            </Link>
          ))}
          <a href={REPO_URL} className="nz-site-menu-item">
            <GitHubMark />
            GitHub
          </a>
          <ThemeItem />
        </nav>
      </details>
    </header>
  );
}
