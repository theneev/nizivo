// NO directive: SiteFooter is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp; Figma's
// Site Footer 7394:81). Closes every page: the brand and a line, columns of links, and the legal
// row. It is a <footer>; each column is a <nav> named by its heading. Narrow, it stacks: the brand and
// the columns wrap. UNSTABLE: v0.6 is new and unreviewed.
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

/** One link in a column. */
export interface SiteFooterLink {
  label: ReactNode;
  href: string;
}

/** One column: "Product" and its links. */
export interface SiteFooterColumn {
  title: string;
  links: readonly SiteFooterLink[];
}

export interface SiteFooterProps extends Omit<ComponentPropsWithRef<'footer'>, 'children'> {
  /** The logo, as a link home. */
  brand?: ReactNode;
  /** A line under the brand. */
  description?: ReactNode;
  columns: readonly SiteFooterColumn[];
  /** The legal row: the name, the version, Privacy and Terms. */
  legal?: ReactNode;
  /** Must render a `<footer>`. */
  render?: RenderProp<Record<string, never>>;
}

export function SiteFooter({
  brand,
  description,
  columns,
  legal,
  render,
  className,
  ...rest
}: SiteFooterProps): ReactElement {
  const id = useId();
  return renderElement(
    'footer',
    render,
    {},
    {
      'data-slot': 'site-footer',
      ...rest,
      className: cx('nz-site-footer', className),
      children: (
        <>
          <div className="nz-site-footer-top">
            {(brand != null || description != null) && (
              <div className="nz-site-footer-brand">
                {brand}
                {description != null && <p className="nz-site-footer-description">{description}</p>}
              </div>
            )}
            {columns.map((column, index) => (
              <nav
                key={column.title}
                className="nz-site-footer-column"
                aria-labelledby={`${id}-${index}`}
              >
                <h2 className="nz-site-footer-heading" id={`${id}-${index}`}>
                  {column.title}
                </h2>
                <ul className="nz-site-footer-links">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a className="nz-site-footer-link" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          {legal != null && <div className="nz-site-footer-legal">{legal}</div>}
        </>
      ),
    },
  );
}
