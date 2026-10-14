"use client";
import { Dialog, Button } from "@nzspike/ui";
import { Sheet } from "@nzspike/ui/b";
export function ClientNs() {
  return (
    <div>
      <Button>Client button</Button>
      <Dialog.Root defaultOpen><Dialog.Trigger>Client A</Dialog.Trigger><Dialog.Popup>Client popup A</Dialog.Popup></Dialog.Root>
      <Sheet.Root defaultOpen><Sheet.Trigger>Client B</Sheet.Trigger><Sheet.Popup>Client popup B</Sheet.Popup></Sheet.Root>
    </div>
  );
}
