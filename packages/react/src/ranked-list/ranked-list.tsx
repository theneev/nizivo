// NO directive: RankedList is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5, §16.5; Figma
// Ranked List 752:444, figma/04 §4.6). Card's surface with a header (title and an optional "View all"
// link) over an ordered list: each row is a label, its value (NumberValue) and a bar relative to the
// leader. The order is the ranking, so it is an `<ol>`; the bars are `aria-hidden` because the value
// is printed (Figma: "Bars are decorative because the value is printed").
//
// No inline style (CSP Profile B, §19.3): a bar is an SVG `<rect>` whose width is a percentage
// attribute. The leader is the largest value among the direct `RankedList.Item` children, or `max`.
//
// The §16.5 contract: `status` swaps only the list region. Loading, empty and error reserve `rows`
// rows of the ready list's geometry (placeholder rows, hidden), so a list of `rows` items keeps its
// box when the data streams in (test/browser/ranked-list.spec.tsx, ±1 px at three widths).
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { dataStatusAttrs, type DataStatus } from '../_internal/data-status';
import { InlineError } from '../inline-error/inline-error';
import { NumberValue } from '../number-value/number-value';
import { Skeleton } from '../skeleton/skeleton';

/**
 * RankedList's own strings (§16.4): serialisable, English defaults, Metric's wording. `{label}` is
 * replaced by the `title` (left out when there is none).
 */
export interface RankedListLabels {
  /** Static, visually hidden text while loading (§16.5: no live region). @default 'Loading {label}' */
  loading: string;
  /** Shown when there is nothing to rank and no `empty` slot. @default 'No data' */
  empty: string;
  /** The InlineError message on a load failure with no `error` slot. @default 'Could not load {label}' */
  error: string;
}

export type RankedListTitleLevel = 2 | 3 | 4 | 5 | 6;

export interface RankedListRootState {
  status: DataStatus;
  pending: boolean;
}

export interface RankedListRootProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** The heading ("Top channels"); it also names the list. */
  title?: ReactNode;
  /** The heading level; its look is Heading/H4 at every level. @default 3 */
  titleLevel?: RankedListTitleLevel;
  /** The header's end, for example `<RankedList.Action href="/channels">View all</RankedList.Action>`. */
  action?: ReactNode;
  /**
   * The value a full bar stands for. @default the largest value among the direct
   * `RankedList.Item` children (the leader); pass it when the items are wrapped in your own components
   */
  max?: number;
  /** Every item's number format, unless the item sets its own (`Intl.NumberFormatOptions`). */
  format?: Intl.NumberFormatOptions;
  /** BCP 47 tag for every item's value. @default 'en-US' */
  locale?: string;
  /**
   * The data lifecycle (§16.5). A ready list with no items is `empty`. @default 'ready'
   */
  status?: DataStatus;
  /**
   * A refresh is in flight while the rows show: `data-pending` and `aria-busy` (ready only, as in
   * Metric). @default false
   */
  pending?: boolean;
  /** Replaces the empty message. */
  empty?: ReactNode;
  /** Replaces the error message, for example an `InlineError` with a retry `action`. */
  error?: ReactNode;
  /**
   * How many rows loading, empty and error reserve, so the box does not change when the data
   * arrives. Pass the number of rows you show (about 6 at most, then View all). @default 5
   */
  rows?: number;
  labels?: Partial<RankedListLabels>;
  /** Composition of the root (Card's surface through the `nz-card` class). */
  render?: RenderProp<RankedListRootState>;
  /** `RankedList.Item` elements, the leader first. */
  children?: ReactNode;
}

export interface RankedListItemState {
  /** value ÷ max, from 0 to 1. */
  ratio: number;
}

export interface RankedListItemProps extends Omit<ComponentPropsWithRef<'li'>, 'children'> {
  label: ReactNode;
  value: number;
  /** Overrides the list's `max` for this row. */
  max?: number | undefined;
  /** Overrides the list's `format`. */
  format?: Intl.NumberFormatOptions | undefined;
  /** @default the list's `locale`, else 'en-US' */
  locale?: string | undefined;
  render?: RenderProp<RankedListItemState>;
}

export interface RankedListActionProps extends ComponentPropsWithRef<'a'> {
  /** The router's link, for example `render={<Link href="/channels" />}`. It must render an `<a>`. */
  render?: RenderProp<Record<string, never>>;
}

/** Percent of the track, 0–100 with up to 3 decimals: deterministic attribute text. */
function percent(value: number, max: number): string {
  const ratio = max > 0 && Number.isFinite(value) ? Math.min(1, Math.max(0, value / max)) : 0;
  return `${Number((ratio * 100).toFixed(3))}%`;
}

function Bar({ width }: { width: string }): ReactElement {
  return (
    <svg
      className="nz-ranked-list-bar"
      data-slot="ranked-list-bar"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      {/* rx is half the 6 px track: round ends on any bar */}
      <rect className="nz-ranked-list-fill" width={width} height="100%" rx="3" />
    </svg>
  );
}

/** `template` with `{label}` replaced by the title node, or dropped when there is no title. */
function fill(template: string, title: ReactNode): ReactNode {
  const at = template.indexOf('{label}');
  if (at < 0) return template;
  const before = template.slice(0, at);
  const after = template.slice(at + '{label}'.length);
  if (title == null) return `${before.trimEnd()}${after.trimStart()}`.trim();
  if (typeof title === 'string' || typeof title === 'number') return `${before}${title}${after}`;
  return (
    <>
      {before}
      {title}
      {after}
    </>
  );
}

