// NO directive: the server-safe IconButton shell (ARCHITECTURE.md §9.5 "split", §10.2). With the
// default tooltip it hands its props to the IconButtonTooltip client leaf; `tooltip={false}` renders the
// <button> here, so a Server Component can use it without running client code. Both paths render the
// <button> with iconButtonElement below, so they write the same DOM.
import type { ReactElement } from 'react';
import { mergeProps } from '../contracts/merge-props';
import { renderElement } from '../contracts/render';
import { cx } from '../_internal/cx';
import { Glyph } from '../_internal/glyphs';
import { ariaKeyShortcuts } from '../_internal/keys';
import { IconButtonTooltip } from './icon-button.client';
import type { IconButtonProps } from './icon-button.contract';

export function IconButton({ tooltip = true, shortcut, ...props }: IconButtonProps): ReactElement {
  warnUnnamed(props.label, props['aria-labelledby']);
  // The tooltip shows the shortcut to sighted users; this tells assistive technology (a consumer's
  // own aria-keyshortcuts wins).
  const keyshortcuts = shortcut === undefined ? undefined : ariaKeyShortcuts(shortcut);
  const button =
    keyshortcuts === undefined || props['aria-keyshortcuts'] !== undefined
      ? props
      : { ...props, 'aria-keyshortcuts': keyshortcuts };
  if (tooltip === false) return iconButtonElement(button);
  return (
    <IconButtonTooltip
      {...button}
      tooltip={tooltip === true ? {} : tooltip}
      {...(shortcut === undefined ? {} : { shortcut })}
    />
  );
}

/** What the element is built from: the props minus the tooltip's. */
export type IconButtonElementProps = Omit<IconButtonProps, 'tooltip' | 'shortcut'>;

/**
 * Renders the button. `trigger` holds the Tooltip trigger's props (handlers and ref) on the client
 * path; the consumer's handlers run before them, as everywhere (§8.2).
 */
export function iconButtonElement(
  {
    label,
    icon,
    variant = 'secondary',
    size = 'md',
    pressed,
    pending = false,
    pendingIndicator,
    disabled = false,
    type,
    render,
    className,
    ...rest
  }: IconButtonElementProps,
  trigger?: Record<string, unknown>,
): ReactElement {
  // Only a real <button> may receive `type` and `disabled`.
  const native = render === undefined;
  const props = trigger === undefined ? rest : mergeProps(trigger, rest);
  return renderElement(
    'button',
    render,
    { variant, size, pending, disabled, pressed },
    {
      'data-slot': 'icon-button',
      'data-variant': variant,
      'data-size': size,
      'data-pending': pending ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      // After our data-*, as in Button: a part that renders this IconButton owns its slot.
      ...props,
      className: cx('nz-icon-button nz-hit-target', className),
      type: native ? (pending ? 'button' : (type ?? 'button')) : undefined,
      disabled: native && disabled && !pending ? true : undefined,
      'aria-label': label,
      'aria-pressed': pressed,
      // Pending stays focusable (gap report B §C2.3).
      'aria-disabled': pending || (!native && disabled) ? true : undefined,
      // A handler only exists when a client component rendered us.
      onClick: pending && props['onClick'] !== undefined ? swallow : props['onClick'],
      children: (
        <span className="nz-icon-button-icon" data-slot="icon-button-icon" aria-hidden="true">
          {pending ? (pendingIndicator ?? <Glyph name="spinner" />) : icon}
        </span>
      ),
    },
  );
}

function swallow(event: { preventDefault(): void }): void {
  event.preventDefault();
}

declare const process: { env: { NODE_ENV?: string } };

/** Development builds warn about an IconButton nothing names; bundlers strip it from production. */
export function warnUnnamed(label: string, labelledBy: string | undefined): void {
  if (label.trim() !== '' || (labelledBy !== undefined && labelledBy.trim() !== '')) return;
  let development = false;
  try {
    development = process.env.NODE_ENV !== 'production';
  } catch {
    // no bundler defined process.env.NODE_ENV: treat it as production
  }
  if (development) {
    console.warn(
      'Nizivo IconButton: `label` is empty, so the button has no accessible name. Pass the action in words, for example label="Delete product".',
    );
  }
}
