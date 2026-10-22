'use client';
// PUBLIC Popover parts (ARCHITECTURE.md §12.3 Popover row): the leaf names every element; the adapter
// names none. A Popover is a non-modal-looking dialog anchored to its trigger: no scrim, no arrow
// (Figma draws no Popover; its popups, the Dropdown Menu 746:204 and the Date Range Picker 746:267,
// have none), Escape and an outside press close it.
import type { JSX, ReactElement } from 'react';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { CloseGlyph } from '../_internal/glyphs';
import type {
  PopoverCloseProps,
  PopoverDescriptionProps,
  PopoverPopupProps,
  PopoverRootProps,
  PopoverTitleLevel,
  PopoverTitleProps,
  PopoverTriggerProps,
} from './popover.contract';
import * as Engine from './engine';

const renderDiv = toRenderFn<unknown>(undefined, 'div');
const renderP = toRenderFn<unknown>(undefined, 'p');

const TABBABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

/**
 * Focus on open (§12.2): an element marked `autoFocus` keeps it; otherwise the first tabbable element
 * in the popup, passing over the default corner Close (focus starts on the content, not on the way
 * out); otherwise the engine focuses the popup's content element itself.
 */
function initialFocus(content: HTMLElement): HTMLElement | null {
  for (const element of content.querySelectorAll<HTMLElement>(TABBABLE)) {
    if (
      element.tabIndex >= 0 &&
      !element.matches(':disabled, .nz-popover-close.nz-icon-button') &&
      element.getClientRects().length > 0
    ) {
      return element;
    }
  }
  return null;
}

export function PopoverRoot(props: PopoverRootProps): JSX.Element {
  return <Engine.Root {...props} />;
}

/**
 * Without `render`, its own `<button>`: `nz-hit-target` gives it the 44 px coarse-pointer hit area of
 * every standalone pressable, and popover.css gives that bare button a 24 x 24 px minimum (WCAG 2.2
 * 2.5.8, as Dialog's and Tooltip's, M27). A composed Button or IconButton keeps its own size.
 */
export function PopoverTrigger({ className, render, ...rest }: PopoverTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      className={cx('nz-popover-trigger', render === undefined && 'nz-hit-target', className)}
      data-slot="popover-trigger"
      render={toRenderFn(render, 'button')}
    />
  );
}

export function PopoverPopup({
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  container,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  className,
  style,
  children,
}: PopoverPopupProps): JSX.Element {
  return (
    <Engine.Popup
      side={side}
      align={align}
      sideOffset={sideOffset}
      container={container}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      contentProps={{ className: 'nz-popover-content', 'data-slot': 'popover-content' }}
      initialFocus={initialFocus}
      className={cx('nz-popover-popup', className)}
      style={style}
      data-slot="popover-popup"
      render={renderDiv}
    >
      {children}
    </Engine.Popup>
  );
}

const HEADINGS: Record<
  PopoverTitleLevel,
  (p: Record<string, unknown>, s: unknown) => ReactElement
> = {
  2: toRenderFn(undefined, 'h2'),
  3: toRenderFn(undefined, 'h3'),
  4: toRenderFn(undefined, 'h4'),
  5: toRenderFn(undefined, 'h5'),
  6: toRenderFn(undefined, 'h6'),
};

export function PopoverTitle({
  level = 2,
  className,
  render,
  ...rest
}: PopoverTitleProps): JSX.Element {
  return (
    <Engine.Title
      {...rest}
      level={level}
      className={cx('nz-popover-title', className)}
      data-slot="popover-title"
      render={render === undefined ? HEADINGS[level] : toRenderFn(render, `h${level}`)}
    />
  );
}

export function PopoverDescription({
  className,
  render,
  ...rest
}: PopoverDescriptionProps): JSX.Element {
  return (
    <Engine.Description
      {...rest}
      className={cx('nz-popover-description', className)}
      data-slot="popover-description"
      render={render === undefined ? renderP : toRenderFn(render, 'p')}
    />
  );
}

/**
 * With `render` or `children`, the consumer's button. With neither, an IconButton (tertiary, `sm`)
 * showing the core close glyph, named by `labels.close`: the IconButton element's markup written out,
 * as `Dialog.Close` does, so the Popover entry does not pull in IconButton's tooltip chain.
 */
export function PopoverClose({
  className,
  render,
  children,
  labels,
  ...rest
}: PopoverCloseProps): JSX.Element {
  return (
    <Engine.Close
      {...rest}
      className={cx('nz-popover-close', className)}
      data-slot="popover-close"
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
      data-size="sm"
      aria-label={label}
    >
      <span className="nz-icon-button-icon" data-slot="icon-button-icon" aria-hidden="true">
        <CloseGlyph />
      </span>
    </button>
  );
}
