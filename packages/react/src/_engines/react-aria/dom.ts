// NO directive: plain functions used by the react-aria adapters (ARCHITECTURE.md §9.3 rule 6).
import allowlist from './dom-allowlist.json' with { type: 'json' };

const ALLOWED: ReadonlySet<string> = new Set(allowlist.attributes);

/**
 * Filters the DOM props React Aria hands to a `render` function:
 * - drops `className`: the engine's default `react-aria-*` classes are not ours, and adapters write none;
 * - drops `slot`: React Aria's context slot name (`slot="close"`) is not a DOM attribute of ours;
 * - drops every `data-*` except the functional allowlist. Vocabulary attributes come only from
 *   `stateAttrs()` over render state, so React Aria's `data-focused`, `data-rac`, `data-hovered` and
 *   its own copies of `data-open`, `data-invalid`, … never reach the DOM.
 */
export function engineDom(props: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className' || key === 'slot') continue;
    if (key.startsWith('data-') && !ALLOWED.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Drops `undefined` keys so optional props can be spread into engine props under exactOptionalPropertyTypes. */
export function defined<T extends object>(props: T): { [K in keyof T]?: T[K] & ({} | null) } {
  const out: { [K in keyof T]?: T[K] & ({} | null) } = {};
  for (const key in props) {
    const value = props[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
