import type { ComponentContract } from './contract.ts';

/** Tooltip parts as @nizivo/react documents them (ARCHITECTURE.md §12.3). */
export const tooltipContract: ComponentContract = {
  name: 'tooltip',
  parts: {
    Trigger: {
      className: 'nz-tooltip-trigger',
      slot: 'tooltip-trigger',
      element: 'button',
      states: ['data-open'],
    },
    Popup: {
      className: 'nz-tooltip-popup',
      slot: 'tooltip-popup',
      element: 'div',
      states: ['data-open', 'data-entering', 'data-exiting', 'data-side', 'data-align'],
    },
  },
};
