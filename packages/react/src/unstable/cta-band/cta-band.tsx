// NO directive: CtaBand is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp; Figma's CTA
// Band 7394:50). The last ask on a page: a heading, one line and two actions, one primary and one
// quiet, centred on a dark band. Figma's band is the Aurora Dark shader, which waits for
// `@nizivo/lab` (§14.5): here it is CSS gradients on bg/code, which stays dark in both themes, with
// text/on-dark, and `background` takes a shader or a picture in its place. The primary action is
// best an Accent Button: a Primary green sinks into the band. UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface CtaBandProps extends Omit<ComponentPropsWithRef<'section'>, 'title' | 'children'> {
  title: ReactNode;
  /** The title's level. @default 2 */
  headingLevel?: 2 | 3;
  description?: ReactNode;
  /** The two actions: an Accent Button and a Secondary one. */
  actions?: ReactNode;
  /** Replaces the CSS background. Decorative: hidden from assistive technology. */
  background?: ReactNode;
  /** Must render a `<section>`. */
  render?: RenderProp<Record<string, never>>;
}

export function CtaBand({
  title,
  headingLevel = 2,
  description,
  actions,
  background,
  render,
  className,
  ...rest
}: CtaBandProps): ReactElement {
  const Heading = `h${headingLevel}` as const;
  return renderElement(
    'section',
    render,
    {},
    {
      'data-slot': 'cta-band',
      ...rest,
      className: cx('nz-cta-band', className),
      children: (
        <>
          <span className="nz-cta-band-background" aria-hidden="true">
            {background}
          </span>
          <div className="nz-cta-band-content">
            <Heading className="nz-cta-band-title" data-slot="cta-band-title">
              {title}
            </Heading>
            {description != null && <p className="nz-cta-band-description">{description}</p>}
            {actions != null && <div className="nz-cta-band-actions">{actions}</div>}
          </div>
        </>
      ),
    },
  );
}
