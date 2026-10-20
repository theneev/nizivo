// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** The Figma text styles as lowercase names (`Nizivo/Label/M` → `label-m`), plus the 12 px proposals. */
export type TextVariant =
  | 'display-l'
  | 'display-m'
  | 'heading-h1'
  | 'heading-h2'
  | 'heading-h3'
  | 'heading-h4'
  | 'body-l'
  | 'body-m'
  | 'body-m-strong'
  | 'body-s'
  | 'label-l'
  | 'label-m'
  | 'label-m-strong'
  | 'label-s'
  | 'numeric-display'
  | 'numeric-kpi'
  | 'numeric-l'
  | 'numeric-m'
  | 'mono-m'
  | 'mono-m-strong';

/**
 * The `text/*` colour tokens. `accent` paints `--nz-text-brand`, since Figma has no accent text for page
 * surfaces (M38; `--nz-text-inverse-accent` is for `bg/inverse`).
 *
 * Deprecated: `'accent'`, which looks exactly like `'brand'`; use `'brand'`. It keeps working; its
 * removal is deferred to 1.0, or to when Figma adds an accent text for page surfaces (M42).
 * TypeScript cannot deprecate one member of a union type, so this note is the marker. Card's and
 * KpiTile's `tone="accent"`, a surface, are not deprecated.
 */
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'inverse'
  | 'on-brand'
  | 'on-accent'
  | 'on-critical'
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'critical'
  | 'info';

export interface TextState {
  variant: TextVariant;
  tone: TextTone | undefined;
}

export interface TextProps extends ComponentPropsWithRef<'p'> {
  /** The text style. 12 px exists only as `body-s` and `label-s` (§15.1). @default 'body-m' */
  variant?: TextVariant;
  /**
   * A `text/*` colour. Absent, the colour is inherited from the surface. Deprecated value:
   * `'accent'`, which paints `--nz-text-brand`; use `'brand'` (M42; removal deferred to 1.0).
   */
  tone?: TextTone;
  /** Another element or component, for example `render={<span />}` or `render={<label htmlFor="sku" />}`. */
  render?: RenderProp<TextState>;
}

export function Text({
  variant = 'body-m',
  tone,
  render,
  className,
  ...rest
}: TextProps): ReactElement {
  return renderElement(
    'p',
    render,
    { variant, tone },
    {
      'data-slot': 'text',
      'data-variant': variant,
      'data-tone': tone,
      ...rest,
      className: cx('nz-text', className),
    },
  );
}
