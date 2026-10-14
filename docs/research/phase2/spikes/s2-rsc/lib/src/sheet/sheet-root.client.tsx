"use client";
import { createContext, useState, type ReactNode } from "react";
type Ctx = { open: boolean; setOpen: (v: boolean) => void };
export const SheetContext = createContext<Ctx | null>(null);
export function SheetRoot({ children, defaultOpen = false }: { children?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <SheetContext value={{ open, setOpen }}>{children}</SheetContext>;
}
