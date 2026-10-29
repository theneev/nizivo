import type { JSX, ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { DrawerFocus } from '../../components/drawer-focus';
import { PageFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { SkipLink } from '../../components/skip-link';
import { sectionTree } from '../../lib/sections';
import { source } from '../../lib/source';
import { VERSION } from '../../lib/version';
import { baseOptions } from '../layout.config';

// Fumadocs' notebook layout: the site header (components/site-header.tsx, M90) across the top, the
// sidebar and the page under it. The sidebar and the previous and next cards keep to the header's
// current section (lib/sections.ts); the header's tabs are the only section switch, so Fumadocs'
// own sidebar tabs are off.
const tree = sectionTree(source.pageTree);

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      {/* Fumadocs renders each page in article#nd-page; the pages give it tabIndex={-1}. */}
      <SkipLink target="nd-page" />
      <DocsLayout
        tree={tree}
        tabs={false}
        {...baseOptions}
        nav={{ mode: 'top', component: <SiteHeader docs /> }}
      >
        <DrawerFocus />
        {children}
      </DocsLayout>
      {/* the home page's footer, after the layout, so it stays the page's contentinfo landmark */}
      <PageFooter version={VERSION} />
    </>
  );
}
