// Shared by every floor-lane page. A classic script (no modules, no fetch) so the pages also work when
// opened straight from disk in any browser, including a real Safari 17.5 that no runner can drive.
// Each page records checks, then calls finish(): the result is rendered as a table and written as JSON
// into <pre id="result">, and <html data-done> tells a runner it can read it.
// Page scripts use the window.nzFloor API defined at the bottom.

const checks = [];
const meta = {};

function osScheme() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ok: true (pass), false (fail) or null (informational: the plan makes no claim).
function check(group, id, ok, observed, expected = null, note = null) {
  checks.push({
    group,
    id,
    status: ok === null ? 'info' : ok ? 'pass' : 'fail',
    observed,
    expected,
    note,
  });
}

function element(tag, content, className) {
  const node = document.createElement(tag);
  node.textContent = content;
  if (className) node.className = className;
  return node;
}

function cellText(value) {
  return value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
}

function render(result) {
  const report = document.getElementById('report');
  const { pass, fail, info } = result.summary;
  const verdict = fail === 0 ? 'PASS' : 'FAIL';
  const line = `${verdict}  pass ${pass}  fail ${fail}  info ${info}  (OS scheme ${result.osScheme})`;
  report.append(
    element('p', line, `nzf-verdict nzf-${verdict.toLowerCase()}`),
    element('p', result.userAgent, 'nzf-ua'),
  );
  const table = document.createElement('table');
  const head = table.createTHead().insertRow();
  for (const h of ['group', 'check', 'status', 'observed', 'expected', 'note'])
    head.append(element('th', h));
  const body = table.createTBody();
  for (const c of result.checks) {
    const row = body.insertRow();
    row.className = `nzf-${c.status}`;
    for (const v of [c.group, c.id, c.status, c.observed, c.expected, c.note])
      row.append(element('td', cellText(v)));
  }
  report.append(table);
}

// Records an uncaught page-script error as a failed check, so a broken page never reads as a pass.
function finish(page, error) {
  if (error !== undefined)
    check('harness', 'page-script', false, String(error?.stack ?? error), 'no exception');
  const summary = { pass: 0, fail: 0, info: 0 };
  for (const c of checks) summary[c.status] += 1;
  const result = {
    page,
    userAgent: navigator.userAgent,
    osScheme: osScheme(),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    meta,
    summary,
    checks,
  };
  render(result);
  const json = JSON.stringify(result);
  document.getElementById('result').textContent = json;
  document.documentElement.setAttribute('data-done', '');
  // Manual runs (pages opened from index.html served by run.ts --serve) hand the result to the runner.
  if (location.protocol === 'http:' && new URLSearchParams(location.search).has('report')) {
    fetch('/result', { method: 'POST', body: json }).catch(() => undefined);
  }
}

window.nzFloor = { check, finish, meta, osScheme };
