// NO directive: Pagination is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5, §16.2; Figma
// Pagination 755:1007, figma/06 §6.10). Two modes, and the current page is `aria-current="page"` in
// both. Link mode (`getHref`): the page is the state, each page is a URL. Button mode
// (`onPageChange`, M48): for client state with no URL, each page is a `<button type="button">` that
// calls it. Only a client component can pass a function, so a Server Component uses link mode and
// still ships nothing; button mode adds no module of its own.
//
// The ellipsis rule (MUI's, so the number of slots never changes while you page): the first and last
// `boundaryCount` pages always show, so do `siblingCount` pages either side of the current one, and a
// gap becomes "…" unless it hides a single page, which shows instead. With the defaults that is
// always 7 slots once there are more than 7 pages: 1 2 3 4 5 … 13, 1 … 6 7 8 … 13, 1 … 9 10 11 12 13.
// Figma's drawing (1 2 3 … 13) is `siblingCount={0}`.
import type { ComponentPropsWithRef, MouseEvent, ReactElement, ReactNode } from 'react';
import { details, type ChangeDetails } from '../contracts/details';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { ChevronGlyph } from '../_internal/glyphs';

/** 40 px (`md`) or 32 px (`sm`) squares; Figma's 36 px is off the control scale (figma/06). */
export type PaginationSize = 'sm' | 'md';

/** Pagination's own strings (§16.4): serialisable, English defaults; `{page}` is replaced. */
export interface PaginationLabels {
  /** The landmark's name. @default 'Pagination' */
  nav: string;
  /** The previous link's name (it shows only a chevron). @default 'Previous page' */
  previous: string;
  /** @default 'Next page' */
  next: string;
  /** Each page link's name; the visible number stays in it (WCAG 2.5.3). @default 'Page {page}' */
  page: string;
}

/** Which control asked for the page. */
export type PaginationChangeReason = 'page' | 'previous' | 'next';

/** One slot of the list: a page number or a gap. */
export type PaginationSlot = number | 'ellipsis';

export interface PaginationLinkState {
  /** The page this link goes to. */
  page: number;
  kind: 'page' | 'previous' | 'next';
  current: boolean;
}

export interface PaginationState {
  page: number;
  totalPages: number;
  size: PaginationSize;
}

export interface PaginationProps extends Omit<ComponentPropsWithRef<'nav'>, 'children'> {
  /** The page being shown, from 1. Clamped to `1…totalPages`. */
  page: number;
  /** At least 1. */
  totalPages: number;
  /** Link mode: the URL of a page, for example `?page=3` for page 3. Give it or `onPageChange`. */
  getHref?: (page: number) => string;
  /**
   * Button mode, for client state with no URL: the pages, previous and next are
   * `<button type="button">`s, and choosing another page calls this with it (the current page calls
   * nothing). `getHref` and `renderLink` are not used. A client component passes it.
   */
  onPageChange?: (page: number, details: ChangeDetails<PaginationChangeReason>) => void;
  /** Pages shown either side of the current one. @default 1 */
  siblingCount?: number;
  /** Pages always shown at each end. @default 1 */
  boundaryCount?: number;
  /**
   * With the defaults a long list is 9 slots: 392 px at `md`, 320 px at `sm`. In a narrower container
   * the slots wrap, so use `sm` and `siblingCount={0}` (7 slots, 248 px) there. @default 'md'
   */
  size?: PaginationSize;
  /** Text before the pages, for example "Showing 1–20 of 248" (Figma); you format it. */
  summary?: ReactNode;
  /** Replaces the chevron of the previous link (mirrored under `dir="rtl"` only by default). */
  previousIcon?: ReactNode;
  nextIcon?: ReactNode;
  /** BCP 47 tag for the page numbers. @default 'en-US' */
  locale?: string;
  labels?: Partial<PaginationLabels>;
  /**
   * The router's link for every page, previous and next link, for example
   * `renderLink={(props) => <Link {...props} href={String(props['href'])} />}`, or an element such
   * as `renderLink={<RouterLink />}`, which receives `href` from `getHref`. It must render an `<a>`.
   * A previous or next link at the ends is not a link and does not use it. Link mode only.
   */
  renderLink?: RenderProp<PaginationLinkState>;
  /** Composition of the `<nav>` landmark (a single-root part's `render`, §8.2). */
  render?: RenderProp<PaginationState>;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);

/** The slots between previous and next, by the rule in this file's header. */
export function paginationSlots(
  page: number,
  totalPages: number,
  siblingCount = 1,
  boundaryCount = 1,
): PaginationSlot[] {
  const count = Math.max(1, Math.floor(totalPages));
  const current = Math.min(count, Math.max(1, Math.floor(page)));
  const siblings = Math.max(0, Math.floor(siblingCount));
  const boundary = Math.max(0, Math.floor(boundaryCount));
  const start = range(1, Math.min(boundary, count));
  const end = range(Math.max(count - boundary + 1, boundary + 1), count);
  const siblingsStart = Math.max(
    Math.min(current - siblings, count - boundary - siblings * 2 - 1),
    boundary + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblings, boundary + siblings * 2 + 2),
    count - boundary - 1,
  );
  const slots: PaginationSlot[] = [...start];
  if (siblingsStart > boundary + 2) slots.push('ellipsis');
  else if (boundary + 1 < count - boundary) slots.push(boundary + 1);
  slots.push(...range(siblingsStart, siblingsEnd));
  if (siblingsEnd < count - boundary - 1) slots.push('ellipsis');
  else if (count - boundary > boundary) slots.push(count - boundary);
  slots.push(...end);
  // a short list can name a page twice (the boundary and its neighbour); keep the first
  return slots.filter((slot, index) => slot === 'ellipsis' || slots.indexOf(slot) === index);
}

