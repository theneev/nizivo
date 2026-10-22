// The toast queue and the announcer's channel (ARCHITECTURE.md §12.6). NO directive and no React:
// `toast()` and `announce()` may be called from any client code, an event handler or an action's
// result, before or after a Toaster mounts. One module-level queue, whatever renders it; the Toaster
// reads it through useSyncExternalStore.
import type { ToastRecord } from './seam';
import type { Politeness, ToastOptions } from './toast.contract';

const TIMEOUT = 5000;

interface Entry {
  record: ToastRecord;
  onClose: (() => void) | undefined;
  /** Milliseconds left; `null` for a toast that stays. */
  remaining: number | null;
  started: number;
  handle: ReturnType<typeof setTimeout> | undefined;
}

let entries: Entry[] = [];
let snapshot: readonly ToastRecord[] = [];
const listeners = new Set<() => void>();
/** Why the clock is stopped: the region (`region`: hover, focus within), the page (`hidden`). */
const pauses = new Set<string>();
/** Ids a Toaster shows; a waiting toast's clock does not run. */
let shown = new Set<string>();
let hosts = 0;
let next = 0;

type Speaker = (text: string, politeness: Politeness) => void;
let speaker: Speaker | undefined;

declare const process: { env: { NODE_ENV?: string } };

function emit(): void {
  snapshot = entries.map((entry) => entry.record);
  for (const listener of listeners) listener();
}

function stop(entry: Entry): void {
  if (entry.handle === undefined) return;
  clearTimeout(entry.handle);
  entry.handle = undefined;
  if (entry.remaining !== null) entry.remaining -= Date.now() - entry.started;
}

/** Runs each clock that may run: a shown toast that leaves on its own, a Toaster mounted, no pause. */
function sync(): void {
  const running = hosts > 0 && pauses.size === 0;
  for (const entry of entries) {
    if (!running || !shown.has(entry.record.id) || entry.remaining === null) stop(entry);
    else if (entry.handle === undefined) {
      const { id } = entry.record;
      entry.started = Date.now();
      entry.handle = setTimeout(() => dismiss(id), Math.max(0, entry.remaining));
    }
  }
}

/** The text a toast speaks: its message, then its description. */
function spoken(record: ToastRecord): string {
  if (record.description === undefined) return record.message;
  const separator = /[.!?…:]$/.test(record.message) ? ' ' : '. ';
  return record.message + separator + record.description;
}

function add(message: string, options: ToastOptions = {}): string {
  const tone = options.tone ?? 'neutral';
  const stays = options.action !== undefined || tone === 'critical';
  const timeout = stays ? null : (options.timeout ?? TIMEOUT);
  const id = options.id ?? `nz-toast-${(next += 1)}`;
  const record: ToastRecord = {
    id,
    message,
    tone,
    description: options.description,
    action: options.action,
    timeout,
  };
  const entry: Entry = {
    record,
    onClose: options.onClose,
    remaining: timeout,
    started: 0,
    handle: undefined,
  };
  const at = entries.findIndex((existing) => existing.record.id === id);
  if (at === -1) entries = [...entries, entry];
  else {
    const previous = entries[at];
    if (previous !== undefined) stop(previous);
    entries = entries.with(at, entry);
  }
  emit();
  sync();
  announce(spoken(record), tone === 'critical' ? 'assertive' : 'polite');
  return id;
}

/** Removes one toast, or every toast with no id. */
function dismiss(id?: string): void {
  const leaving = entries.filter((entry) => id === undefined || entry.record.id === id);
  if (leaving.length === 0) return;
  for (const entry of leaving) stop(entry);
  entries = entries.filter((entry) => !leaving.includes(entry));
  emit();
  for (const entry of leaving) entry.onClose?.();
}

/**
 * Shows a toast and returns its id. A toast with an action, or a critical one, stays until it is
 * dismissed; any other leaves after `timeout` (5 s). Every toast is spoken once through the Toaster's
 * announcer: polite, or assertive when critical. Render one `<Toaster />` in the app's root layout.
 */
export const toast: ((message: string, options?: ToastOptions) => string) & {
  /** Removes the toast with this id, or every toast. */
  dismiss: (id?: string) => void;
} = Object.assign(add, { dismiss });

/**
 * Speaks `message` through the Toaster's announcer, a live region that is on the page before any
 * message and stays reachable above a modal. For status a sighted user sees some other way: "Saved",
 * "3 results". Needs a mounted `<Toaster />`.
 */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  if (speaker !== undefined) speaker(message, politeness);
  else if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `Nizivo: announce("${message}") ran with no <Toaster /> mounted, so nothing spoke it.`,
    );
  }
}

// --- the Toaster's side ------------------------------------------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): readonly ToastRecord[] {
  return snapshot;
}

const EMPTY: readonly ToastRecord[] = [];

/** The server renders no toast: the queue is the browser's. */
export function getServerSnapshot(): readonly ToastRecord[] {
  return EMPTY;
}

/** A Toaster mounted; clocks run while one is. Returns its unmount. */
export function attach(): () => void {
  hosts += 1;
  sync();
  return () => {
    hosts -= 1;
    sync();
  };
}

/** The ids the Toaster shows: the newest `limit`. */
export function show(ids: readonly string[]): void {
  shown = new Set(ids);
  sync();
}

export function pause(reason: string): void {
  pauses.add(reason);
  sync();
}

export function resume(reason: string): void {
  pauses.delete(reason);
  sync();
}

/** The announcer registers here while mounted. Returns its unregister. */
export function speakThrough(speak: Speaker): () => void {
  speaker = speak;
  return () => {
    if (speaker === speak) speaker = undefined;
  };
}
