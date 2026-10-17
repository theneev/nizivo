import type { JSX } from 'react';
import { Button } from '../button/index';
import { Tooltip } from './index';

/**
 * Compose a Button (or an IconButton) into `Tooltip.Trigger`: it brings the control look and the
 * 40 px control height. The bare part is an unstyled `<button>` with only the WCAG 2.2 2.5.8 minimum
 * of 24 x 24 px (and the 44 px hit area under a coarse pointer; M27).
 */
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

/** Open on the server; the trigger is a composed Button, as everywhere. */
export function TooltipOpenExample(): JSX.Element {
  return (
    <Tooltip.Root defaultOpen delay={0}>
      <Tooltip.Trigger render={<Button variant="secondary">Refresh</Button>} />
      <Tooltip.Popup>Refresh data</Tooltip.Popup>
    </Tooltip.Root>
  );
}