export function Pagination({
  page,
  totalPages,
  getHref,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  size = 'md',
  summary,
  previousIcon,
  nextIcon,
  locale = 'en-US',
  labels,
  renderLink,
  render,
  className,
  ...rest
}: PaginationProps): ReactElement {
  const count = Math.max(1, Math.floor(totalPages));
  const current = Math.min(count, Math.max(1, Math.floor(page)));
  const number = new Intl.NumberFormat(locale);
  const pageLabel = labels?.page ?? 'Page {page}';

  const link = (
    target: number,
    kind: PaginationLinkState['kind'],
    { rel, ...props }: Record<string, unknown>,
  ): ReactElement => {
    if (onPageChange !== undefined) {
      return renderElement('button', undefined, undefined, {
        type: 'button',
        ...props,
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          if (target !== current) onPageChange(target, details(kind, event.nativeEvent));
        },
      });
    }
    if (getHref === undefined) throw new Error('Pagination needs getHref (links) or onPageChange');
    return renderElement(
      'a',
      renderLink,
      { page: target, kind, current: kind === 'page' && target === current },
      { href: getHref(target), ...props, rel },
    );
  };

  const step = (kind: 'previous' | 'next', icon: ReactNode): ReactElement => {
    const target = kind === 'previous' ? current - 1 : current + 1;
    // literal slots, one per branch, so `nz api` can name both (§8.2)
    const slot =
      kind === 'previous'
        ? {
            'data-slot': 'pagination-previous',
            className: 'nz-pagination-step nz-pagination-previous',
          }
        : { 'data-slot': 'pagination-next', className: 'nz-pagination-step nz-pagination-next' };
    const { className: stepClass, ...slotAttribute } = slot;
    const props = {
      ...slot,
      'aria-label':
        kind === 'previous' ? (labels?.previous ?? 'Previous page') : (labels?.next ?? 'Next page'),
      children: (
        <span
          className="nz-pagination-icon"
          data-slot="pagination-icon"
          data-mirror={icon === undefined ? 'rtl' : undefined}
          aria-hidden="true"
        >
          {icon ?? <ChevronGlyph />}
        </span>
      ),
    };
    // Figma: "disabled, not hidden, at the ends". A step with nowhere to go is not an <a href>, so it
    // is out of the Tab order; it keeps the link role and its name, marked disabled (an <a> without
    // href has no role, and a name on a role-less element is prohibited ARIA).
    if ((target < 1 || target > count) && onPageChange !== undefined) {
      return (
        <button
          type="button"
          className={stepClass}
          {...slotAttribute}
          aria-label={props['aria-label']}
          disabled
          data-disabled=""
        >
          {props.children}
        </button>
      );
    }
    if (target < 1 || target > count) {
      return (
        <span
          className={stepClass}
          {...slotAttribute}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a disabled link: <a> needs href to be one
          role="link"
          aria-label={props['aria-label']}
          aria-disabled="true"
          data-disabled=""
        >
          {props.children}
        </span>
      );
    }
    return link(target, kind, { ...props, rel: kind === 'previous' ? 'prev' : 'next' });
  };

  const slots = paginationSlots(current, count, siblingCount, boundaryCount);
  const firstGap = slots.indexOf('ellipsis');

  return renderElement(
    'nav',
    render,
    { page: current, totalPages: count, size },
    {
      'data-slot': 'pagination',
      'data-size': size,
      'aria-label': labels?.nav ?? 'Pagination',
      ...rest,
      className: cx('nz-pagination', className),
      children: (
        <>
          {summary != null && (
            <p className="nz-pagination-summary" data-slot="pagination-summary">
              {summary}
            </p>
          )}
          <ul className="nz-pagination-list" data-slot="pagination-list">
            <li>{step('previous', previousIcon)}</li>
            {slots.map((slot, index) =>
              slot === 'ellipsis' ? (
                // at most two gaps: one before the current page's siblings, one after
                <li key={index === firstGap ? 'gap-start' : 'gap-end'} aria-hidden="true">
                  <span className="nz-pagination-ellipsis" data-slot="pagination-ellipsis">
                    …
                  </span>
                </li>
              ) : (
                <li key={slot}>
                  {link(slot, 'page', {
                    'data-slot': 'pagination-page',
                    className: 'nz-pagination-page',
                    'aria-label': pageLabel.replaceAll('{page}', number.format(slot)),
                    'aria-current': slot === current ? 'page' : undefined,
                    children: number.format(slot),
                  })}
                </li>
              ),
            )}
            <li>{step('next', nextIcon)}</li>
          </ul>
        </>
      ),
    },
  );
}
