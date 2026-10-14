import { SheetRoot, SheetTrigger, SheetPopup } from "@nzspike/ui/b";
export default function Page() {
  return (
    <main>
      <SheetRoot defaultOpen>
        <SheetTrigger>Open flat B</SheetTrigger>
        <SheetPopup>Popup flat B content</SheetPopup>
      </SheetRoot>
    </main>
  );
}
