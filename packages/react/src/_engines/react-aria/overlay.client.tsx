'use client';
// The react-aria family's OverlayEngine (ARCHITECTURE.md §12.2): portal container, placement and the
// popup style contract. Inert, scroll lock, dismiss stack and focus return stay with React Aria.
import type { CSSProperties, JSX, ReactNode, RefObject } from 'react';
import type { PopoverProps } from 'react-aria-components';
import { UNSAFE_PortalProvider } from 'react-aria/PortalProvider';
import type { OverlayEngine } from '../../_internal/overlay';
import type { Align, Side } from '../../contracts/state';

type Placement = NonNullable<PopoverProps['placement']>;
export type LogicalSide = 'top' | 'bottom' | 'start' | 'end';

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

/** Maps Nizivo's `data-nz-top-layer` to React Aria's inert exemption. */
export function markTopLayer(element: Element): () => void {
  element.setAttribute('data-react-aria-top-layer', '');
  return () => element.removeAttribute('data-react-aria-top-layer');
}

export const overlayEngine: OverlayEngine = { Scope: OverlayScope, markTopLayer };

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
