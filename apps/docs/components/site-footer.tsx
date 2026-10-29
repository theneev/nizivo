// The site's footer (Figma's Site Footer on the Website page, M90), on the home page and every docs
// page, after the layout so it stays the page's contentinfo landmark. A module of its own, so the
// docs pages do not import the home page's client parts.
import type { JSX } from 'react';
import { SiteFooter } from '@nizivo/react/unstable/site-footer';
import { REPO_URL } from '../lib/repo-url';
import { Mark } from './site-mark';

export function PageFooter({ version }: { version: string }): JSX.Element {
  return (
    <SiteFooter
      className="nz-home-footer"
      brand={
        <a href="/" className="nz-home-footer-brand">
          <Mark size={28} />
          <span className="nz-visually-hidden">Nizivo UI home</span>
        </a>
      }
      description="Calm, accessible product UI from one set of tokens."
      columns={[
        {
          title: 'Product',
          links: [
            { label: 'Components', href: '/docs/components/' },
            { label: 'Patterns', href: '/docs/patterns/' },
            { label: 'Charts', href: '/docs/charts/' },
            { label: 'Changelog', href: '/docs/changelog/' },
          ],
        },
        {
          title: 'Resources',
          links: [
            { label: 'Getting started', href: '/docs/getting-started/next/' },
            { label: 'Foundations', href: '/docs/foundations/colour/' },
            { label: 'Tokens', href: '/docs/foundations/tokens/' },
            { label: 'Icons', href: '/docs/icons/' },
          ],
        },
        {
          title: 'Project',
          links: [
            { label: 'GitHub', href: REPO_URL },
            { label: 'npm', href: 'https://www.npmjs.com/package/@nizivo/react' },
            { label: 'Licence', href: `${REPO_URL}/blob/main/LICENSE` },
          ],
        },
      ]}
      legal={
        <>
          <span>Nizivo UI · v{version}</span>
          <span>Apache-2.0</span>
        </>
      }
    />
  );
}
