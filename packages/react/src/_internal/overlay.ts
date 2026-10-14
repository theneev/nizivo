// NO directive. The engine-free shape of an overlay family's shared mechanics (ARCHITECTURE.md §12.2).
// One implementation per engine family (`_engines/<engine>/overlay.client.tsx` exports it as
// `overlayEngine`), used by every overlay adapter of that family; overlay-family components swap
// engines together (§4.1 L4, checked by nz gen against engines.json). The conformance suite in
// test/overlay runs against the family's adapters through the DOM contract only.
//
// What the family owns, and where:
// - portal container and the nested-portal chain (§12.1 L2): `Scope`, plus each popup's `container`;
// - positioning (§12.2 Positioning): `toPlacement`, `resolveSide` and `popupStyle`, which map the
//   logical side and alignment to the engine and the engine's result back to the vocabulary
//   (`data-side`) and the runtime variables (`--nz-trigger-width`, `--nz-transform-origin`,
//   `--nz-available-height`), and drop the engine's own z-index (§12.1 L1);
// - the top-layer exemption (§12.1 L3): `markTopLayer`;
// - engine-first: inert / hiding outside, the one scroll lock, the dismiss stack (Esc and outside
//   press close the topmost layer) and focus return. Nizivo never writes `inert`, `aria-hidden` or a
//   lock beside the engine; `delegated` names these so a second family states the same ownership;
// - completed by the family where the engine stops short (D-af), each in the family's own files and
//   named in `completes`, because a second family must provide the same behaviour, not the same
//   code: Tab out of a modal popup closes it and moves focus past the trigger (`tab-out`), focus goes
//   back to the trigger after a popup that was open on the server closes (`return-focus`), a dialog
//   focuses its first field (`initial-focus`), and a nested overlay's portal container stays
//   interactive under a modal parent (`nested-top-layer`). The conformance suite tests all four.
import type { CSSProperties, ReactElement, ReactNode, RefObject } from 'react';
import type { Align, Side } from '../contracts/state';

/** A popup's requested side, in logical terms (`start`/`end` follow the writing direction). */
export type LogicalSide = 'top' | 'bottom' | 'start' | 'end';

/** The shared overlay mechanics the engine itself performs (§12.2 table). */
export type DelegatedMechanic = 'inert' | 'scroll-lock' | 'dismiss-stack' | 'focus-return';

/** Behaviour the family adds where its engine stops short of §12.2 (D-af). */
export type FamilyCompletion = 'tab-out' | 'return-focus' | 'initial-focus' | 'nested-top-layer';

export interface OverlayEngine {
  /** Nested overlays rendered inside `children` portal into `container` (§12.1 L2). */
  Scope(props: { container: RefObject<HTMLElement | null>; children: ReactNode }): ReactElement;
  /** Keeps `element` interactive above modal overlays (toast region, live announcer). Returns an undo. */
  markTopLayer(element: Element): () => void;
  /** Logical side + alignment → the engine's placement value. */
  toPlacement(side: LogicalSide, align: Align): string;
  /** The resolved physical side (`data-side`): the engine's placement after flip and RTL, else the request. */
  resolveSide(placement: string | null, requested: LogicalSide, direction: 'ltr' | 'rtl'): Side;
  /** The engine's positioning style minus its z-index, plus Nizivo's runtime variables (§8.3). */
  popupStyle(style: unknown): CSSProperties | undefined;
  /** Mechanics the engine performs; Nizivo never writes `inert`, `aria-hidden` or a lock beside it. */
  readonly delegated: readonly DelegatedMechanic[];
  /** What this family adds on top of its engine to meet §12.2 (header comment; D-af). */
  readonly completes: readonly FamilyCompletion[];
}
