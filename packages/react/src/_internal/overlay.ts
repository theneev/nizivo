// NO directive. The engine-free shape of an overlay family's shared mechanics (ARCHITECTURE.md §12.2).
// Inert, scroll lock, dismiss stack and focus return are delegated to the engine; Nizivo never writes
// `inert` or `aria-hidden` while an engine is in charge.
import type { ReactElement, ReactNode, RefObject } from 'react';

export interface OverlayEngine {
  /** Nested overlays rendered inside `children` portal into `container` (§12.1 L2). */
  Scope(props: { container: RefObject<HTMLElement | null>; children: ReactNode }): ReactElement;
  /** Keeps `element` interactive above modal overlays (toast region, live announcer). Returns an undo. */
  markTopLayer(element: Element): () => void;
}
