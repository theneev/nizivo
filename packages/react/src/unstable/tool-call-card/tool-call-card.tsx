// NO directive: ToolCallCard is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-dn; Figma's
// Tool Call Card 7410:294). An action the AI is taking in the product, shown step by step: the plan
// and the progress, not just the result. Running marks the card `aria-busy`; Done and Failed carry a
// mark and a word; each step says its own status to a screen reader. A failure names the step and
// why, and `actions` holds a scoped Retry. Never hide an action the AI took.
// UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import {
  CheckGlyph,
  CircleCheckGlyph,
  CircleXGlyph,
  CloseGlyph,
  SpinnerGlyph,
  WandSparklesGlyph,
} from '../../_internal/glyphs';

/** The whole action's status. */
export type ToolCallStatus = 'running' | 'done' | 'failed';
/** One step's status. */
export type ToolCallStepStatus = 'todo' | 'running' | 'done' | 'failed';

export interface ToolCallStep {
  /** What the step does: "Find posts from last week"; for a failure, also why. */
  label: ReactNode;
  status: ToolCallStepStatus;
}

/** ToolCallCard's own strings (§16.4): serialisable, English defaults. */
export interface ToolCallCardLabels {
  /** @default 'Running' */
  running: string;
  /** @default 'Done' */
  done: string;
  /** @default 'Failed' */
  failed: string;
  /**
   * A step not started yet, read after its label.
   * @default 'not started'
   */
  stepTodo: string;
  /** @default 'in progress' */
  stepRunning: string;
  /** @default 'done' */
  stepDone: string;
  /** @default 'failed' */
  stepFailed: string;
}

export interface ToolCallCardProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'title' | 'children'
> {
  /** What the AI is doing, as a short action: "Tag products on 3 posts". */
  title: ReactNode;
  status: ToolCallStatus;
  /** The plan, in order. */
  steps: readonly ToolCallStep[];
  /** Under the steps, for example a Button that retries the failed step. */
  actions?: ReactNode;
  labels?: Partial<ToolCallCardLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

const STATUS_GLYPH = {
  running: <SpinnerGlyph />,
  done: <CircleCheckGlyph />,
  failed: <CircleXGlyph />,
} as const;

const STEP_GLYPH = {
  todo: <span className="nz-tool-call-card-todo" />,
  running: <SpinnerGlyph />,
  done: <CheckGlyph />,
  failed: <CloseGlyph />,
} as const;

export function ToolCallCard({
  title,
  status,
  steps,
  actions,
  labels,
  render,
  className,
  ...rest
}: ToolCallCardProps): ReactElement {
  const L: ToolCallCardLabels = {
    running: labels?.running ?? 'Running',
    done: labels?.done ?? 'Done',
    failed: labels?.failed ?? 'Failed',
    stepTodo: labels?.stepTodo ?? 'not started',
    stepRunning: labels?.stepRunning ?? 'in progress',
    stepDone: labels?.stepDone ?? 'done',
    stepFailed: labels?.stepFailed ?? 'failed',
  };
  const stepWord = {
    todo: L.stepTodo,
    running: L.stepRunning,
    done: L.stepDone,
    failed: L.stepFailed,
  };
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'tool-call-card',
      'data-tone': status,
      'aria-busy': status === 'running' ? true : undefined,
      ...rest,
      className: cx('nz-tool-call-card', className),
      children: (
        <>
          <div className="nz-tool-call-card-header">
            <span className="nz-tool-call-card-icon" aria-hidden="true">
              <WandSparklesGlyph />
            </span>
            <span className="nz-tool-call-card-title" data-slot="tool-call-card-title">
              {title}
            </span>
            <span className="nz-tool-call-card-status" data-slot="tool-call-card-status">
              <span className="nz-tool-call-card-status-icon" aria-hidden="true">
                {STATUS_GLYPH[status]}
              </span>
              <span
                className="nz-tool-call-card-status-text"
                data-slot="tool-call-card-status-text"
              >
                {L[status]}
              </span>
            </span>
          </div>
          <ol className="nz-tool-call-card-steps" data-slot="tool-call-card-steps">
            {steps.map((step, index) => (
              <li
                // oxlint-disable-next-line react/no-array-index-key -- the plan's steps, in order, never reordered
                key={index}
                className="nz-tool-call-card-step"
                data-slot="tool-call-card-step"
                data-tone={step.status}
              >
                <span className="nz-tool-call-card-step-icon" aria-hidden="true">
                  {STEP_GLYPH[step.status]}
                </span>
                <span>
                  {step.label}
                  <span className="nz-visually-hidden">, {stepWord[step.status]}</span>
                </span>
              </li>
            ))}
          </ol>
          {actions != null && <div className="nz-tool-call-card-actions">{actions}</div>}
        </>
      ),
    },
  );
}
