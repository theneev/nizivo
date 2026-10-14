'use client';
// Optional client configuration (ARCHITECTURE.md §16.4). No provider is required: without one, the
// locale is 'en-US', and nothing reads `navigator.language` during render.
import { createContext, use, useMemo, type JSX, type ReactNode } from 'react';

export interface NizivoConfigProps {
  /** BCP 47 tag used by engine-backed parts. @default 'en-US' */
  locale?: string;
  children?: ReactNode;
}

interface ConfigValue {
  locale: string;
}

const ConfigContext = createContext<ConfigValue>({ locale: 'en-US' });

export function NizivoConfig({ locale = 'en-US', children }: NizivoConfigProps): JSX.Element {
  const value = useMemo(() => ({ locale }), [locale]);
  return <ConfigContext value={value}>{children}</ConfigContext>;
}

/** The resolved locale. Internal: engine roots read it through EngineLocale. */
export function useResolvedLocale(): string {
  return use(ConfigContext).locale;
}
