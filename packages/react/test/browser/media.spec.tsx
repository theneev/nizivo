// Slider and MediaPlayer in a browser (ARCHITECTURE.md §21.4a, D-do): Slider (hydration, a native
// range named by its label, the value text as aria-valuetext, the keys, the fill set through the
// CSSOM) and MediaPlayer (the play button's name follows its state, the scrubber read in minutes
// and seconds, seeking by 5 seconds).
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { MediaPlayer } from '../../src/unstable/media-player/media-player.client';
import { Slider } from '../../src/unstable/slider/slider.client';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/unstable/slider/slider.css',
    '../../src/unstable/media-player/media-player.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 4)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

async function hydrate(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
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

function range(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="range"]');
  if (input === null) throw new Error('no range input');
  return input;
}

describe('Slider', () => {
  test('hydrates; named by its label, its value text read and the fill set', async () => {
    const container = await hydrate(
      <Slider label="Discount" defaultValue={30} format={{ style: 'unit', unit: 'percent' }} />,
    );
    const input = range(container);
    expect(input.labels?.[0]?.textContent).toBe('Discount');
    expect(input.getAttribute('aria-valuetext')).toBe('30%');
    expect(input.style.getPropertyValue('--_nz-slider-fill')).toBe('30%');
    expect(input.hasAttribute('style')).toBe(true);
  });

  test('the keys step it; the value text follows', async () => {
    const changes: number[] = [];
    const container = await mount(
      <Slider label="Volume" defaultValue={50} onValueChange={(v) => changes.push(v)} />,
    );
    const input = range(container);
    input.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(input.value).toBe('51');
    await userEvent.keyboard('{End}');
    expect(input.value).toBe('100');
    expect(input.getAttribute('aria-valuetext')).toBe('100');
    expect(changes.at(-1)).toBe(100);
  });
});

function Player(): JSX.Element {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(72);
  return (
    <MediaPlayer
      title="Making the autumn glaze"
      playing={playing}
      onPlayingChange={setPlaying}
      currentTime={time}
      duration={228}
      onSeek={setTime}
    />
  );
}

describe('MediaPlayer', () => {
  test('the play button names its action; the scrubber reads minutes and seconds', async () => {
    const container = await mount(<Player />);
    const [back, play, forward] = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-slot="media-player-control"]'),
    ];
    expect(back?.getAttribute('aria-label')).toBe('Skip back');
    expect(forward?.getAttribute('aria-label')).toBe('Skip forward');
    expect(play?.getAttribute('aria-label')).toBe('Play');
    expect(play?.hasAttribute('aria-pressed')).toBe(false);
    if (play === undefined) throw new Error('no play');
    await userEvent.click(play);
    expect(play.getAttribute('aria-label')).toBe('Pause');
    const input = range(container);
    expect(input.getAttribute('aria-label')).toBe('Seek');
    expect(input.getAttribute('aria-valuetext')).toBe(
      '1 minute 12 seconds of 3 minutes 48 seconds',
    );
    input.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(input.getAttribute('aria-valuetext')).toBe(
      '1 minute 17 seconds of 3 minutes 48 seconds',
    );
    expect(container.querySelector('.nz-media-player-times')?.textContent).toBe('1:173:48');
  });
});
