import type { ComponentProps } from "react";
/** Server-safe: no directive, no hooks. */
export function Button({ children, ...props }: ComponentProps<"button">) {
  return (
    <button data-nz-button="nz-button-marker-7f3a" className="nz-button" type="button" {...props}>
      {children}
    </button>
  );
}
