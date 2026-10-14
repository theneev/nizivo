import type { JSX, ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { SkipLink } from '../../components/skip-link';
import { homeOptions } from '../layout.config';

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      <SkipLink target="content" />
      <HomeLayout {...homeOptions}>{children}</HomeLayout>
    </>
  );
}
