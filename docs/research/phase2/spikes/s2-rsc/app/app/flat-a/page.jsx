import { Button, DialogRoot, DialogTrigger, DialogPopup } from "@nzspike/ui";
export default function Page() {
  return (
    <main>
      <Button>Server button</Button>
      <DialogRoot defaultOpen>
        <DialogTrigger>Open flat A</DialogTrigger>
        <DialogPopup>Popup flat A content</DialogPopup>
      </DialogRoot>
    </main>
  );
}
