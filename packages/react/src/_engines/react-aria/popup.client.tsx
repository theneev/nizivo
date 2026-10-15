'use client';
// Helpers for the react-aria family's modal popups (Menu, Select, Dialog): Tab out of a menu or
// listbox, and the focus-return chain (ARCHITECTURE.md §12.2, O-11). Kept out
// of overlay.client.tsx, which Tooltip imports, because these read React Aria's contexts: a value
// import from the components barrel there would put its Popover and Dialog modules on every Tooltip
// page.
import {
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { OverlayTriggerStateContext, PopoverContext } from 'react-aria-components';
import type { ReturnFocusTarget } from '../../_internal/overlay';

const TABBABLE =
  'a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

/**
 * The tabbable element after (or before) `from` in its dialog, else in the document, skipping `skip`
 * (the popup itself). `inert` is not checked: the engine marks the page inert while the popup is
 * open, and lifts it as the popup closes.
 */
function adjacentTabbable(
  from: HTMLElement,
  backwards: boolean,
  skip: Element | null,
): HTMLElement | undefined {
  const root = from.closest('[role="dialog"], [role="alertdialog"], dialog') ?? from.ownerDocument;
  const order = backwards ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
  const candidates = [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      (skip === null || !skip.contains(element)) &&
      !from.contains(element) &&
      (from.compareDocumentPosition(element) & order) !== 0 &&
      element.getClientRects().length > 0,
  );
  return backwards ? candidates.at(-1) : candidates[0];
}

/**
 * Tab and Shift+Tab out of a menu or listbox popup (§12.2 Dismiss stack; APG menu button): the popup
 * closes and focus moves to the element after (or before) its trigger. React Aria 1.22.1 keeps Tab
 * inside its modal popovers, so the adapter handles the key on the popup's list element.
 */
export function useTabOut(popup: RefObject<HTMLElement | null>): (event: KeyboardEvent) => void {
  const state = use(OverlayTriggerStateContext);
  const context: unknown = use(PopoverContext);
  const trigger =
    typeof context === 'object' && context !== null && 'triggerRef' in context
      ? context.triggerRef
      : undefined;
  return (event) => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    const from =
      typeof trigger === 'object' && trigger !== null && 'current' in trigger
        ? trigger.current
        : undefined;
    if (state === null || !(from instanceof HTMLElement)) return;
    event.preventDefault();
    event.stopPropagation();
    const target = adjacentTabbable(from, event.shiftKey, popup.current) ?? from;
    state.close();
    // The engine lifts its focus containment once the exit starts (the next frame); focus then
    // stays where it moved, because the engine restores focus only when it is still inside.
    requestAnimationFrame(() => target.focus());
  };
}

function isElementRef(value: unknown): value is RefObject<HTMLElement | null> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'current' in value &&
    (value.current === null || value.current instanceof HTMLElement)
  );
}

/** The enclosing MenuTrigger's, Select's or DialogTrigger's trigger, from the engine's PopoverContext. */
export function useTriggerRef(): RefObject<HTMLElement | null> | undefined {
  const context: unknown = use(PopoverContext);
  const ref =
    typeof context === 'object' && context !== null && 'triggerRef' in context
      ? context.triggerRef
      : undefined;
  return isElementRef(ref) ? ref : undefined;
}

/** The family's open popups and their triggers: the parent-overlay step below. */
const OPEN = new Map<RefObject<HTMLElement | null>, RefObject<HTMLElement | null> | undefined>();

/**
 * React Aria's FocusScope dispatches this cancelable event on the element it is about to focus when a
 * scope unmounts with focus lost to <body> (react-aria 3.53.1, FocusScope `restoreFocusToElement`); a
 * prevented event leaves focus alone. It is how `returnFocus` overrides the engine's choice.
 */
const ENGINE_RESTORE = 'react-aria-focus-scope-restore';

declare const process: { env: { NODE_ENV?: string } };

/** A focus target: on the page, and not <body> (where focus is when nothing has it). */
const usable = (element: unknown): element is HTMLElement =>
  element instanceof HTMLElement && element.isConnected && element !== element.ownerDocument.body;

