// The dashboard values and tiles in a real engine (ARCHITECTURE.md §10.7, §16.5; M41): Metric, KpiTile
// and TrendCard keep the same root box (±1 px) in all four statuses at three container widths, so a
// Suspense fallback streams in without a layout shift. The server HTML hydrates with no warning
// (useId names the group), the number is tabular and never wraps, and Card's new brand and accent
// tones are the tinted surfaces Figma draws (no stroke, the same box as the other tones).
import type { ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Button } from '../../src/button/button';
import { CardRoot } from '../../src/card/card';
import { Delta } from '../../src/delta/delta';
import { InlineError } from '../../src/inline-error/inline-error';
import { KpiTile } from '../../src/kpi-tile/kpi-tile';
import { Metric, type MetricDataProps } from '../../src/metric/metric';
import { TrendCard } from '../../src/trend-card/trend-card';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/card/card.css',
    '../../src/delta/delta.css',
    '../../src/skeleton/skeleton.css',
    '../../src/inline-error/inline-error.css',
    '../../src/number-value/number-value.css',
    '../../src/metric/metric.css',
    '../../src/kpi-tile/kpi-tile.css',
    '../../src/trend-card/trend-card.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 11)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Server HTML in the document, then hydration; collects every hydration problem. */
async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  return { container, problems };
}

