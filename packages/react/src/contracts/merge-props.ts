// NO directive: used by server-safe and client parts alike (ARCHITECTURE.md §10.1).
import { cx } from '../_internal/cx';

type Props = Record<string, unknown>;
type Handler = (...args: unknown[]) => unknown;

/**
 * Merges prop objects from left ("ours") to right ("theirs"):
 * - `className` is concatenated, ours first, without repeating a class;
 * - `style` is shallow-merged, theirs winning;
 * - `on*` handlers are chained theirs-first, and ours skip when the event was `defaultPrevented`;
 * - refs are merged into one callback ref;
 * - any other key: the right-most defined value wins, and `undefined` never overrides.
 *
 * A function is created only when both sides supply one, so a server component that merges a
 * consumer element never synthesises a handler or ref (functions cannot cross the RSC boundary).
 */
export function mergeProps(...sources: ReadonlyArray<Props | undefined>): Props {
  const out: Props = {};
  for (const source of sources) {
    if (source === undefined) continue;
    for (const key of Object.keys(source)) {
      const theirs = source[key];
      if (theirs === undefined) continue;
      const ours = out[key];
      out[key] = ours === undefined ? theirs : mergeValue(key, ours, theirs);
    }
  }
  return out;
}

function mergeValue(key: string, ours: unknown, theirs: unknown): unknown {
  if (key === 'className' && typeof ours === 'string' && typeof theirs === 'string') {
    return cx(ours, theirs);
  }
  if (key === 'style' && isObject(ours) && isObject(theirs)) return { ...ours, ...theirs };
  if (key === 'ref' && isRef(ours) && isRef(theirs)) return mergeRefs(ours, theirs);
  if (/^on[A-Z]/.test(key) && isFunction(ours) && isFunction(theirs)) return chain(theirs, ours);
  return theirs;
}

function chain(theirs: Handler, ours: Handler): Handler {
  return (...args) => {
    theirs(...args);
    if (!isPrevented(args[0])) ours(...args);
  };
}

function isPrevented(event: unknown): boolean {
  return isObject(event) && event['defaultPrevented'] === true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFunction(value: unknown): value is Handler {
  return typeof value === 'function';
}

function isRefObject(value: unknown): value is { current: unknown } {
  return isObject(value) && 'current' in value;
}

type Ref = Handler | { current: unknown };

function isRef(value: unknown): value is Ref {
  return isFunction(value) || isRefObject(value);
}

/** Assigns `node` and returns the ref's React 19 cleanup, if it returned one. */
function assignRef(ref: Ref, node: unknown): Handler | undefined {
  if (isFunction(ref)) {
    const cleanup = ref(node);
    return isFunction(cleanup) ? cleanup : undefined;
  }
  ref.current = node;
  return undefined;
}

/** One callback ref for both; honours React 19 ref cleanups. */
function mergeRefs(a: Ref, b: Ref): (node: unknown) => () => void {
  return (node) => {
    const cleanups = [assignRef(a, node), assignRef(b, node)];
    return () => {
      cleanups.forEach((cleanup, i) => (cleanup ? cleanup() : assignRef(i === 0 ? a : b, null)));
    };
  };
}
