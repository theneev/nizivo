// K9's own case (ARCHITECTURE.md §14.1, §10.8): ChartFrame around a dummy third-party <svg> with
// interaction="none" guarantees caption (visible or, with titleVisibility="hidden", visually hidden),
// data table, legend and status and makes no keyboard claim.
// Then the controls that show the suite fails when its claims break: a stand-in Nizivo renderer
// passes the keyboard branch, and each broken variant is caught.
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { ChartFrame, type ChartTable } from '../../src/chart-frame/index';
import { Legend } from '../../src/legend/index';
import {
  caseProblems,
  chartConformance,
  STATUSES,
  statusProblems,
  type ChartConformanceCase,
  type FrameForward,
} from './chart.conformance';

const TABLE: ChartTable = {
  columns: ['Day', 'Sales'],
  rows: [
    ['Oct 1', '$2,140'],
    ['Oct 2', '$3,020'],
    ['Oct 3', '$2,760'],
  ],
};

/**
 * What a third-party renderer emits: its own classes, attributes and pixel-space geometry, none of
 * Nizivo's vocabulary. (Recharts and ECharts emit markup of this shape; neither is a dependency.)
 */
const THIRD_PARTY: ReactElement = (
  <svg
    className="recharts-surface"
    width="720"
    height="280"
    viewBox="0 0 720 280"
    data-chart-engine="dummy"
    focusable="false"
  >
    <g className="recharts-layer recharts-area">
      <path
        className="recharts-curve recharts-area-area"
        d="M0,180L360,120L720,60L720,280L0,280Z"
      />
      <path className="recharts-curve recharts-area-curve" d="M0,180L360,120L720,60" />
    </g>
  </svg>
);

const LEGEND = <Legend items={[{ label: 'This period', series: 'current' }]} />;

function framed(frame: FrameForward, child: ReactElement, interaction: 'nizivo' | 'none') {
  return (
    <ChartFrame
      title="Sales"
      summary="Daily sales, Oct 1–3"
      table={TABLE}
      legend={LEGEND}
      interaction={interaction}
      ticks={{ x: ['Oct 1', 'Oct 2', 'Oct 3'], y: ['$4k', '$2k', '$0'] }}
      {...frame}
    >
      {child}
    </ChartFrame>
  );
}

const thirdParty: ChartConformanceCase = {
  part: 'chart-frame around a third-party <svg>',
  interaction: 'none',
  child: THIRD_PARTY,
  render: (frame) => framed(frame, THIRD_PARTY, 'none'),
};

chartConformance(thirdParty);

test('around a third-party child the legend and the caption are there in every status', () => {
  for (const status of STATUSES) {
    const out = renderToStaticMarkup(thirdParty.render({ status }));
    expect(out).toContain('data-slot="chart-frame-legend"');
    expect(out).toContain('<span class="nz-chart-frame-title"');
  }
});

/** A stand-in for a Nizivo renderer: a percent-space SVG and an island-shaped interaction layer. */
function nizivoPlot(island: ReactElement | null): ReactElement {
  return (
    <>
      <svg
        className="nz-chart-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="nz-chart-line" data-series="current" d="M0,50L50,25L100,10" />
      </svg>
      {island}
    </>
  );
}

// The island's shape (src/_island/chart-interaction.client.tsx): one named, focusable group with
// a polite region. createElement, not JSX: jsx-a11y rightly flags a tabindex on a <div> in app code.
const ISLAND = createElement(
  'div',
  {
    className: 'nz-chart-interaction',
    tabIndex: 0,
    role: 'group',
    'aria-roledescription': 'interactive chart',
    'aria-label': 'Sales',
  },
  createElement('div', { className: 'nz-chart-visually-hidden', 'aria-live': 'polite' }),
);

chartConformance({
  part: 'chart-frame around a stand-in Nizivo renderer',
  interaction: 'nizivo',
  render: (frame) => framed(frame, nizivoPlot(ISLAND), 'nizivo'),
});

