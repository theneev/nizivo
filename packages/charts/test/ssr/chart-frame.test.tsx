// ChartFrame's server markup (ARCHITECTURE.md §14.1, §16, §16.5): the figure and its caption, the
// status contract, the HTML ticks and the data table, the accessible alternative to the picture.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { ChartFrame, chartFrameLabels, type ChartTable } from '../../src/chart-frame/index';

const table: ChartTable = {
  columns: ['Day', 'Sales'],
  rows: [
    ['Oct 1', '$2,140'],
    ['Oct 2', '$3,020'],
    ['Oct 3', '$2,760'],
  ],
};
const svg = <svg className="nz-chart-svg" data-testid="plot" aria-hidden="true" />;

function html(node: ReactElement): string {
  return renderToStaticMarkup(node);
}

/** The document a test asserts on, parsed just enough: count and pick elements by a regex. */
function count(markup: string, pattern: RegExp): number {
  return [...markup.matchAll(new RegExp(pattern.source, 'g'))].length;
}

/** The frame's slots in order, minus what only one status has (the skeleton, the table). */
function skeleton(markup: string): Array<string | undefined> {
  return [...markup.matchAll(/data-slot="(chart-frame[a-z-]*)"/g)]
    .map(([, slot]) => slot)
    .filter((slot) => !/skeleton|table/.test(slot ?? ''));
}

describe('ChartFrame: the figure', () => {
  test('a <figure> named by its <figcaption>: title, then summary', () => {
    const out = html(
      <ChartFrame title="Sales" summary="Daily sales, Oct 1–3" table={table}>
        {svg}
      </ChartFrame>,
    );
    expect(out).toMatch(/^<figure data-slot="chart-frame" class="nz-chart-frame"/);
    expect(out).toContain(
      '<figcaption class="nz-chart-frame-caption" data-slot="chart-frame-caption">' +
        '<span class="nz-chart-frame-title" id="_R_0_">Sales</span>' +
        '<span class="nz-chart-frame-summary">Daily sales, Oct 1–3</span></figcaption>',
    );
    expect(out).toContain('data-x-direction="ltr"');
    expect(out).not.toContain('aria-busy');
    expect(out).toContain('data-testid="plot"');
  });

  test('className and HTML attributes reach the figure; render swaps the element', () => {
    expect(html(<ChartFrame title="S" table={table} className="mine" id="sales" />)).toMatch(
      /^<figure data-slot="chart-frame" id="sales" class="nz-chart-frame mine"/,
    );
    expect(html(<ChartFrame title="S" table={table} render={<section />} />)).toMatch(
      /^<section data-slot="chart-frame"/,
    );
  });
});

describe('ChartFrame: the data table, server-rendered', () => {
  test('visually hidden by default, named by the title, row headers in the first column', () => {
    const out = html(
      <ChartFrame title="Sales" table={table}>
        {svg}
      </ChartFrame>,
    );
    expect(out).toContain(
      // the wrapper is hidden, not the table: a <table> ignores `inline-size: 1px`
      '<div class="nz-chart-visually-hidden"><table class="nz-chart-frame-table" data-slot="chart-frame-table" aria-labelledby="_R_0_">' +
        '<thead><tr><th scope="col">Day</th><th scope="col">Sales</th></tr></thead>' +
        '<tbody><tr><th scope="row">Oct 1</th><td>$2,140</td></tr>',
    );
    expect(count(out, /<tr>/)).toBe(4);
  });

  test('tableView="details": a native disclosure, no JS, the table visible inside', () => {
    const out = html(
      <ChartFrame title="Sales" table={table} tableView="details">
        {svg}
      </ChartFrame>,
    );
    expect(out).toContain(
      `<details class="nz-chart-frame-details" data-slot="chart-frame-details"><summary class="nz-chart-frame-details-summary">${chartFrameLabels.table}</summary>` +
        '<table class="nz-chart-frame-table" data-slot="chart-frame-table"',
    );
  });
});

