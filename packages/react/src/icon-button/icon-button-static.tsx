// NO directive, and no import of a 'use client' module (ARCHITECTURE.md §9.5, §10.2; D-aa, M31): the
// IconButton element, and IconButtonStatic, which renders it with nothing else. IconButton's shell and
// its tooltip leaf build the same <button> here, so all three write the same DOM. A page that imports
// only IconButtonStatic reaches no client module, so a bundler that ships every client module the
// server graph reaches (Turbopack, `next dev`) adds nothing to the page for it.
import type { ReactElement } from 'react';
import { mergeProps } from '../contracts/merge-props';
import { renderElement } from '../contracts/render';
import { cx } from '../_internal/cx';
import { SpinnerGlyph } from '../_internal/glyphs';
import type { IconButtonProps, IconButtonStaticProps } from './icon-button.contract';

/**
 * A server-safe IconButton with no tooltip: the same `<button>`, classes and CSS as
 * `<IconButton tooltip={false}>`, from a module that imports no client code.
 *
 * Use it only where visible text already names the action for sighted users (a column header, a
 * labelled row) and the page should ship no JavaScript for the button: a table row action that is a
 * link (`render={<a href="/orders/42/edit" />}`) under a header that says what it does, a submit
 * button in a Server Action form (`type="submit"` inside `<form action={deleteProduct}>`) beside its
 * label. Under Turbopack and `next dev`, importing `IconButton` ships its tooltip code even with
 * `tooltip={false}` (about 20 KB gzip in production); `IconButtonStatic` ships none.
 *
 * An icon-only toolbar needs `IconButton`'s tooltip, so a sighted user can read what each glyph does.
 *
 * `aria-label` is always required. You may also pass `aria-labelledby` pointing at visible text; it
 * then names the button, with `aria-label` as the fallback. There is no `tooltip`, no `shortcut`
 * (pass `aria-keyshortcuts` yourself, for example `"Meta+B Control+B"`) and no `label`.
 */
export function IconButtonStatic({
  'aria-label': ariaLabel,
  // Typed `never`; dropped so an untyped caller does not write them onto the <button>.
  label: _label,
  tooltip: _tooltip,
  shortcut: _shortcut,
  ...props
}: IconButtonStaticProps): ReactElement {
  warnUnnamed(ariaLabel, props['aria-labelledby'], 'IconButtonStatic', 'aria-label');
  return iconButtonElement({ ...props, label: ariaLabel });
}

/** What the element is built from: IconButton's props minus the tooltip's, with an optional name. */
export type IconButtonElementProps = Omit<IconButtonProps, 'tooltip' | 'shortcut' | 'label'> & {
  /** Written as `aria-label`; absent when `undefined`. */
  label: string | undefined;
};

/**
 * Renders the button. `trigger` holds the Tooltip trigger's props (handlers and ref) on IconButton's
 * client path; the consumer's handlers run before them, as everywhere (§8.2).
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
          {pending ? (pendingIndicator ?? <SpinnerGlyph />) : icon}
        </span>
      ),
    },
  );
}

function swallow(event: { preventDefault(): void }): void {
  event.preventDefault();
}

declare const process: { env: { NODE_ENV?: string } };

/**
 * Development builds warn about a button nothing names; bundlers strip it from production. `prop` is
 * the prop that names it (`label` on IconButton, `aria-label` on IconButtonStatic).
 */
export function warnUnnamed(
  name: string | undefined,
  labelledBy: string | undefined,
  component = 'IconButton',
  prop = 'label',
): void {
  if ((name ?? '').trim() !== '' || (labelledBy ?? '').trim() !== '') return;
  let development = false;
  try {
    development = process.env.NODE_ENV !== 'production';
  } catch {
    // no bundler defined process.env.NODE_ENV: treat it as production
  }
  if (development) {
    console.warn(
      `Nizivo ${component}: \`${prop}\` is empty, so the button has no accessible name. Pass the action in words, for example ${prop}="Delete product".`,
    );
  }
}
