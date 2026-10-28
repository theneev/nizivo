import type { JSX } from 'react';
import { Button } from '../button/index';
import { Dialog } from './index';

/**
 * A destructive dialog: a server Button arrives as the trigger through `render`. Compose a
 * Button (or an IconButton) into `Dialog.Trigger` rather than styling the bare part: it brings the
 * control look and the 40 px control height (the bare part has only the WCAG 2.2 2.5.8 minimum of
 * 24 x 24 px, and the 44 px hit area under a coarse pointer; M27). The bare
 * `Dialog.Close` is the header's close IconButton, named "Close"; the alertdialog still focuses
 * Cancel, its least destructive action.
 */
export function DialogExample(): JSX.Element {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="critical">Delete product</Button>} />
      <Dialog.Popup role="alertdialog" size="sm">
        <Dialog.Title>Delete “Stoneware mug”?</Dialog.Title>
        <Dialog.Close />
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

/**
 * Open on the server: closed overlays and server-rendered opens both emit no popup HTML (§12.2 SSR).
 * The trigger is a composed Button, as everywhere.
 */
export function DialogOpenExample(): JSX.Element {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger render={<Button variant="secondary">Edit</Button>} />
      <Dialog.Popup>
        <Dialog.Title level={3}>Edit product</Dialog.Title>
        <Dialog.Close />
        <Dialog.Body>Body</Dialog.Body>
      </Dialog.Popup>
    </Dialog.Root>
  );
}

/**
 * A footer-less dialog closed by a full-width `Dialog.Close` flush with the popup's bottom edge. The
 * content clips its corners, so a control placed straight in it draws its keyboard ring
 * inside itself, where the clip cannot cut it (§12.3).
 */
export function DialogPlainCloseExample(): JSX.Element {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger render={<Button variant="secondary">Details</Button>} />
      <Dialog.Popup>
        <Dialog.Title level={3}>Order shipped</Dialog.Title>
        <Dialog.Body>It arrives on Friday.</Dialog.Body>
        <Dialog.Close>Done</Dialog.Close>
      </Dialog.Popup>
    </Dialog.Root>
  );
}
