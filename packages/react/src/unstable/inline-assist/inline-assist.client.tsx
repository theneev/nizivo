'use client';
// InlineAssist (ARCHITECTURE.md §21.4a; D-dn; Figma's Inline Assist 7410:346): the AI's actions for
// selected text ("Improve", "Shorten", "Translate") and "Ask AI…", in a dark floating toolbar.
// It is a `role="toolbar"` with one Tab stop: the arrow keys move between its buttons (Home and End
// to the ends, mirrored right to left), and it never takes focus on its own. Placing it at the
// selection and opening it on Ctrl/⌘+J are the app's; a result replaces the selection only after the
// person accepts it, with Undo. UNSTABLE: the AI kit is new and unreviewed.
import {
  useState,
  type ComponentPropsWithRef,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useLabels } from '../../config/config.client';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { SparklesGlyph } from '../../_internal/glyphs';

/** One action on the selection. */
export interface InlineAssistAction {
  value: string;
  label: string;
  /** A 16 px glyph, such as one from `@nizivo/icons`. */
  icon?: ReactNode;
  disabled?: boolean;
}

/** InlineAssist's own strings (§16.4): serialisable, English defaults. */
export interface InlineAssistLabels {
  /**
   * The toolbar's name.
   * @default 'Writing tools'
   */
  label: string;
  /** The last button, after the divider. @default 'Ask AI…' */
  ask: string;
}

export interface InlineAssistProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'role'> {
  actions: readonly InlineAssistAction[];
  /** An action was chosen: run it on the selection, and show the result for acceptance. */
  onAction?: (value: string) => void;
  /** "Ask AI…" was chosen: open the composer with the selection as context. */
  onAsk?: () => void;
  labels?: Partial<InlineAssistLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function InlineAssist({
  actions,
  onAction,
  onAsk,
  labels: labelsProp,
  render,
  className,
  onKeyDown,
  ...rest
}: InlineAssistProps): JSX.Element {
  const labels = useLabels('inlineAssist', labelsProp);
  // the one Tab stop: the button last focused, the first at the start
  const [active, setActive] = useState(0);

  const button = (
    index: number,
    label: string,
    icon: ReactNode,
    onClick: (() => void) | undefined,
    disabled?: boolean,
  ): JSX.Element => (
    <button
      key={index}
      type="button"
      className="nz-inline-assist-action"
      data-slot="inline-assist-action"
      tabIndex={index === active ? 0 : -1}
      disabled={disabled}
      onFocus={() => setActive(index)}
      onClick={onClick}
    >
      {icon != null && (
        <span className="nz-inline-assist-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {label}
    </button>
  );

  return renderElement(
    'div',
    render,
    {},
    {
      role: 'toolbar',
      'aria-label': labels?.label ?? 'Writing tools',
      'data-slot': 'inline-assist',
      ...rest,
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) move(event);
      },
      className: cx('nz-inline-assist', className),
      children: (
        <>
          {actions.map((action, index) =>
            button(
              index,
              action.label,
              action.icon,
              onAction === undefined ? undefined : () => onAction(action.value),
              action.disabled,
            ),
          )}
          <span className="nz-inline-assist-divider" aria-hidden="true" />
          {button(actions.length, labels?.ask ?? 'Ask AI…', <SparklesGlyph />, onAsk)}
        </>
      ),
    },
  );
}

/** The arrow keys, Home and End move focus along the toolbar, mirrored right to left. */
function move(event: KeyboardEvent<HTMLDivElement>): void {
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[data-slot="inline-assist-action"]:not(:disabled)',
    ),
  ];
  const at = buttons.findIndex((button) => button === document.activeElement);
  if (at === -1 || buttons.length === 0) return;
  const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  const next =
    event.key === forward
      ? (at + 1) % buttons.length
      : event.key === back
        ? (at - 1 + buttons.length) % buttons.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : undefined;
  if (next === undefined) return;
  event.preventDefault();
  buttons[next]?.focus();
}
