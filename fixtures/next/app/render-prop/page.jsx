// (d) A Server Component passes server Buttons, as elements, into client parts' `render` (§10.4, V3).
import { Button } from '@nizivo/react/button';
import { Dialog } from '@nizivo/react/dialog';
import { Tooltip } from '@nizivo/react/tooltip';

export default function Page() {
  return (
    <main>
      <h1>Server Button in a render prop</h1>
      <Dialog.Root>
        <Dialog.Trigger render={<Button variant="critical">Delete product</Button>} />
        <Dialog.Popup role="alertdialog" size="sm">
          <Dialog.Title>Delete “Stoneware mug”?</Dialog.Title>
          <Dialog.Description>This can’t be undone.</Dialog.Description>
          <Dialog.Footer>
            <Dialog.Close render={<Button>Cancel</Button>} />
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>
      <Tooltip.Root>
        <Tooltip.Trigger render={<Button variant="tertiary">Export</Button>} />
        <Tooltip.Popup side="end">Download the report as CSV</Tooltip.Popup>
      </Tooltip.Root>
    </main>
  );
}
