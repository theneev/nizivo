// NO directive: the server-safe Banner shell (ARCHITECTURE.md §9.5, "split"), shaped like Alert. The
// dismiss control is the BannerDismiss client leaf, passed in `dismiss`, so a Banner without one ships
// no client JS.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** Figma "Tone": `brand` is Figma's Promo (handoff Q25, D-bq). */
export type BannerTone = 'brand' | 'warning';

export interface BannerState {
  tone: BannerTone;
}

export interface BannerProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** @default 'brand' */
  tone?: BannerTone;
  /** One line, Heading/H4. The description is `children`. */
  title?: ReactNode;
  /**
   * A 72 px picture before the text, such as Figma's product render on the brand banner:
   * `<img src="…" alt="" width={72} height={72} />`. Decorative; the text carries the message.
   */
  media?: ReactNode;
  /** Decorative tone glyph at 24 px, such as a triangle for `warning`; used when there is no `media`. */
  icon?: ReactNode;
  /** One control after the text, such as `<Button variant="primary">Add storefront</Button>`. */
  action?: ReactNode;
  /** `<BannerDismiss onDismiss={…} />`; leave it out for a banner that blocks work and stays. */
  dismiss?: ReactNode;
  /**
   * No live role by default: a banner present on page load must not interrupt. Pass `role="status"`
   * for one added after a user action.
   */
  role?: ComponentPropsWithRef<'div'>['role'];
  render?: RenderProp<BannerState>;
}

/** A page-wide message under the header (Figma Banner 7275:15120): one at a time. */
export function Banner({
  tone = 'brand',
  title,
  media,
  icon,
  action,
  dismiss,
  render,
  className,
  children,
  ...rest
}: BannerProps): ReactElement {
  return renderElement(
    'div',
    render,
    { tone },
    {
      'data-slot': 'banner',
      'data-tone': tone,
      ...rest,
      className: cx('nz-banner', className),
      children: (
        <>
          {media != null ? (
            <span className="nz-banner-media" data-slot="banner-media" aria-hidden="true">
              {media}
            </span>
          ) : (
            icon != null && (
              <span className="nz-banner-icon" data-slot="banner-icon" aria-hidden="true">
                {icon}
              </span>
            )
          )}
          <div className="nz-banner-content" data-slot="banner-content">
            {title != null && (
              <div className="nz-banner-title" data-slot="banner-title">
                {title}
              </div>
            )}
            {children != null && children !== false && children !== '' && (
              <div className="nz-banner-description" data-slot="banner-description">
                {children}
              </div>
            )}
          </div>
          {action != null && (
            <div className="nz-banner-action" data-slot="banner-action">
              {action}
            </div>
          )}
          {dismiss}
        </>
      ),
    },
  );
}