describe('ChartFrame: status (§16.5)', () => {
  test('loading: aria-busy, a skeleton and static hidden text, no live region, no plot, no table', () => {
    const out = html(
      <ChartFrame title="Sales" status="loading" table={table}>
        {svg}
      </ChartFrame>,
    );
    expect(out).toContain('data-loading=""');
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain(
      '<span class="nz-chart-frame-skeleton" data-slot="chart-frame-skeleton" aria-hidden="true"></span>',
    );
    expect(out).toContain('<span class="nz-chart-visually-hidden">Loading chart</span>');
    expect(out).not.toMatch(/aria-live|role="status"|role="alert"/);
    expect(out).not.toContain('data-testid="plot"');
    expect(out).not.toContain('<table');
  });

  test('empty and error: the default message or the slot, never live', () => {
    const empty = html(<ChartFrame title="S" status="empty" table={table} />);
    expect(empty).toContain('data-empty=""');
    expect(empty).toContain('<p class="nz-chart-frame-message">No data to show</p>');
    const error = html(
      <ChartFrame title="S" status="error" table={table} error={<p>Retry later</p>} />,
    );
    expect(error).toContain('data-error=""');
    expect(error).toContain('<p>Retry later</p>');
    expect(error).not.toMatch(/aria-live|role="alert"/);
  });

  test('a ready chart with no rows renders as empty', () => {
    const out = html(
      <ChartFrame title="S" table={{ columns: ['Day'], rows: [] }}>
        {svg}
      </ChartFrame>,
    );
    expect(out).toContain('data-empty=""');
    expect(out).not.toContain('data-testid="plot"');
  });

  test('pending: data stays, aria-busy and data-pending', () => {
    const out = html(
      <ChartFrame title="S" table={table} pending>
        {svg}
      </ChartFrame>,
    );
    expect(out).toContain('data-pending=""');
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain('data-testid="plot"');
  });

  test('labels translate the strings per instance', () => {
    expect(
      html(
        <ChartFrame
          title="S"
          status="loading"
          table={table}
          labels={{ loading: 'Wird geladen' }}
        />,
      ),
    ).toContain('>Wird geladen</span>');
  });

  test('the same frame structure in all four statuses (the box cannot shift)', () => {
    const shapes = (['ready', 'loading', 'empty', 'error'] as const).map((status) =>
      skeleton(
        html(
          <ChartFrame
            title="S"
            status={status}
            table={table}
            ticks={{ x: ['a', 'b', 'c'], y: ['2', '1', '0'] }}
            tableView="details"
          >
            {svg}
          </ChartFrame>,
        ),
      ),
    );
    for (const shape of shapes) expect(shape).toEqual(shapes[0]);
  });
});

describe('ChartFrame: HTML ticks on grid tracks (no inline style, CSP Profile B)', () => {
  test("point ticks: n labels on n − 1 cells, the last cell holding both ends' labels", () => {
    const out = html(
      <ChartFrame
        title="S"
        table={table}
        ticks={{ x: ['Oct 1', '', 'Oct 3'], y: ['$4k', '$2k', '$0'] }}
      >
        {svg}
      </ChartFrame>,
    );
    const x =
      /<div class="nz-chart-frame-x-ticks" data-slot="chart-frame-x-ticks" aria-hidden="true">(.*?)<\/div>/.exec(
        out,
      )?.[1];
    expect(x).toBe(
      '<span class="nz-chart-frame-cell"><span class="nz-chart-frame-tick">Oct 1</span></span>' +
        '<span class="nz-chart-frame-cell"><span class="nz-chart-frame-tick"></span><span class="nz-chart-frame-tick">Oct 3</span></span>',
    );
    expect(out).toContain(
      'data-slot="chart-frame-y-ticks" aria-hidden="true"><span class="nz-chart-frame-cell"><span class="nz-chart-frame-tick">$4k</span></span>',
    );
    expect(out).not.toContain('style=');
  });

  test('a point track with no label is an empty cell, except the last (M40 item 10: long series)', () => {
    const out = html(
      <ChartFrame title="S" table={table} ticks={{ x: ['Oct 1', '', '', '', 'Oct 5'] }}>
        {svg}
      </ChartFrame>,
    );
    expect(out).toContain(
      '<span class="nz-chart-frame-cell"><span class="nz-chart-frame-tick">Oct 1</span></span>' +
        '<span class="nz-chart-frame-cell"></span><span class="nz-chart-frame-cell"></span>' +
        '<span class="nz-chart-frame-cell"><span class="nz-chart-frame-tick"></span><span class="nz-chart-frame-tick">Oct 5</span></span>',
    );
  });

  test('band ticks: one centred label per band', () => {
    const out = html(
      <ChartFrame title="S" table={table} ticks={{ x: ['1', '2', '3'], xAlign: 'band' }}>
        {svg}
      </ChartFrame>,
    );
    expect(out).toContain('class="nz-chart-frame-x-ticks nz-chart-frame-x-ticks-band"');
    expect(count(out, /class="nz-chart-frame-tick"/)).toBe(3);
  });

  test('axes="none": no tick strips', () => {
    const out = html(
      <ChartFrame title="S" table={table} axes="none">
        {svg}
      </ChartFrame>,
    );
    expect(out).not.toContain('ticks');
  });

  test('xDirection is the plot direction attribute', () => {
    expect(html(<ChartFrame title="S" table={table} xDirection="rtl" />)).toContain(
      'data-x-direction="rtl"',
    );
  });
});

describe('the renderer seam: a third-party child (K9)', () => {
  test('caption, data table, legend and status around any <svg>, and no keyboard claim', () => {
    const out = html(
      <ChartFrame
        title="Orders"
        table={{ columns: ['Channel', 'Orders'], rows: [['Online', '412']] }}
        axes="none"
        interaction="none"
        legend={<ul data-testid="legend" />}
      >
        <svg data-vendor="third-party" viewBox="0 0 10 10">
          <rect width="5" height="5" />
        </svg>
      </ChartFrame>,
    );
    expect(out).toContain('<figcaption');
    expect(out).toContain('<th scope="row">Online</th><td>412</td>');
    expect(out).toContain(
      '<div class="nz-chart-frame-legend" data-slot="chart-frame-legend"><ul data-testid="legend"></ul></div>',
    );
    expect(out).toContain('data-vendor="third-party"');
    expect(out).not.toMatch(/tabindex|role="application"|aria-roledescription/);
  });
});
