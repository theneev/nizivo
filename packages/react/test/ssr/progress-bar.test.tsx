import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { ProgressBar } from '../../src/progress-bar/progress-bar';
import { ProgressBarExample } from '../../src/progress-bar/progress-bar.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('ProgressBar is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/progress-bar/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('ProgressBar markup and semantics', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  test('a labelled native <progress>: the label names it, the shown percentage is hidden', () => {
    const html = renderToString(<ProgressBar label="Monthly goal" value={68} />);
    const id = /<span id="([^"]+)" class="nz-progress-bar-label"/.exec(html)?.[1];
    expect(id).toBeDefined();
    expect(html).toMatch(
      /^<div data-slot="progress-bar" data-tone="brand" class="nz-progress-bar">/,
    );
    expect(html).toContain(
      '<span class="nz-progress-bar-value" data-slot="progress-bar-value" aria-hidden="true">68%</span>',
    );
    expect(html).toContain(
      `<progress class="nz-progress-bar-track" data-slot="progress-bar-track" max="100" value="68" aria-labelledby="${id}"></progress>`,
    );
    expect(errors).not.toHaveBeenCalled();
  });

  test('indeterminate: max stays, no value attribute, no shown value', () => {
    const html = renderToString(<ProgressBar label="Uploading" indeterminate value={30} />);
    const progress = /<progress[^>]*>/.exec(html)?.[0] ?? '';
    expect(progress).toContain('max="100"');
    expect(progress).not.toContain('value=');
    expect(progress).not.toContain('aria-valuetext');
    expect(html).not.toContain('nz-progress-bar-value');
    expect(errors).not.toHaveBeenCalled();
  });

  test('values are clamped and non-finite input never reaches an attribute', () => {
    expect(renderToString(<ProgressBar aria-label="a" value={140} />)).toContain('value="100"');
    expect(renderToString(<ProgressBar aria-label="b" value={-5} />)).toContain('value="0"');
    const nan = renderToString(<ProgressBar aria-label="c" value={Number.NaN} max={0} />);
    expect(nan).toContain('max="100" value="0"');
    expect(nan).not.toMatch(/NaN|Infinity/);
    expect(errors).not.toHaveBeenCalled();
  });

  test('a consumer name reaches the native element, not the wrapper; valueText is read and shown', () => {
    const html = renderToString(
      <ProgressBar aria-label="Import" value={3} max={5} valueText="3 of 5 steps" tone="success" />,
    );
    expect(html).toMatch(
      /^<div data-slot="progress-bar" data-tone="success" class="nz-progress-bar">/,
    );
    expect(html).toContain('aria-hidden="true">3 of 5 steps</span>');
    expect(html).toContain(
      '<progress class="nz-progress-bar-track" data-slot="progress-bar-track" max="5" value="3" aria-label="Import" aria-valuetext="3 of 5 steps"></progress>',
    );
  });

  test('showValue={false} without a label renders no header', () => {
    expect(
      renderToString(<ProgressBar aria-label="Import" value={40} showValue={false} />),
    ).not.toContain('nz-progress-bar-header');
  });

  test('render composes the root only; the <progress> keeps its semantics', () => {
    const html = renderToString(
      <ProgressBar
        aria-label="Import"
        value={40}
        render={<section data-tone="brand" />}
        tone="critical"
      />,
    );
    expect(html).toMatch(
      /^<section data-tone="critical" data-slot="progress-bar" class="nz-progress-bar">/,
    );
    expect(html).toContain('<progress class="nz-progress-bar-track"');
  });

  test('the example renders without warnings', () => {
    expect(renderToString(<ProgressBarExample />).match(/<progress /g)).toHaveLength(4);
    expect(errors).not.toHaveBeenCalled();
  });
});
