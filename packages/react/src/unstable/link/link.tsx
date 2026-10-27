// NO directive: Link is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's Link
// 7367:397). Navigation in text, always underlined, so it is never told by colour alone (WCAG 1.4.1),
// in text/brand. `external` opens it in a new tab, adds the arrow, and says "(opens in a new tab)"
// to a screen reader. For an action, use Button. `render` takes a router link.
// UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { ArrowUpRightGlyph } from '../../_internal/glyphs';

/** Link's own strings (§16.4): serialisable, English defaults. */
export interface LinkLabels {
  /** Read after an external link's text. @default '(opens in a new tab)' */
  newTab: string;
}

export interface LinkProps extends ComponentPropsWithRef<'a'> {
  /** Opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) with the arrow. @default false */
  external?: boolean;
  labels?: Partial<LinkLabels>;
  /** Must render an `<a>`, or a router link that renders one. */
  render?: RenderProp<Record<string, never>>;
}

export function Link({
  external = false,
  labels,
  render,
  className,
  children,
  ...rest
}: LinkProps): ReactElement {
  return renderElement(
    'a',
    render,
    {},
    {
      'data-slot': 'link',
      ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      ...rest,
      className: cx('nz-link', className),
      children: external ? (
        <>
          {children}
          <span className="nz-link-icon" aria-hidden="true">
            <ArrowUpRightGlyph />
          </span>
          <span className="nz-visually-hidden"> {labels?.newTab ?? '(opens in a new tab)'}</span>
        </>
      ) : (
        children
      ),
    },
  );
}
