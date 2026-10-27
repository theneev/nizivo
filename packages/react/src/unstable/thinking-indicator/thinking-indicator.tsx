// NO directive: ThinkingIndicator is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn;
// Figma's Thinking Indicator 7409:103). The wait before an AI answer's first word: three dots that
// step every 320 ms, drawn by CSS alone, beside a label that can name the step ("Searching
// orders…"). It is a polite status region, so a screen reader hears the label when it changes; the
// dots are decorative. Under reduced motion the dots stay still and only the label changes.
// UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';

/** ThinkingIndicator's own strings (§16.4): serialisable, English defaults. */
export interface ThinkingIndicatorLabels {
  /**
   * The label when the indicator has no children.
   * @default 'Thinking…'
   */
  label: string;
}

export interface ThinkingIndicatorProps extends ComponentPropsWithRef<'div'> {
  /** Replaces "Thinking…". Children (the step, such as "Reading last week's orders…") win. */
  labels?: Partial<ThinkingIndicatorLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function ThinkingIndicator({
  labels,
  render,
  className,
  children,
  ...rest
}: ThinkingIndicatorProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      role: 'status',
      'data-slot': 'thinking-indicator',
      ...rest,
      className: cx('nz-thinking-indicator', className),
      children: (
        <>
          <span className="nz-thinking-indicator-dots" aria-hidden="true">
            <span className="nz-thinking-indicator-dot" />
            <span className="nz-thinking-indicator-dot" />
            <span className="nz-thinking-indicator-dot" />
          </span>
          <span className="nz-thinking-indicator-label" data-slot="thinking-indicator-label">
            {children ?? labels?.label ?? 'Thinking…'}
          </span>
        </>
      ),
    },
  );
}
