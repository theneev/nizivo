'use client';
// PUBLIC Tooltip parts (ARCHITECTURE.md §12.3): role="tooltip" via aria-describedby, 400 ms delay,
// shown on keyboard focus, never moves focus, inverse scheme. `content` and `shortcut` are the week 3
// conveniences (§23.4 D-d); the compound Root / Trigger / Popup stays canonical.
import type { JSX } from 'react';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { Kbd } from '../kbd/kbd';
import * as Engine from './engine';
import type { TooltipPopupProps, TooltipRootProps, TooltipTriggerProps } from './tooltip.contract';

const renderDiv = toRenderFn<unknown>(undefined, 'div');

export function TooltipRoot({
  delay = 400,
  content,
  shortcut,
  children,
  ...props
}: TooltipRootProps): JSX.Element {
  return (
    <Engine.Root {...props} delay={delay}>
      {children}
      {content !== undefined && (
        <TooltipPopup {...(shortcut === undefined ? {} : { shortcut })}>{content}</TooltipPopup>
      )}
    </Engine.Root>
  );
}

/**
 * Without `render`, its own `<button>`: `nz-hit-target` gives it the 44 px coarse-pointer hit area of
 * every standalone pressable, and tooltip.css gives that bare button a 24 x 24 px minimum (WCAG 2.2
 * 2.5.8; M27). A composed Button or IconButton keeps its own size and classes.
 */
export function TooltipTrigger({ className, render, ...rest }: TooltipTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      // Only the default <button> gets a type, so it never submits a form.
      type={rest.type ?? (render === undefined ? 'button' : undefined)}
      className={cx('nz-tooltip-trigger', render === undefined && 'nz-hit-target', className)}
      data-slot="tooltip-trigger"
      render={toRenderFn(render, 'button')}
    />
  );
}

export function TooltipPopup({
  side = 'top',
  align = 'center',
  sideOffset = 8,
  container,
  shortcut,
  className,
  children,
  ...rest
}: TooltipPopupProps): JSX.Element {
  return (
    <Engine.Popup
      {...rest}
      side={side}
      align={align}
      sideOffset={sideOffset}
      container={container}
      className={cx('nz-tooltip-popup', className)}
      data-slot="tooltip-popup"
      data-nz-scheme="inverse"
      render={renderDiv}
    >
      {children}
      {shortcut !== undefined && (
        <>
          {/* The flex row does not render this space; it keeps the description "Export Ctrl+E". */}{' '}
          <Kbd keys={shortcut} className="nz-tooltip-shortcut" />
        </>
      )}
    </Engine.Popup>
  );
}
