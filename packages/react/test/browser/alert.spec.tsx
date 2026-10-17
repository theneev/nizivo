// Alert's dismiss in a real engine (ARCHITECTURE.md §9.5 "split", M28): the default AlertDismiss is a
// tertiary sm IconButton with no tooltip. The server HTML hydrates unchanged, a click dismisses, and
// the 32 px target sits in the dismiss slot without growing the row: the 16 px glyph lands where
// Figma draws it, on the title's line, 12 px after the text and at the padding edge, in either
// writing direction and whichever of alert.css and icon-button.css loads first.
import type { ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Alert, AlertDismiss } from '../../src/alert/index';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/alert/alert.css',
    '../../src/icon-button/icon-button.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 4)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const sheet = (name: string): string =>
  Object.entries(STYLES).find(([path]) => path.endsWith(name))?.[1] ?? '';
const style = document.createElement('style');
document.head.append(style);

/** Loads the stylesheets with alert.css before or after icon-button.css. */
function load(order: 'alert-first' | 'icon-button-first'): void {
  const pair =
    order === 'alert-first'
      ? [sheet('alert.css'), sheet('icon-button.css')]
      : [sheet('icon-button.css'), sheet('alert.css')];
  style.textContent = [sheet('tokens.css'), sheet('base.css'), ...pair].join('\n');
}

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Server HTML in the document, then hydration; collects every hydration problem. */
async function hydrate(app: ReactNode, dir?: 'rtl'): Promise<{ problems: unknown[] }> {
  const container = document.createElement('div');
  if (dir) container.dir = dir;
  // a fixed width, so the text wraps the same in every engine
  container.style.inlineSize = '480px';
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(
    hydrateRoot(container, app, {
      onRecoverableError: (error) => problems.push(error),
    }),
  );
  await settle();
  return { problems };
}

function alertWith(dismiss: ReactNode): ReactNode {
  return (
    <Alert tone="critical" title="Payment failed for order #1040" dismiss={dismiss}>
      Card was declined.
    </Alert>
  );
}

function element(selector: string): HTMLElement {
  const found = document.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${selector}`);
  return found;
}

function rect(selector: string): DOMRect {
  return element(selector).getBoundingClientRect();
}

describe('AlertDismiss is an IconButton', () => {
  test('the server HTML hydrates unchanged, and a click calls onDismiss with no arguments', async () => {
    load('alert-first');
    const onDismiss = vi.fn<() => void>();
    const { problems } = await hydrate(alertWith(<AlertDismiss onDismiss={onDismiss} />));
    expect(problems).toEqual([]);
    const button = element('.nz-alert-dismiss');
    expect(button.matches('.nz-icon-button[data-variant="tertiary"][data-size="sm"]')).toBe(true);
    // no tooltip: nothing describes the button, and no popup is mounted on focus or hover
    button.focus();
    await userEvent.hover(button);
    // longer than IconButton's 400 ms default tooltip delay: a tooltip that would open has opened
    await settle(500);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    await userEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith();
    // the pointer leaves, so the next case's button is not hovered
    await userEvent.unhover(button);
  });

  for (const order of ['alert-first', 'icon-button-first'] as const) {
    for (const dir of [undefined, 'rtl'] as const) {
      test(`geometry and colour (${order}${dir ? ', rtl' : ''})`, async () => {
        load(order);
        await hydrate(
          <>
            <div id="with">{alertWith(<AlertDismiss />)}</div>
            <div id="without">{alertWith(undefined)}</div>
          </>,
          dir,
        );
        const button = rect('#with .nz-alert-dismiss');
        const glyph = rect('#with .nz-alert-dismiss .nz-icon-button-icon');
        const alert = rect('#with .nz-alert');
        const title = rect('#with .nz-alert-title');
        const content = rect('#with .nz-alert-content');
        // IconButton sm: a 32 px square around a 16 px glyph
        expect([button.width, button.height]).toEqual([32, 32]);
        expect([glyph.width, glyph.height]).toEqual([16, 16]);
        // the row does not grow: the alert is as tall as one without a dismiss
        expect(alert.height).toBeCloseTo(rect('#without .nz-alert').height, 1);
        // the glyph is centred on the title's first line
        expect(glyph.top + glyph.height / 2).toBeCloseTo(title.top + 10, 1);
        // 16 px from the inline-end edge (the padding), 12 px after the text (the gap)
        const rtl = dir === 'rtl';
        expect(rtl ? glyph.left - alert.left : alert.right - glyph.right).toBeCloseTo(16, 1);
        expect(rtl ? content.left - glyph.right : glyph.left - content.right).toBeCloseTo(12, 1);
        // the target stays inside the alert
        expect(button.top).toBeGreaterThanOrEqual(alert.top);
        expect(button.right).toBeLessThanOrEqual(alert.right);
        expect(button.left).toBeGreaterThanOrEqual(alert.left);
        // Figma's icon/secondary glyph, through the IconButton's private
        const probe = document.createElement('span');
        probe.style.color = 'var(--nz-icon-secondary)';
        document.body.append(probe);
        const dismiss = getComputedStyle(element('#with .nz-alert-dismiss'));
        expect(dismiss.color).toBe(getComputedStyle(probe).color);
        // a tertiary IconButton: no fill at rest
        expect(dismiss.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      });
    }
  }

  test('the --nz-alert-dismiss-fg hook recolours the glyph', async () => {
    load('icon-button-first');
    await hydrate(
      <div style={{ ['--nz-alert-dismiss-fg' as string]: 'rgb(1, 2, 3)' }}>
        {alertWith(<AlertDismiss />)}
      </div>,
    );
    expect(getComputedStyle(element('.nz-alert-dismiss')).color).toBe('rgb(1, 2, 3)');
  });
});
