import type { JSX, ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DrawerFocus } from '../../components/drawer-focus';
import { SkipLink } from '../../components/skip-link';
import { source } from '../../lib/source';
import { baseOptions } from '../layout.config';

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      {/* Fumadocs renders each page in article#nd-page; the pages give it tabIndex={-1}. */}
      <SkipLink target="nd-page" />
      <DocsLayout tree={source.pageTree} {...baseOptions}>
        <DrawerFocus />
        {children}
      </DocsLayout>
    </>
  );
}
