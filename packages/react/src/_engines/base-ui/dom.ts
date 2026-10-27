// NO directive: plain functions used by the Base UI canary's adapters (ARCHITECTURE.md §9.3 rule 6,
// §10.4; D-dk). The canary is tested, never built or shipped (gen/adapter.ts).
import allowlist from './dom-allowlist.json' with { type: 'json' };

const ALLOWED: ReadonlySet<string> = new Set(allowlist.attributes);

/**
 * Filters the DOM props Base UI hands to a `render` function, as react-aria/dom.ts does for React
 * Aria: drops `className` (adapters write none) and every `data-*` but the functional allowlist, so
 * Base UI's `data-open`, `data-starting-style`, `data-highlighted`, … never reach the DOM.
 * Vocabulary attributes come only from `stateAttrs()` over render state.
 */
export function engineDom(props: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') continue;
    if (key.startsWith('data-') && !ALLOWED.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Drops `undefined` keys so optional props can be spread under exactOptionalPropertyTypes. */
export function defined<T extends object>(props: T): { [K in keyof T]?: T[K] & ({} | null) } {
  const out: { [K in keyof T]?: T[K] & ({} | null) } = {};
  for (const key in props) {
    const value = props[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
