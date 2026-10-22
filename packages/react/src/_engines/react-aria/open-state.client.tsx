'use client';
// The open state of the family's Roots, so an overlay cooperates with <Activity> (ARCHITECTURE.md
// §12.2 "Activity", O-15). React Aria always gets a controlled `isOpen`: its own state survives a
// hidden Activity and would reopen a transient popup on return. A hidden Activity destroys effects
// (React Aria's inert and scroll lock go with them) and keeps state, so a popup opened after mount
// closes in a layout-effect cleanup: an uncontrolled one closes itself, and either way
// `onOpenChange(false, { reason: 'hidden' })` tells the consumer. One open at mount (`defaultOpen`,
// or `open` from the server) never closes this way, so Strict Mode's mount, cleanup, mount changes
// nothing. React cannot tell a hidden Activity from an unmount: a popup opened after mount that
// unmounts while open reports 'hidden' too.
//
// The close also remounts the engine (`key`): React Aria keeps a closing popup mounted until an
// effect sees its exit animation end, and a hidden Activity runs no effects, so the popup would stay
// in the DOM until the route is shown again. React 19.3 hides it there; React 19.2 hides no portal,
// so it stayed on screen (O-15 on 19.2). A remounted engine starts closed and renders nothing.
import { createContext, useLayoutEffect, useRef, useState, type Context } from 'react';
import { details, type ChangeDetails, type OpenReason } from '../../contracts/details';

/**
 * The key, for a popup part whose Root keeps other state in the engine (Select's value): that part
 * remounts its popup instead.
 */
export const PopupKey: Context<number> = createContext(0);

type OnOpenChange = ((open: boolean, details: ChangeDetails<OpenReason>) => void) | undefined;

/**
 * `[isOpen, setOpen, key]` for the engine: the consumer's `open`, else the Root's own state, and the
 * key to render the engine's root with.
 */
export function useOpenState(
  open: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: OnOpenChange,
): readonly [boolean, (open: boolean) => void, number] {
  const [own, setOwn] = useState(defaultOpen ?? false);
  const [key, setKey] = useState(0);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : own;

  const latest = useRef({ controlled, onOpenChange });
  useLayoutEffect(() => {
    latest.current = { controlled, onOpenChange };
  });

  // Opened after a committed closed render: only then does hiding close it.
  const seenClosed = useRef(false);
  const armed = useRef(false);
  useLayoutEffect(() => {
    if (!isOpen) seenClosed.current = true;
    armed.current = isOpen && seenClosed.current;
  }, [isOpen]);
  useLayoutEffect(
    () => () => {
      if (!armed.current) return;
      armed.current = false;
      if (!latest.current.controlled) setOwn(false);
      setKey((k) => k + 1);
      latest.current.onOpenChange?.(false, details('hidden'));
    },
    [],
  );

  const setOpen = (next: boolean): void => {
    if (!controlled) setOwn(next);
    // React Aria reports no cause.
    onOpenChange?.(next, details('unknown'));
  };
  return [isOpen, setOpen, key];
}
