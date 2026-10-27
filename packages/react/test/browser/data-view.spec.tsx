// DataView in a browser (ARCHITECTURE.md §16.2; D-db): the root's own width, not the viewport's,
// picks the presentation: the table from 40rem, the list below; the other is display: none, so only
// one table or list is in the accessibility tree and Tab reaches only the shown links. An
// interactive list row is one stretched link.
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import { DataView } from '../../src/data-view/index';

const isWebKit = server.browser === 'webkit';

const STYLES = import.meta.glob(
  ['../../../tokens/dist/tokens.css', '../../styles/base.css', '../../src/data-view/data-view.css'],
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

function orders(width: string): ReactNode {
  return (
    <DataView.Root style={{ inlineSize: width }}>
      <DataView.Table>
        <table>
          <tbody>
            <tr>
              <td>
                <a href="#t1">Table one</a>
              </td>
            </tr>
          </tbody>
        </table>
      </DataView.Table>
      <DataView.List aria-label="Orders">
        <DataView.Item interactive>
          <DataView.ItemLink href="#l1">List one</DataView.ItemLink>
          <button type="button">Archive</button>
        </DataView.Item>
      </DataView.List>
    </DataView.Root>
  );
}

const shown = (container: HTMLElement, selector: string): boolean =>
  container.querySelector<HTMLElement>(selector)?.checkVisibility() ?? false;

describe('presentation', () => {
  test('40rem and wider: the table; the list is display: none', async () => {
    const container = await mount(orders('40rem'));
    expect(shown(container, '[data-presentation="table"]')).toBe(true);
    expect(shown(container, '[data-presentation="list"]')).toBe(false);
    const list = container.querySelector('[data-presentation="list"]');
    expect(list === null ? '' : getComputedStyle(list).display).toBe('none');
  });

  test('narrower than 40rem: the list; the table is display: none', async () => {
    const container = await mount(orders('39.9rem'));
    expect(shown(container, '[data-presentation="list"]')).toBe(true);
    expect(shown(container, '[data-presentation="table"]')).toBe(false);
  });

  test('the root’s width decides, not the viewport’s', async () => {
    // the viewport is narrower than 40rem; the root is not
    expect(window.innerWidth).toBeLessThan(640);
    const container = await mount(orders('48rem'));
    expect(shown(container, '[data-presentation="table"]')).toBe(true);
  });
});

describe('keyboard', () => {
  // WebKit on macOS does not Tab to links by default (CLAUDE.md's known Tab-order failures)
  test.skipIf(isWebKit)('Tab reaches only the shown presentation’s links', async () => {
    await mount(orders('20rem'));
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('List one');
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('Archive');
  });
});

describe('interactive row', () => {
  test('a press anywhere on the row follows its link; the button stays its own', async () => {
    const container = await mount(orders('20rem'));
    const item = container.querySelector<HTMLElement>('[data-slot="data-view-item"]');
    if (item === null) throw new Error('no item');
    const rect = item.getBoundingClientRect();
    await userEvent.click(item, { position: { x: rect.width - 8, y: rect.height / 2 } });
    // the pointer landed on the row's padding, under the stretched link's ::after
    const button = container.querySelector('button');
    const link = container.querySelector('[data-slot="data-view-item-link"]');
    const hit = document.elementFromPoint(rect.left + 4, rect.top + rect.height / 2);
    expect(hit).toBe(link);
    const buttonRect = button?.getBoundingClientRect();
    if (buttonRect === undefined) throw new Error('no button');
    expect(
      document.elementFromPoint(buttonRect.left + 2, buttonRect.top + buttonRect.height / 2),
    ).toBe(button);
    expect(window.location.hash).toBe('#l1');
  });
});
