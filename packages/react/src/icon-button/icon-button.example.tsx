import type { JSX } from 'react';
import { Inline } from '../inline/index';
import { IconButton } from './index';

/** Stand-ins for `@nizivo/icons` glyphs (20 px Lucide strokes). */
function Bell(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33" />
    </svg>
  );
}
function Trash(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function Plus(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}
function Bold(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
    </svg>
  );
}

/** Secondary (the default), tertiary and primary. Each shows its label in a tooltip on hover and focus. */
export function IconButtonExample(): JSX.Element {
  return (
    <Inline gap="2">
      <IconButton label="Notifications" icon={<Bell />} />
      <IconButton label="Delete product" icon={<Trash />} variant="tertiary" />
      <IconButton label="Add product" icon={<Plus />} variant="primary" />
    </Inline>
  );
}

/** 32, 40 and 48 px. `tooltip={false}` renders on the server with no client code. */
export function IconButtonSizesExample(): JSX.Element {
  return (
    <Inline gap="2">
      <IconButton label="Add product" icon={<Plus />} size="sm" tooltip={false} />
      <IconButton label="Add product" icon={<Plus />} tooltip={false} />
      <IconButton label="Add product" icon={<Plus />} size="lg" tooltip={false} />
    </Inline>
  );
}

/**
 * A toggle keeps its label and reports its state with `pressed` (`aria-pressed`); `pending` keeps the
 * button focusable while the action runs; a disabled button has no tooltip.
 */
export function IconButtonStatesExample(): JSX.Element {
  return (
    <Inline gap="2">
      <IconButton label="Bold" icon={<Bold />} variant="tertiary" pressed={false} />
      <IconButton label="Bold" icon={<Bold />} variant="tertiary" pressed />
      <IconButton label="Delete product" icon={<Trash />} variant="critical" pending />
      <IconButton label="Delete product" icon={<Trash />} disabled />
    </Inline>
  );
}

/** The shortcut shows in the tooltip after the label: ⌘B on Apple devices, Ctrl+B elsewhere. */
export function IconButtonShortcutExample(): JSX.Element {
  return (
    <IconButton
      label="Bold"
      icon={<Bold />}
      variant="tertiary"
      shortcut="mod+b"
      tooltip={{ side: 'bottom' }}
    />
  );
}
