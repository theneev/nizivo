import { Sheet } from "@nzspike/ui/b";
import { Button } from "@nzspike/ui";
export default function Page() {
  return (
    <main>
      <Button>Server button</Button>
      <Sheet.Root defaultOpen>
        <Sheet.Trigger>Open B</Sheet.Trigger>
        <Sheet.Popup>Popup B content</Sheet.Popup>
      </Sheet.Root>
    </main>
  );
}
