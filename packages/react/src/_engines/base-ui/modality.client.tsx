'use client';
// Keyboard modality for the Base UI canary (D-dk, M74): Base UI reports no focus-visible state on a
// highlighted option, so the family derives it, as React Aria does, from the last input: a key press
// makes it keyboard, a pointer press makes it pointer.
import { useSyncExternalStore } from 'react';

let keyboard = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (next === keyboard) return;
  keyboard = next;
  for (const listener of listeners) listener();
}

// Listening from the first subscriber on, and never stopping: the press that opens a popup comes
// before its options mount, and it must count.
let listening = false;

function subscribe(listener: () => void): () => void {
  if (!listening) {
    listening = true;
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function onKey(event: KeyboardEvent): void {
  if (!event.metaKey && !event.ctrlKey && !event.altKey) set(true);
}

function onPointer(): void {
  set(false);
}

/** Whether the last input was the keyboard. */
export function useKeyboardModality(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => keyboard,
    () => false,
  );
}
