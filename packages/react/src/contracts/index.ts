// @nizivo/react/contracts: the server-safe helpers behind every part, public for E4 replacements
// (ARCHITECTURE.md §8.6, §10.1). NO directive.
export { renderElement, toRenderFn } from './render';
export type { RenderProp } from './render';
export { mergeProps } from './merge-props';
export { stateAttrs, STATE_ATTR_NAMES } from './state';
export type { StateInput, StateAttrs, Side, Align, Orientation } from './state';
export { details } from './details';
export type { ChangeDetails, OpenReason } from './details';
