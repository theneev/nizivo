import type { JSX } from 'react';
import { Button } from '../button/index';
import { Dialog } from './index';

/** Figma Modal Type=Destructive: a server Button arrives as the trigger through `render`. */
export function DialogExample(): JSX.Element {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="critical">Delete product</Button>} />
      <Dialog.Popup role="alertdialog" size="sm">
        <Dialog.Title>Delete “Stoneware mug”?</Dialog.Title>
        <Dialog.Description>This can't be undone.</Dialog.Description>
        <Dialog.Footer>
          <Dialog.Close render={<Button>Cancel</Button>} />
          <Button type="submit" variant="critical">
            Delete
          </Button>
        </Dialog.Footer>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

/** Open on the server: closed overlays and server-rendered opens both emit no popup HTML (§12.2 SSR). */
export function DialogOpenExample(): JSX.Element {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Edit</Dialog.Trigger>
      <Dialog.Popup>
        <Dialog.Title level={3}>Edit product</Dialog.Title>
        <Dialog.Body>Body</Dialog.Body>
        <Dialog.Close>Close</Dialog.Close>
      </Dialog.Popup>
    </Dialog.Root>
  );
}
