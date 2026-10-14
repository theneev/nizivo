// The engine-agnostic shape the conformance suites assert (ARCHITECTURE.md §9.6). A suite receives the
// component through its public parts only, so the same cases run against every adapter.

/** The nine areas every engine-backed component's suite covers, in §9.6 order. */
export const CONFORMANCE_AREAS: readonly ConformanceArea[] = [
  'aria',
  'keyboard',
  'styling-contract',
  'render-merge',
  'forms',
  'ssr',
  'locale',
  'overlays',
  'axe',
];

export type ConformanceArea =
  | 'aria'
  | 'keyboard'
  | 'styling-contract'
  | 'render-merge'
  | 'forms'
  | 'ssr'
  | 'locale'
  | 'overlays'
  | 'axe';

/** One documented part: exactly these class, `data-slot`, element and vocabulary states (§9.6 case 3). */
export interface PartContract {
  className: string;
  slot: string;
  /** The element type the engine renders for the part (§9.3 rule 3). */
  element: string;
  /** Vocabulary attributes the part may carry, by state. */
  states: readonly string[];
}

export interface ComponentContract {
  name: string;
  parts: Readonly<Record<string, PartContract>>;
}
