'use client';
// The react-aria family's OverlayEngine (ARCHITECTURE.md §12.2; the interface is
// _internal/overlay.ts): portal container, placement and the popup style contract. Inert (React Aria's
// reference-counted `inert`), the one scroll lock (`usePreventScroll`), the dismiss stack (`useOverlay`)
// and focus return (`FocusScope restoreFocus`; popup.client.tsx's `ReturnFocus` covers a popup that
// opened with no focus origin) stay with React Aria. Adapters import the members by
// name, which keeps the engine's own Placement type; `overlayEngine` is the family's typed whole.
import type { CSSProperties, JSX, ReactNode, RefObject } from 'react';
// Types only from the components barrel: Tooltip imports this module, and a value import here would
// pull React Aria's Popover and Dialog modules into every Tooltip page (Turbopack measured +39 KB
// gzip). The modal-popup helpers live in popup.client.tsx.
import type { PopoverProps } from 'react-aria-components';
import { UNSAFE_PortalProvider } from 'react-aria/PortalProvider';
import type { LogicalSide, OverlayEngine } from '../../_internal/overlay';
import type { Align, Side } from '../../contracts/state';

type Placement = NonNullable<PopoverProps['placement']>;

/** Nested overlays rendered inside `children` portal into `container` (§12.1 L2). */
export function OverlayScope({
  container,
  children,
}: {
  container: RefObject<HTMLElement | null>;
  children: ReactNode;
}): JSX.Element {
  return (
    <UNSAFE_PortalProvider
      getContainer={() =>
        container.current ?? (typeof document === 'undefined' ? null : document.body)
      }
    >
      {children}
    </UNSAFE_PortalProvider>
  );
}

/** React Aria's inert exemption, as props for an element the adapter renders itself. */
export const TOP_LAYER: Readonly<Record<string, string>> = { 'data-react-aria-top-layer': '' };

/** Maps Nizivo's `data-nz-top-layer` to React Aria's inert exemption. */
export function markTopLayer(element: Element): () => void {
  element.setAttribute('data-react-aria-top-layer', '');
  return () => element.removeAttribute('data-react-aria-top-layer');
}

/** Logical side + alignment → a React Aria placement. */
export function toPlacement(side: LogicalSide, align: Align): Placement {
  if (align === 'center') return side;
  if (side === 'top' || side === 'bottom') return `${side} ${align}`;
  return `${side} ${align === 'start' ? 'top' : 'bottom'}`;
}

/** The resolved physical side: the engine's placement after flip and RTL, else the requested side. */
export function resolveSide(
  placement: string | null,
  requested: LogicalSide,
  direction: 'ltr' | 'rtl',
): Side {
  if (
    placement === 'top' ||
    placement === 'bottom' ||
    placement === 'left' ||
    placement === 'right'
  ) {
    return placement;
  }
  if (requested === 'start') return direction === 'rtl' ? 'right' : 'left';
  if (requested === 'end') return direction === 'rtl' ? 'left' : 'right';
  return requested;
}

/**
 * The engine's positioning style without its fixed `z-index` (popups sit in the one
 * `--nz-z-overlay` band, §12.1), plus the runtime variables Nizivo documents (§8.3).
 */
export function popupStyle(style: unknown): CSSProperties | undefined {
  if (typeof style !== 'object' || style === null) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style)) if (key !== 'zIndex') out[key] = value;
  if (out['--trigger-width'] != null) out['--nz-trigger-width'] = out['--trigger-width'];
  if (out['--trigger-anchor-point'] != null) {
    out['--nz-transform-origin'] = out['--trigger-anchor-point'];
  }
  if (typeof out['maxHeight'] === 'number') out['--nz-available-height'] = `${out['maxHeight']}px`;
  return out;
}

export const overlayEngine: OverlayEngine = {
  Scope: OverlayScope,
  markTopLayer,
  toPlacement,
  resolveSide,
  popupStyle,
  delegated: ['inert', 'scroll-lock', 'dismiss-stack', 'focus-return'],
  // tab-out and return-focus: popup.client.tsx (useTabOut, ReturnFocus); initial-focus: the
  // dialog adapter's initialFocus; nested-top-layer: TOP_LAYER on the dialog's nested container
  completes: ['tab-out', 'return-focus', 'initial-focus', 'nested-top-layer'],
};
