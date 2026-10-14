"use client";
import { createContext, use, useState, type ReactNode } from "react";

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const DialogContext = createContext<Ctx | null>(null);

export function DialogRoot({ children, defaultOpen = false }: { children?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <DialogContext value={{ open, setOpen }}>{children}</DialogContext>;
}
export function DialogTrigger({ children }: { children?: ReactNode }) {
  const ctx = use(DialogContext)!;
  return (
    <button type="button" data-nz-dialog-trigger="nz-dialog-marker-91bc" aria-expanded={ctx.open} onClick={() => ctx.setOpen(!ctx.open)}>
      {children}
    </button>
  );
}
export function DialogPopup({ children }: { children?: ReactNode }) {
  const ctx = use(DialogContext)!;
  return ctx.open ? <div role="dialog" data-nz-dialog-popup="">{children}</div> : null;
}
export { DialogRoot as Root, DialogTrigger as Trigger, DialogPopup as Popup };
