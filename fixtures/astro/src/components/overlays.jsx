// Select, Dialog and Tooltip composed inside one island: parts passed from an .astro file would
// arrive as static HTML, outside their Root's context (§11.1).
import { Dialog } from '@nizivo/react/dialog';
import { Select } from '@nizivo/react/select';
import { Stack } from '@nizivo/react/stack';
import { Tooltip } from '@nizivo/react/tooltip';

export function Overlays() {
  // The bare Dialog and Tooltip triggers are unstyled native buttons (21 px tall): side by side they
  // fail WCAG 2.2 target size (2.5.8), so the Stack spaces them (RESULTS.md, "axe").
  return (
    <Stack gap="4">
      <Select.Root defaultValue="30d" name="period" aria-label="Period">
        <Select.Trigger />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
          <Select.Item value="90d">Last 90 days</Select.Item>
        </Select.Popup>
      </Select.Root>
      <Dialog.Root>
        <Dialog.Trigger>Edit product</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Edit product</Dialog.Title>
          <Dialog.Description>Change the name and price.</Dialog.Description>
          <Dialog.Body>Form fields go here.</Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>Done</Dialog.Close>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>Export</Tooltip.Trigger>
        <Tooltip.Popup>Download the report as CSV</Tooltip.Popup>
      </Tooltip.Root>
    </Stack>
  );
}
