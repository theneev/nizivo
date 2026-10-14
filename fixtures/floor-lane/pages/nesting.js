// Port of spike S1 (matrix.mjs and matrix-varinside.mjs): the native rows only. The Lightning CSS
// lowered and @property rows are left out because the plan bans both shapes (§7.4, S1b, S1c).
// Every variant is applied in place (the <style id="variant"> text and <html data-theme>), so one page
// load covers the whole matrix for the browser's current OS colour scheme.

const tokenForms = {
  literal: '--nz-bg-surface: light-dark(#ffffff, #181b19);',
  'var-inside':
    '--nz-p-neutral-0: #ffffff; --nz-p-neutral-900: #181b19;' +
    ' --nz-bg-surface: light-dark(var(--nz-p-neutral-0), var(--nz-p-neutral-900));',
};
const rootForms = {
  'light dark': 'color-scheme: light dark;',
  unset: '',
  normal: 'color-scheme: normal;',
};
const scopeRules = `
  [data-theme="dark"] { color-scheme: dark; }
  [data-theme="light"] { color-scheme: light; }
  [data-theme="normal"] { color-scheme: normal; }
  .probe { background-color: var(--nz-bg-surface); }
  .direct { background-color: light-dark(#ffffff, #181b19); }`;
const htmlThemes = ['none', 'dark', 'light'];

// The color-scheme values between <html> and each probe, outermost first.
const probeScopes = {
  root: [],
  'direct-root': [],
  d1: ['dark'],
  'direct-d1': ['dark'],
  'd1-l2': ['dark', 'light'],
  'direct-d1-l2': ['dark', 'light'],
  'd1-l2-d3': ['dark', 'light', 'dark'],
  'd1-normal': ['dark', 'normal'],
  'direct-d1-normal': ['dark', 'normal'],
};

// The plan's claim (§7.4, S1): the nearest declared color-scheme wins; "light dark" follows the OS;
// "normal", and no declaration at all, resolve to light even when the OS is dark.
function expectedScheme(scopeChain, os) {
  const nearest = scopeChain.findLast((s) => s !== 'unset');
  if (nearest === 'dark') return 'D';
  if (nearest === 'light dark') return os === 'dark' ? 'D' : 'L';
  return 'L';
}

function shortColour(value) {
  if (value === 'rgb(255, 255, 255)') return 'L';
  if (value === 'rgb(24, 27, 25)') return 'D';
  if (value === 'rgba(0, 0, 0, 0)') return 'T';
  return value;
}

function runNesting() {
  const { check } = window.nzFloor;
  const os = window.nzFloor.osScheme();
  const html = document.documentElement;
  const variant = document.getElementById('variant');
  for (const [formName, tokens] of Object.entries(tokenForms)) {
    for (const [rootName, rootDecl] of Object.entries(rootForms)) {
      for (const theme of htmlThemes) {
        variant.textContent = `:root { ${tokens} ${rootDecl} }${scopeRules}`;
        if (theme === 'none') html.removeAttribute('data-theme');
        else html.setAttribute('data-theme', theme);
        const rootScheme = theme === 'none' ? rootName : theme;
        const group = `${formName} | root=${rootName} | html=${theme}`;
        for (const [id, chain] of Object.entries(probeScopes)) {
          const observed = shortColour(
            getComputedStyle(document.getElementById(id)).backgroundColor,
          );
          const expected = expectedScheme([rootScheme, ...chain], os);
          check(group, id, observed === expected, observed, expected);
        }
      }
    }
  }
  html.removeAttribute('data-theme');
  variant.textContent = '';
}

try {
  runNesting();
  window.nzFloor.finish('nesting');
} catch (error) {
  window.nzFloor.finish('nesting', error);
}
