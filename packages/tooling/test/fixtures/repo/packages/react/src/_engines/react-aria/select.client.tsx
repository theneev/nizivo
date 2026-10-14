'use client';
// Fixture: the engine adapter. It implements SelectEngine; engine.ts re-exports these parts.
import type { SelectEngine } from '../../select/select.contract';

export const Root: SelectEngine['Root'] = (props) => props;
export const Trigger: SelectEngine['Trigger'] = (props) => props;
export const Value: SelectEngine['Value'] = (props) => props;
export const Popup: SelectEngine['Popup'] = (props) => props;
export const Item: SelectEngine['Item'] = (props) => props;
export const Group: SelectEngine['Group'] = (props) => props;
export const GroupLabel: SelectEngine['GroupLabel'] = (props) => props;
export const Separator: SelectEngine['Separator'] = (props) => props;
