'use client';
// The react-aria family's outside-press completion (ARCHITECTURE.md §12.2 Dismiss stack; the
// `outside-press` entry of overlayEngine.completes). Its own module beside popup.client.tsx: every
// modal popup of the family renders it (Dialog, Drawer, Menu, Select, Popover).
import { use, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';

/**
 * The family's open popups, in open order. Its own list, not popup.client's registry: a Select's
 * hidden collection pass registers and unregisters there under the same ref. Only entries on the
 * page count.
 */
const STACK: RefObject<HTMLElement | null>[] = [];

const onPage = (popup: RefObject<HTMLElement | null>): boolean =>
  popup.current?.isConnected === true;

/**
 * Outside press for a popup opened inside another overlay (§12.2 Dismiss stack). React Aria's
 * useInteractOutside ignores every press inside an element marked top-layer, and the family's
 * nested-portal containers carry that mark (§12.1 L2), so a press on a nested popup's underlay, or
 * anywhere else in its parent's container, never reached the engine's dismiss logic: a Select or
 * Menu inside a Dialog stayed open (weeks 4 to 12; found in week 13). The family completes it: a
 * press that starts and ends outside `popup`, inside a top-layer element that is not Nizivo's own
 * top layer (the toast region and announcer, `data-nz-top-layer`, dismiss nothing) and not on a
 * tooltip, closes `popup` when it is the topmost. Every other press stays with the engine. The
 * element is read at the press: a Select's popup is attached after this component's first effect.
 */
export function OutsidePress({
  popup,
  dismissable = true,
}: {
  popup: RefObject<HTMLElement | null>;
  dismissable?: boolean;
}): null {
  // The latest state without re-running the effect: React Aria's state object is new on every
  // render, and a press re-renders the trigger between its pointerdown and pointerup.
  const context = use(OverlayTriggerStateContext);
  const state = useRef(context);
  useLayoutEffect(() => {
    state.current = context;
  });
  useEffect(() => {
    STACK.push(popup);
    const ours = (event: PointerEvent): boolean => {
      const element = popup.current;
      const { target } = event;
      if (
        !dismissable ||
        event.button > 0 ||
        element === null ||
        !(target instanceof Element) ||
        element.contains(target)
      ) {
        return false;
      }
      const host = target.closest('[data-react-aria-top-layer]');
      return (
        host !== null &&
        host.closest('[data-nz-top-layer]') === null &&
        target.closest('[role="tooltip"]') === null &&
        STACK.findLast(onPage) === popup
      );
    };
    let started = false;
    const down = (event: PointerEvent): void => {
      started = ours(event);
    };
    const up = (event: PointerEvent): void => {
      if (started && ours(event)) state.current?.close();
      started = false;
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    return () => {
      STACK.splice(STACK.lastIndexOf(popup), 1);
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
    };
  }, [popup, dismissable]);
  return null;
}