/** A row of the ready geometry with no content, for loading and for the reserved height. */
function PlaceholderRow({ skeleton }: { skeleton: boolean }): ReactElement {
  return (
    <div className="nz-ranked-list-placeholder" data-slot="ranked-list-placeholder">
      <span className="nz-ranked-list-row">
        {skeleton && <Skeleton className="nz-ranked-list-skeleton-label" />}
        {skeleton && <Skeleton className="nz-ranked-list-skeleton-value" />}
      </span>
      <span className="nz-ranked-list-track" />
    </div>
  );
}

export function RankedListRoot({
  title,
  titleLevel = 3,
  action,
  max,
  format,
  locale,
  status = 'ready',
  pending = false,
  empty,
  error,
  rows = 5,
  labels,
  render,
  className,
  children,
  ...rest
}: RankedListRootProps): ReactElement {
  const titleId = `${useId()}-title`;
  const items = Children.toArray(children);
  const ranked = items.filter(
    (child): child is ReactElement<RankedListItemProps> =>
      isValidElement<RankedListItemProps>(child) && child.type === RankedListItem,
  );
  const resolved: DataStatus = status === 'ready' && items.length === 0 ? 'empty' : status;
  const leader = max ?? Math.max(0, ...ranked.map((item) => item.props.value));
  const reserve = Array.from({ length: Math.max(0, Math.floor(rows)) }, (_, index) => index);
  const Heading = `h${titleLevel}` as const;

  let body: ReactNode;
  if (resolved === 'ready') {
    body = (
      <ol
        className="nz-ranked-list-list"
        data-slot="ranked-list-list"
        aria-labelledby={title != null ? titleId : undefined}
      >
        {items.map((child) =>
          isValidElement<RankedListItemProps>(child) && child.type === RankedListItem
            ? cloneElement(child, {
                max: child.props.max ?? leader,
                format: child.props.format ?? format,
                locale: child.props.locale ?? locale,
              })
            : child,
        )}
      </ol>
    );
  } else {
    const message =
      resolved === 'loading' ? (
        <span className="nz-visually-hidden">
          {fill(labels?.loading ?? 'Loading {label}', title)}
        </span>
      ) : resolved === 'error' ? (
        (error ?? (
          <InlineError>{fill(labels?.error ?? 'Could not load {label}', title)}</InlineError>
        ))
      ) : (
        (empty ?? <p className="nz-ranked-list-empty">{fill(labels?.empty ?? 'No data', title)}</p>)
      );
    body = (
      <div className="nz-ranked-list-status" data-slot="ranked-list-status">
        <div className="nz-ranked-list-reserve" aria-hidden="true">
          {reserve.map((index) => (
            <PlaceholderRow key={index} skeleton={resolved === 'loading'} />
          ))}
        </div>
        <div className="nz-ranked-list-message" data-slot="ranked-list-message">
          {message}
        </div>
      </div>
    );
  }

  const busy = resolved === 'ready' && pending;
  return renderElement(
    'div',
    render,
    { status: resolved, pending: busy },
    {
      // Card's surface by its class (card.css with no tone or padding attribute is Surface, 24 px
      // padding and no shadow at rest, as Figma draws the Ranked List)
      'data-slot': 'ranked-list',
      ...dataStatusAttrs(resolved, busy),
      ...rest,
      className: cx('nz-card', 'nz-ranked-list', className),
      children: (
        <>
          {(title != null || action != null) && (
            <div className="nz-ranked-list-header" data-slot="ranked-list-header">
              {title != null && (
                <Heading
                  className="nz-ranked-list-title"
                  data-slot="ranked-list-title"
                  id={titleId}
                >
                  {title}
                </Heading>
              )}
              {action}
            </div>
          )}
          {body}
        </>
      ),
    },
  );
}

export function RankedListItem({
  label,
  value,
  max,
  format,
  locale = 'en-US',
  render,
  className,
  ...rest
}: RankedListItemProps): ReactElement {
  const leader = max ?? value;
  const width = percent(value, leader);
  const ratio = Number.parseFloat(width) / 100;
  return renderElement(
    'li',
    render,
    { ratio },
    {
      'data-slot': 'ranked-list-item',
      ...rest,
      className: cx('nz-ranked-list-item', className),
      children: (
        <>
          <span className="nz-ranked-list-row">
            <span className="nz-ranked-list-label" data-slot="ranked-list-label">
              {label}
            </span>
            <NumberValue
              className="nz-ranked-list-value"
              value={value}
              format={format ?? {}}
              locale={locale}
            />
          </span>
          <span className="nz-ranked-list-track" data-slot="ranked-list-track">
            <Bar width={width} />
          </span>
        </>
      ),
    },
  );
}

/** "View all": a real link, at least 24 px tall (WCAG 2.5.8). */
export function RankedListAction({
  render,
  className,
  ...rest
}: RankedListActionProps): ReactElement {
  return renderElement(
    'a',
    render,
    {},
    {
      'data-slot': 'ranked-list-action',
      ...rest,
      className: cx('nz-ranked-list-action', className),
    },
  );
}
