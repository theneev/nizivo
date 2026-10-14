// Computed versus painted light-dark(), with a static layout (nothing toggled after load). Each square
// uses light-dark() either through a custom property (the plan's token shape) or directly on the
// property. The page checks computed values against same-engine references; the runner then samples
// the painted pixels at meta.paintProbes from a screenshot. By hand: red squares are light, blue are dark.

const paintProbes = {
  'bg-var': ['background-color', 'backgroundColor', (c) => c],
  'bg-direct': ['background-color', 'backgroundColor', (c) => c],
  'bg-mix-direct': [
    'background-color',
    'backgroundColor',
    (c) => `color-mix(in srgb, ${c} 100%, transparent)`,
  ],
  'bg-direct-var-args': ['background-color', 'backgroundColor', (c) => c],
  // Same declaration as bg-direct, but as an inline style, so no two squares share a rule.
  'bg-direct-inline': ['background-color', 'backgroundColor', (c) => c],
  'text-direct': ['color', 'color', (c) => c],
  'shadow-var': ['box-shadow', 'boxShadow', (c) => `inset 0 0 0 14px ${c}`],
  'shadow-direct': ['box-shadow', 'boxShadow', (c) => `inset 0 0 0 14px ${c}`],
};
const paintColours = { L: 'rgb(255 0 0)', D: 'rgb(0 0 255)' };

function expectedLetter(chain, os) {
  const nearest = chain.findLast((s) => s !== '' && s !== 'none');
  if (nearest === 'dark') return 'D';
  if (nearest === 'system') return os === 'dark' ? 'D' : 'L';
  return 'L';
}

function paintReferences() {
  const refs = {};
  for (const [name, [css, prop, wrap]] of Object.entries(paintProbes)) {
    refs[name] = {};
    for (const [letter, colour] of Object.entries(paintColours)) {
      const ref = document.createElement('div');
      ref.style.setProperty(css, wrap(colour));
      document.body.append(ref);
      refs[name][letter] = getComputedStyle(ref)[prop];
      ref.remove();
    }
  }
  return refs;
}

function runPaint() {
  const { check, meta } = window.nzFloor;
  const os = window.nzFloor.osScheme();
  const htmlTheme = document.documentElement.getAttribute('data-theme') ?? 'none';
  const refs = paintReferences();
  meta.htmlTheme = htmlTheme;
  meta.devicePixelRatio = devicePixelRatio;
  meta.paintProbes = [];
  for (const row of document.querySelectorAll('.nzf-row')) {
    const scopes = row.dataset.scopes;
    const expected = expectedLetter([htmlTheme, ...scopes.split(' ')], os);
    const label = document.createElement('span');
    label.textContent = `${scopes || '(root)'}: ${expected === 'L' ? 'red' : 'blue'}`;
    row.append(label);
    for (const name of Object.keys(paintProbes)) {
      const square = document.createElement('div');
      square.className = name;
      if (name === 'bg-direct-inline') {
        square.style.setProperty('background-color', 'light-dark(rgb(255 0 0), rgb(0 0 255))');
      }
      row.append(square);
    }
  }
  for (const row of document.querySelectorAll('.nzf-row')) {
    const scopes = row.dataset.scopes || '(root)';
    const expected = expectedLetter([htmlTheme, ...row.dataset.scopes.split(' ')], os);
    const group = `html=${htmlTheme} | ${scopes}`;
    for (const square of row.querySelectorAll('div')) {
      const name = square.className;
      const value = getComputedStyle(square)[paintProbes[name][1]];
      const got = value === refs[name].L ? 'L' : value === refs[name].D ? 'D' : value;
      check(`computed | ${group}`, name, got === expected, got, expected);
      const rect = square.getBoundingClientRect();
      meta.paintProbes.push({
        group: `painted | ${group}`,
        id: name,
        expected,
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      });
    }
  }
}

try {
  runPaint();
  window.nzFloor.finish('paint');
} catch (error) {
  window.nzFloor.finish('paint', error);
}
