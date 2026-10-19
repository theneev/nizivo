'use client';
// The one client module of @nizivo/charts (ARCHITECTURE.md §14.1, §17.2 ≤ 0.8 KB own code): the
// crosshair, the hover dots, the tooltip card, a roving keyboard index and a polite live region,
// over a chart the server has already drawn. It receives plain JSON: positions in percent space and
// every label and value pre-formatted (§16.4), so it formats nothing and reads no locale.
//
// One tab stop for the whole plot (r6 §2.6), role="application" so a screen reader hands it the arrow
// keys (its name, role description and hint say what it is and how to use it). Arrow keys move the active point, Home and End jump to
// the ends, Escape hides the card; each keyboard move speaks the point's `announce` text through
// the polite region, which is in the server HTML, empty, before any move (§16.5); leaving the layer
// empties it, so coming back speaks the point again. A pointer only shows the card: it never
// speaks. The layer fills the plot and positions nothing in the flow, so showing it moves nothing,
// and the crosshair and dots move by `translate` in container units, never by a layout property, so
// a hover adds nothing to the page's layout shift (CLS, §17.3). They are placed by React through CSSOM
// after hydration, so the server HTML never has a `style` attribute (CSP
// Profile B, §19.3: CSSOM writes are allowed under style-src-attr 'none',
// test/browser/chart-interaction.spec.tsx).
import { useState, type KeyboardEvent, type PointerEvent, type ReactElement } from 'react';
import { ChartTooltip, type ChartTooltipProps } from '../chart-tooltip/chart-tooltip';

export interface ChartInteractionPoint {
  /**
   * 0–100 along x, in the server's percent space (before any RTL mirror). Points are evenly spaced,
   * as a point or a band scale places them, so the pointer finds its point without a search.
   */
  x: number;
  /** Per row of the card, its dot's y (0–100 top down), or `null` for no dot. */
  y: ReadonlyArray<number | null>;
  /** The tooltip card at this point, every string pre-formatted. */
  card: Pick<ChartTooltipProps, 'title' | 'rows' | 'delta'>;
  /** What the live region says when the point is reached by keyboard. */
  announce: string;
}

export interface ChartInteractionProps {
  /** In x order. */
  points: readonly ChartInteractionPoint[];
  /** The plot is drawn mirrored (xDirection="rtl", ChartFrame's `scale: -1 1`). */
  mirror: boolean;
  /** The accessible name of the focusable layer. */
  'aria-label': string;
  /** How assistive technology names the layer's role, for example "interactive chart". */
  'aria-roledescription': string;
  /** The id of the keyboard instructions the server rendered beside the layer. */
  'aria-describedby': string;
}

export function ChartInteraction({
  points,
  mirror,
  ...names
}: ChartInteractionProps): ReactElement {
  const last = points.length - 1;
  const [index, setIndex] = useState(last);
  const [shown, setShown] = useState(false);
  const [said, setSaid] = useState('');
  const point = shown ? points[index] : undefined;
  // where the crosshair is on screen, from the left (the layer is direction: ltr)
  const x = point === undefined ? 0 : mirror ? 100 - point.x : point.x;

  const show = (next: number, speak?: boolean): void => {
    const i = Math.max(0, Math.min(last, next));
    setIndex(i);
    setShown(true);
    if (speak === true) setSaid(points[i]?.announce ?? '');
  };

  const onPointer = (event: PointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const along = (event.clientX - box.left) / box.width;
    const first = points[0]?.x ?? 0;
    const span = (points[last]?.x ?? 0) - first || 1;
    show(Math.round((((mirror ? 1 - along : along) * 100 - first) / span) * last));
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
    if (event.key === 'Escape' && shown) setShown(false);
    else if (to === undefined) return;
    else show(to, true);
    event.preventDefault();
  };

  return (
    // A widget with its own keys (ARIA has no chart role): jsx-a11y counts "application" as
    // non-interactive, but it is the role that makes a screen reader pass the arrows through to it
    // rather than read on in browse mode; the polite region then speaks each point.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <div
      {...names}
      className="nz-chart-interaction"
      role="application"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the one tab stop of the plot
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointer}
      onPointerMove={onPointer}
      onPointerLeave={(event) => event.pointerType !== 'touch' && setShown(false)}
      onPointerCancel={() => setShown(false)}
      onFocus={(event) => event.currentTarget.matches(':focus-visible') && show(index, true)}
      onBlur={() => {
        setShown(false);
        setSaid('');
      }}
    >
      {point !== undefined && (
        // One zero-width column at the point: its edge is the crosshair, and it carries the dots
        // and the card, beside the crosshair on the side with more room (Figma 03: "flips side near
        // edges"; the CSS caps the card at half the plot, so that side always fits it).
        <span className="nz-chart-interaction-point" style={{ translate: `${x}cqi` }}>
          {point.card.rows.map(
            (row, i) =>
              point.y[i] != null && (
                <span
                  key={row.label}
                  className="nz-chart-interaction-dot"
                  data-series={row.series}
                  style={{ translate: `0 ${point.y[i]}cqb` }}
                />
              ),
          )}
          <ChartTooltip
            {...point.card}
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
