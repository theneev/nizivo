import type { JSX } from 'react';
import { Button } from '../button/index';
import { Tooltip } from './index';

export function TooltipExample(): JSX.Element {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<Button variant="tertiary">Export</Button>} />
      <Tooltip.Popup side="end">Download the report as CSV</Tooltip.Popup>
    </Tooltip.Root>
  );
}

/**
 * `content` renders the Popup for you, and `shortcut` draws the keys with Kbd: ⌘E on Apple devices
 * once `ThemeScript` has run, Ctrl+E elsewhere.
 */
export function TooltipShortcutExample(): JSX.Element {
  return (
    <Tooltip.Root content="Export the report" shortcut="mod+e">
      <Tooltip.Trigger render={<Button variant="secondary">Export</Button>} />
    </Tooltip.Root>
  );
}

export function TooltipOpenExample(): JSX.Element {
  return (
    <Tooltip.Root defaultOpen delay={0}>
      <Tooltip.Trigger aria-label="Refresh">↻</Tooltip.Trigger>
      <Tooltip.Popup>Refresh data</Tooltip.Popup>
    </Tooltip.Root>
  );
}
