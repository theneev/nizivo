'use client';
// PUBLIC Tooltip parts (ARCHITECTURE.md §12.3): role="tooltip" via aria-describedby, 400 ms delay,
// shown on keyboard focus, never moves focus, inverse scheme.
import type { JSX } from 'react';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import * as Engine from './engine';
import type { TooltipPopupProps, TooltipRootProps, TooltipTriggerProps } from './tooltip.contract';

const renderDiv = toRenderFn<unknown>(undefined, 'div');

export function TooltipRoot({ delay = 400, ...props }: TooltipRootProps): JSX.Element {
  return <Engine.Root {...props} delay={delay} />;
}

export function TooltipTrigger({ className, render, ...rest }: TooltipTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      // Only the default <button> gets a type, so it never submits a form.
      type={rest.type ?? (render === undefined ? 'button' : undefined)}
      className={cx('nz-tooltip-trigger', className)}
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
    </Engine.Popup>
  );
}
