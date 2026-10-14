import { Button, Dialog } from "@nzspike/ui";
export default function Page() {
  return (
    <main>
      <Button>Server button</Button>
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open A</Dialog.Trigger>
        <Dialog.Popup>Popup A content</Dialog.Popup>
      </Dialog.Root>
    </main>
  );
}
