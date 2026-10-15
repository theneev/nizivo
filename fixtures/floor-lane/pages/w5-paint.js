// Week 5 painted fills (ARCHITECTURE.md §21.1 exit criterion 6, W5): the parts the floor paints through
// vendor pseudo-elements, SVG strokes or ::before, which no computed style can show. The page sets
// the components' public hooks so the part under test is red and what surrounds it blue, lists a probe
// point for each, and the runner samples a screenshot there (red = L, blue = D, as paint.js).
// Everything sampled sits in the first ~520 px, so a phone viewport holds it in one screenshot.
const $ = (selector) => {
  const found = document.querySelector(selector);
  if (!found) throw new Error(`no element ${selector}`);
  return found;
};
const box = (el) => el.getBoundingClientRect();

function runPaint() {
  const { check, meta } = window.nzFloor;
  meta.devicePixelRatio = devicePixelRatio;
  meta.paintProbes = [];
  if (new URLSearchParams(location.search).has('calibrate')) {
    const marker = document.createElement('i');
    marker.style.cssText =
      'position:absolute;inset-block-start:0;inset-inline-start:0;inline-size:8px;block-size:8px;background:rgb(0 255 0)';
    document.body.append(marker);
    const rect = marker.getBoundingClientRect();
    meta.calibration = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  const probe = (group, id, expected, x, y) =>
    meta.paintProbes.push({ group: `painted | ${group}`, id, expected, x, y });

  // ProgressBar and Meter at 30%: the fill starts at the inline start, so RTL fills from the right.
  for (const [id, selector] of [
    ['pb', '.nz-progress-bar-track'],
    ['meter', '.nz-meter-track'],
  ]) {
    for (const dir of ['ltr', 'rtl']) {
      const r = box($(`#${id}-${dir} ${selector}`));
      const y = r.top + r.height / 2;
      const [left, right] = dir === 'ltr' ? ['L', 'D'] : ['D', 'L'];
      probe(id, `${dir}-15%`, left, r.left + r.width * 0.15, y);
      probe(id, `${dir}-85%`, right, r.left + r.width * 0.85, y);
    }
  }

  // ProgressRing at 25%: the arc runs clockwise from 12 o'clock (pathLength 100, rotate(-90)).
  const ring = box($('#ring svg'));
  const radius = (32.4 / 72) * ring.width;
  const at = (degrees) => {
    const a = (degrees * Math.PI) / 180;
    return [
      ring.left + ring.width / 2 + radius * Math.sin(a),
      ring.top + ring.height / 2 - radius * Math.cos(a),
    ];
  };
  for (const [degrees, expected] of [
    [45, 'L'],
    [135, 'D'],
    [225, 'D'],
    [315, 'D'],
  ]) {
    probe('progress-ring', `${degrees}deg`, expected, ...at(degrees));
  }

  // Skeleton circle on a blue bed: red in the middle, blue in the box's corner outside the circle.
  const skeleton = box($('#sk'));
  probe(
    'skeleton',
    'centre',
    'L',
    skeleton.left + skeleton.width / 2,
    skeleton.top + skeleton.height / 2,
  );
  probe('skeleton', 'corner', 'D', skeleton.left + 3, skeleton.top + 3);

  // Tabs and TabNav: the selected (current) one has the red 2 px indicator on its bottom edge; the strip
  // behind the others is blue. The middle one is selected, so both ends are unselected.
  for (const [group, selector] of [
    ['tabs', '#tabs-paint .nz-tabs-tab'],
    ['tab-nav', '#tabnav-paint .nz-tab-nav-link'],
  ]) {
    const items = [...document.querySelectorAll(selector)];
    for (const [index, el] of items.entries()) {
      const r = box(el);
      probe(
        group,
        `indicator-${index}`,
        index === 1 ? 'L' : 'D',
        r.left + r.width / 2,
        r.bottom - 1,
      );
    }
  }

  // SegmentedControl: the checked item is the red thumb, painted by :has(> input:checked).
  for (const [index, el] of [
    ...document.querySelectorAll('#seg-paint .nz-segmented-control-item'),
  ].entries()) {
    const r = box(el);
    probe('segmented', `item-${index}`, index === 1 ? 'L' : 'D', r.left + 4, r.top + r.height / 2);
  }

  // Switch, on: the red thumb sits at the inline end, the blue track shows at the start.
  for (const dir of ['ltr', 'rtl']) {
    const track = box($(`#switch-${dir} .nz-switch-input`));
    const thumb = box($(`#switch-${dir} .nz-switch-thumb`));
    const y = track.top + track.height / 2;
    probe(
      'switch',
      `${dir}-thumb`,
      'L',
      thumb.left + thumb.width / 2,
      thumb.top + thumb.height / 2,
    );
    probe('switch', `${dir}-track-start`, 'D', dir === 'ltr' ? track.left + 6 : track.right - 6, y);
  }

  // The hooks reached the computed style (a missing stylesheet would leave the track unpainted).
  const blue = getComputedStyle($('#pb-ltr .nz-progress-bar-track')).backgroundColor;
  check(
    'setup',
    'track-hook',
    blue === 'rgb(0, 0, 255)',
    blue,
    'rgb(0, 0, 255)',
    '--nz-progress-bar-track-bg',
  );
  const lowest = Math.max(...meta.paintProbes.map((p) => p.y));
  check(
    'setup',
    'probes-in-viewport',
    lowest < innerHeight,
    Math.round(lowest),
    `< ${innerHeight}`,
    'one screenshot holds every probe',
  );
  meta.probeCount = meta.paintProbes.length;
}

try {
  runPaint();
  window.nzFloor.finish('w5-paint');
} catch (error) {
  window.nzFloor.finish('w5-paint', error);
}
