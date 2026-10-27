// Link, DocsCard, CopyButton and CodeBlock in a browser (ARCHITECTURE.md §21.4a, D-do): an external
// link's tab and words, a card as one link named by its title, a copy announced and undone after
// 2 seconds, and versions as tabs whose Copy copies the shown one, the "$" left out.
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { CodeBlock } from '../../src/unstable/code-block/code-block.client';
import { CopyButton } from '../../src/unstable/copy-button/copy-button.client';
import { DocsCard } from '../../src/unstable/docs-card/docs-card';
import { Link } from '../../src/unstable/link/link';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/tabs/tabs.css',
    '../../src/unstable/link/link.css',
    '../../src/unstable/docs-card/docs-card.css',
    '../../src/unstable/copy-button/copy-button.css',
    '../../src/unstable/code-block/code-block.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 7)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

async function hydrate(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const before = container.innerHTML;
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  expect(container.innerHTML).toBe(before);
  expect(problems).toEqual([]);
  return container;
}

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

function clipboard(): string[] {
  const written: string[] = [];
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation((text: string) => {
    written.push(text);
    return Promise.resolve();
  });
  return written;
}

describe('Link and DocsCard', () => {
  test('an external link opens a new tab and says so', async () => {
    const container = await hydrate(
      <>
        <Link href="/orders">Orders</Link>
        <Link href="https://example.com" external>
          Help
        </Link>
      </>,
    );
    const [inside, outside] = [...container.querySelectorAll('a')];
    expect(inside?.hasAttribute('target')).toBe(false);
    expect(outside?.getAttribute('target')).toBe('_blank');
    expect(outside?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(outside?.textContent).toBe('Help (opens in a new tab)');
  });

  test('a docs card is one link, its title first', async () => {
    const container = await hydrate(
      <DocsCard href="/docs/" title="Components" description="Every control." meta="114" />,
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe('ComponentsEvery control.114');
  });
});

describe('CopyButton', () => {
  test('copies, says "Copied" and announces it, then goes back after 2 seconds', async () => {
    const written = clipboard();
    const container = await mount(<CopyButton value="npm i @nizivo/react" />);
    const button = container.querySelector('button');
    if (button === null) throw new Error('no button');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    button.click();
    await vi.waitFor(() => expect(written).toEqual(['npm i @nizivo/react']));
    await vi.waitFor(() => expect(button.getAttribute('data-variant')).toBe('copied'));
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('Copied');
    expect(button.querySelector('.nz-visually-hidden')?.textContent).toBe('Copy');
    vi.advanceTimersByTime(2000);
    await vi.waitFor(() => expect(button.getAttribute('data-variant')).toBe('idle'));
    expect(live?.textContent).toBe('');
  });
});

describe('CodeBlock', () => {
  test('versions are tabs; Copy copies the shown one, without the "$"', async () => {
    const written = clipboard();
    const container = await mount(
      <CodeBlock
        variant="command"
        items={[
          { label: 'npm', code: 'npm i x' },
          { label: 'pnpm', code: 'pnpm add x' },
        ]}
      />,
    );
    const tabs = [...container.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map((tab) => tab.querySelector('.nz-tabs-text')?.textContent)).toEqual([
      'npm',
      'pnpm',
    ]);
    expect(container.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Versions',
    );
    const pnpm = tabs[1];
    if (pnpm === undefined) throw new Error('no pnpm tab');
    await userEvent.click(pnpm);
    const copy = container.querySelector<HTMLButtonElement>('[data-slot="copy-button"]');
    copy?.click();
    await vi.waitFor(() => expect(written).toEqual(['pnpm add x']));
    const code = container.querySelector<HTMLElement>('[role="tabpanel"] pre');
    expect(code?.tabIndex).toBe(0);
    expect(code?.querySelector('code')?.textContent).toBe('pnpm add x');
  });
});
