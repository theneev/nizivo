'use client';
// The one client module of @nizivo/charts (ARCHITECTURE.md §14.1, §17.2): the crosshair, the hover
// dots, the tooltip card, a roving keyboard index and a polite live region, over a chart the server
// has already drawn. It receives plain JSON (§16.4): every label and value pre-formatted, each
// series' name once and each point as a short tuple (M40 item 10), so it formats nothing and reads
// no locale; the spoken text is the card's strings joined with the server's list separators.
//
// Two modes. Point mode (AreaChart): points evenly spaced from the plot's start edge to its end
// edge, a crosshair and a dot per series at the active point. Column mode (`columns`, BarChart):
// one band per point, the card beside the active band and `data-highlighted` on the chart's own
// column element, whose CSS dims the others; no crosshair, no dots.
//
// One tab stop for the whole plot (r6 §2.6), role="application" so a screen reader hands it the arrow
// keys (its name, role description and hint say what it is and how to use it). Arrow keys move the
// active point (following the screen, so under a mirrored plot ArrowRight goes back in time), Home
// and End jump to the ends; each keyboard move speaks the point through the polite region, which is
// in the server HTML, empty, before any move (§16.5); hiding the card (Escape, the pointer leaving,
// focus leaving) empties it, so the next key that shows the card speaks the point again. A pointer
// only shows the card: it never speaks. The card never hides while the pointer is over the plot,
// its own area included (it takes no pointer events, so it follows the point under the pointer),
// it has no timeout, and Escape hides it wherever focus is (WCAG 1.4.13: dismissable, persistent).
//
// The layer fills the plot and positions nothing in the flow, so showing it moves nothing, and the
// crosshair and dots move by `translate` in container units, never by a layout property, so a hover
// adds nothing to the page's layout shift (CLS, §17.3). They are placed by React through CSSOM after
// hydration, so the server HTML never has a `style` attribute (CSP Profile B, §19.3: CSSOM writes
// are allowed under style-src-attr 'none', test/browser/chart-interaction-csp.spec.tsx).
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';
import { cx } from '../_shared/cx';
import {
  ChartTooltip,
  type ChartTooltipRow,
  type ChartTrend,
} from '../chart-tooltip/chart-tooltip';

/** A row of the card without its value: the series' name and colour role, sent once. */
export type ChartInteractionSeries = Omit<ChartTooltipRow, 'value'>;

/**
 * One point, in x order: its title, one pre-formatted value per series (in `series` order), each
 * series' dot as a y in percent of the plot (0 top, 100 bottom; `null` for no dot, and none at all
 * in column mode), and the tooltip's change with its trend when there is one.
 */
export type ChartInteractionPoint = readonly [
  title: string,
  values: readonly string[],
  y: ReadonlyArray<number | null>,
  change?: string,
  trend?: ChartTrend,
];

export interface ChartInteractionProps {
  /** The card's rows, once for every point. */
  series: readonly ChartInteractionSeries[];
  /**
   * In x order, evenly spaced: in point mode the first at the plot's start edge and the last at its
   * end edge (one point sits in the middle), in column mode one per band, at the band's centre.
   */
  points: readonly ChartInteractionPoint[];
  /** The label after a point's change, for example "vs previous". */
  delta?: string;
  /**
   * How the spoken text joins its items: the separator between two items and the one before the
   * last, as the locale's `Intl.ListFormat` (`type: 'unit'`, `style: 'short'`) writes them.
   */
  separators: readonly [between: string, last: string];
  /**
   * Column mode: the `data-slot` of the chart's column elements, one per point in x order, inside
   * the layer's parent (the plot). The active one gets `data-highlighted` while the card shows.
   */
  columns?: string;
  /** The accessible name of the focusable layer. */
  'aria-label': string;
  /** How assistive technology names the layer's role, for example "interactive chart". */
  'aria-roledescription': string;
  /** The id of the keyboard instructions the server rendered beside the layer. */
  'aria-describedby': string;
}

