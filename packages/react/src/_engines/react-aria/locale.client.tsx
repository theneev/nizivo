'use client';
// Every engine root is wrapped in EngineLocale (ARCHITECTURE.md §9.3 rule 5). Without it React Aria
// renders en-US on the server and switches to the browser locale after hydration.
import type { JSX, ReactNode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { useResolvedLocale } from '../../config/config.client';

export function EngineLocale({ children }: { children: ReactNode }): JSX.Element {
  return <I18nProvider locale={useResolvedLocale()}>{children}</I18nProvider>;
}
