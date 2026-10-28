import type { JSX, ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { HomeAnnouncement, HomeFooter } from '../../components/home';
import { SiteHeader } from '../../components/site-header';
import { SkipLink } from '../../components/skip-link';
import { VERSION } from '../../lib/version';
import { homeOptions } from '../layout.config';

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      <SkipLink target="content" />
      <HomeLayout
        {...homeOptions}
        nav={{
          component: (
            <>
              <HomeAnnouncement version={VERSION} />
              <SiteHeader />
            </>
          ),
        }}
      >
        {children}
      </HomeLayout>
      {/* after <main>, so it stays the page's contentinfo landmark */}
      <HomeFooter version={VERSION} />
    </>
  );
}
