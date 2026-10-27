// Page 12's CSS motion parts in a browser (ARCHITECTURE.md §21.4a, D-dq): each loop runs, and stops
// under data-nz-motion="reduce"; the Ticker's second set is hidden and it pauses under focus; the
// caret and the dot are hidden from assistive technology; the WordRotator turns its words and a
// screen reader gets all of them once.
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CaretHeadline } from '../../src/unstable/caret-headline/caret-headline';
import { LivePulse } from '../../src/unstable/live-pulse/live-pulse';
import { Ticker } from '../../src/unstable/ticker/ticker';
import { WordRotator } from '../../src/unstable/word-rotator/word-rotator.client';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/unstable/ticker/ticker.css',
    '../../src/unstable/caret-headline/caret-headline.css',
    '../../src/unstable/live-pulse/live-pulse.css',
    '../../src/unstable/word-rotator/word-rotator.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 6)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-nz-motion');
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

function animation(element: Element | null, pseudo?: string): string {
  if (element === null) throw new Error('no element');
  return getComputedStyle(element, pseudo).animationName;
}

describe('the CSS loops', () => {
  test('run, then stop under data-nz-motion="reduce"', async () => {
    const container = await hydrate(
      <>
        <Ticker items={['A', 'B']} />
        <CaretHeadline>Build</CaretHeadline>
        <LivePulse>Live</LivePulse>
      </>,
    );
    const track = container.querySelector('.nz-ticker-track');
    const caret = container.querySelector('.nz-caret-headline-caret');
    const dot = container.querySelector('.nz-live-pulse-dot');
    expect(animation(track)).toBe('nz-ticker-slide');
    expect(animation(caret)).toBe('nz-caret-headline-blink');
    expect(animation(dot, '::after')).toBe('nz-live-pulse-ring');
    document.documentElement.setAttribute('data-nz-motion', 'reduce');
    expect(animation(track)).toBe('none');
    expect(animation(caret)).toBe('none');
    expect(animation(dot, '::after')).toBe('none');
  });

  test('the Ticker reads each item once and pauses while focus is inside it', async () => {
    const container = await hydrate(
      <Ticker
        items={[
          <a key="a" href="#a">
            A
          </a>,
          'B',
        ]}
      />,
    );
    const [shown, copy] = [...container.querySelectorAll('.nz-ticker-set')];
    expect(shown?.hasAttribute('aria-hidden')).toBe(false);
    expect(copy?.getAttribute('aria-hidden')).toBe('true');
    const track = container.querySelector('.nz-ticker-track');
    if (track === null) throw new Error('no track');
    expect(getComputedStyle(track).animationPlayState).toBe('running');
    container.querySelector('a')?.focus();
    expect(getComputedStyle(track).animationPlayState).toBe('paused');
  });

  test('the caret and the dot are hidden; the heading and the words are not', async () => {
    const container = await hydrate(
      <>
        <CaretHeadline level={2}>Build</CaretHeadline>
        <LivePulse>Live</LivePulse>
      </>,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Build');
    expect(container.querySelector('.nz-caret-headline-caret')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(container.querySelector('.nz-live-pulse')?.textContent).toBe('Live');
  });
});

describe('WordRotator', () => {
  test('turns its words; a screen reader gets the list once', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);
    root.render(<WordRotator words={['dashboards', 'commerce', 'websites']} />);
    await vi.waitFor(() =>
      expect(container.querySelector('.nz-word-rotator-words')).not.toBeNull(),
    );
    expect(container.querySelector('.nz-visually-hidden')?.textContent).toBe(
      'dashboards, commerce, and websites',
    );
    expect(container.querySelector('.nz-word-rotator-window')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    const words = container.querySelector<HTMLElement>('.nz-word-rotator-words');
    const index = (): string => words?.style.getPropertyValue('--_nz-word-rotator-index') ?? '';
    expect(index()).toBe('0');
    vi.advanceTimersByTime(2250);
    await vi.waitFor(() => expect(index()).toBe('1'));
  });

  test('stays on the first word under Reduced motion', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    document.documentElement.setAttribute('data-nz-motion', 'reduce');
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);
    root.render(<WordRotator words={['dashboards', 'commerce']} />);
    await vi.waitFor(() =>
      expect(container.querySelector('.nz-word-rotator-words')).not.toBeNull(),
    );
    vi.advanceTimersByTime(5000);
    await Promise.resolve();
    const words = container.querySelector<HTMLElement>('.nz-word-rotator-words');
    expect(words?.style.getPropertyValue('--_nz-word-rotator-index')).toBe('0');
  });
});
