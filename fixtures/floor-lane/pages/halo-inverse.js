// Port of docs/research/phase2/scripts/probe/probe.mjs, widened to the full §7.4 scope set: the opt-in
// default (no attribute), light, dark, system, nested themes and inverse surfaces, under each <html>
// theme. Computed colours serialise differently per engine (color-mix() in particular), so each probe is
// compared with reference elements styled with the literal light and dark values in the same engine.

const probes = {
  bg: {
    prop: 'backgroundColor',
    css: 'background-color',
    light: 'var(--nz-p-neutral-0)',
    dark: 'var(--nz-p-neutral-900)',
  },
  text: {
    prop: 'color',
    css: 'color',
    light: 'var(--nz-p-neutral-900)',
    dark: 'var(--nz-p-neutral-50)',
  },
  border: {
    prop: 'borderTopColor',
    css: 'border-block-start',
    light: '2px solid var(--nz-p-green-500)',
    dark: '2px solid var(--nz-p-green-300)',
  },
  halo: {
    prop: 'backgroundColor',
    css: 'background-color',
    light: 'color-mix(in oklab, var(--nz-p-green-500) 28%, transparent)',
    dark: 'color-mix(in oklab, var(--nz-p-green-300) 28%, transparent)',
  },
  'halo-direct': {
    prop: 'backgroundColor',
    css: 'background-color',
    light: 'color-mix(in oklab, var(--nz-p-green-500) 28%, transparent)',
    dark: 'color-mix(in oklab, var(--nz-p-green-300) 28%, transparent)',
  },
  shadow: {
    prop: 'boxShadow',
    css: 'box-shadow',
    light:
      '0 0 0 1px transparent, 0 1px 2px 0 rgb(16 19 17 / 0.04), 0 1px 1px 0 rgb(16 19 17 / 0.03)',
    dark: '0 0 0 1px rgb(255 255 255 / 0.08), 0 1px 2px 0 rgb(0 0 0 / 0.24), 0 1px 1px 0 rgb(0 0 0 / 0.18)',
  },
  'shadow-direct': {
    prop: 'boxShadow',
    css: 'box-shadow',
    light: '0 1px 2px 0 rgb(16 19 17 / 0.04)',
    dark: '0 1px 2px 0 rgb(0 0 0 / 0.24)',
  },
  scrim: {
    prop: 'backgroundColor',
    css: 'background-color',
    light: 'rgb(24 27 25 / 0.32)',
    dark: 'rgb(0 0 0 / 0.6)',
  },
};

function opposite(scheme) {
  return scheme === 'L' ? 'D' : 'L';
}

// Expected scheme per group under an <html> theme, per the §7.5 scope rules.
function expectedGroups(theme, os) {
  const osLetter = os === 'dark' ? 'D' : 'L';
  const root = theme === 'dark' ? 'D' : theme === 'system' ? osLetter : 'L';
  return {
    'g-root': root,
    'g-root-inv': opposite(root),
    'g-light': 'L',
    'g-light-inv': 'D',
    'g-dark': 'D',
    'g-dark-inv': 'L',
    'g-system': osLetter,
    'g-system-inv': opposite(osLetter),
    'g-dark-light': 'L',
    'g-dark-light-inv': 'D',
    'g-light-system': osLetter,
    'g-light-system-inv': opposite(osLetter),
    // The plan does not say what an inverse surface inside another inverse surface does.
    'g-dark-inv-inv': null,
  };
}

function buildProbes() {
  const refs = {};
  const refRoot = document.getElementById('refs');
  for (const [name, p] of Object.entries(probes)) {
    refs[name] = {};
    for (const scheme of ['light', 'dark']) {
      const ref = document.createElement('div');
      ref.className = 'nzf-ref';
      ref.style.setProperty(p.css, p[scheme]);
      refRoot.append(ref);
      refs[name][scheme] = getComputedStyle(ref)[p.prop];
    }
  }
  for (const group of document.querySelectorAll('.nzf-group')) {
    for (const name of Object.keys(probes)) {
      const probe = document.createElement('div');
      probe.className = `p-${name}`;
      probe.dataset.probe = name;
      group.append(probe);
    }
  }
  return refs;
}

function runHaloInverse() {
  const { check } = window.nzFloor;
  const os = window.nzFloor.osScheme();
  const html = document.documentElement;
  const refs = buildProbes();
  window.nzFloor.meta.references = refs;

  for (const [name, r] of Object.entries(refs)) {
    check(
      'references',
      `${name} light differs from dark`,
      r.light !== r.dark,
      r.light,
      `not ${r.dark}`,
    );
  }
  const supports = {
    'light-dark() in a colour': ['color', 'light-dark(#fff, #000)'],
    'light-dark() inside color-mix()': [
      'background-color',
      'color-mix(in oklab, light-dark(#fff, #000) 28%, transparent)',
    ],
    'light-dark() inside box-shadow': ['box-shadow', '0 1px 2px 0 light-dark(#fff, #000)'],
  };
  for (const [id, [prop, value]] of Object.entries(supports)) {
    const ok = CSS.supports(prop, value);
    check('CSS.supports', id, ok, ok, true);
  }

  for (const theme of ['none', 'light', 'dark', 'system']) {
    if (theme === 'none') html.removeAttribute('data-nz-theme');
    else html.setAttribute('data-nz-theme', theme);
    const expected = expectedGroups(theme, os);
    for (const [groupId, want] of Object.entries(expected)) {
      for (const probe of document.getElementById(groupId).children) {
        const name = probe.dataset.probe;
        const value = getComputedStyle(probe)[probes[name].prop];
        const got = value === refs[name].light ? 'L' : value === refs[name].dark ? 'D' : value;
        const group = `html=${theme} | ${groupId}`;
        if (want === null)
          check(group, name, null, got, null, 'plan is silent on inverse inside inverse');
        else check(group, name, got === want, got, want);
      }
    }
  }
  html.removeAttribute('data-nz-theme');
}

try {
  runHaloInverse();
  window.nzFloor.finish('halo-inverse');
} catch (error) {
  window.nzFloor.finish('halo-inverse', error);
}
