// Accordion in a browser (ARCHITECTURE.md §21.3; D-cy): native <details> items open and close from the
// pointer and from the keyboard (Enter and Space on the summary) with no script of ours; items that
// share a `name` are exclusive; Tab reaches each summary; the chevron turns while open; the browser's
// own disclosure marker is hidden.
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import { Accordion } from '../../src/accordion/index';

const isWebKit = server.browser === 'webkit';
const STYLES = import.meta.glob(
  ['../../../tokens/dist/tokens.css', '../../styles/base.css', '../../src/accordion/accordion.css'],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 3)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

function faq(name?: string): ReactNode {
  return (
    <Accordion.Root {...(name === undefined ? {} : { name })}>
      {['One', 'Two', 'Three'].map((title) => (
        <Accordion.Item key={title}>
          <Accordion.Trigger>{title}</Accordion.Trigger>
          <Accordion.Panel>{title} answer</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

const items = (container: HTMLElement): HTMLDetailsElement[] => [
  ...container.querySelectorAll<HTMLDetailsElement>('details.nz-accordion-item'),
];
const triggers = (container: HTMLElement): HTMLElement[] => [
  ...container.querySelectorAll<HTMLElement>('.nz-accordion-trigger'),
];

describe('Accordion', () => {
  test('a press opens and closes an item; without a name, several stay open', async () => {
    const container = await mount(faq());
    const [first, second] = triggers(container);
    if (first === undefined || second === undefined) throw new Error('no triggers');
    await userEvent.click(first);
    await userEvent.click(second);
    expect(items(container).map((item) => item.open)).toEqual([true, true, false]);
    await userEvent.click(first);
    expect(items(container).map((item) => item.open)).toEqual([false, true, false]);
  });

  test('with a name, opening one closes the others', async () => {
    const container = await mount(faq('faq'));
    const [first, second] = triggers(container);
    if (first === undefined || second === undefined) throw new Error('no triggers');
    await userEvent.click(first);
    await userEvent.click(second);
    await settle();
    expect(items(container).map((item) => item.open)).toEqual([false, true, false]);
  });

  test('Tab reaches each summary; Enter and Space toggle it', async () => {
    const container = await mount(
      <>
        <button type="button">before</button>
        {faq()}
      </>,
    );
    const [first, second] = triggers(container);
    if (first === undefined || second === undefined) throw new Error('no triggers');
    container.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    // WebKit on macOS does not Tab to a summary by default (CLAUDE.md's Tab-order note)
    if (isWebKit && document.activeElement !== first) first.focus();
    expect(document.activeElement).toBe(first);
    expect(getComputedStyle(first).outlineStyle).toBe('solid');
    await userEvent.keyboard('{Enter}');
    expect(items(container)[0]?.open).toBe(true);
    await userEvent.keyboard('{Tab}');
    if (isWebKit && document.activeElement !== second) second.focus();
    expect(document.activeElement).toBe(second);
    await userEvent.keyboard(' ');
    expect(items(container)[1]?.open).toBe(true);
  });

  test('the chevron points down while closed and up while open; no disclosure marker', async () => {
    const container = await mount(faq());
    const [first] = triggers(container);
    if (first === undefined) throw new Error('no trigger');
    const indicator = first.querySelector<HTMLElement>('.nz-accordion-indicator');
    if (indicator === null) throw new Error('no indicator');
    expect(getComputedStyle(indicator).rotate).toBe('90deg');
    expect(getComputedStyle(first).listStyleType).toBe('none');
    await userEvent.click(first);
    await settle();
    await expect.poll(() => getComputedStyle(indicator).rotate).toBe('-90deg');
  });
});
