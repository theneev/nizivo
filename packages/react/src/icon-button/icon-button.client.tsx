'use client';
// The IconButton's tooltip leaf (ARCHITECTURE.md §9.5 "split"): the same <button> as the server shell,
// made the trigger of a Tooltip that shows the label. It imports the element builder from the shell's
// module, which imports this leaf: a cycle only in client bundles, where both are client code, and
// nothing runs at module load (Field and FieldScope have the same shape).
import type { JSX } from 'react';
import { TooltipPopup, TooltipRoot, TooltipTrigger } from '../tooltip/tooltip.client';
import type { IconButtonTooltipOptions } from './icon-button.contract';
import { iconButtonElement, type IconButtonElementProps } from './icon-button';

export interface IconButtonTooltipProps extends IconButtonElementProps {
  tooltip: IconButtonTooltipOptions;
  shortcut?: string;
}

export function IconButtonTooltip({
  tooltip: { side, align, delay },
  shortcut,
  ...button
}: IconButtonTooltipProps): JSX.Element {
  return (
    // A disabled <button> gets no hover or focus, so its tooltip is off too (§12.3).
    <TooltipRoot disabled={button.disabled === true} {...(delay === undefined ? {} : { delay })}>
      <TooltipTrigger render={(props) => iconButtonElement(button, triggerProps(props))} />
      <TooltipPopup
        {...(side === undefined ? {} : { side })}
        {...(align === undefined ? {} : { align })}
        {...(shortcut === undefined ? {} : { shortcut })}
      >
        {button.label}
      </TooltipPopup>
    </TooltipRoot>
  );
}

/**
 * Keeps the trigger's handlers and ref. Drops what would make the DOM differ from the server path:
 * `nz-tooltip-trigger`, its slot, `data-open` and the `tabIndex` that makes any element focusable (a
 * button or link already is; a consumer's own `tabIndex` still applies). Drops `aria-describedby` too:
 * the tooltip repeats the accessible name, so describing the button by it would say the label twice.
 */
function triggerProps(props: Record<string, unknown>): Record<string, unknown> {
  const {
    className: _class,
    'data-slot': _slot,
    'data-open': _open,
    'aria-describedby': _described,
    type: _type,
    tabIndex: _tabIndex,
    ...kept
  } = props;
  return kept;
}