export function ChartInteraction({
  series,
  points,
  delta,
  separators: [between, final],
  columns,
  ...names
}: ChartInteractionProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const last = points.length - 1;
  const [index, setIndex] = useState(last);
  const [shown, setShown] = useState(false);
  const [said, setSaid] = useState('');
  // hiding the card also empties the polite region, so the next key that shows it speaks again
  const hide = (): void => {
    setShown(false);
    setSaid('');
  };
  // Whether the plot is drawn mirrored, as ChartFrame's CSS resolved its xDirection ('rtl', or
  // 'auto' under a right-to-left `dir`): the plot's computed direction, read once after hydration
  // (the server cannot know it for 'auto'). Nothing is shown before then, so nothing moves.
  const [mirror, setMirror] = useState(false);
  useEffect(() => {
    const plot = ref.current?.parentElement;
    if (plot) setMirror(getComputedStyle(plot).direction === 'rtl');
  }, []);

  // While the card shows: Escape hides it, and in column mode the active column is highlighted
  useEffect(() => {
    if (!shown) return undefined;
    const column = columns
      ? ref.current?.parentElement?.querySelectorAll(`[data-slot="${columns}"]`)[index]
      : undefined;
    // Escape on the layer itself is the card's alone (as W10's: an enclosing dialog stays open);
    // with focus elsewhere it hides the card and still reaches what else listens for it
    const escape = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // what hide() does, with the stable setters alone (the effect's dependencies stay its own)
      setShown(false);
      setSaid('');
      if (event.target === ref.current) event.preventDefault();
    };
    column?.setAttribute('data-highlighted', '');
    document.addEventListener('keydown', escape);
    return () => {
      column?.removeAttribute('data-highlighted');
      document.removeEventListener('keydown', escape);
    };
  }, [shown, index, columns]);

  // the points' spacing: a band's centre is half a step in, a point mode's ends are the plot's edges
  const half = columns ? 0.5 : 0;
  const steps = columns ? last + 1 : last;
  const point = shown ? points[index] : undefined;
  // where the active point is on screen, from the left (the layer is direction: ltr)
  const along = steps ? ((index + half) / steps) * 100 : 50;
  const x = mirror ? 100 - along : along;

  const show = (next: number, speak?: boolean): void => {
    const i = Math.max(0, Math.min(last, next));
    const at = points[i];
    setIndex(i);
    setShown(true);
    if (speak && at) {
      // what the card shows, in its order, joined as the server's Intl.ListFormat would
      const items = [at[0], ...series.flatMap((row, s) => [row.label, at[1][s]])];
      if (at[3] !== undefined) items.push(at[3], delta);
      setSaid(
        items
          .filter((item) => item !== undefined)
          .reduce((text, item, k, all) => text + (k < all.length - 1 ? between : final) + item),
      );
    }
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = (event.clientX - box.left) / box.width;
    show(Math.round((mirror ? 1 - at : at) * steps - half));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // the arrows follow the screen: under a mirrored plot, ArrowRight goes back in time
    const step = shown ? (mirror ? -1 : 1) : 0;
    const keys: Record<string, number> = {
      ArrowRight: index + step,
      ArrowLeft: index - step,
      Home: 0,
      End: last,
    };
    const to = keys[event.key];
    if (to === undefined) return;
    show(to, true);
    event.preventDefault();
  };

  return (
    // A widget with its own keys (ARIA has no chart role): jsx-a11y counts "application" as
    // non-interactive, but it is the role that makes a screen reader pass the arrows through to it
    // rather than read on in browse mode; the polite region then speaks each point.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <div
      {...names}
      ref={ref}
      className={cx('nz-chart-interaction', columns && 'nz-chart-interaction-columns')}
      role="application"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the one tab stop of the plot
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointer}
      onPointerMove={onPointer}
      onPointerLeave={(event) => event.pointerType !== 'touch' && hide()}
      onPointerCancel={hide}
      onFocus={(event) => event.currentTarget.matches(':focus-visible') && show(index, true)}
      onBlur={hide}
    >
      {point !== undefined && (
        // One zero-width column at the point: its edge is the crosshair, and it carries the dots
        // and the card, beside the crosshair on the side with more room (Figma 03: "flips side near
        // edges"; the CSS caps the card at half the plot, so that side always fits it).
        <span className="nz-chart-interaction-point" style={{ translate: `${x}cqi` }}>
          {series.map(
            (row, s) =>
              point[2][s] != null && (
                <span
                  key={row.label}
                  className="nz-chart-interaction-dot"
                  data-series={row.series}
                  style={{ translate: `0 ${point[2][s]}cqb` }}
                />
              ),
          )}
          <ChartTooltip
            title={point[0]}
            rows={series.map((row, s) => ({ ...row, value: point[1][s] ?? '' }))}
            delta={
              point[3] === undefined
                ? undefined
                : { value: point[3], label: delta, trend: point[4] ?? 'flat' }
            }
            className="nz-chart-interaction-tip"
            data-side={x > 50 ? 'left' : 'right'}
            aria-hidden="true"
          />
        </span>
      )}
      <span className="nz-chart-visually-hidden" aria-live="polite" aria-atomic="true">
        {said}
      </span>
    </div>
  );
}
