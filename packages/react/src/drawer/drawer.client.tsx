'use client';
// PUBLIC Drawer parts (ARCHITECTURE.md §12.3 Drawer / Sheet row; figma/07 §4.5, Drawer 756:1001): the
// leaf names every element; the adapter names none. The Dialog pattern at an edge: modal, a scrim,
// focus contained, the page's scroll locked, and focus back on the trigger when it closes.
import { createContext, use, type JSX, type ReactElement } from 'react';
import { renderElement, toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CloseGlyph } from '../_internal/glyphs';
import { initialFocus, ModalNestingScope, useModalNesting } from '../_internal/modal.client';
import type { ReturnFocusTarget } from '../_internal/overlay';
import type {
  DrawerBodyProps,
  DrawerCloseProps,
  DrawerDescriptionProps,
  DrawerFooterProps,
  DrawerHeaderProps,
  DrawerPopupProps,
  DrawerRootProps,
  DrawerTitleLevel,
  DrawerTitleProps,
  DrawerTriggerProps,
} from './drawer.contract';
import * as Engine from './engine';

/** `Drawer.Root`'s `returnFocus`, for its Popup. */
const ReturnFocusContext = createContext<ReturnFocusTarget>(true);

const renderDiv = toRenderFn<unknown>(undefined, 'div');
const renderP = toRenderFn<unknown>(undefined, 'p');

/** A drawer is always a dialog (an alertdialog is the Dialog's job). */
const ROLE = 'dialog';

/** Focus on open (§12.2): the first tabbable element in `Drawer.Body`, else the drawer itself. */
const INITIAL_FOCUS = initialFocus('drawer', ROLE);

export function DrawerRoot({ returnFocus = true, ...props }: DrawerRootProps): JSX.Element {
  return (
    <ReturnFocusContext value={returnFocus}>
      <Engine.Root {...props} />
    </ReturnFocusContext>
  );
}

/**
 * Without `render`, its own `<button>` with `nz-hit-target` and, from drawer.css, a 24 x 24 px
 * minimum (WCAG 2.2 2.5.8, as the Dialog's, M27). A composed Button or IconButton keeps its own size.
 */
export function DrawerTrigger({ className, render, ...rest }: DrawerTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      className={cx('nz-drawer-trigger', render === undefined && 'nz-hit-target', className)}
      data-slot="drawer-trigger"
      render={toRenderFn(render, 'button')}
    />
  );
}

export function DrawerPopup({
  side = 'end',
  backdrop,
  container,
  className,
  children,
  ...rest
}: DrawerPopupProps): JSX.Element {
  const { parent, nesting, childOpen } = useModalNesting();
  const returnFocus = use(ReturnFocusContext);
  // The resolved physical edge (§8.3 data-side): `start` and `end` follow the engine's direction.
  const ltr = Engine.useDirection() === 'ltr';
  const physical = side === 'bottom' ? side : (side === 'end') === ltr ? 'right' : 'left';
  return (
    <Engine.Popup
      {...rest}
      role={ROLE}
      container={container}
      // A drawer opened from a modal does not double-darken the page (gap report C §1.7).
      backdrop={backdrop ?? parent === null}
      positioner={{
        className: 'nz-drawer-positioner',
        'data-slot': 'drawer-positioner',
        'data-side': physical,
      }}
      backdropProps={{ className: 'nz-drawer-backdrop', 'data-slot': 'drawer-backdrop' }}
      contentProps={{ className: 'nz-drawer-content', 'data-slot': 'drawer-content' }}
      initialFocus={INITIAL_FOCUS}
      returnFocus={returnFocus}
      className={cx('nz-drawer-popup', className)}
      data-slot="drawer-popup"
      data-side={physical}
      data-nested-open={childOpen ? '' : undefined}
      render={renderDiv}
    >
      <ModalNestingScope parent={parent} nesting={nesting}>
        {children}
      </ModalNestingScope>
    </Engine.Popup>
  );
}

/** Figma's Header frame: the title, an optional description and badges, above a 1 px rule. */
export function DrawerHeader({ className, render, ...rest }: DrawerHeaderProps): JSX.Element {
  return renderElement(
    'div',
    render,
    {},
    { ...rest, className: cx('nz-drawer-header', className), 'data-slot': 'drawer-header' },
  );
}

const HEADINGS: Record<DrawerTitleLevel, (p: Record<string, unknown>, s: unknown) => ReactElement> =
  {
    2: toRenderFn(undefined, 'h2'),
    3: toRenderFn(undefined, 'h3'),
    4: toRenderFn(undefined, 'h4'),
    5: toRenderFn(undefined, 'h5'),
    6: toRenderFn(undefined, 'h6'),
  };

export function DrawerTitle({
  level = 2,
  className,
  render,
  ...rest
}: DrawerTitleProps): JSX.Element {
  return (
    <Engine.Title
      {...rest}
      level={level}
      className={cx('nz-drawer-title', className)}
      data-slot="drawer-title"
      render={render === undefined ? HEADINGS[level] : toRenderFn(render, `h${level}`)}
    />
  );
}

export function DrawerDescription({
  className,
  render,
  ...rest
}: DrawerDescriptionProps): JSX.Element {
  return (
    <Engine.Description
      {...rest}
      className={cx('nz-drawer-description', className)}
      data-slot="drawer-description"
      render={render === undefined ? renderP : toRenderFn(render, 'p')}
    />
  );
}

/** The only scroller inside the drawer; it fills the height between the header and the footer. */
export function DrawerBody({ className, render, ...rest }: DrawerBodyProps): JSX.Element {
  return renderElement(
    'div',
    render,
    {},
    { ...rest, className: cx('nz-drawer-body', className), 'data-slot': 'drawer-body' },
  );
}

/** Figma's Footer frame: actions that share its width, above a 1 px rule. */
export function DrawerFooter({ className, render, ...rest }: DrawerFooterProps): JSX.Element {
  return renderElement(
    'div',
    render,
    {},
    { ...rest, className: cx('nz-drawer-footer', className), 'data-slot': 'drawer-footer' },
  );
}

/**
 * With `render` or `children`, the consumer's button. With neither, an IconButton (tertiary, `md`)
 * showing the core close glyph, named by `labels.close`: the IconButton element's markup written out,
 * as `Dialog.Close` does, so the Drawer entry does not pull in IconButton's tooltip chain.
 */
export function DrawerClose({
  className,
  render,
  children,
  labels,
  ...rest
}: DrawerCloseProps): JSX.Element {
  return (
    <Engine.Close
      {...rest}
      className={cx('nz-drawer-close', className)}
      data-slot="drawer-close"
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
