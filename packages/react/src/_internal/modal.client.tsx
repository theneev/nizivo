'use client';
// What the modal leaves share (ARCHITECTURE.md §10.4, §12.2, §12.3): Dialog and Drawer. One nesting
// context, so a Drawer opened from a Dialog (or the other way round) draws no second scrim and marks
// its parent `data-nested-open`; and one focus-on-open rule, read from each leaf's own slots.
import {
  createContext,
  use,
  useLayoutEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

/** The enclosing open modal popup, if any: nested modals skip the backdrop and mark the parent. */
export interface Nesting {
  childOpened(delta: 1 | -1): void;
}
const NestingContext = createContext<Nesting | null>(null);

/**
 * The nesting state of one modal popup: the modal it was opened from (`parent`, null at the root),
 * whether a modal opened from it is open (`childOpen`), and its own `nesting`, which
 * `ModalNestingScope` hands to the modals opened inside it.
 */
export function useModalNesting(): {
  parent: Nesting | null;
  nesting: Nesting;
  childOpen: boolean;
} {
  const parent = use(NestingContext);
  const [openChildren, setOpenChildren] = useState(0);
  const nesting = useMemo<Nesting>(
    () => ({ childOpened: (delta) => setOpenChildren((n) => n + delta) }),
    [],
  );
  return { parent, nesting, childOpen: openChildren > 0 };
}

/** Wraps a modal popup's children: modals opened inside report to it, and it reports to its parent. */
export function ModalNestingScope({
  parent,
  nesting,
  children,
}: {
  parent: Nesting | null;
  nesting: Nesting;
  children: ReactNode;
}): JSX.Element {
  return (
    <NestingContext value={nesting}>
      {parent !== null && <OpenSignal parent={parent} />}
      {children}
    </NestingContext>
  );
}

/** Mounted only while this popup's content is mounted, i.e. while it is open. */
function OpenSignal({ parent }: { parent: Nesting }): null {
  useLayoutEffect(() => {
    parent.childOpened(1);
    return () => parent.childOpened(-1);
  }, [parent]);
  return null;
}

const TABBABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

/** The first tabbable, enabled, rendered element inside `root`, if any. */
export function firstTabbable(root: Element | null): HTMLElement | null {
  if (root === null) return null;
  for (const element of root.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      element.getClientRects().length > 0
    ) {
      return element;
    }
  }
  return null;
}

/**
 * Focus on open (§12.2) for a modal leaf whose slots start with `name`: an element the consumer
 * marked `autoFocus` keeps it (the engine sees focus inside and leaves it); an alertdialog focuses
 * its least destructive action, the first `<name>-close` in its footer, else any; a dialog focuses
 * the first tabbable element in its `<name>-body`; otherwise the engine focuses the popup itself, so
 * a long text starts at its top.
 */
export function initialFocus(
  name: string,
  role: 'dialog' | 'alertdialog',
): (content: HTMLElement) => HTMLElement | null {
  const close = `[data-slot="${name}-close"]:not(:disabled)`;
  return (content) =>
    role === 'alertdialog'
      ? // A footer action (Cancel) before a close icon in the corner.
        (content.querySelector<HTMLElement>(`[data-slot="${name}-footer"] ${close}`) ??
        content.querySelector<HTMLElement>(close))
      : firstTabbable(content.querySelector(`[data-slot="${name}-body"]`));
}