/** Whether the popup is still in the DOM: Strict Mode's mount-time replay of the effect. */
const mounted = (popup: RefObject<HTMLElement | null>): boolean =>
  popup.current?.isConnected === true;

/** The element a `returnFocus` ref or function names, if any. */
const named = (target: ReturnFocusTarget): unknown =>
  typeof target === 'function' ? target() : typeof target === 'object' ? target.current : null;

/**
 * Focus return (§12.2): `returnFocus` (`true`, an element ref, a function returning one, or `false`)
 * → the original trigger if still connected → the element that had focus as the popup opened → the
 * parent overlay's trigger (a Dialog opened from a Menu item returns to the Menu button) → <body>,
 * with a development warning. Rendered inside every modal popup of the family (Dialog, Menu,
 * Select).
 *
 * React Aria returns focus to the element that had it when the popup opened, which covers the
 * common case; this completes the chain where it has nowhere to go: a popup open on the server
 * (`defaultOpen`) or opened from code with nothing focused, and a Dialog opened from an item of a
 * Menu that had no focus origin of its own loses its opener with the Menu. Each popup registers
 * itself while open, so one opened from inside another records that one's trigger as its parent
 * step. It never moves focus that went somewhere (an outside click on a control, Tab out of a
 * menu).
 */
export function ReturnFocus({
  trigger,
  popup,
  target = true,
}: {
  trigger: RefObject<HTMLElement | null> | undefined;
  popup: RefObject<HTMLElement | null>;
  target?: ReturnFocusTarget;
}): null {
  // Read at the first render, before anything inside takes focus (React Aria records its own then).
  // <body> (nothing focused) is not an origin: the chain goes on to the warning.
  const [origin] = useState(() => {
    const opener = globalThis.document?.activeElement;
    let parent;
    for (const [open, openTrigger] of OPEN) {
      if (opener != null && open.current?.contains(opener)) parent = openTrigger?.current;
    }
    return [opener, parent];
  });
  // The latest value without re-running the effect: an inline function is new on every render.
  const latest = useRef(target);
  useLayoutEffect(() => {
    latest.current = target;
  });
  // Whether the popup was ever on the page. React Aria also renders a Select's or Menu's content in
  // a hidden pass that builds its collection, where no popup exists: that copy returns nothing (it
  // used to focus <body>, and would now warn, at every unmount and Strict Mode replay). A passive
  // effect, because the popup's ref is attached after this component's layout effects.
  const shown = useRef(false);
  useEffect(() => {
    if (mounted(popup)) shown.current = true;
  });
  useLayoutEffect(() => {
    // The trigger as the popup opens: the one it returns to.
    const element = trigger?.current;
    OPEN.set(popup, trigger);
    return () => {
      OPEN.delete(popup);
      const doc = document;
      let handled = false;
      const onRestore = (event: Event): void => {
        const own = latest.current;
        const to = named(own);
        if (event.defaultPrevented || mounted(popup) || (own !== false && !usable(to))) return;
        event.preventDefault();
        handled = true;
        if (usable(to)) to.focus();
      };
      doc.addEventListener(ENGINE_RESTORE, onRestore, true);
      // After the engine's own restore, which it schedules earlier for the same frame.
      requestAnimationFrame(() => {
        doc.removeEventListener(ENGINE_RESTORE, onRestore, true);
        const own = latest.current;
        if (
          handled ||
          !shown.current ||
          own === false ||
          mounted(popup) ||
          (doc.activeElement ?? doc.body) !== doc.body
        ) {
          return;
        }
        const next = [named(own), element, ...origin].find(usable);
        if (next) next.focus();
        else if (process.env.NODE_ENV !== 'production') {
          console.warn(
            'Nizivo: an overlay closed and focus had nowhere to return (its trigger, the element that opened it and its parent overlay are gone), so it is on <body>. Pass `returnFocus` an element that stays on the page.',
          );
        }
      });
    };
  }, [trigger, popup, origin]);
  return null;
}
