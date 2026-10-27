// NO directive: AnnouncementBar is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dp;
// Figma's Announcement Bar 7392:9). One short site-wide message above the navigation, on bg/inverse,
// with a link in text/inverse-accent. With `dismissible`, a close button named "Dismiss
// announcement" calls `onDismiss`; remembering the choice is the app's. UNSTABLE: v0.6 is unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { CloseGlyph } from '../../_internal/glyphs';

/** AnnouncementBar's own strings (§16.4): serialisable, English defaults. */
export interface AnnouncementBarLabels {
  /** The close button's name. @default 'Dismiss announcement' */
  dismiss: string;
  /** The region's name. @default 'Announcement' */
  label: string;
}

export interface AnnouncementBarProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** The message: "Nizivo 0.5 is out." */
  children: ReactNode;
  /** After the message: a link, such as "Read the changelog". */
  action?: ReactNode;
  /** Adds the close button. @default false */
  dismissible?: boolean;
  onDismiss?: () => void;
  labels?: Partial<AnnouncementBarLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function AnnouncementBar({
  children,
  action,
  dismissible = false,
  onDismiss,
  labels,
  render,
  className,
  ...rest
}: AnnouncementBarProps): ReactElement {
  const named = rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined;
  return renderElement(
    'div',
    render,
    {},
    {
      role: 'region',
      'aria-label': named ? undefined : (labels?.label ?? 'Announcement'),
      'data-slot': 'announcement-bar',
      ...rest,
      className: cx('nz-announcement-bar', className),
      children: (
        <>
          <p className="nz-announcement-bar-message" data-slot="announcement-bar-message">
            {children}
            {action != null && <span className="nz-announcement-bar-action">{action}</span>}
          </p>
          {dismissible && (
            <button
              type="button"
              className="nz-announcement-bar-dismiss"
              data-slot="announcement-bar-dismiss"
              aria-label={labels?.dismiss ?? 'Dismiss announcement'}
              onClick={onDismiss}
            >
              <CloseGlyph />
            </button>
          )}
        </>
      ),
    },
  );
}
