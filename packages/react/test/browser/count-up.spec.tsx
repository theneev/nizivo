// CountUp in a real engine (ARCHITECTURE.md §13.2 rule 3, §13.3 "Count-up"; Figma 04 §5): when it
// counts (a client mount in view, a hydrated element's first entry into view, a new value in view)
// and when it does not (a hydrated element already in view, a new value off screen, reduced motion,
// either switch); that nothing moves while it counts (a sibling's position every frame, and Chromium's
// layout-shift entries); and that every final text, and the box, are NumberValue's.
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cdp, server } from 'vitest/browser';
import { CountUp } from '../../src/motion/count-up.client';
import { formatNumber, NumberValue } from '../../src/number-value/number-value';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/number-value/number-value.css',
    '../../src/motion/motion.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 4)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  scrollTo(0, 0);
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every text the digits show, in order, from now on (each write is a mutation). */
function record(container: HTMLElement): { texts: string[]; stop: () => void } {
  const texts: string[] = [];
  const observer = new MutationObserver(() => {
    const text = digits(container).textContent ?? '';
    if (texts.at(-1) !== text) texts.push(text);
  });
  observer.observe(container, { subtree: true, childList: true, characterData: true });
  return { texts, stop: () => observer.disconnect() };
}

/** Polls every frame until `done` holds, or fails after `ms`. */
async function until(done: () => boolean, ms = 5000): Promise<void> {
  const end = performance.now() + ms;
  while (!done()) {
    if (performance.now() > end) throw new Error('timed out');
    // oxlint-disable-next-line no-await-in-loop -- one frame after the other
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

function digits(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('[data-slot="count-up-value"]');
  if (element === null) throw new Error('no digits');
  return element;
}

function label(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>('.nz-count-up-label');
  if (element === null) throw new Error('no label');
  return element;
}

function box(): HTMLElement {
  const container = document.createElement('div');
  container.style.inlineSize = '480px';
  container.style.font = '600 32px/1 system-ui, sans-serif';
  document.body.append(container);
  return container;
}

async function mount(
  app: ReactNode,
  container = box(),
): Promise<{ container: HTMLElement; root: Root }> {
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle(30);
  return { container, root };
}

async function hydrate(
  app: ReactNode,
  container = box(),
): Promise<{ container: HTMLElement; problems: unknown[] }> {
  container.innerHTML = renderToString(app);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  return { container, problems };
}

/** The digits of a formatted number as a number (Latin digits; a decimal point is "."). */
function numeric(text: string): number {
  return Number(text.replace(/[^\d.-]/g, ''));
}

const fast = 240;

describe('when it counts', () => {
  test('a client mount in view counts from 0 to the value; the label is the final value throughout', async () => {
    const container = box();
    const { texts, stop } = record(container);
    await mount(<CountUp value={48290} duration={fast} />, container);
    expect(label(container).textContent).toBe('48,290');
    await settle(fast + 150);
    stop();
    expect(texts[0]).toBe('0');
    expect(texts.at(-1)).toBe('48,290');
    expect(texts.length).toBeGreaterThan(3);
    const values = texts.map(numeric);
    expect(values).toEqual(values.toSorted((a, b) => a - b));
    // integers in, integers out: no frame shows a fraction the endpoints do not have
    expect(texts.every((text) => !text.includes('.'))).toBe(true);
    expect(label(container).textContent).toBe('48,290');
    expect(digits(container).getAttribute('aria-hidden')).toBe('true');
    expect(digits(container).style.inlineSize).toBe('');
    expect(container.querySelector('[aria-live], [role="status"]')).toBeNull();
  });

  test('the default duration is --nz-duration-count-up (900 ms)', async () => {
    const container = box();
    const { texts, stop } = record(container);
    const started = performance.now();
    await mount(<CountUp value={100} />, container);
    // the width lock holds from the first frame to the last; its release is the count's end (the
    // text reads "100" a little earlier, at about 88 % of the time, where the eased value rounds up)
    expect(digits(container).style.inlineSize).toMatch(/px$/);
    await until(() => digits(container).style.inlineSize === '');
    const elapsed = performance.now() - started;
    stop();
    expect(texts[0]).toBe('0');
    expect(texts.at(-1)).toBe('100');
    expect(elapsed).toBeGreaterThanOrEqual(900);
    expect(elapsed).toBeLessThan(2000);
  });

  test('`from` sets where the first count starts, and the box is the final width meanwhile', async () => {
    const container = box();
    const { texts, stop } = record(container);
    await mount(<CountUp value={12500} from={1000} locale="de-DE" duration={fast} />, container);
    const width = digits(container).style.inlineSize;
    expect(width).toMatch(/px$/);
    await settle(fast + 150);
    stop();
    expect(texts[0]).toBe('1.000');
    expect(texts.at(-1)).toBe('12.500');
    expect(Number.parseFloat(width)).toBeCloseTo(
      digits(container).getBoundingClientRect().width,
      1,
    );
  });

  test('a hydrated element in view keeps the server number: no count, no hydration problem', async () => {
    const app = <CountUp value={48290} duration={fast} />;
    const container = box();
    container.innerHTML = renderToString(app);
    const { texts, stop } = record(container);
    const { problems } = await hydrate(app, container);
    await settle(fast + 150);
    stop();
    expect(problems).toEqual([]);
    expect(texts.filter((text) => text !== '48,290')).toEqual([]);
  });

  test('a hydrated element off screen counts from `from` when it first comes into view', async () => {
    const spacer = document.createElement('div');
    spacer.style.blockSize = '300vh';
    document.body.append(spacer);
    const container = box();
    const app = <CountUp value={900} from={100} duration={fast} />;
    const { problems } = await hydrate(app, container);
    const { texts, stop } = record(container);
    await settle(fast);
    expect(texts).toEqual([]);
    container.scrollIntoView();
    await settle(fast + 200);
    stop();
    expect(problems).toEqual([]);
    expect(texts[0]).toBe('100');
    expect(texts.at(-1)).toBe('900');
    expect(texts.length).toBeGreaterThan(3);
  });

  test('a new value in view counts from the number on screen; off screen it just shows', async () => {
    const { container, root } = await mount(<CountUp value={10} duration={fast} />);
    await settle(fast + 150);
    let run = record(container);
    root.render(<CountUp value={50} duration={fast} />);
    await settle(fast + 150);
    run.stop();
    // the new final text and the first frame are written in one task: the first frame is what shows
    expect(run.texts[0]).toBe('10');
    expect(run.texts.at(-1)).toBe('50');
    expect(run.texts.length).toBeGreaterThan(3);

    const spacer = document.createElement('div');
    spacer.style.blockSize = '300vh';
    document.body.prepend(spacer);
    await settle();
    run = record(container);
    root.render(<CountUp value={70} duration={fast} />);
    await settle(fast + 150);
    run.stop();
    expect(run.texts).toEqual(['70']);
  });

  test('a new value mid-count continues from the frame on screen', async () => {
    // a long first count, so the second value surely lands mid-count on a loaded machine
    const { container, root } = await mount(<CountUp value={1000} duration={2000} />);
    await settle(300);
    const shown = numeric(digits(container).textContent ?? '');
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(1000);
    const run = record(container);
    root.render(<CountUp value={2000} duration={fast} />);
    await settle(fast + 150);
    run.stop();
    expect(numeric(run.texts[0] ?? '')).toBeGreaterThanOrEqual(shown);
    expect(run.texts.at(-1)).toBe('2,000');
  });
});

describe('reduced motion', () => {
  test('[data-nz-motion="reduce"]: the value at once, whatever `duration` says', async () => {
    const container = box();
    container.dataset['nzMotion'] = 'reduce';
    const { texts, stop } = record(container);
    await mount(<CountUp value={48290} duration={fast} />, container);
    await settle(fast + 150);
    stop();
    expect(texts.filter((text) => text !== '48,290')).toEqual([]);
    expect(digits(container).textContent).toBe('48,290');
    expect(digits(container).style.inlineSize).toBe('');
  });

  test.runIf(server.browser === 'chromium')(
    'prefers-reduced-motion with the built tokens: the value at once',
    async () => {
      const session = cdp();
      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      try {
        expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
        const container = box();
        const { texts, stop } = record(container);
        await mount(<CountUp value={48290} />, container);
        await settle(200);
        stop();
        expect(texts.filter((text) => text !== '48,290')).toEqual([]);
      } finally {
        await session.send('Emulation.setEmulatedMedia', { features: [] });
      }
    },
  );
});

function rootBox(container: HTMLElement): DOMRect {
  const element = container.querySelector('data');
  if (element === null) throw new Error('no <data>');
  return element.getBoundingClientRect();
}

/** An element's left edge on every frame until `ms` have passed. */
async function track(element: HTMLElement, ms: number): Promise<number[]> {
  const lefts: number[] = [];
  const end = performance.now() + ms;
  await new Promise<void>((resolve) => {
    const frame = (): void => {
      lefts.push(element.getBoundingClientRect().left);
      if (performance.now() < end) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  return lefts;
}

describe('no layout shift', () => {
  for (const [name, from, value, scale] of [
    ['counting up', 0, 48290, 1],
    ['counting down to a shorter string', 99999, 5, 1],
    // the lock is the unscaled width, so a scaled ancestor moves nothing either (A11Y-W12-5)
    ['counting up under transform: scale(0.5)', 0, 48290, 0.5],
    ['counting up under transform: scale(1.5)', 0, 48290, 1.5],
  ] as const) {
    test(`${name}: the text after it never moves`, async () => {
      // Chromium reports layout shifts; Firefox and WebKit have only the geometry check
      const supported = PerformanceObserver.supportedEntryTypes.includes('layout-shift');
      let shift = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if ('value' in entry) shift += Number(entry.value);
      });
      if (supported) observer.observe({ type: 'layout-shift' });
      const container = box();
      // no margin to collapse through the body: inserting the paragraph must not move the page
      container.style.display = 'flow-root';
      if (scale !== 1) {
        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = '0 0';
      }
      const app = (
        <p style={{ margin: 0 }}>
          Revenue <CountUp value={value} from={from} duration={fast} />{' '}
          <span id="after">this week</span>
        </p>
      );
      const root = createRoot(container);
      roots.push(root);
      root.render(app);
      const after = await new Promise<HTMLElement>((resolve) => {
        const look = (): void => {
          const found = container.querySelector<HTMLElement>('#after');
          if (found) resolve(found);
          else requestAnimationFrame(look);
        };
        look();
      });
      const lefts = await track(after, fast + 150);
      observer.disconnect();
      expect(lefts.length).toBeGreaterThan(5);
      expect(new Set(lefts.map((left) => left.toFixed(2)))).toEqual(
        new Set([lefts[0]?.toFixed(2)]),
      );
      expect(shift).toBe(0);
    });
  }
});

describe("NumberValue's text and box", () => {
  const cases: Array<[number, Intl.NumberFormatOptions | undefined, string]> = [
    [48290, { style: 'currency', currency: 'USD' }, 'en-US'],
    [1234567.891, undefined, 'de-DE'],
    [0.124, { style: 'percent', maximumFractionDigits: 1 }, 'fr-FR'],
    [98765, { notation: 'compact' }, 'ja-JP'],
    [-3200.5, { style: 'currency', currency: 'INR' }, 'hi-IN'],
    [4321, undefined, 'ar-EG'],
  ];

  /** Each case as NumberValue and as CountUp, side by side in its own container. */
  async function both(): Promise<Array<{ reference: HTMLElement; count: HTMLElement }>> {
    return Promise.all(
      cases.map(async ([value, format, locale]) => {
        const [{ container: reference }, { container: count }] = await Promise.all([
          mount(<NumberValue value={value} format={format} locale={locale} />),
          mount(<CountUp value={value} format={format} locale={locale} duration={fast} />),
        ]);
        return { reference, count };
      }),
    );
  }

  test('after a count, the digits read exactly what NumberValue renders, in 6 locales and formats', async () => {
    const pairs = await both();
    await settle(fast + 200);
    for (const [index, [value, format, locale]] of cases.entries()) {
      const pair = pairs[index];
      if (pair === undefined) throw new Error('no pair');
      const text = pair.reference.querySelector('data')?.textContent;
      expect(text).toBe(formatNumber(value, format, locale));
      expect(digits(pair.count).textContent).toBe(text);
      expect(label(pair.count).textContent).toBe(text);
    }
  });

  test("the root box is NumberValue's (±1 px) while counting and at rest", async () => {
    const pairs = await both();
    const during = pairs.map(({ reference, count }) => ({
      expected: rootBox(reference),
      actual: rootBox(count),
      counting: digits(count).textContent !== reference.textContent,
    }));
    await settle(fast + 200);
    const after = pairs.map(({ reference, count }) => ({
      expected: rootBox(reference),
      actual: rootBox(count),
      counting: false,
    }));
    // the first measurement really is mid-count
    expect(during.every(({ counting }) => counting)).toBe(true);
    for (const { expected, actual } of [...during, ...after]) {
      expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(1);
    }
  });
});
