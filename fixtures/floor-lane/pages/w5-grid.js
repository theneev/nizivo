// Week 5 Grid on the floor (ARCHITECTURE.md §21.1 exit criterion 6, W5; figma/08 §6.1). The span is
// `grid-column: span min(var(--_nz-grid-item-span), var(--nz-grid-columns))`: a math function in a
// grid line's integer, which the floor must resolve, at 4, 8 and 12 columns.
const near = (a, b, tolerance = 0.5) => Math.abs(a - b) <= tolerance;
const round = (n) => Math.round(n * 100) / 100;

// The breakpoints of tokens.css (40rem and 80rem), and each item's span per breakpoint.
const spans = {
  'span-full': { base: 'full' },
  'span-8-lg': { base: 'full', lg: 8 },
  'span-4-lg': { base: 'full', lg: 4 },
  'span-4-sm-3-lg': { base: 'full', sm: 4, lg: 3 },
  'span-12': { base: 12 },
  'span-6': { base: 6 },
  'span-1': { base: 1 },
  'span-default': { base: 1 },
};

function frameChecks(frame) {
  const { check } = window.nzFloor;
  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  const width = view.innerWidth;
  const rem = Number.parseFloat(view.getComputedStyle(doc.documentElement).fontSize);
  const breakpoint = width >= 80 * rem ? 'lg' : width >= 40 * rem ? 'sm' : 'base';
  const group = `grid ${width}px`;
  const grid = doc.getElementById('grid');
  const style = view.getComputedStyle(grid);
  const columns = Number.parseInt(style.getPropertyValue('--nz-grid-columns'), 10);
  const expectedColumns = { base: 4, sm: 8, lg: 12 }[breakpoint];
  check(group, 'columns-token', columns === expectedColumns, columns, expectedColumns, breakpoint);
  const tracks = style.gridTemplateColumns.split(' ').filter(Boolean).length;
  check(
    group,
    'tracks',
    tracks === columns,
    tracks,
    columns,
    'repeat(var(--nz-grid-columns), minmax(0, 1fr))',
  );
  const gap = Number.parseFloat(style.columnGap);
  const probe = doc.createElement('div');
  probe.style.cssText = 'inline-size:var(--nz-grid-gutter);block-size:0';
  grid.after(probe);
  const gutter = probe.getBoundingClientRect().width;
  probe.style.cssText = 'inline-size:var(--nz-grid-margin);block-size:0';
  const margin = probe.getBoundingClientRect().width;
  probe.style.cssText = 'inline-size:var(--nz-space-2);block-size:0';
  const space2 = probe.getBoundingClientRect().width;
  probe.remove();
  check(group, 'gutter', near(gap, gutter), gap, gutter, '--nz-grid-gutter');
  const column = (grid.getBoundingClientRect().width - (columns - 1) * gap) / columns;
  for (const [id, steps] of Object.entries(spans)) {
    const step =
      breakpoint === 'lg'
        ? (steps.lg ?? steps.sm ?? steps.base)
        : breakpoint === 'sm'
          ? (steps.sm ?? steps.base)
          : steps.base;
    const span = step === 'full' ? columns : Math.min(step, columns);
    const expected = span * column + (span - 1) * gap;
    const observed = doc.getElementById(id).getBoundingClientRect().width;
    check(
      group,
      id,
      near(observed, expected, 1),
      round(observed),
      round(expected),
      `span ${span} of ${columns}`,
    );
  }
  const gapStyle = view.getComputedStyle(doc.getElementById('grid-gap'));
  check(
    group,
    'gap-prop',
    near(Number.parseFloat(gapStyle.columnGap), space2),
    gapStyle.columnGap,
    `${space2}px`,
    'gap="2"',
  );
  const container = view.getComputedStyle(doc.getElementById('container'));
  check(
    group,
    'container-margin',
    near(Number.parseFloat(container.paddingLeft), margin),
    container.paddingLeft,
    `${margin}px`,
    '--nz-grid-margin',
  );
}

function run() {
  const frames = [...document.querySelectorAll('iframe')];
  window.nzFloor.meta.frames = frames.map((f) => f.contentWindow.innerWidth);
  for (const frame of frames) frameChecks(frame);
}

// The frames load after this script runs; wait for every one (and its stylesheets) to finish.
window.addEventListener('load', () => {
  try {
    run();
    window.nzFloor.finish('w5-grid');
  } catch (error) {
    window.nzFloor.finish('w5-grid', error);
  }
});
