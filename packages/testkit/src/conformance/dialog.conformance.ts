import type { ComponentContract } from './contract.ts';

/** Dialog parts as @nizivo/react documents them (ARCHITECTURE.md §10.4, §12.3). */
export const dialogContract: ComponentContract = {
  name: 'dialog',
  parts: {
    Trigger: {
      className: 'nz-dialog-trigger',
      slot: 'dialog-trigger',
      element: 'button',
      states: ['data-open', 'data-pressed', 'data-focus-visible', 'data-disabled'],
    },
    Positioner: {
      className: 'nz-dialog-positioner',
      slot: 'dialog-positioner',
      element: 'div',
      states: ['data-open', 'data-entering', 'data-exiting'],
    },
    Backdrop: {
      className: 'nz-dialog-backdrop',
      slot: 'dialog-backdrop',
      element: 'div',
      states: ['data-open', 'data-entering', 'data-exiting'],
    },
    Popup: {
      className: 'nz-dialog-popup',
      slot: 'dialog-popup',
      element: 'div',
      states: ['data-open', 'data-entering', 'data-exiting', 'data-nested-open'],
    },
    // React Aria 1.22.1 renders the dialog/alertdialog role on a <section>.
    Content: {
      className: 'nz-dialog-content',
      slot: 'dialog-content',
      element: 'section',
      states: [],
    },
    Title: { className: 'nz-dialog-title', slot: 'dialog-title', element: 'h2', states: [] },
    Description: {
      className: 'nz-dialog-description',
      slot: 'dialog-description',
      element: 'p',
      states: [],
    },
    Body: { className: 'nz-dialog-body', slot: 'dialog-body', element: 'div', states: [] },
    Footer: { className: 'nz-dialog-footer', slot: 'dialog-footer', element: 'div', states: [] },
    Close: {
      className: 'nz-dialog-close',
      slot: 'dialog-close',
      element: 'button',
      states: ['data-pressed', 'data-focus-visible', 'data-disabled'],
    },
  },
};
