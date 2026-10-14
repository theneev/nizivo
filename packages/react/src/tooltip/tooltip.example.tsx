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

export function TooltipOpenExample(): JSX.Element {
  return (
    <Tooltip.Root defaultOpen delay={0}>
      <Tooltip.Trigger aria-label="Refresh">↻</Tooltip.Trigger>
      <Tooltip.Popup>Refresh data</Tooltip.Popup>
    </Tooltip.Root>
  );
}
