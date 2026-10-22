'use client';
// The Drawer's engine adapter (ARCHITECTURE.md §9.2, §12.3 Drawer / Sheet row): the Dialog adapter,
// re-exported, plus the engine's writing direction. A drawer is a modal dialog at an edge, so React
// Aria's ModalOverlay → Modal → Dialog serve it unchanged; the leaf adds the classes and the resolved
// edge. RAC 1.22's Sheet is not used: it is a preview there (component-inventory §4.6), and one modal
// core keeps the Dialog and the Drawer nesting, locking and returning focus the same way.
import { useLocale } from 'react-aria-components';
import type { DrawerEngine } from '../../drawer/drawer.contract';

export { Close, Description, Popup, Root, Title, Trigger } from './dialog.client';

/** The engine's writing direction, from the locale every engine root provides (§9.3 rule 5). */
export const useDirection: DrawerEngine['useDirection'] = () => useLocale().direction;
