// NO directive: LivePulse is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dq; Figma's Live
// Pulse 7390:171). A "live" or "online" mark: a dot whose ring grows and fades every 1.6 seconds (0.8 ×
// --nz-duration-pulse), always beside its words ("Live", "Syncing"), which carry the meaning; the dot
// is decoration. Under Reduced motion the dot stands still. UNSTABLE: v0.6 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

export interface LivePulseProps extends ComponentPropsWithRef<'span'> {
  /** The words: "Live", "Syncing". Required: the pulse alone says nothing. */
  children: ReactElement | string;
  /** Must render a `<span>`. */
  render?: RenderProp<Record<string, never>>;
}

export function LivePulse({ render, className, children, ...rest }: LivePulseProps): ReactElement {
  return renderElement(
    'span',
    render,
    {},
    {
      'data-slot': 'live-pulse',
      ...rest,
      className: cx('nz-live-pulse', className),
      children: (
        <>
          <span className="nz-live-pulse-dot" aria-hidden="true" />
          <span className="nz-live-pulse-label" data-slot="live-pulse-label">
            {children}
          </span>
        </>
      ),
    },
  );
}
