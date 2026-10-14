'use client';
// Helpers for the react-aria family's modal popups (Menu, Select, Dialog): Tab out of a menu or
// listbox, and focus return for a popup opened with no focus origin (ARCHITECTURE.md §12.2). Kept out
// of overlay.client.tsx, which Tooltip imports, because these read React Aria's contexts: a value
// import from the components barrel there would put its Popover and Dialog modules on every Tooltip
// page.
import { use, useEffect, type KeyboardEvent, type RefObject } from 'react';
import { OverlayTriggerStateContext, PopoverContext } from 'react-aria-components';

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

/**
 * Focus return when the engine has nowhere to send it (§12.2 Focus return: "the original trigger if
 * still connected"). React Aria returns focus to the element that had it when the popup opened. A
 * popup open on the server (`defaultOpen`) opened with focus on <body>, so closing it would leave
 * focus there, and the next Tab would start from the top of the page. Rendered inside the popup:
 * after it unmounts, if focus is on <body> and the trigger is still connected, the trigger takes it.
 * It never moves focus that went somewhere (an outside click on a control, Tab out of a menu).
 * `popup` guards Strict Mode's mount-time effect replay: the popup is still in the DOM then.
 */
export function ReturnFocus({
  trigger,
  popup,
}: {
  trigger: RefObject<HTMLElement | null> | undefined;
  popup: RefObject<HTMLElement | null>;
}): null {
  useEffect(
    () => () => {
      const element = trigger?.current;
      requestAnimationFrame(() => {
        if (popup.current?.isConnected === true) return;
        const active = document.activeElement;
        if ((active === null || active === document.body) && element?.isConnected === true) {
          element.focus();
        }
      });
    },
    [trigger, popup],
  );
  return null;
}
