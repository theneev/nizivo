import type { JSX, ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { DrawerFocus } from '../../components/drawer-focus';
import { SiteHeader } from '../../components/site-header';
import { SkipLink } from '../../components/skip-link';
import { source } from '../../lib/source';
import { baseOptions } from '../layout.config';

// Fumadocs' notebook layout: the site header (components/site-header.tsx, M90) across the top, the
// sidebar and the page under it.
export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      {/* Fumadocs renders each page in article#nd-page; the pages give it tabIndex={-1}. */}
      <SkipLink target="nd-page" />
      <DocsLayout
        tree={source.pageTree}
        {...baseOptions}
        nav={{ mode: 'top', component: <SiteHeader docs /> }}
      >
        <DrawerFocus />
        {children}
      </DocsLayout>
    </>
  );
}
