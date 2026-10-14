// A Dialog open on the server (`defaultOpen`). React Aria renders no popup during SSR, so the server
// HTML has an expanded trigger and no dialog: the dialog mounts after hydration, and only then may
// every IDREF on the page resolve.
import { Dialog } from '@nizivo/react/dialog';

export default function Page() {
  return (
    <main>
      <h1>Dialog open on the server</h1>
      <Dialog.Root defaultOpen>
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
    </main>
  );
}