function element(selector: string, scope: ParentNode = document): HTMLElement {
  const found = scope.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${selector}`);
  return found;
}

function svgElement(selector: string, scope: ParentNode = document): SVGElement {
  const found = scope.querySelector(selector);
  if (!(found instanceof SVGElement)) throw new Error(`no ${selector}`);
  return found;
}

const STATUSES = ['ready', 'loading', 'empty', 'error'] as const;

/** Every prop the ready tile has, the status apart: the fallback and the data render the same slots. */
const DATA = {
  label: 'Total sales',
  value: 48290,
  format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
  delta: 0.124,
  comparison: 'vs last week',
} satisfies MetricDataProps;

const CHART = (
  <svg viewBox="0 0 88 28" width="88" height="28" aria-hidden="true">
    <path d="M0 20 L88 4" stroke="currentColor" />
  </svg>
);

/** A stand-in chart with a fixed aspect, as ChartFrame's body keeps in every status. */
const PLOT = <div style={{ aspectRatio: '18 / 7', background: 'currentColor' }} />;

/**
 * The root boxes of `make(status)`, each status alone in the first cell of its own dashboard row
 * (`repeat(4, 1fr)` cells of `width` px), as a Suspense fallback and its data swap in place: a part
 * whose content set its minimum width would widen its column in one status only (A11Y-W12-2). With
 * `text`, the root font size (200 % is WCAG 1.4.4's enlarged text).
 */
async function boxes(
  width: number,
  make: (status: (typeof STATUSES)[number]) => ReactNode,
  text = '100%',
): Promise<DOMRect[]> {
  document.documentElement.style.fontSize = text;
  const { problems } = await hydrate(
    <div>
      {STATUSES.map((status) => (
        <div
          key={status}
          data-status={status}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            inlineSize: width * 4 + 48,
            marginBlockEnd: 16,
          }}
        >
          {make(status)}
          <div />
          <div />
          <div />
        </div>
      ))}
    </div>,
  );
  expect(problems).toEqual([]);
  return STATUSES.map((status) => element(`[data-status="${status}"] > *`).getBoundingClientRect());
}

/** Each status whose box differs from the ready one by more than 1 px, with both sizes. */
function moved(rects: DOMRect[]): string[] {
  const [ready] = rects;
  if (ready === undefined) throw new Error('no box');
  return rects.flatMap((rect, i) =>
    Math.abs(rect.width - ready.width) > 1 || Math.abs(rect.height - ready.height) > 1
      ? [`${STATUSES[i] ?? i}: ${rect.width}×${rect.height} vs ${ready.width}×${ready.height}`]
      : [],
  );
}

/** The error a dashboard shows with a Retry, as InlineError's docs draw it. */
const RETRY = (
  <InlineError action={<Button size="sm">Retry</Button>}>Could not load sales</InlineError>
);

describe('the root box is the same in all four statuses (§16.5)', () => {
  afterEach(() => {
    document.documentElement.style.fontSize = '';
  });

  for (const text of ['100%', '200%']) {
    for (const width of [200, 240, 320, 480]) {
      test(`KpiTile at ${width} px, ${text} text, ready props on every status`, async () => {
        const rects = await boxes(
          width,
          (status) => <KpiTile {...DATA} chart={CHART} status={status} />,
          text,
        );
        expect(moved(rects)).toEqual([]);
      });

      test(`KpiTile at ${width} px, ${text} text, a bare fallback against the ready tile`, async () => {
        const rects = await boxes(
          width,
          (status) =>
            status === 'ready' ? (
              <KpiTile {...DATA} chart={CHART} />
            ) : (
              <KpiTile label={DATA.label} status={status} />
            ),
          text,
        );
        expect(moved(rects)).toEqual([]);
      });

      test(`KpiTile at ${width} px, ${text} text, an error with a Retry`, async () => {
        const rects = await boxes(
          width,
          (status) => <KpiTile {...DATA} chart={CHART} status={status} error={RETRY} />,
          text,
        );
        expect(moved(rects)).toEqual([]);
      });

      test(`Metric at ${width} px, ${text} text`, async () => {
        const rects = await boxes(width, (status) => <Metric {...DATA} status={status} />, text);
        expect(moved(rects)).toEqual([]);
      });
    }

    for (const width of [320, 560, 800]) {
      test(`TrendCard at ${width} px, ${text} text`, async () => {
        const rects = await boxes(
          width,
          (status) => (
            <TrendCard
              {...DATA}
              status={status}
              action={<button type="button">Last 30 days</button>}
              chart={PLOT}
              legend={<span>Oct 1 – Oct 30</span>}
            />
          ),
          text,
        );
        expect(moved(rects)).toEqual([]);
      });

      test(`TrendCard at ${width} px, ${text} text, a bare fallback against the ready card`, async () => {
        const rects = await boxes(
          width,
          (status) => (
            <TrendCard
              {...(status === 'ready' ? DATA : { label: DATA.label })}
              status={status}
              action={<button type="button">Last 30 days</button>}
              chart={PLOT}
            />
          ),
          text,
        );
        expect(moved(rects)).toEqual([]);
      });
    }
  }
});

/** How much of `selector`'s text shows: its box over its whole text width. */
function shown(selector: string, scope: ParentNode): number {
  const el = element(selector, scope);
  return el.clientWidth / el.scrollWidth;
}

describe('TrendCard keeps its comparison and its error readable when narrow (A11Y-W12-3)', () => {
  afterEach(() => {
    document.documentElement.style.fontSize = '';
  });

  for (const text of ['100%', '200%']) {
    for (const width of [320, 560, 800]) {
      test(`at ${width} px, ${text} text`, async () => {
        document.documentElement.style.fontSize = text;
        const { container } = await hydrate(
          <div style={{ inlineSize: width }}>
            <TrendCard {...DATA} action={<button type="button">Last 30 days</button>} />
            <TrendCard
              {...DATA}
              status="error"
              action={<button type="button">Last 30 days</button>}
            />
          </div>,
        );
        const [ready, failed] = container.querySelectorAll('.nz-trend-card');
        if (ready === undefined || failed === undefined) throw new Error('no cards');
        // at 100 % the whole comparison and the whole default error show; at 200 % they may end in
        // an ellipsis in a 320 px card, but keep a good part of their text (about half, measured)
        const least = text === '100%' ? 1 : 0.4;
        expect(shown('.nz-metric-comparison', ready)).toBeGreaterThanOrEqual(least);
        expect(shown('.nz-inline-error-message', failed)).toBeGreaterThanOrEqual(least);
      });
    }
  }
});

describe('KpiTile', () => {
  test('hydrates without a warning; a group named by its label; Figma geometry', async () => {
    const { container, problems } = await hydrate(
      <div style={{ inlineSize: 300 }}>
        <KpiTile {...DATA} chart={CHART} />
      </div>,
    );
    expect(problems).toEqual([]);
    const tile = element('.nz-kpi-tile', container);
    const label = element('.nz-metric-label', tile);
    expect(tile.getAttribute('role')).toBe('group');
    expect(tile.getAttribute('aria-labelledby')).toBe(label.id);
    const css = getComputedStyle(tile);
    // padding space/5 (20), radius xl, no shadow at rest (handoff row j)
    expect(css.paddingTop).toBe('20px');
    expect(css.paddingLeft).toBe('20px');
    expect(css.boxShadow).toBe('none');
    // the label, the value row and the change row 16 apart; the chart at most 88 × 28, at the end
    const metric = element('.nz-metric', tile);
    expect(getComputedStyle(metric).rowGap).toBe('16px');
    const value = element('.nz-number-value', tile);
    expect(getComputedStyle(value).fontVariantNumeric).toBe('tabular-nums');
    expect(getComputedStyle(value).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(value).fontSize).toBe('32px');
    const chart = svgElement('.nz-metric-chart > svg', tile).getBoundingClientRect();
    expect(chart.width).toBeLessThanOrEqual(88);
    expect(chart.height).toBeLessThanOrEqual(28);
    const row = element('.nz-metric-value-row', tile).getBoundingClientRect();
    expect(Math.abs(chart.right - row.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(chart.bottom - row.bottom)).toBeLessThanOrEqual(1);
  });

  test('a long value keeps one line; the chart gives way', async () => {
    const { container } = await hydrate(
      <div style={{ inlineSize: 240 }}>
        <KpiTile label="Total sales" value={1248290.4} chart={CHART} />
      </div>,
    );
    const value = element('.nz-number-value', container);
    expect(value.getBoundingClientRect().height).toBeLessThanOrEqual(33);
    expect(
      element('.nz-metric-value-row', container).getBoundingClientRect().height,
    ).toBeLessThanOrEqual(33);
  });

  test('loading names nothing live; the hidden text is static', async () => {
    const { container } = await hydrate(<KpiTile label="Revenue" status="loading" />);
    const tile = element('.nz-kpi-tile', container);
    expect(tile.getAttribute('aria-busy')).toBe('true');
    expect(tile.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
    expect(element('.nz-visually-hidden', tile).textContent).toBe('Loading Revenue');
  });
});

describe('Card tones (M41)', () => {
  test('brand and accent are the subtle tints, with no stroke and the same box as surface', async () => {
    const { container } = await hydrate(
      <div style={{ inlineSize: 300 }}>
        {(['surface', 'subtle', 'brand', 'accent'] as const).map((tone) => (
          <CardRoot key={tone} tone={tone} data-test={tone}>
            Body
          </CardRoot>
        ))}
        <span data-token="brand" style={{ background: 'var(--nz-bg-brand-subtle)' }} />
        <span data-token="accent" style={{ background: 'var(--nz-bg-accent-subtle)' }} />
      </div>,
    );
    const card = (tone: string): HTMLElement => element(`[data-test="${tone}"]`, container);
    const token = (name: string): string =>
      getComputedStyle(element(`[data-token="${name}"]`, container)).backgroundColor;
    for (const tone of ['brand', 'accent']) {
      const css = getComputedStyle(card(tone));
      expect(css.backgroundColor).toBe(token(tone));
      expect(css.borderTopColor).toBe('rgba(0, 0, 0, 0)');
      expect(css.borderTopWidth).toBe('1px');
      expect(css.boxShadow).toBe('none');
      // the same box (Firefox lays out stacked boxes on a 1/60 px grid, so not bit-identical)
      expect(card(tone).getBoundingClientRect().height).toBeCloseTo(
        card('surface').getBoundingClientRect().height,
        1,
      );
    }
    expect(token('brand')).not.toBe(getComputedStyle(card('surface')).backgroundColor);
    // the existing tones did not move
    expect(getComputedStyle(card('subtle')).borderTopColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(card('surface')).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('KpiTile and TrendCard take the tone from card.css', async () => {
    const { container } = await hydrate(
      <div style={{ inlineSize: 400 }}>
        <KpiTile label="A" value={1} tone="accent" />
        <TrendCard label="B" value={2} tone="brand" />
        <span data-token="brand" style={{ background: 'var(--nz-bg-brand-subtle)' }} />
        <span data-token="accent" style={{ background: 'var(--nz-bg-accent-subtle)' }} />
      </div>,
    );
    const bg = (selector: string): string =>
      getComputedStyle(element(selector, container)).backgroundColor;
    expect(bg('.nz-kpi-tile')).toBe(bg('[data-token="accent"]'));
    expect(bg('.nz-trend-card')).toBe(bg('[data-token="brand"]'));
    // TrendCard: padding md (24), rows 24 apart
    const trend = getComputedStyle(element('.nz-trend-card', container));
    expect(trend.paddingTop).toBe('24px');
    expect(trend.rowGap).toBe('24px');
  });
});

/** `rgb(r, g, b)`, `rgba(r, g, b, a)` or `color(srgb r g b)` → sRGB 0–255 channels (opaque only). */
function channels(color: string): [number, number, number] {
  const rgb =
    /^rgba?\((\d+(?:\.\d+)?),?\s*(\d+(?:\.\d+)?),?\s*(\d+(?:\.\d+)?)(?:[,/]\s*([\d.]+))?\)$/.exec(
      color,
    );
  if (rgb !== null && (rgb[4] === undefined || Number(rgb[4]) === 1)) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(color);
  if (srgb !== null) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255];
  throw new Error(`not an opaque colour: ${color}`);
}

/** An sRGB channel (0–255) in linear light. */
function linear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.2 relative luminance of an opaque computed colour. */
function luminance(color: string): number {
  const [r, g, bl] = channels(color);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(bl);
}

/** WCAG 2.2 contrast ratio of two opaque computed colours. */
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** A span painted from `var(--nz-surface, <fallback>)`: what a child reading the variable gets. */
const Probe = ({ id }: { id: string }): ReactNode => (
  <span
    data-probe={id}
    style={{ display: 'block', background: 'var(--nz-surface, rgb(1, 2, 3))', blockSize: 4 }}
  />
);

describe('the shared surface variable, --nz-surface (M42 item 6)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`a child reads the surface its Card paints, every tone (${theme})`, async () => {
      const tones = ['surface', 'subtle', 'brand', 'accent', 'inverse'] as const;
      const { container } = await hydrate(
        <div data-nz-theme={theme} style={{ inlineSize: 300 }}>
          <Probe id="outside" />
          {tones.map((tone) => (
            <CardRoot key={tone} tone={tone} data-test={tone}>
              <div>
                <Probe id={tone} />
              </div>
            </CardRoot>
          ))}
          <CardRoot
            data-test="hook"
            style={{ '--nz-card-bg': 'rgb(10, 20, 30)' } as Record<string, string>}
          >
            <Probe id="hook" />
          </CardRoot>
          <CardRoot tone="brand" data-test="outer">
            <CardRoot tone="inverse" data-test="nested">
              <Probe id="nested" />
            </CardRoot>
          </CardRoot>
          <KpiTile label="K" value={1} tone="accent" chart={<Probe id="kpi" />} />
          <TrendCard label="T" value={2} tone="brand" chart={<Probe id="trend" />} />
        </div>,
      );
      const probe = (id: string): string =>
        getComputedStyle(element(`[data-probe="${id}"]`, container)).backgroundColor;
      const card = (id: string): string =>
        getComputedStyle(element(`[data-test="${id}"]`, container)).backgroundColor;
      // not a token: undefined outside a Card, so a read takes its fallback
      expect(probe('outside')).toBe('rgb(1, 2, 3)');
      for (const tone of tones) expect([tone, probe(tone)]).toEqual([tone, card(tone)]);
      // the five tones are four colours at least (brand and accent are equal in dark, Figma 04 #5)
      expect(new Set(tones.map(probe)).size).toBeGreaterThanOrEqual(4);
      // inverse resolves in the inverse scheme, as the Card does
      expect(probe('inverse')).not.toBe(probe('surface'));
      // a consumer's --nz-card-bg flows through; the nearest Card wins
      expect(probe('hook')).toBe('rgb(10, 20, 30)');
      expect(probe('nested')).toBe(card('nested'));
      expect(probe('nested')).not.toBe(card('outer'));
      // KpiTile and TrendCard are Cards
      expect(probe('kpi')).toBe(
        getComputedStyle(element('.nz-kpi-tile', container)).backgroundColor,
      );
      expect(probe('trend')).toBe(
        getComputedStyle(element('.nz-trend-card', container)).backgroundColor,
      );
    });
  }
});

describe('the Delta pill on a tinted surface is bg/surface (M42 item 4)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`visible on brand and accent, its text at least 4.5:1 on it (${theme})`, async () => {
      const { container } = await hydrate(
        <div data-nz-theme={theme} style={{ inlineSize: 400 }}>
          <span data-token="surface" style={{ background: 'var(--nz-bg-surface)' }} />
          <span data-token="success-subtle" style={{ background: 'var(--nz-bg-success-subtle)' }} />
          {(['brand', 'accent'] as const).map((tone) => (
            <div key={tone} data-test={tone}>
              <KpiTile label="Up" value={1} delta={0.124} tone={tone} />
              <KpiTile label="Down" value={1} delta={-0.05} tone={tone} />
              <KpiTile label="Flat" value={1} delta={0} tone={tone} />
              <TrendCard label="Up" value={1} delta={0.124} tone={tone} />
              <CardRoot tone={tone}>
                <Delta value={0.2} />
              </CardRoot>
            </div>
          ))}
          <div data-test="surface">
            <KpiTile label="Up" value={1} delta={0.124} />
          </div>
          <div data-test="hook">
            <KpiTile
              label="Up"
              value={1}
              delta={0.124}
              tone="brand"
              style={{ '--nz-delta-bg': 'rgb(10, 20, 30)' } as Record<string, string>}
            />
          </div>
          {/* the nearest Card decides: an untinted Card nested in a tinted one keeps Delta's pill */}
          <CardRoot tone="brand">
            <CardRoot data-test="nested-surface">
              <Delta value={0.2} />
              <CardRoot tone="accent" data-test="nested-tint">
                <Delta value={0.2} />
              </CardRoot>
            </CardRoot>
            <CardRoot tone="inverse" data-test="nested-inverse">
              <Delta value={0.2} />
            </CardRoot>
          </CardRoot>
        </div>,
      );
      const token = (name: string): string =>
        getComputedStyle(element(`[data-token="${name}"]`, container)).backgroundColor;
      for (const tone of ['brand', 'accent']) {
        const group = element(`[data-test="${tone}"]`, container);
        const pills = [...group.querySelectorAll<HTMLElement>('.nz-delta')];
        expect(pills).toHaveLength(5);
        expect(new Set(pills.map((pill) => pill.dataset['tone']))).toEqual(
          new Set(['success', 'critical', 'neutral']),
        );
        for (const pill of pills) {
          const css = getComputedStyle(pill);
          const owner = pill.closest('.nz-card');
          if (!(owner instanceof HTMLElement)) throw new Error('a pill outside a Card');
          const surface = getComputedStyle(owner).backgroundColor;
          expect([tone, pill.dataset['tone'], css.backgroundColor]).toEqual([
            tone,
            pill.dataset['tone'],
            token('surface'),
          ]);
          // the pill shows on the tint
          expect(css.backgroundColor).not.toBe(surface);
          // measured: the pill's text on the pill, WCAG 1.4.3
          expect(contrast(css.color, css.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        }
      }
      // the surface tile keeps Figma's pill; a consumer's --nz-delta-bg still wins
      const surfacePill = element('[data-test="surface"] .nz-delta', container);
      expect(getComputedStyle(surfacePill).backgroundColor).toBe(token('success-subtle'));
      const hookPill = element('[data-test="hook"] .nz-delta', container);
      expect(getComputedStyle(hookPill).backgroundColor).toBe('rgb(10, 20, 30)');
      const nestedPill = element('[data-test="nested-surface"] > .nz-delta', container);
      expect(getComputedStyle(nestedPill).backgroundColor).toBe(token('success-subtle'));
      expect(getComputedStyle(nestedPill).backgroundColor).not.toBe(
        getComputedStyle(element('[data-test="nested-surface"]', container)).backgroundColor,
      );
      const tintPill = element('[data-test="nested-tint"] .nz-delta', container);
      expect(getComputedStyle(tintPill).backgroundColor).toBe(token('surface'));
      // inverse: Delta's own pill in the inverse scheme, not the inverse Card's surface
      const inverse = element('[data-test="nested-inverse"]', container);
      const inversePill = getComputedStyle(element('.nz-delta', inverse)).backgroundColor;
      expect(inversePill).not.toBe(getComputedStyle(inverse).backgroundColor);
      expect(inversePill).not.toBe(token('surface'));
    });
  }
});
