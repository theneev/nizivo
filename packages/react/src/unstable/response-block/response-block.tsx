// NO directive: ResponseBlock is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn; Figma's
// Response Block 7409:247). One AI answer from its first wait to its end: Thinking shows the
// ThinkingIndicator, Streaming the text as it arrives with a caret and a Stop button, Complete the
// answer and its actions, Error a message and a Retry. The answer sits in a polite live region that
// is `aria-busy` while it streams, so a screen reader reads it once, when it is complete, not word by
// word; the error is an alert. Stop is an ordinary Button, always in the Tab order.
// UNSTABLE: the AI kit is new and unreviewed.
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import {
  CircleAlertGlyph,
  CircleStopGlyph,
  RefreshCwGlyph,
  SparklesGlyph,
} from '../../_internal/glyphs';
import { Button } from '../../button/index';
import { AiBadge } from '../ai-badge/index';
import { ThinkingIndicator } from '../thinking-indicator/index';

/** Where the answer is: thinking, streaming, complete or failed. */
export type ResponseStatus = 'thinking' | 'streaming' | 'complete' | 'error';

/** ResponseBlock's own strings (§16.4): serialisable, English defaults. */
export interface ResponseBlockLabels {
  /**
   * Who answers, unless `name` is given.
   * @default 'Assistant'
   */
  name: string;
  /** @default 'Stop generating' */
  stop: string;
  /** @default 'Retry' */
  retry: string;
  /**
   * The error message, unless `error` is given.
   * @default 'Something went wrong. Try again.'
   */
  error: string;
}

export interface ResponseBlockProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  status: ResponseStatus;
  /** Who answers. Replaces `labels.name`. */
  name?: ReactNode;
  /** Replaces the sparkles mark, for example an Avatar of the assistant. */
  avatar?: ReactNode;
  /** Beside the name; `null` hides it. @default <AiBadge /> */
  badge?: ReactNode;
  /** While thinking: the step, such as "Reading last week's orders…". */
  thinking?: ReactNode;
  /** Shown once the answer is complete, for example copy and regenerate buttons and a FeedbackBar. */
  actions?: ReactNode;
  /** The error message. Replaces `labels.error`. */
  error?: ReactNode;
  /**
   * The "Stop generating" Button, shown while streaming, calls it. Pass it from the client component
   * that streams the answer.
   */
  onStop?: () => void;
  /** The "Retry" Button, shown after an error, calls it. */
  onRetry?: () => void;
  labels?: Partial<ResponseBlockLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function ResponseBlock({
  status,
  name,
  avatar,
  badge,
  thinking,
  actions,
  error,
  onStop,
  onRetry,
  labels,
  render,
  className,
  children,
  ...rest
}: ResponseBlockProps): ReactElement {
  const nameId = useId();
  return renderElement(
    'div',
    render,
    {},
    {
      role: 'group',
      'aria-labelledby': nameId,
      'data-slot': 'response-block',
      'data-tone': status,
      ...rest,
      className: cx('nz-response-block', className),
      children: (
        <>
          <div className="nz-response-block-header">
            <span className="nz-response-block-avatar" aria-hidden="true">
              {avatar ?? <SparklesGlyph />}
            </span>
            <span className="nz-response-block-name" data-slot="response-block-name" id={nameId}>
              {name ?? labels?.name ?? 'Assistant'}
            </span>
            {badge === undefined ? <AiBadge /> : badge}
          </div>
          <div className="nz-response-block-body">
            {status === 'thinking' && <ThinkingIndicator>{thinking}</ThinkingIndicator>}
            {/* always in the DOM, so the region exists before the answer arrives in it */}
            <div
              className="nz-response-block-content"
              data-slot="response-block-content"
              aria-live="polite"
              aria-busy={status === 'thinking' || status === 'streaming' ? true : undefined}
            >
              {status !== 'thinking' && children}
            </div>
            {status === 'error' && (
              <div
                className="nz-response-block-error"
                data-slot="response-block-error"
                role="alert"
              >
                <span className="nz-response-block-error-icon" aria-hidden="true">
                  <CircleAlertGlyph />
                </span>
                <span className="nz-response-block-error-text">
                  {error ?? labels?.error ?? 'Something went wrong. Try again.'}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<RefreshCwGlyph />}
                  onClick={onRetry}
                >
                  {labels?.retry ?? 'Retry'}
                </Button>
              </div>
            )}
            {status === 'streaming' && (
              <div className="nz-response-block-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<CircleStopGlyph />}
                  onClick={onStop}
                >
                  {labels?.stop ?? 'Stop generating'}
                </Button>
              </div>
            )}
            {status === 'complete' && actions != null && (
              <div className="nz-response-block-actions" data-slot="response-block-actions">
                {actions}
              </div>
            )}
          </div>
        </>
      ),
    },
  );
}
