// Fixture: the stateAttrs() tables, written as in the real contracts/state.ts.
export interface StateInput {
  open?: boolean | undefined;
  disabled?: boolean | undefined;
  pressed?: boolean | undefined;
  side?: 'top' | 'bottom' | undefined;
}

const PRESENCE = [
  ['open', 'data-open'],
  ['disabled', 'data-disabled'],
  ['pressed', 'data-pressed'],
] as const;

const VALUED: ReadonlyArray<readonly ['side', `data-${string}`]> = [['side', 'data-side']];

export function stateAttrs(state: StateInput): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, name] of PRESENCE) if (state[key] === true) out[name] = '';
  for (const [key, name] of VALUED) {
    const value = state[key];
    if (value !== undefined) out[name] = value;
  }
  return out;
}
