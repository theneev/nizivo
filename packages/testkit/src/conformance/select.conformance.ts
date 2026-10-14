import type { ComponentContract } from './contract.ts';

/** Select parts as @nizivo/react documents them (ARCHITECTURE.md §10.3). */
export const selectContract: ComponentContract = {
  name: 'select',
  parts: {
    Root: {
      className: 'nz-select',
      slot: 'select',
      element: 'div',
      states: ['data-open', 'data-disabled', 'data-required', 'data-invalid'],
    },
    Trigger: {
      className: 'nz-select-trigger',
      slot: 'select-trigger',
      element: 'button',
      states: ['data-open', 'data-pressed', 'data-focus-visible', 'data-disabled', 'data-invalid'],
    },
    Value: {
      className: 'nz-select-value',
      slot: 'select-value',
      element: 'span',
      states: ['data-placeholder'],
    },
    Popup: {
      className: 'nz-select-popup',
      slot: 'select-popup',
      element: 'div',
      states: ['data-open', 'data-entering', 'data-exiting', 'data-side', 'data-align'],
    },
    List: { className: 'nz-select-list', slot: 'select-list', element: 'div', states: [] },
    Item: {
      className: 'nz-select-item',
      slot: 'select-item',
      element: 'div',
      states: ['data-highlighted', 'data-selected', 'data-disabled', 'data-focus-visible'],
    },
    Group: { className: 'nz-select-group', slot: 'select-group', element: 'section', states: [] },
    GroupLabel: {
      className: 'nz-select-group-label',
      slot: 'select-group-label',
      element: 'header',
      states: [],
    },
    Separator: {
      className: 'nz-select-separator',
      slot: 'select-separator',
      element: 'div',
      states: [],
    },
  },
};
