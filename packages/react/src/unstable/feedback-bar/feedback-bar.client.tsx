'use client';
// FeedbackBar (ARCHITECTURE.md §21.4a; D-dn; Figma's Feedback Bar 7409:298): "Was this helpful?"
// under an AI answer, with a thumbs up and a thumbs down. The votes are IconButtons with
// `aria-pressed` (a toggle; pressing the pressed one clears the vote) and constant names ("Good
// answer", "Bad answer"). The prompt is a polite live region, so the thanks that replaces it is heard. A
// down vote may offer reasons, one ChipGroup choice. A vote never opens a dialog or moves focus.
// UNSTABLE: the AI kit is new and unreviewed.
import { useId, useState, type ComponentPropsWithRef, type JSX, type ReactNode } from 'react';
import { useLabels } from '../../config/config.client';
import { details, type ChangeDetails } from '../../contracts/details';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { ThumbsDownGlyph, ThumbsUpGlyph } from '../../_internal/glyphs';
import { Chip, ChipGroup } from '../../chip-group/index';
import { IconButton } from '../../icon-button/index';

/** A vote, or none. */
export type FeedbackValue = 'up' | 'down' | null;

/** FeedbackBar's own strings (§16.4): serialisable, English defaults. */
export interface FeedbackBarLabels {
  /** @default 'Was this helpful?' */
  prompt: string;
  /** After a thumbs up. @default 'Thanks — glad it helped.' */
  thanksUp: string;
  /** After a thumbs down. @default 'Thanks. What went wrong?' */
  thanksDown: string;
  /** The thumbs up's name. @default 'Good answer' */
  up: string;
  /** The thumbs down's name. @default 'Bad answer' */
  down: string;
  /** The reasons' group name. @default 'What went wrong' */
  reasons: string;
}

export interface FeedbackBarState {
  value: FeedbackValue;
}

export interface FeedbackBarProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'children'
> {
  /** The vote (controlled). */
  value?: FeedbackValue;
  /** The vote at first (uncontrolled). @default null */
  defaultValue?: FeedbackValue;
  onValueChange?: (value: FeedbackValue, details: ChangeDetails<'press'>) => void;
  /** Shown after a thumbs down, one to pick: "Not accurate", "Too long". */
  reasons?: readonly string[];
  /** The picked reason (controlled). */
  reason?: string | null;
  /** The reason at first (uncontrolled). */
  defaultReason?: string;
  onReasonChange?: (reason: string) => void;
  /** Replaces the prompt; still replaced by the thanks after a vote. */
  prompt?: ReactNode;
  labels?: Partial<FeedbackBarLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<FeedbackBarState>;
}

export function FeedbackBar({
  value,
  defaultValue = null,
  onValueChange,
  reasons,
  reason,
  defaultReason,
  onReasonChange,
  prompt,
  labels: labelsProp,
  render,
  className,
  ...rest
}: FeedbackBarProps): JSX.Element {
  const labels = useLabels('feedbackBar', labelsProp);
  const [own, setOwn] = useState<FeedbackValue>(defaultValue);
  const current = value === undefined ? own : value;
  const promptId = useId();

  function vote(next: 'up' | 'down', event: Event): void {
    const result = current === next ? null : next;
    setOwn(result);
    onValueChange?.(result, details('press', event));
  }

  const text =
    current === 'up'
      ? (labels?.thanksUp ?? 'Thanks — glad it helped.')
      : current === 'down'
        ? (labels?.thanksDown ?? 'Thanks. What went wrong?')
        : (prompt ?? labels?.prompt ?? 'Was this helpful?');

  return renderElement(
    'div',
    render,
    { value: current },
    {
      role: 'group',
      'aria-labelledby': promptId,
      'data-slot': 'feedback-bar',
      ...rest,
      className: cx('nz-feedback-bar', className),
      children: (
        <>
          <div className="nz-feedback-bar-row">
            <span
              className="nz-feedback-bar-prompt"
              data-slot="feedback-bar-prompt"
              id={promptId}
              // a span, not <output> (Field's announcer): form.reset() would rewrite an <output>
              aria-live="polite"
            >
              {text}
            </span>
            <span className="nz-feedback-bar-votes">
              <IconButton
                className="nz-feedback-bar-vote"
                data-slot="feedback-bar-vote"
                variant="secondary"
                size="sm"
                label={labels?.up ?? 'Good answer'}
                icon={<ThumbsUpGlyph />}
                pressed={current === 'up'}
                onClick={(event) => vote('up', event.nativeEvent)}
              />
              <IconButton
                className="nz-feedback-bar-vote"
                data-slot="feedback-bar-vote"
                variant="secondary"
                size="sm"
                label={labels?.down ?? 'Bad answer'}
                icon={<ThumbsDownGlyph />}
                pressed={current === 'down'}
                onClick={(event) => vote('down', event.nativeEvent)}
              />
            </span>
          </div>
          {current === 'down' && reasons != null && reasons.length > 0 && (
            <ChipGroup
              className="nz-feedback-bar-reasons"
              aria-label={labels?.reasons ?? 'What went wrong'}
              {...(reason === undefined ? {} : { value: reason })}
              {...(defaultReason === undefined ? {} : { defaultValue: defaultReason })}
              onValueChange={(next) => onReasonChange?.(next)}
            >
              {reasons.map((item) => (
                <Chip
                  key={item}
                  className="nz-feedback-bar-reason"
                  data-slot="feedback-bar-reason"
                  value={item}
                >
                  {item}
                </Chip>
              ))}
            </ChipGroup>
          )}
        </>
      ),
    },
  );
}
