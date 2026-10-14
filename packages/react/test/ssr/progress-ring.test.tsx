import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { ProgressRing } from '../../src/progress-ring/progress-ring';
import { ProgressRingExample } from '../../src/progress-ring/progress-ring.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('ProgressRing is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/progress-ring/index.ts');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('ProgressRing markup and semantics', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  test('a progressbar with values; the svg and the centre are hidden from assistive technology', () => {
    const html = renderToString(<ProgressRing aria-label="Store setup" value={25} />);
    expect(html).toMatch(
      /^<div role="progressbar" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100" aria-valuetext="25%" data-slot="progress-ring" data-tone="brand" data-size="md" aria-label="Store setup" class="nz-progress-ring">/,
    );
    expect(html).toContain(
      '<svg class="nz-progress-ring-svg" viewBox="0 0 72 72" aria-hidden="true" focusable="false">',
    );
    expect(html).toContain('stroke-dasharray="25 100" transform="rotate(-90 36 36)"');
    expect(html).toContain(
      '<span class="nz-progress-ring-label" data-slot="progress-ring-label" aria-hidden="true">25%</span>',
    );
    expect(html).not.toContain('style=');
    expect(errors).not.toHaveBeenCalled();
  });

  test('a clamped value: the arc and aria-valuenow agree', () => {
    const html = renderToString(<ProgressRing aria-label="Goal" value={9} max={6} />);
    expect(html).toContain('aria-valuenow="6" aria-valuemin="0" aria-valuemax="6"');
    expect(html).toContain('stroke-dasharray="100 100"');
    const empty = renderToString(<ProgressRing aria-label="Goal" value={Number.NaN} />);
    expect(empty).toContain('aria-valuenow="0"');
    expect(empty).toContain('stroke-dasharray="0 100"');
    expect(empty).not.toMatch(/NaN/);
  });

  test('meter: the meter role; a custom centre reads valueText', () => {
    const html = renderToString(
      <ProgressRing aria-label="Imported" meter value={3} max={4} valueText="3 of 4" size="sm">
        3/4
      </ProgressRing>,
    );
    expect(html).toMatch(
      /^<div role="meter" aria-valuenow="3" aria-valuemin="0" aria-valuemax="4" aria-valuetext="3 of 4" data-slot="progress-ring" data-tone="brand" data-size="sm"/,
    );
    expect(html).toContain('aria-hidden="true">3/4</span>');
  });

  test('render keeps the role, values and part attributes', () => {
    const html = renderToString(
      <ProgressRing
        aria-label="Goal"
        value={50}
        render={<figure data-size="lg" />}
        tone="success"
      />,
    );
    expect(html).toMatch(/^<figure data-size="md" role="progressbar" aria-valuenow="50"/);
    expect(html).toContain('data-slot="progress-ring" data-tone="success"');
  });

  test('the example renders without warnings', () => {
    expect(
      renderToString(<ProgressRingExample />).match(/data-slot="progress-ring"/g),
    ).toHaveLength(3);
    expect(errors).not.toHaveBeenCalled();
  });
});