describe('the suite fails when a claim breaks (negative controls)', () => {
  test('a Nizivo renderer without its island: no keyboard claim', () => {
    const problems = statusProblems(
      { part: 'x', interaction: 'nizivo', render: (f) => framed(f, nizivoPlot(null), 'nizivo') },
      { status: 'ready' },
    );
    expect(problems).toContain(
      'ready: no tab stop: the keyboard claim of a Nizivo renderer does not hold',
    );
    expect(problems.some((p) => p.includes('0 live regions'))).toBe(true);
  });

  test('an unnamed tab stop, a second live region, an assertive one', () => {
    const island = createElement(
      'div',
      { tabIndex: 0 },
      createElement('div', { 'aria-live': 'polite' }),
      createElement('div', { 'aria-live': 'assertive' }),
    );
    const problems = statusProblems(
      { part: 'x', interaction: 'nizivo', render: (f) => framed(f, nizivoPlot(island), 'nizivo') },
      { status: 'ready' },
    );
    expect(problems).toContain('ready: the tab stop <div> has no accessible name');
    expect(problems).toContain('ready: 2 live regions (want exactly one, aria-live="polite")');
  });

  test('a frame that adds an island beside a third-party child under interaction="none"', () => {
    const problems = statusProblems(
      {
        ...thirdParty,
        render: (f) =>
          framed(
            f,
            <>
              {THIRD_PARTY}
              {ISLAND}
            </>,
            'none',
          ),
      },
      { status: 'ready' },
    );
    expect(problems).toContain('ready: the third-party child does not reach the plot verbatim');
  });

  test('a tab stop or a live region the frame owns under interaction="none"', () => {
    const problems = statusProblems(
      {
        ...thirdParty,
        render: (f) => (
          <ChartFrame
            title="Sales"
            table={TABLE}
            interaction="none"
            legend={createElement('p', { tabIndex: 0, 'aria-live': 'polite' }, 'Legend')}
            {...f}
          >
            {THIRD_PARTY}
          </ChartFrame>
        ),
      },
      { status: 'ready' },
    );
    expect(problems).toContain('ready: 1 tab stops (p) where no keyboard claim is made');
    expect(problems).toContain('ready: 1 live regions where no keyboard claim is made');
  });

  test('a renderer that ignores status, styles inline and invents data-* and classes', () => {
    const broken: ChartConformanceCase = {
      part: 'x',
      interaction: 'nizivo',
      render: (f) => (
        <ChartFrame title="Sales" table={TABLE} labels={f.labels ?? {}}>
          <svg className="my-chart" data-kind="area" style={{ color: 'red' }} />
          {ISLAND}
        </ChartFrame>
      ),
    };
    const problems = caseProblems(broken);
    expect(problems).toContain('loading: data-loading is absent');
    expect(problems).toContain('loading: aria-busy is absent');
    expect(problems).toContain('error: a data table while not ready');
    expect(problems.some((p) => p.startsWith('ready: inline style on <svg'))).toBe(true);
    expect(problems).toContain('ready: class "my-chart" is not nz-<part>[-<element>]');
    expect(problems).toContain('ready: data-kind is not in contracts/vocabulary.json');
  });

  test('a renderer that drops the frame’s strings', () => {
    const problems = caseProblems({
      part: 'x',
      interaction: 'nizivo',
      render: ({ status }) => framed({ status }, nizivoPlot(ISLAND), 'nizivo'),
    });
    expect(problems).toContain('loading: the plot does not say "Diagramm wird geladen"');
    expect(problems).toContain('empty: the plot does not say "Keine Daten"');
  });

  test('a renderer that drops titleVisibility, or hides its caption on its own', () => {
    const dropped = caseProblems({
      part: 'x',
      interaction: 'nizivo',
      render: ({ status }) => framed({ status }, nizivoPlot(ISLAND), 'nizivo'),
    });
    expect(dropped).toContain(
      'ready: the caption is not visually hidden with titleVisibility="hidden"',
    );
    const always = statusProblems(
      {
        part: 'x',
        interaction: 'nizivo',
        render: (f) => framed({ ...f, titleVisibility: 'hidden' }, nizivoPlot(ISLAND), 'nizivo'),
      },
      { status: 'ready' },
    );
    expect(always).toContain(
      'ready: the caption is visually hidden without titleVisibility="hidden"',
    );
  });

  test('a renderer that hides the legend in some statuses: the box moves', () => {
    const problems = caseProblems({
      part: 'x',
      interaction: 'nizivo',
      render: (f) => (
        <ChartFrame
          title="Sales"
          table={TABLE}
          legend={f.status === 'ready' ? LEGEND : undefined}
          {...f}
        >
          {nizivoPlot(ISLAND)}
        </ChartFrame>
      ),
    });
    expect(problems.some((p) => p.startsWith("loading: the frame's slots differ from ready"))).toBe(
      true,
    );
  });
});

test('ChartFrame tells a render function who claims the keyboard', () => {
  const seen: string[] = [];
  for (const interaction of ['nizivo', 'none'] as const) {
    // the function form, as a consumer composing the figure would use it
    renderToStaticMarkup(
      <ChartFrame
        title="Sales"
        table={TABLE}
        interaction={interaction}
        render={(props, state) => {
          seen.push(state.interaction);
          return <figure {...props} />;
        }}
      />,
    );
  }
  expect(seen).toEqual(['nizivo', 'none']);
});
