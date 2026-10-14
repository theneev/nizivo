'use client';
// Fixture: the public client leaf of an engine-backed compound component (ARCHITECTURE.md §9.2).
import type { SelectPartProps, SelectRootProps } from './select.contract';

// Internal: never exported, so it can never leak through a barrel.
const scope = { size: 'md' };

export function SelectRoot(props: SelectRootProps): unknown {
  return { ...props, scope };
}
export function SelectTrigger(props: SelectPartProps): unknown {
  return props;
}
export const SelectValue = (props: SelectPartProps): unknown => props;
export const SelectPopup = (props: SelectPartProps): unknown => props;
export const SelectItem = (props: SelectPartProps): unknown => props;
export const SelectGroup = (props: SelectPartProps): unknown => props;
export const SelectGroupLabel = (props: SelectPartProps): unknown => props;
export const SelectSeparator = (props: SelectPartProps): unknown => props;
