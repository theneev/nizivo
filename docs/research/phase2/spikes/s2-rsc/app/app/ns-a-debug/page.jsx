import { Dialog, DialogRoot } from "@nzspike/ui";
export const dynamic = "force-dynamic";
export default function Page() {
  let keys; try { keys = Object.keys(Dialog).join(","); } catch (e) { keys = "THROWS: " + e.message; }
  let root; try { root = typeof Dialog.Root; } catch (e) { root = "THROWS: " + e.message; }
  const info = {
    typeofDialog: typeof Dialog,
    dialogDollarTypeof: String(Dialog?.$$typeof),
    dialogId: String(Dialog?.$$id),
    keys,
    typeofDialogRoot: root,
    flatDialogRootDollarTypeof: String(DialogRoot?.$$typeof),
    flatDialogRootId: String(DialogRoot?.$$id),
  };
  return <pre id="info">{JSON.stringify(info, null, 2)}</pre>;
}
