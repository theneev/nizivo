// NO directive: Breadcrumb is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5; Figma Breadcrumb
// 755:998, figma/06 §6.9). A `<nav>` landmark around an `<ol>`: each level is a link, the last is
// the current page (`aria-current="page"`, text, not a link), and the chevrons between them are
// decorative (`aria-hidden`).
//
// The collapse rule (0.2): nothing collapses. Every level stays a link in the DOM and in the Tab
// order, and a trail longer than its container wraps onto a second line. Hiding middle levels
// behind an ellipsis needs a menu to reach them (figma/06's `maxItems`), which is client code; it is
// not built, so no level is ever unreachable.
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { ChevronGlyph } from '../_internal/glyphs';

/** Breadcrumb's own strings (§16.4): serialisable, English defaults. */
export interface BreadcrumbLabels {
  /** The landmark's name. @default 'Breadcrumb' */
  nav: string;
}

export interface BreadcrumbRootProps extends ComponentPropsWithRef<'nav'> {
  /**
   * Replaces the chevron between levels on every `Breadcrumb.Item` that sets none. It is decorative
   * (`aria-hidden`), so a character such as "/" is fine. It is not mirrored under `dir="rtl"`.
   */
  separator?: ReactNode;
  /** An `aria-label` wins over `labels.nav`. */
  labels?: Partial<BreadcrumbLabels>;
  /** Must render a navigation landmark (a `<nav>`, or an element with `role="navigation"`). */
  render?: RenderProp<Record<string, never>>;
  /** `Breadcrumb.Item` elements, the root of the site first. */
  children?: ReactNode;
}

export interface BreadcrumbItemState {
  current: boolean;
}

export interface BreadcrumbItemProps extends Omit<ComponentPropsWithRef<'a'>, 'children'> {
  /**
   * The page being shown: renders text with `aria-current="page"` instead of a link (the last
   * item, in Label/M Strong). @default false
   */
  current?: boolean;
  /**
   * The router's link, for example `render={<Link href="/products" />}`. It must render an `<a>`.
   * Ignored on the current item, which is not a link; so are the other anchor props (`href`), while
   * `className` goes on whichever element renders.
   */
  render?: RenderProp<BreadcrumbItemState>;
  /**
   * The mark before this level (none is drawn before the first). Only the default chevron mirrors
   * under `dir="rtl"`. @default the chevron glyph
   */
  separator?: ReactNode;
  children: ReactNode;
}

export function BreadcrumbRoot({
  separator,
  labels,
  render,
  className,
  children,
  ...rest
}: BreadcrumbRootProps): ReactElement {
  const items =
    separator === undefined
      ? children
      : Children.map(children, (child) =>
          isValidElement<BreadcrumbItemProps>(child) &&
          child.type === BreadcrumbItem &&
          child.props.separator === undefined
            ? cloneElement(child, { separator })
            : child,
        );
  return renderElement(
    'nav',
    render,
    {},
    {
      'data-slot': 'breadcrumb',
      'aria-label': labels?.nav ?? 'Breadcrumb',
      ...rest,
      className: cx('nz-breadcrumb', className),
      children: (
        <ol className="nz-breadcrumb-list" data-slot="breadcrumb-list">
          {items}
        </ol>
      ),
    },
  );
}

export function BreadcrumbItem({
  current = false,
  render,
  separator,
  className,
  children,
  ...rest
}: BreadcrumbItemProps): ReactElement {
  const level = current ? (
    <span
      className={cx('nz-breadcrumb-current', className)}
      data-slot="breadcrumb-current"
      aria-current="page"
    >
      {children}
    </span>
  ) : (
    renderElement(
      'a',
      render,
      { current },
      {
        'data-slot': 'breadcrumb-link',
        ...rest,
        className: cx('nz-breadcrumb-link', className),
        children,
      },
    )
  );
  return (
    <li className="nz-breadcrumb-item" data-slot="breadcrumb-item">
      <span
        className="nz-breadcrumb-separator"
        data-slot="breadcrumb-separator"
        // the chevron points along the trail; a consumer's mark mirrors itself (or not, like "/")
        data-mirror={separator === undefined ? 'rtl' : undefined}
        aria-hidden="true"
      >
        {separator ?? <ChevronGlyph />}
      </span>
      {level}
    </li>
  );
}
