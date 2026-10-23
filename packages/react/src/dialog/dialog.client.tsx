'use client';
// PUBLIC Dialog parts (ARCHITECTURE.md §10.4): the leaf names every element; the adapter names none.
import { createContext, use, type JSX, type ReactElement } from 'react';
import { useLabels } from '../config/config.client';
import { renderElement, toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CloseGlyph } from '../_internal/glyphs';
import { initialFocus, ModalNestingScope, useModalNesting } from '../_internal/modal.client';
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

/** `Dialog.Root`'s `returnFocus`, for its Popup. */
const ReturnFocusContext = createContext<ReturnFocusTarget>(true);

const renderDiv = toRenderFn<unknown>(undefined, 'div');
const renderP = toRenderFn<unknown>(undefined, 'p');

/** Focus on open (§12.2), from the Dialog's own slots. */
const INITIAL_FOCUS = {
  dialog: initialFocus('dialog', 'dialog'),
  alertdialog: initialFocus('dialog', 'alertdialog'),
};

export function DialogRoot({ returnFocus = true, ...props }: DialogRootProps): JSX.Element {
  return (
    <ReturnFocusContext value={returnFocus}>
      <Engine.Root {...props} />
    </ReturnFocusContext>
  );
}

/**
 * Without `render`, its own `<button>`: `nz-hit-target` gives it the 44 px coarse-pointer hit area of
 * every standalone pressable, and dialog.css gives that bare button a 24 x 24 px minimum (WCAG 2.2
 * 2.5.8; M27). A composed Button or IconButton keeps its own size and classes.
 */
export function DialogTrigger({ className, render, ...rest }: DialogTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      className={cx('nz-dialog-trigger', render === undefined && 'nz-hit-target', className)}
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
  const { parent, nesting, childOpen } = useModalNesting();
  const returnFocus = use(ReturnFocusContext);
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
      data-nested-open={childOpen ? '' : undefined}
      render={renderDiv}
    >
      <ModalNestingScope parent={parent} nesting={nesting}>
        {children}
      </ModalNestingScope>
    </Engine.Popup>
  );
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
 * element's (`iconButtonElement`, icon-button-static.tsx since M31), written out: importing that
 * builder cost the Dialog entry about 280 B gzip against its 31 KiB cap. An overlay-lane case
 * compares the two.
 */
export function DialogClose({
  className,
  render,
  children,
  labels: labelsProp,
  ...rest
}: DialogCloseProps): JSX.Element {
  const labels = useLabels('dialog', labelsProp);
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
