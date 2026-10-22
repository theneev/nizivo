// Banner in a real engine (ARCHITECTURE.md §9.5 "split"; Figma Banner 7275:15120): the server HTML
// hydrates unchanged, the default BannerDismiss is a 40 px tertiary IconButton that dismisses on a
// click, the row keeps Figma's 16 / 24 padding and 20 px gaps, and with little room the action wraps
// under the text while the dismiss stays last.
import type { ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Banner, BannerDismiss } from '../../src/banner/index';
import { Button } from '../../src/button/index';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/icon-button/icon-button.css',
    '../../src/banner/banner.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 5)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

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
async function hydrate(app: ReactNode, width: number): Promise<{ problems: unknown[] }> {
  const container = document.createElement('div');
  container.style.inlineSize = `${width}px`;
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(
    hydrateRoot(container, app, {
      onRecoverableError: (error: unknown) => problems.push(error),
    }),
  );
  await settle();
  return { problems };
}

const get = (slot: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
  if (found === null) throw new Error(`no ${slot}`);
  return found;
};

function warning(onDismiss?: () => void): ReactNode {
  return (
    <Banner
      tone="warning"
      icon={<svg viewBox="0 0 24 24" />}
      title="Your plan renews in 3 days"
      action={<Button>Update card</Button>}
      dismiss={<BannerDismiss {...(onDismiss && { onDismiss })} />}
    >
      Update the card on file to avoid interruption.
    </Banner>
  );
}

describe('Banner', () => {
  test('hydrates unchanged, has no live role, and dismisses on a click', async () => {
    const onDismiss = vi.fn<() => void>();
    const { problems } = await hydrate(warning(onDismiss), 980);
    expect(problems).toEqual([]);
    const banner = get('banner');
    expect(banner.getAttribute('role')).toBeNull();
    expect(banner.getAttribute('data-tone')).toBe('warning');
    const dismiss = get('banner-dismiss');
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss');
    expect(dismiss.getBoundingClientRect().height).toBe(40);
    await userEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  test('Figma’s row: 16 / 24 padding, 20 px gaps, one line of parts at 980 px', async () => {
    await hydrate(warning(), 980);
    const banner = getComputedStyle(get('banner'));
    expect(banner.paddingTop).toBe('16px');
    expect(banner.paddingInlineStart).toBe('24px');
    expect(banner.columnGap).toBe('20px');
    const tops = ['banner-icon', 'banner-content', 'banner-action', 'banner-dismiss'].map(
      (slot) => {
        const box = get(slot).getBoundingClientRect();
        return Math.round(box.top + box.height / 2);
      },
    );
    // everything centred on one row
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  });

  test('with little room the action wraps under the text and the dismiss stays last', async () => {
    await hydrate(warning(), 360);
    const content = get('banner-content').getBoundingClientRect();
    const action = get('banner-action').getBoundingClientRect();
    const dismiss = get('banner-dismiss').getBoundingClientRect();
    expect(action.top).toBeGreaterThanOrEqual(content.bottom);
    expect(dismiss.right).toBeLessThanOrEqual(get('banner').getBoundingClientRect().right - 23);
    expect(dismiss.left).toBeGreaterThan(action.right);
  });

  test('media takes the lead slot at 72 px; without it, the icon does', async () => {
    await hydrate(
      <Banner media={<img alt="" width={72} height={72} />} title="Open a second storefront">
        Sell in EUR and GBP.
      </Banner>,
      980,
    );
    const media = get('banner-media');
    expect(media.getAttribute('aria-hidden')).toBe('true');
    expect(media.getBoundingClientRect().width).toBe(72);
    expect(document.querySelector('[data-slot="banner-icon"]')).toBeNull();
  });
});
