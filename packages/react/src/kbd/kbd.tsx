// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { splitKeys } from '../_internal/keys';

/** The `data-platform` values of the glyph spans; they match `data-nz-platform` (§8.3). */
export type KbdPlatform = 'apple' | 'other';

export interface KbdProps extends ComponentPropsWithRef<'kbd'> {
  /**
   * A shortcut such as `"mod+k"` or `"mod+shift+d"`, drawn for both platforms (`⌘⇧D` and
   * `Ctrl+Shift+D`); CSS shows the one `data-nz-platform` names, and `other` when no ancestor sets it.
   * `mod` is ⌘ on Apple platforms and Ctrl elsewhere; the plus key is `plus` (`"mod+plus"`, or
   * `"mod++"`). Replaces `children`.
   */
  keys?: string;
  /** Literal key text, for example `<Kbd>esc</Kbd>` or `<Kbd>↑↓</Kbd>`. */
  children?: ReactNode;
  render?: RenderProp<Record<string, never>>;
}

/** Key name → [Apple glyph, other platforms]. Anything else is drawn as written; one letter is uppercased. */
const KEYS: Record<string, readonly [string, string]> = {
  mod: ['⌘', 'Ctrl'],
  cmd: ['⌘', 'Win'],
  command: ['⌘', 'Win'],
  meta: ['⌘', 'Win'],
  ctrl: ['⌃', 'Ctrl'],
  control: ['⌃', 'Ctrl'],
  alt: ['⌥', 'Alt'],
  option: ['⌥', 'Alt'],
  shift: ['⇧', 'Shift'],
  enter: ['↵', 'Enter'],
  return: ['↵', 'Enter'],
  esc: ['esc', 'esc'],
  escape: ['esc', 'esc'],
  tab: ['⇥', 'Tab'],
  backspace: ['⌫', 'Backspace'],
  delete: ['⌦', 'Del'],
  space: ['Space', 'Space'],
  plus: ['+', '+'],
  up: ['↑', '↑'],
  down: ['↓', '↓'],
  left: ['←', '←'],
  right: ['→', '→'],
};

/** `"mod+shift+d"` → `["⌘⇧D", "Ctrl+Shift+D"]`: Apple glyphs run together, others join with `+`. */
function formatKeys(keys: string): [apple: string, other: string] {
  const apple: string[] = [];
  const other: string[] = [];
  for (const key of splitKeys(keys)) {
    const known = KEYS[key.toLowerCase()];
    const text = key.length === 1 ? key.toUpperCase() : key;
    apple.push(known?.[0] ?? text);
    other.push(known?.[1] ?? text);
  }
  return [apple.join(''), other.join('+')];
}

export function Kbd({ keys, render, className, children, ...rest }: KbdProps): ReactElement {
  return renderElement(
    'kbd',
    render,
    {},
    {
      'data-slot': 'kbd',
      ...rest,
      className: cx('nz-kbd', className),
      children: (
        <span className="nz-kbd-label" data-slot="kbd-label">
          {keys === undefined ? children : glyphs(keys)}
        </span>
      ),
    },
  );
}

/** One span per platform when they differ; CSS hides the other (kbd.css). */
function glyphs(keys: string): ReactNode {
  const [apple, other] = formatKeys(keys);
  if (apple === other) return apple;
  return (
    <>
      <span className="nz-kbd-glyphs" data-slot="kbd-glyphs" data-platform="apple">
        {apple}
      </span>
      <span className="nz-kbd-glyphs" data-slot="kbd-glyphs" data-platform="other">
        {other}
      </span>
    </>
  );
}
