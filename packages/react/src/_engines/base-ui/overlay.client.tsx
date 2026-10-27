'use client';
// The Base UI canary's OverlayEngine (ARCHITECTURE.md §10.4, §12.2; the interface is
// _internal/overlay.ts; M65, D-dk): a second overlay family for Dialog and Select, run by the overlay
// conformance lane under NZ_ADAPTER=base-ui and never shipped. Base UI has no portal-container
// provider, so the family's nested-portal chain is a context of its own, read by each popup's
// Portal. Hiding the outside (`aria-hidden` and its `data-base-ui-inert` marker), the scroll lock,
// the dismiss stack and focus return stay with Base UI.
import {
  createContext,
  use,
  type CSSProperties,
  type JSX,
  type ReactNode,
  type RefObject,
} from 'react';
import type { LogicalSide, OverlayEngine } from '../../_internal/overlay';
import type { Align, Side } from '../../contracts/state';

const Container = createContext<RefObject<HTMLElement | null> | null>(null);

/** Nested overlays rendered inside `children` portal into `container` (§12.1 L2). */
export function OverlayScope({
  container,
  children,
}: {
  container: RefObject<HTMLElement | null>;
  children: ReactNode;
}): JSX.Element {
  return <Container value={container}>{children}</Container>;
}

/** The portal container for a popup: its own `container`, else the enclosing overlay's, else body. */
export function usePortalContainer(
  own: Element | null | undefined,
): RefObject<HTMLElement | null> | HTMLElement | undefined {
  const scope = use(Container);
  if (own instanceof HTMLElement) return own;
  return scope ?? undefined;
}

/**
 * Base UI keeps `[aria-live]` regions outside its `aria-hidden`, but has no attribute that exempts
 * any other element: nothing to set (a canary finding, W30-RESULTS.md).
 */
export function markTopLayer(_element: Element): () => void {
  return () => undefined;
}

/** Base UI's placement: a physical or logical side and an alignment. */
export interface BasePlacement {
  side: 'top' | 'bottom' | 'inline-start' | 'inline-end';
  align: Align;
}

export function toPlacement(side: LogicalSide, align: Align): BasePlacement {
  const map = { top: 'top', bottom: 'bottom', start: 'inline-start', end: 'inline-end' } as const;
  return { side: map[side], align };
}

/** Base UI's resolved side (after flip) is physical except for `inline-*`, which follows direction. */
export function resolveSide(
  placement: string | null,
  requested: LogicalSide,
  direction: 'ltr' | 'rtl',
): Side {
  const logical =
    placement === 'inline-start' ? 'start' : placement === 'inline-end' ? 'end' : placement;
  if (logical === 'top' || logical === 'bottom' || logical === 'left' || logical === 'right') {
    return logical;
  }
  const side = logical === 'start' || logical === 'end' ? logical : requested;
  if (side === 'start') return direction === 'rtl' ? 'right' : 'left';
  if (side === 'end') return direction === 'rtl' ? 'left' : 'right';
  return side;
}

/**
 * Base UI positions the positioner element and publishes `--anchor-width`, `--available-height` and
 * `--transform-origin` on it; Nizivo's runtime variables (§8.3) read them.
 */
export function popupStyle(style: unknown): CSSProperties | undefined {
  const out: Record<string, unknown> =
    typeof style === 'object' && style !== null ? { ...style } : {};
  delete out['zIndex'];
  out['--nz-trigger-width'] = 'var(--anchor-width)';
  out['--nz-available-height'] = 'var(--available-height)';
  out['--nz-transform-origin'] = 'var(--transform-origin)';
  return out;
}

export const overlayEngine: OverlayEngine = {
  Scope: OverlayScope,
  markTopLayer,
  toPlacement: (side, align) => {
    const p = toPlacement(side, align);
    return `${p.side} ${p.align}`;
  },
  resolveSide,
  popupStyle,
  // Base UI marks the outside aria-hidden (not inert), locks scroll, keeps a dismiss stack and
  // returns focus to the trigger
  delegated: ['inert', 'scroll-lock', 'dismiss-stack', 'focus-return'],
  // the chain past the trigger and the nested top layer are not completed: canary findings
  completes: ['initial-focus'],
};
