// NO directive: AiBadge is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn; Figma's AI
// Badge 7409:25). It says that content beside it was written or changed by AI, so it goes next to
// that content, never as decoration. Lime marks AI everywhere in Nizivo: the badge is drawn in
// `bg/accent`, which Figma keeps for AI. UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { SparklesGlyph } from '../../_internal/glyphs';

/** AiBadge's own strings (§16.4): serialisable, English defaults. */
export interface AiBadgeLabels {
  /**
   * The text when the badge has no children.
   * @default 'AI generated'
   */
  label: string;
}

export interface AiBadgeProps extends ComponentPropsWithRef<'span'> {
  /** Figma "Style": `subtle` (accent-subtle with a brand edge) or `solid` (the accent). @default 'subtle' */
  variant?: 'subtle' | 'solid';
  /** Replaces "AI generated", for example `labels={{ label: 'Edited with AI' }}`. Children win. */
  labels?: Partial<AiBadgeLabels>;
  /** Must render a `<span>` or another phrasing element. */
  render?: RenderProp<Record<string, never>>;
}

export function AiBadge({
  variant = 'subtle',
  labels,
  render,
  className,
  children,
  ...rest
}: AiBadgeProps): ReactElement {
  return renderElement(
    'span',
    render,
    {},
    {
      'data-slot': 'ai-badge',
      'data-variant': variant,
      ...rest,
      className: cx('nz-ai-badge', className),
      children: (
        <>
          <span className="nz-ai-badge-icon" data-slot="ai-badge-icon" aria-hidden="true">
            <SparklesGlyph />
          </span>
          {children ?? labels?.label ?? 'AI generated'}
        </>
      ),
    },
  );
}
