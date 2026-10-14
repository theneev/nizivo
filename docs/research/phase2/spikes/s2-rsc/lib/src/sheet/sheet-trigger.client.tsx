"use client";
import { use, type ReactNode } from "react";
import { SheetContext } from "./sheet-root.client";
export function SheetTrigger({ children }: { children?: ReactNode }) {
  const ctx = use(SheetContext)!;
  return <button type="button" data-nz-sheet-trigger="nz-sheet-marker-c4d2" aria-expanded={ctx.open} onClick={() => ctx.setOpen(!ctx.open)}>{children}</button>;
}
export function SheetPopup({ children }: { children?: ReactNode }) {
  const ctx = use(SheetContext)!;
  return ctx.open ? <div role="dialog" data-nz-sheet-popup="">{children}</div> : null;
}
