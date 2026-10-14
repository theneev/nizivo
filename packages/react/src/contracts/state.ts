// NO directive. The `state` group of contracts/vocabulary.json as a typed helper (ARCHITECTURE.md §8.3).
// Kept in sync with the JSON by test/unit/state.test.ts until `nz gen` emits this file.

/** Value sets of the valued attributes, in contracts/vocabulary.json order (checked by the test). */
export const SIDES = ['top', 'right', 'bottom', 'left'] as const;
export const ALIGNS = ['start', 'center', 'end'] as const;
export const ORIENTATIONS = ['horizontal', 'vertical'] as const;
export const MIRRORS = ['rtl'] as const;

export type Side = (typeof SIDES)[number];
export type Align = (typeof ALIGNS)[number];
export type Orientation = (typeof ORIENTATIONS)[number];

/** Engine-independent state, as adapters derive it from the engine's render state. */
export interface StateInput {
  open?: boolean | undefined;
  entering?: boolean | undefined;
  exiting?: boolean | undefined;
  side?: Side | undefined;
  align?: Align | undefined;
  nestedOpen?: boolean | undefined;
  highlighted?: boolean | undefined;
  selected?: boolean | undefined;
  checked?: boolean | undefined;
  indeterminate?: boolean | undefined;
  pressed?: boolean | undefined;
  focusVisible?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  invalid?: boolean | undefined;
  placeholder?: boolean | undefined;
  orientation?: Orientation | undefined;
  loading?: boolean | undefined;
  pending?: boolean | undefined;
  empty?: boolean | undefined;
  error?: boolean | undefined;
  mirror?: (typeof MIRRORS)[number] | undefined;
}

type PresenceKey = Exclude<keyof StateInput, 'side' | 'align' | 'orientation' | 'mirror'>;
type ValueKey = 'side' | 'align' | 'orientation' | 'mirror';

const PRESENCE: ReadonlyArray<readonly [PresenceKey, `data-${string}`]> = [
  ['open', 'data-open'],
  ['entering', 'data-entering'],
  ['exiting', 'data-exiting'],
  ['nestedOpen', 'data-nested-open'],
  ['highlighted', 'data-highlighted'],
  ['selected', 'data-selected'],
  ['checked', 'data-checked'],
  ['indeterminate', 'data-indeterminate'],
  ['pressed', 'data-pressed'],
  ['focusVisible', 'data-focus-visible'],
  ['disabled', 'data-disabled'],
  ['readOnly', 'data-readonly'],
  ['required', 'data-required'],
  ['invalid', 'data-invalid'],
  ['placeholder', 'data-placeholder'],
  ['loading', 'data-loading'],
  ['pending', 'data-pending'],
  ['empty', 'data-empty'],
  ['error', 'data-error'],
];

const VALUED: ReadonlyArray<readonly [ValueKey, `data-${string}`]> = [
  ['side', 'data-side'],
  ['align', 'data-align'],
  ['orientation', 'data-orientation'],
  ['mirror', 'data-mirror'],
];

/** `data-*` attributes keyed by name; presence attributes carry `""`. */
export type StateAttrs = Record<`data-${string}`, string>;

/** Every attribute name `stateAttrs()` can emit. */
export const STATE_ATTR_NAMES: readonly string[] = [...PRESENCE, ...VALUED].map(([, name]) => name);

/** Maps state to vocabulary attributes. False and absent states emit nothing. */
export function stateAttrs(state: StateInput): StateAttrs {
  const out: StateAttrs = {};
  for (const [key, name] of PRESENCE) if (state[key] === true) out[name] = '';
  for (const [key, name] of VALUED) {
    const value = state[key];
    if (value !== undefined) out[name] = value;
  }
  return out;
}
