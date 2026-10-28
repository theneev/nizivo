import type { JSX } from 'react';
import { Button } from '../../button/index';
import { Link } from '../link/index';
import { SiteNavbar } from './index';

const LINKS = [
  { label: 'Product', href: '/product/' },
  { label: 'Components', href: '/docs/components/', current: true },
  { label: 'Docs', href: '/docs/' },
  { label: 'Pricing', href: '/pricing/' },
];

/** Two styles: the full-width bar, and the floating pill for over a hero. */
export function SiteNavbarExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 24, inlineSize: 960 }}>
      <SiteNavbar
        brand={<Link href="/">Nizivo</Link>}
        links={LINKS}
        actions={
          <>
            <Button variant="tertiary">Sign in</Button>
            <Button variant="primary">Get started</Button>
          </>
        }
      />
      <SiteNavbar
        variant="floating"
        brand={<Link href="/">Nizivo</Link>}
        links={LINKS}
        actions={<Button variant="primary">Get started</Button>}
      />
    </div>
  );
}
