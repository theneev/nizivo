// CSP Profile B (ARCHITECTURE.md §19.3: `style-src-attr 'none'`) with the ChartInteraction island:
// the server HTML has no style attribute, and the island places its crosshair, dots and card through
// CSSOM (React's `style` prop on the client is `element.style`, not the attribute), which the policy
// does not block. This file sets the policy for its whole page, so it is a file of its own.
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { AreaChart } from '../../src/area-chart/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const sheet = document.createElement('style');
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe { inline-size: 764px; padding: 24px; }`;
document.head.append(sheet);

// Profile B's style rule, enforced from here on (a policy delivered by <meta> applies once inserted)
const policy = document.createElement('meta');
policy.httpEquiv = 'Content-Security-Policy';
policy.content = "style-src-attr 'none'";
document.head.append(policy);

const violations: string[] = [];
document.addEventListener('securitypolicyviolation', (event) => {
  violations.push(`${event.violatedDirective} ${event.sample}`);
});

const DAYS = Array.from({ length: 10 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  current: 1000 + i * 100,
}));

test('the policy is in force: a style attribute is ignored', async () => {
  const probe = document.createElement('div');
  probe.setAttribute('style', 'inline-size: 7px');
  document.body.append(probe);
  expect(probe.getBoundingClientRect().width).not.toBe(7);
  // a CSSOM write is not an attribute: it applies
  probe.style.inlineSize = '9px';
  expect(probe.getBoundingClientRect().width).toBe(9);
  probe.remove();
  await new Promise((done) => setTimeout(done, 50));
  expect(violations.length).toBeGreaterThan(0);
});

test('under it, the island hydrates and places the crosshair and the card', async () => {
  violations.length = 0;
  const app = <AreaChart title="Sales" data={DAYS} x="date" y="current" />;
  const before = document.createElement('input');
  before.setAttribute('aria-label', 'Before');
  const container = document.createElement('div');
  container.className = 'probe';
  container.innerHTML = renderToString(app);
  document.body.append(before, container);
  expect(container.querySelector('[style]')).toBeNull();
  await act(async () => {
    hydrateRoot(container, app);
  });
  before.focus();
  await userEvent.tab();
  await userEvent.keyboard('{Home}');
  const layer = container.querySelector('.nz-chart-interaction');
  const column = container.querySelector('.nz-chart-interaction-point');
  if (layer === null || column === null) throw new Error('nothing shown');
  const plot = layer.getBoundingClientRect();
  const line = column.getBoundingClientRect();
  // the first point, at the plot's left edge: placed, not left at the layer's static position
  expect(line.left + line.width / 2).toBeCloseTo(plot.left, 0);
  await userEvent.keyboard('{End}');
  const end = container.querySelector('.nz-chart-interaction-point')?.getBoundingClientRect();
  expect((end?.left ?? 0) + (end?.width ?? 0) / 2).toBeCloseTo(plot.right, 0);
  const dot = container.querySelector('.nz-chart-interaction-dot')?.getBoundingClientRect();
  // the dot's top was written too: the last value is the highest, at the plot's top part
  expect(dot?.top ?? 0).toBeLessThan(plot.top + plot.height / 2);
  // and the card sits beside it, inside the plot
  const card = container.querySelector('.nz-chart-interaction-tip')?.getBoundingClientRect();
  expect(card?.right ?? 0).toBeLessThan(end?.left ?? 0);
  expect(card?.left ?? 0).toBeGreaterThanOrEqual(plot.left);
  await new Promise((done) => setTimeout(done, 50));
  expect(violations).toEqual([]);
});
