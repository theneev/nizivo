'use client';
// PUBLIC Dialog parts (ARCHITECTURE.md §10.4): the leaf names every element; the adapter names none.
import {
  createContext,
  use,
  useLayoutEffect,
  useMemo,
  useState,
  type JSX,
  type ReactElement,
} from 'react';
import { renderElement, toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CloseGlyph } from '../_internal/glyphs';
import type { ReturnFocusTarget } from '../_internal/overlay';
import type {
  DialogBodyProps,
  DialogCloseProps,
  DialogDescriptionProps,
  DialogFooterProps,
  DialogPopupProps,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
  DialogTitleLevel,
} from './dialog.contract';
import * as Engine from './engine';

/** The enclosing open Dialog popup, if any: nested modals skip the backdrop and mark the parent. */
interface Nesting {
  childOpened(delta: 1 | -1): void;
}
const NestingContext = createContext<Nesting | null>(null);

/** `Dialog.Root`'s `returnFocus`, for its Popup. */
const ReturnFocusContext = createContext<ReturnFocusTarget>(true);

const renderDiv = toRenderFn<unknown>(undefined, 'div');
const renderP = toRenderFn<unknown>(undefined, 'p');

const TABBABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

/**
 * Focus on open (§12.2): an element the consumer marked `autoFocus` keeps it (the engine sees focus
 * inside and leaves it); an alertdialog focuses its least destructive action, the first
 * `Dialog.Close`; a dialog focuses the first tabbable element in its `Dialog.Body`; otherwise the
 * engine focuses the popup itself, so a long text starts at its top.
 */
function initialFocus(
  role: 'dialog' | 'alertdialog',
): (content: HTMLElement) => HTMLElement | null {
  return (content) => {
    if (role === 'alertdialog') {
      // A footer action (Cancel) before a close icon in the corner.
      return (
        content.querySelector<HTMLElement>(
          '[data-slot="dialog-footer"] [data-slot="dialog-close"]:not(:disabled)',
        ) ?? content.querySelector<HTMLElement>('[data-slot="dialog-close"]:not(:disabled)')
      );
    }
    const body = content.querySelector('[data-slot="dialog-body"]');
    if (body === null) return null;
    for (const element of body.querySelectorAll<HTMLElement>(TABBABLE)) {
      if (
        element.tabIndex >= 0 &&
        !element.matches(':disabled') &&
        element.getClientRects().length > 0
      ) {
        return element;
      }
    }
    return null;
  };
}
const INITIAL_FOCUS = { dialog: initialFocus('dialog'), alertdialog: initialFocus('alertdialog') };

export function DialogRoot({ returnFocus = true, ...props }: DialogRootProps): JSX.Element {
  return (
    <ReturnFocusContext value={returnFocus}>
      <Engine.Root {...props} />
    </ReturnFocusContext>
  );
}

export function DialogTrigger({ className, render, ...rest }: DialogTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      className={cx('nz-dialog-trigger', className)}
      data-slot="dialog-trigger"
      render={toRenderFn(render, 'button')}
    />
  );
}

export function DialogPopup({
  role = 'dialog',
  size = 'md',
  backdrop,
  container,
  className,
  children,
  ...rest
}: DialogPopupProps): JSX.Element {
  const parent = use(NestingContext);
  const returnFocus = use(ReturnFocusContext);
  const [openChildren, setOpenChildren] = useState(0);
  const nesting = useMemo<Nesting>(
    () => ({ childOpened: (delta) => setOpenChildren((n) => n + delta) }),
    [],
  );
  return (
    <Engine.Popup
      {...rest}
      role={role}
      container={container}
      // Nested modals do not double-darken the page (gap report C §1.7).
      backdrop={backdrop ?? parent === null}
      positioner={{ className: 'nz-dialog-positioner', 'data-slot': 'dialog-positioner' }}
      backdropProps={{ className: 'nz-dialog-backdrop', 'data-slot': 'dialog-backdrop' }}
      contentProps={{ className: 'nz-dialog-content', 'data-slot': 'dialog-content' }}
      initialFocus={INITIAL_FOCUS[role]}
      returnFocus={returnFocus}
      className={cx('nz-dialog-popup', className)}
      data-slot="dialog-popup"
      data-size={size}
      data-nested-open={openChildren > 0 ? '' : undefined}
      render={renderDiv}
    >
      <NestingContext value={nesting}>
        {parent !== null && <OpenSignal parent={parent} />}
        {children}
      </NestingContext>
    </Engine.Popup>
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

const HEADINGS: Record<DialogTitleLevel, (p: Record<string, unknown>, s: unknown) => ReactElement> =
  {
    2: toRenderFn(undefined, 'h2'),
    3: toRenderFn(undefined, 'h3'),
    4: toRenderFn(undefined, 'h4'),
    5: toRenderFn(undefined, 'h5'),
    6: toRenderFn(undefined, 'h6'),
  };

export function DialogTitle({
  level = 2,
  className,
  render,
  ...rest
}: DialogTitleProps): JSX.Element {
  return (
    <Engine.Title
      {...rest}
      level={level}
      className={cx('nz-dialog-title', className)}
      data-slot="dialog-title"
      render={render === undefined ? HEADINGS[level] : toRenderFn(render, `h${level}`)}
    />
  );
}

export function DialogDescription({
  className,
  render,
  ...rest
}: DialogDescriptionProps): JSX.Element {
  return (
    <Engine.Description
      {...rest}
      className={cx('nz-dialog-description', className)}
      data-slot="dialog-description"
      render={render === undefined ? renderP : toRenderFn(render, 'p')}
    />
  );
}

/** The only scroller inside the popup. */
export function DialogBody({ className, render, ...rest }: DialogBodyProps): JSX.Element {
  return renderElement(
    'div',
    render,
    {},
    {
      ...rest,
      className: cx('nz-dialog-body', className),
      'data-slot': 'dialog-body',
    },
  );
}

export function DialogFooter({ className, render, ...rest }: DialogFooterProps): JSX.Element {
  return renderElement(
    'div',
    render,
    {},
    {
      ...rest,
      className: cx('nz-dialog-footer', className),
      'data-slot': 'dialog-footer',
    },
  );
}

/**
 * With `render` or `children`, the consumer's button. With neither, an IconButton (tertiary, `md`)
 * showing the core close glyph (§12.3, §14.2), named by `labels.close`. Its markup is the IconButton
 * element's (`iconButtonElement` in icon-button.tsx), written out: importing that builder cost the
 * Dialog entry about 280 B gzip against its 31 KiB cap. An overlay-lane case compares the two.
 */
export function DialogClose({
  className,
  render,
  children,
  labels,
  ...rest
}: DialogCloseProps): JSX.Element {
  return (
    <Engine.Close
      {...rest}
      className={cx('nz-dialog-close', className)}
      data-slot="dialog-close"
      render={toRenderFn(
        render ??
          (children === undefined
            ? closeIcon(rest['aria-label'] ?? labels?.close ?? 'Close')
            : undefined),
        'button',
      )}
    >
      {children}
    </Engine.Close>
  );
}

function closeIcon(label: string): ReactElement {
  return (
    <button
      type="button"
      className="nz-icon-button nz-hit-target"
      data-variant="tertiary"
      data-size="md"
      aria-label={label}
    >
      <span className="nz-icon-button-icon" data-slot="icon-button-icon" aria-hidden="true">
        <CloseGlyph />
      </span>
    </button>
  );
}
