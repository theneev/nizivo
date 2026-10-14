// IconButton and the Tooltip conveniences in Chromium (ARCHITECTURE.md §9.5 "split", §12.3, D-d): the
// server HTML hydrates unchanged, the tooltip names the action on focus and hover without describing
// the button twice, and `shortcut` draws Kbd in the popup.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Button } from '../../src/button/button';
import { IconButton } from '../../src/icon-button/icon-button';
import { Tooltip } from '../../src/tooltip/index';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../src/icon-button/icon-button.css',
    '../../src/tooltip/tooltip.css',
    '../../src/kbd/kbd.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 4)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const Mark = (
  <svg viewBox="0 0 24 24" width="1em" height="1em">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

function Toggle(): JSX.Element {
  const [pressed, setPressed] = useState(false);
  return (
    <IconButton
      label="Bold"
      icon={Mark}
      variant="tertiary"
      pressed={pressed}
      onClick={() => setPressed((value) => !value)}
    />
  );
}

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-nz-platform');
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Server HTML in the document, then hydration; collects every hydration problem. */
async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const html = renderToString(app);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  expect(container.innerHTML).toBe(html);
  return { container, problems };
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

/** A colour token as the page computes it. */
function resolved(token: string): string {
  const probe = document.createElement('i');
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function tooltip(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

/** Waits up to a second for the tooltip to appear (React Aria opens it in an effect). */
async function opened(tries = 40): Promise<HTMLElement> {
  const element = tooltip();
  if (element !== null) return element;
  if (tries === 0) throw new Error('no tooltip opened');
  await settle(25);
  return opened(tries - 1);
}

describe('IconButton', () => {
  test('server HTML hydrates with no mismatch and no console error, with and without the tooltip', async () => {
    const { problems } = await hydrate(
      <div>
        <IconButton label="Notifications" icon={Mark} />
        <IconButton label="Bold" icon={Mark} pressed shortcut="mod+b" />
        <IconButton label="Delete" icon={Mark} tooltip={false} />
      </div>,
    );
    expect(problems).toEqual([]);
  });

  test('keyboard focus shows the label at once; the button is named, not described, by it', async () => {
    const container = await mount(
      <IconButton label="Notifications" icon={Mark} tooltip={{ delay: 5000 }} />,
    );
    const button = container.querySelector('button');
    if (button === null) throw new Error('no button');
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    const popup = await opened();
    expect(popup.textContent).toBe('Notifications');
    expect(popup.dataset['slot']).toBe('tooltip-popup');
    expect(button.getAttribute('aria-label')).toBe('Notifications');
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(button.className).toBe('nz-icon-button nz-hit-target');
    expect(button.dataset['slot']).toBe('icon-button');
    await userEvent.keyboard('{Escape}');
    await settle(300);
    expect(tooltip()).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  test('hover opens it after the delay', async () => {
    const container = await mount(
      <div>
        <p>Before</p>
        <IconButton label="Notifications" icon={Mark} tooltip={{ delay: 100 }} />
      </div>,
    );
    const button = container.querySelector('button');
    const before = container.querySelector('p');
    if (button === null || before === null) throw new Error('no button');
    // React Aria opens on hover once the pointer has moved (its modality is "pointer"), as a real
    // mouse always has by the time it reaches a button.
    await userEvent.hover(before);
    await userEvent.hover(button);
    expect((await opened()).textContent).toBe('Notifications');
  });

  test('the shortcut follows the label, spelled for the platform', async () => {
    const container = await mount(<IconButton label="Bold" icon={Mark} shortcut="mod+b" />);
    await userEvent.tab();
    const popup = await opened();
    const kbd = popup.querySelector('kbd');
    expect(kbd?.className).toBe('nz-kbd nz-tooltip-shortcut');
    expect(popup.innerText.replace(/\s+/g, ' ').trim()).toBe('Bold Ctrl+B');
    document.documentElement.setAttribute('data-nz-platform', 'apple');
    expect(popup.innerText.replace(/\s+/g, ' ').trim()).toBe('Bold ⌘B');
    // Figma draws it as plain Mono/M text, not a key box
    expect(getComputedStyle(kbd ?? popup).borderStyle).toBe('none');
    expect(container.querySelector('button')?.hasAttribute('aria-describedby')).toBe(false);
  });

  test('tooltip={false}: no tooltip on focus', async () => {
    await mount(<IconButton label="Delete" icon={Mark} tooltip={false} />);
    await userEvent.tab();
    await settle(200);
    expect(tooltip()).toBeNull();
  });

  test('a toggle flips aria-pressed and keeps its label', async () => {
    const container = await mount(<Toggle />);
    const button = container.querySelector('button');
    if (button === null) throw new Error('no button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Bold');
    // the pressed look: the brand border is the 3:1 cue, with the brand tint (after the 140 ms fade)
    await settle(400);
    expect(getComputedStyle(button).borderTopColor).toBe(resolved('--nz-border-brand'));
    expect(getComputedStyle(button).backgroundColor).toBe(resolved('--nz-bg-brand-subtle'));
  });

  test('sizes are square: 32, 40 and 48 px', async () => {
    const container = await mount(
      <div>
        <IconButton label="A" icon={Mark} size="sm" tooltip={false} />
        <IconButton label="B" icon={Mark} tooltip={false} />
        <IconButton label="C" icon={Mark} size="lg" tooltip={false} />
      </div>,
    );
    const sizes = [...container.querySelectorAll('button')].map((b) => {
      const rect = b.getBoundingClientRect();
      return [rect.width, rect.height];
    });
    expect(sizes).toEqual([
      [32, 32],
      [40, 40],
      [48, 48],
    ]);
  });
});

describe('Tooltip conveniences', () => {
  test('content renders the popup, and shortcut draws Kbd; a plain trigger is described by it', async () => {
    const container = await mount(
      <Tooltip.Root content="Export the report" shortcut="mod+e" delay={0}>
        <Tooltip.Trigger render={<Button>Export</Button>} />
      </Tooltip.Root>,
    );
    await userEvent.tab();
    const popup = await opened();
    expect(popup.querySelector('kbd')).not.toBeNull();
    const trigger = container.querySelector('button');
    const describedBy = trigger?.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toBe(popup.id);
    // both spellings are in the DOM; kbd.css shows one
    expect(popup.textContent).toBe('Export the report ⌘ECtrl+E');
    expect(popup.innerText.replace(/\s+/g, ' ').trim()).toBe('Export the report Ctrl+E');
  });
});
