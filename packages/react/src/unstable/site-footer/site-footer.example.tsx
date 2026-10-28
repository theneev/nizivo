import type { JSX } from 'react';
import { Link } from '../link/index';
import { SiteFooter } from './index';

/** A footer: the brand, three columns and the legal row. */
export function SiteFooterExample(): JSX.Element {
  return (
    <SiteFooter
      brand={<Link href="/">Nizivo</Link>}
      description="Calm, accessible product UI from one set of tokens."
      columns={[
        {
          title: 'Product',
          links: [
            { label: 'Components', href: '/docs/components/' },
            { label: 'Patterns', href: '/docs/patterns/' },
            { label: 'Changelog', href: '/changelog/' },
          ],
        },
        {
          title: 'Resources',
          links: [
            { label: 'Getting started', href: '/docs/getting-started/' },
            { label: 'Accessibility', href: '/docs/accessibility/' },
            { label: 'Tokens', href: '/docs/tokens/' },
          ],
        },
        {
          title: 'Company',
          links: [
            { label: 'About', href: '/about/' },
            { label: 'Contact', href: '/contact/' },
          ],
        },
      ]}
      legal={
        <>
          <span>Nizivo · v0.6</span>
          <span>
            <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a>
          </span>
        </>
      }
    />
  );
}
