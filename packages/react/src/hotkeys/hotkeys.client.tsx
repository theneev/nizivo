'use client';
// @nizivo/react/hotkeys (ARCHITECTURE.md §17 G18; gap report A §5.4; M72). Keyboard shortcuts in
// one module-level registry: no provider, so it works across islands. A shortcut is written as Kbd
// and IconButton take it (`"mod+k"`: ⌘ on Apple platforms, Ctrl elsewhere); tinykeys 4 matches the
// presses. The registry is the one list a help dialog or the CommandMenu footer reads
// (`useHotkeys`). Policy, enforced here rather than left to the matcher's defaults:
// - never during an IME composition (`isComposing`, or the 229 key code some engines send);
// - not while typing in an input, a textarea, a select or an editable element, unless the shortcut
//   says `allowInInputs` (the command menu's ⌘K does);
// - a single printable key with no modifier is warned about in development: WCAG 2.1.4 asks for a
//   way to turn such shortcuts off.
import { useEffectEvent, useLayoutEffect, useSyncExternalStore } from 'react';
import { defaultKeybindingsHandlerIgnore, tinykeys } from 'tinykeys';
import { splitKeys } from '../_internal/keys';

declare const process: { env: { NODE_ENV?: string } };

/** A shortcut and what it does. */
export interface Hotkey {
  /** Unique in the page; registering an `id` again replaces the first. */
  id: string;
  /** `"mod+k"`, `"shift+?"`, `"mod+shift+d"`, as `Kbd keys` takes them. */
  keys: string;
  /** What it does, for a list of shortcuts: "Open the command menu". */
  description: string;
  /** Also while focus is in a text field. @default false */
  allowInInputs?: boolean;
  run: (event: KeyboardEvent) => void;
}

/** A registered shortcut as `useHotkeys` lists it. */
export interface HotkeyInfo {
  id: string;
  keys: string;
  description: string;
}

/** Our key names → tinykeys' (`event.key` values, `$mod` for the platform's command key). */
const TINYKEYS: Record<string, string> = {
  mod: '$mod',
  cmd: 'Meta',
  command: 'Meta',
  meta: 'Meta',
  ctrl: 'Control',
  control: 'Control',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
  esc: 'Escape',
  escape: 'Escape',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  space: 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  plus: '+',
};

/** `"mod+shift+k"` → tinykeys' `"$mod+Shift+k"`. */
export function toTinykeys(keys: string): string {
  return splitKeys(keys)
    .map((key) => TINYKEYS[key.toLowerCase()] ?? key)
    .join('+');
}

const registry = new Map<string, Hotkey>();
const listeners = new Set<() => void>();
const EMPTY: readonly HotkeyInfo[] = [];
let snapshot: readonly HotkeyInfo[] = EMPTY;
let detach: (() => void) | undefined;

const composing = (event: KeyboardEvent): boolean => event.isComposing || event.keyCode === 229;

/** Rebuilds the one window listener from the registry, and the list `useHotkeys` reads. */
function rebuild(): void {
  detach?.();
  detach = undefined;
  snapshot =
    registry.size === 0
      ? EMPTY
      : [...registry.values()].map(({ id, keys, description }) => ({ id, keys, description }));
  for (const listener of listeners) listener();
  if (registry.size === 0 || typeof window === 'undefined') return;
  const bindings: Record<string, (event: KeyboardEvent) => void> = {};
  for (const hotkey of registry.values()) {
    // the shortcut registered last wins a shared key
    bindings[toTinykeys(hotkey.keys)] = (event) => {
      if (composing(event)) return;
      if (hotkey.allowInInputs !== true && defaultKeybindingsHandlerIgnore(event)) return;
      hotkey.run(event);
    };
  }
  detach = tinykeys(window, bindings, { ignore: () => false });
}

/** Registers a shortcut; returns the function that removes it. */
export function registerHotkey(hotkey: Hotkey): () => void {
  if (process.env.NODE_ENV !== 'production') {
    const parts = splitKeys(hotkey.keys);
    if (parts.length === 1 && (parts[0] ?? '').length === 1) {
      console.warn(
        `@nizivo/react/hotkeys: "${hotkey.keys}" is a single printable key; WCAG 2.1.4 asks for a way to turn it off or remap it.`,
      );
    }
  }
  registry.set(hotkey.id, hotkey);
  rebuild();
  return () => {
    if (registry.get(hotkey.id) !== hotkey) return;
    registry.delete(hotkey.id);
    rebuild();
  };
}

/**
 * Registers a shortcut while the component is mounted (and not hidden in an Activity). `run` may
 * change on every render; the latest one runs.
 */
export function useHotkey(hotkey: Hotkey): void {
  const run = useEffectEvent((event: KeyboardEvent) => hotkey.run(event));
  const { id, keys, description, allowInInputs } = hotkey;
  // a layout effect: a component hidden in an Activity unregisters at once (§12, the Activity rule)
  useLayoutEffect(
    () =>
      registerHotkey({
        id,
        keys,
        description,
        ...(allowInInputs !== undefined && { allowInInputs }),
        run: (event) => run(event),
      }),
    [id, keys, description, allowInInputs],
  );
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Every registered shortcut, in registration order; none on the server. */
export function useHotkeys(): readonly HotkeyInfo[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}
