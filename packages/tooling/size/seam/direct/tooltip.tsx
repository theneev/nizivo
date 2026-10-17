'use client';
// Seam baseline: Tooltip written on React Aria directly (see select.tsx). RAC's `Focusable` lets any
// element trigger it, as the adapter's useFocusable does. Not here (Nizivo-only): the vocabulary
// data-* mapping, `render` props, the popup style variables, the `content` and `shortcut` props.
import type { JSX, ReactNode } from 'react';
import {
  Focusable,
  I18nProvider,
  Tooltip,
  TooltipTrigger as TriggerScope,
  type TooltipTriggerComponentProps,
} from 'react-aria-components';

export function TooltipRoot({
  locale = 'en-US',
  delay = 400,
  children,
  ...props
}: TooltipTriggerComponentProps & { locale?: string }): JSX.Element {
  return (
    <I18nProvider locale={locale}>
      <TriggerScope {...props} delay={delay}>
        {children}
      </TriggerScope>
    </I18nProvider>
  );
}

export function TooltipTrigger({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Focusable>
      <button
        type="button"
        className="nz-tooltip-trigger nz-hit-target"
        data-slot="tooltip-trigger"
      >
        {children}
      </button>
    </Focusable>
  );
}

export function TooltipPopup({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Tooltip
      placement="top"
      offset={8}
      className="nz-tooltip-popup"
      data-slot="tooltip-popup"
      data-nz-scheme="inverse"
    >
      {children}
    </Tooltip>
  );
}
