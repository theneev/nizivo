'use client';
// Optional client configuration (ARCHITECTURE.md §16.4). No provider is required: without one, the
// locale is 'en-US', every part shows its English defaults, and nothing reads `navigator.language`
// during render.
import { createContext, use, useMemo, type JSX, type ReactNode } from 'react';
import type { enUS } from '../locales/en-US';

/**
 * Built-in strings for every client part in the scope, shaped like the `enUS` catalogue
 * (`@nizivo/react/locales/en-US`): keyed by component, every key and every string optional, so a
 * whole catalogue of another locale fits. Read by the client parts the Strings guide lists; the
 * other keys (server parts such as Pagination, Button and Breadcrumb, which cannot read a context,
 * and AlertDismiss) are ignored here, and those parts take `labels` per instance.
 */
export type NizivoLabels = { [K in keyof typeof enUS]?: Partial<(typeof enUS)[K]> };

export interface NizivoConfigProps {
  /** BCP 47 tag used by engine-backed parts. @default 'en-US' */
  locale?: string;
  /**
   * Built-in strings for the client parts in this scope. A part's own `labels` prop wins key by
   * key; a key neither sets falls back to the English default. Keep the object stable (a module
   * constant or memoised), as with any context value.
   */
  labels?: NizivoLabels;
  children?: ReactNode;
}

interface ConfigValue {
  locale: string;
  labels?: NizivoLabels | undefined;
}

const ConfigContext = createContext<ConfigValue>({ locale: 'en-US' });

export function NizivoConfig({
  locale = 'en-US',
  labels,
  children,
}: NizivoConfigProps): JSX.Element {
  const value = useMemo(() => ({ locale, labels }), [locale, labels]);
  return <ConfigContext value={value}>{children}</ConfigContext>;
}

/** The resolved locale. Internal: engine roots read it through EngineLocale. */
export function useResolvedLocale(): string {
  return use(ConfigContext).locale;
}

/**
 * A client part's labels: its own `labels` prop over the scope's `NizivoConfig labels[key]`, key by
 * key. Undefined when neither sets anything, so the part's own English default applies.
 * Internal: server parts never call it (they cannot read a context).
 */
export function useLabels<K extends keyof NizivoLabels>(
  key: K,
  own: NizivoLabels[K],
): NizivoLabels[K] {
  const scope = use(ConfigContext).labels?.[key];
  return scope === undefined ? own : { ...scope, ...own };
}
