// NO directive. Callback details shared by every component (ARCHITECTURE.md §8.2, §9.3 rule 2).

/**
 * The second argument of every `on<X>Change(value, details)`. `reason` is Nizivo-owned: where the
 * engine reports no cause, it is `'unknown'`, never a guess.
 */
export interface ChangeDetails<R extends string> {
  reason: R | 'unknown';
  event?: Event;
}

/** Why an overlay opened or closed (§12.2). */
export type OpenReason =
  | 'trigger'
  | 'escape'
  | 'outside-press'
  | 'close-part'
  | 'item-press'
  | 'hidden'
  | 'programmatic';

export function details<R extends string = never>(
  reason: NoInfer<R> | 'unknown',
  event?: Event,
): ChangeDetails<R> {
  return event === undefined ? { reason } : { reason, event };
}
