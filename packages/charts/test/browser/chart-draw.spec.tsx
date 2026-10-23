// The chart draw (ARCHITECTURE.md §13.3 "Chart draw"; Figma 09's "Chart · draw" specimen,
// docs/figma/09-lab.md §4.2): the shipped recipe, not 09's stroke-dash one. AreaChart's plot is
// revealed left to right by ChartFrame's clip-path sweep (nz-chart-reveal), BarChart's bars grow
// from the baseline by clip-path (nz-bar-chart-grow) and DonutChart's ring fades in and settles
// (nz-donut-chart-reveal), all on --nz-duration-chart-draw (700 ms) and --nz-easing-standard, fill
// mode both. Under prefers-reduced-motion (emulated through Playwright's page.emulateMedia, the
// `emulateReducedMotion` command of test/browser/vitest.config.ts) and under
// [data-nz-motion="reduce"], the duration is 0 s and the chart renders at once in exactly the state
// the 700 ms draw ends in. Styled by the shipped stylesheets only, so build first. Runs in every
// engine: `NZ_BROWSER=firefox` or `webkit`.
import type { JSX } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { commands } from 'vitest/browser';
import { AreaChart } from '../../src/area-chart/index';
import { BarChart } from '../../src/bar-chart/index';
import { DonutChart } from '../../src/donut-chart/index';

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Playwright's page.emulateMedia({ reducedMotion }) for the whole tab, the test frame included. */
    emulateReducedMotion: (value: 'reduce' | 'no-preference') => Promise<void>;
  }
}

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
.probe { inline-size: 640px; }`;
document.head.append(sheet);

const DAYS = [120, 180, 150, 260, 210, 320, 290].map((value, i) => ({
  day: `Oct ${i + 1}`,
  value,
  previous: value - 40,
}));
const CHANNELS = [
  { name: 'Online store', sales: 64120 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Wholesale', sales: 17263 },
];

interface Case {
  name: string;
  chart: () => JSX.Element;
  /** The animated element(s). */
  animated: string;
  keyframes: string;
  /** The marks whose boxes the end state compares. */
  marks: string;
}

const CASES: Case[] = [
  {
    name: 'AreaChart (ChartFrame reveal)',
    chart: () => (
      <AreaChart
        title="Sales"
        data={DAYS}
        x="day"
        y="value"
        compare="previous"
        interaction="none"
      />
    ),
    animated: '.nz-chart-svg',
    keyframes: 'nz-chart-reveal',
    marks: '.nz-chart-line, .nz-chart-area',
  },
  {
    name: 'BarChart',
    chart: () => (
      <BarChart title="Orders" data={DAYS} x={(d) => d.day} y={(d) => d.value} interaction="none" />
    ),
    animated: '.nz-bar-chart-svg',
    keyframes: 'nz-bar-chart-grow',
    marks: '.nz-bar-chart-bar',
  },
  {
    name: 'DonutChart',
    chart: () => (
      <DonutChart
        title="Sales by channel"
        data={CHANNELS}
        category={(d) => d.name}
        value={(d) => d.sales}
        interaction="none"
      />
    ),
    animated: '.nz-donut-chart-svg',
    keyframes: 'nz-donut-chart-reveal',
    marks: '.nz-donut-chart-segment',
  },
];

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(async () => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
  await commands.emulateReducedMotion('no-preference');
});

function frames(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

async function mount(chart: () => JSX.Element, motion?: 'reduce'): Promise<HTMLElement> {
  host = document.createElement('div');
  host.className = 'probe';
  if (motion !== undefined) host.dataset['nzMotion'] = motion;
  document.body.append(host);
  root = createRoot(host);
  const into = root;
  flushSync(() => into.render(chart()));
  return host;
}

function all(within: HTMLElement, selector: string): Element[] {
  const found = [...within.querySelectorAll(selector)];
  if (found.length === 0) throw new Error(`no ${selector}`);
  return found;
}

/** A box, rounded to 0.01 px. */
function round(r: DOMRect): number[] {
  return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100);
}

/** What the reader sees once the draw is over: each animated element's clip, opacity and scale, and every mark's box. */
function endState(within: HTMLElement, c: Case): unknown {
  return {
    animated: all(within, c.animated).map((el) => {
      const style = getComputedStyle(el);
      return {
        clipPath: style.clipPath,
        opacity: style.opacity,
        scale: style.scale,
        box: round(el.getBoundingClientRect()),
      };
    }),
    marks: all(within, c.marks).map((el) => round(el.getBoundingClientRect())),
  };
}

/** The CSS animations on the element (not the island's or a transition). */
function draws(el: Element, name: string): CSSAnimation[] {
  return el
    .getAnimations()
    .filter((a): a is CSSAnimation => a instanceof CSSAnimation && a.animationName === name);
}

describe.each(CASES)('$name', (c) => {
  test('draws in over --nz-duration-chart-draw (700 ms), --nz-easing-standard, fill mode both', async () => {
    const chart = await mount(c.chart);
    for (const el of all(chart, c.animated)) {
      const style = getComputedStyle(el);
      expect(style.animationName).toBe(c.keyframes);
      expect(style.animationDuration).toBe('0.7s');
      expect(style.animationTimingFunction).toBe('cubic-bezier(0.2, 0, 0, 1)');
      expect(style.animationFillMode).toBe('both');
      const [animation] = draws(el, c.keyframes);
      expect(animation?.effect?.getTiming().duration).toBe(700);
      expect(animation?.playState).toBe('running');
    }
  });

  test('the draw starts from nothing shown and ends in the end state', async () => {
    const chart = await mount(c.chart);
    const el = all(chart, c.animated)[0];
    if (el === undefined) throw new Error('no animated element');
    const [animation] = draws(el, c.keyframes);
    if (animation === undefined) throw new Error(`no ${c.keyframes} animation`);
    animation.pause();
    animation.currentTime = 0;
    const style = getComputedStyle(el);
    const start = { clipPath: style.clipPath, opacity: style.opacity, scale: style.scale };
    animation.play();
    await Promise.all(document.getAnimations().map((a) => a.finished));
    await frames();
    const end = getComputedStyle(el);
    expect(start).not.toEqual({ clipPath: end.clipPath, opacity: end.opacity, scale: end.scale });
  });

  test.each(['prefers-reduced-motion', '[data-nz-motion="reduce"]'] as const)(
    'Reduced motion (%s): 0 s, and the chart renders at once in the drawn end state',
    async (how) => {
      const normal = await mount(c.chart);
      await Promise.all(document.getAnimations().map((a) => a.finished));
      await frames();
      const drawn = endState(normal, c);
      root?.unmount();
      normal.remove();

      if (how === 'prefers-reduced-motion') {
        await commands.emulateReducedMotion('reduce');
      }
      expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
        how === 'prefers-reduced-motion',
      );
      const reduced = await mount(c.chart, how === 'prefers-reduced-motion' ? undefined : 'reduce');
      // one frame, no waiting for an animation: the first painted state is the end state
      await frames();
      for (const el of all(reduced, c.animated)) {
        const style = getComputedStyle(el);
        expect(style.animationName).toBe(c.keyframes);
        expect(style.animationDuration).toBe('0s');
        expect(draws(el, c.keyframes).filter((a) => a.playState === 'running')).toEqual([]);
      }
      expect(endState(reduced, c)).toEqual(drawn);
    },
  );
});
