'use client';
// ApprovalCard (ARCHITECTURE.md §21.4a; D-dn; Figma's Approval Card 7410:300): the AI asks before an
// action it cannot undo for you ("Send 3 emails to customers"). It says what will happen, to whom,
// and what it cannot take back, then offers Cancel, Edit first and the confirm, which names the
// action. As Figma asks, focus lands on Cancel when the card appears (`autoFocus={false}` turns that
// off) and Escape anywhere in the card cancels. It is a `<section>` named by its heading, never a
// modal: the conversation stays readable around it. UNSTABLE: the AI kit is new and unreviewed.
import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useLabels } from '../../config/config.client';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { Button } from '../../button/index';
import { AiBadge } from '../ai-badge/index';

/** ApprovalCard's own strings (§16.4): serialisable, English defaults. */
export interface ApprovalCardLabels {
  /** The badge over the title. @default 'Needs your approval' */
  badge: string;
  /** @default 'Cancel' */
  cancel: string;
  /** @default 'Edit first' */
  edit: string;
}

export interface ApprovalCardProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  /** The action, as a question or a statement: "Send 3 emails to customers?" */
  title: ReactNode;
  /** The title's level, so the card fits the page outline. @default 3 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** What exactly will happen, set apart: the recipients, the subject, the amount. */
  summary?: ReactNode;
  /** The confirm button's label, naming the action: "Send emails". */
  confirmLabel: ReactNode;
  onConfirm?: () => void;
  /** Cancel and Escape call it. */
  onCancel?: () => void;
  /** Without it there is no "Edit first" button. */
  onEdit?: () => void;
  /** The confirm is in flight (Button `pending`). @default false */
  pending?: boolean;
  /** Focus Cancel when the card mounts (Figma: "Focus lands on Cancel"). @default true */
  autoFocus?: boolean;
  labels?: Partial<ApprovalCardLabels>;
  /** Must render a `<section>`. */
  render?: RenderProp<Record<string, never>>;
}

export function ApprovalCard({
  title,
  headingLevel = 3,
  summary,
  confirmLabel,
  onConfirm,
  onCancel,
  onEdit,
  pending = false,
  autoFocus = true,
  labels: labelsProp,
  render,
  className,
  children,
  onKeyDown,
  ...rest
}: ApprovalCardProps): JSX.Element {
  const labels = useLabels('approvalCard', labelsProp);
  const titleId = useId();
  const cancel = useRef<HTMLButtonElement | null>(null);
  const Heading = `h${headingLevel}` as const;

  useEffect(() => {
    // once, when the card appears; preventScroll keeps the conversation where the reader left it
    if (autoFocus) cancel.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on mount only, as Figma asks
  }, []);

  return renderElement(
    'section',
    render,
    {},
    {
      'aria-labelledby': titleId,
      'data-slot': 'approval-card',
      ...rest,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);
        if (event.key === 'Escape' && !event.defaultPrevented && onCancel != null) {
          event.preventDefault();
          onCancel();
        }
      },
      className: cx('nz-approval-card', className),
      children: (
        <>
          <AiBadge className="nz-approval-card-badge">
            {labels?.badge ?? 'Needs your approval'}
          </AiBadge>
          <Heading className="nz-approval-card-title" data-slot="approval-card-title" id={titleId}>
            {title}
          </Heading>
          {children != null && (
            <div className="nz-approval-card-body" data-slot="approval-card-body">
              {children}
            </div>
          )}
          {summary != null && (
            <div className="nz-approval-card-summary" data-slot="approval-card-summary">
              {summary}
            </div>
          )}
          <div className="nz-approval-card-actions">
            <Button
              ref={cancel}
              className="nz-approval-card-action"
              data-slot="approval-card-action"
              variant="tertiary"
              onClick={onCancel}
            >
              {labels?.cancel ?? 'Cancel'}
            </Button>
            {onEdit != null && (
              <Button
                className="nz-approval-card-action"
                data-slot="approval-card-action"
                variant="secondary"
                onClick={onEdit}
              >
                {labels?.edit ?? 'Edit first'}
              </Button>
            )}
            <Button
              className="nz-approval-card-action"
              data-slot="approval-card-action"
              variant="primary"
              pending={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </>
      ),
    },
  );
}
