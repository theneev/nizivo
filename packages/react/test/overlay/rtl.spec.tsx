// Right-to-left mirror geometry (ARCHITECTURE.md §16.4, §12.2 Positioning; v0.3): under
// `dir="rtl"` a logical `side` or `align` lands on the mirrored physical edge, for every positioned
// popup of the family, and `data-side` names that physical side. The popup's box is checked against
// its trigger's, so a popup that says `left` but sits on the right fails. Directional glyphs
// (`data-mirror="rtl"`) flip; others never do. The Drawer's sides are drawer.spec.tsx's.
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { NizivoConfig } from '../../src/config/index';
import { Menu } from '../../src/menu/index';
import { Pagination } from '../../src/pagination/index';
import { Popover } from '../../src/popover/index';
import { Select } from '../../src/select/index';
import { Tooltip } from '../../src/tooltip/index';
import { get, mount, settle, until } from './harness';

type Dir = 'ltr' | 'rtl';
type Logical = 'start' | 'end';

afterEach(() => {
  document.documentElement.removeAttribute('dir');
});

async function render(dir: Dir, app: ReactNode): Promise<void> {
  document.documentElement.dir = dir;
  // the engine reads the direction from the locale, the CSS from `dir`: both say the same here
  await mount(<NizivoConfig locale={dir === 'rtl' ? 'ar-EG' : 'en-US'}>{app}</NizivoConfig>);
}

/** The physical side a logical one lands on. */
function physical(side: Logical, dir: Dir): 'left' | 'right' {
  return (side === 'start') === (dir === 'ltr') ? 'left' : 'right';
}

/** The popup's `data-side` once placed, and which side of its trigger its box is on. */
async function placement(
  popupSlot: string,
  triggerSlot: string,
): Promise<{ side: string; box: string }> {
  await until(() => expect(get(popupSlot).dataset['side']).toMatch(/^(left|right)$/));
  await settle();
  const popup = get(popupSlot).getBoundingClientRect();
  const trigger = get(triggerSlot).getBoundingClientRect();
  const box =
    popup.right <= trigger.left + 1
      ? 'left'
      : popup.left >= trigger.right - 1
        ? 'right'
        : 'overlapping';
  return { side: get(popupSlot).dataset['side'] ?? '', box };
}

// The arrows are inline-flex in pagination.css, which the harness does not load: an inline box takes
// no transform, and WebKit then computes `scale` as none.
const PAGINATION_CSS = import.meta.glob('../../src/pagination/pagination.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const sheet = document.createElement('style');
sheet.textContent = Object.values(PAGINATION_CSS).join('\n');
document.head.append(sheet);

/**
 * The trigger at the far edge from where its popup goes, so that side has room in the lane's
 * 414 px viewport and the engine never flips it (a flip is a different, correct result).
 */
function placed(edge: 'left' | 'right', children: ReactNode): ReactNode {
  return (
    <div
      style={{
        display: 'grid',
        alignItems: 'center',
        // physical keywords: `end` would itself flip under rtl
        justifyItems: edge === 'left' ? 'right' : 'left',
        blockSize: 400,
        paddingInline: 16,
      }}
    >
      {children}
    </div>
  );
}

/** A trigger in the middle of the page. */
function centred(children: ReactNode): ReactNode {
  return <div style={{ display: 'grid', placeItems: 'center', blockSize: 400 }}>{children}</div>;
}

const cases: [Logical, Dir][] = [
  ['start', 'ltr'],
  ['end', 'ltr'],
  ['start', 'rtl'],
  ['end', 'rtl'],
];

describe('a logical side lands on the mirrored physical edge', () => {
  for (const [side, dir] of cases) {
    const edge = physical(side, dir);
    test(`Popover side="${side}" in ${dir}: data-side="${edge}", on the ${edge} of its trigger`, async () => {
      await render(
        dir,
        placed(
          edge,
          <Popover.Root defaultOpen>
            <Popover.Trigger>Store status</Popover.Trigger>
            <Popover.Popup side={side}>
              <Popover.Title>Store is live</Popover.Title>
            </Popover.Popup>
          </Popover.Root>,
        ),
      );
      expect(await placement('popover-popup', 'popover-trigger')).toEqual({
        side: edge,
        box: edge,
      });
    });

    test(`Menu side="${side}" in ${dir}: data-side="${edge}", on the ${edge} of its trigger`, async () => {
      await render(
        dir,
        placed(
          edge,
          <Menu.Root defaultOpen>
            <Menu.Trigger>Actions</Menu.Trigger>
            <Menu.Popup side={side}>
              <Menu.Item>Edit product</Menu.Item>
            </Menu.Popup>
          </Menu.Root>,
        ),
      );
      expect(await placement('menu-popup', 'menu-trigger')).toEqual({ side: edge, box: edge });
    });

    test(`Tooltip side="${side}" in ${dir}: data-side="${edge}", on the ${edge} of its trigger`, async () => {
      await render(
        dir,
        placed(
          edge,
          <Tooltip.Root defaultOpen delay={0}>
            <Tooltip.Trigger>Export</Tooltip.Trigger>
            <Tooltip.Popup side={side}>Download the report</Tooltip.Popup>
          </Tooltip.Root>,
        ),
      );
      expect(await placement('tooltip-popup', 'tooltip-trigger')).toEqual({
        side: edge,
        box: edge,
      });
    });
  }
});

describe('a logical alignment mirrors', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    test(`Select align="start" in ${dir}: the listbox lines up with the trigger's ${dir === 'ltr' ? 'left' : 'right'} edge`, async () => {
      await render(
        dir,
        centred(
          <Select.Root defaultOpen aria-label="Period" defaultValue="7d">
            <Select.Trigger />
            <Select.Popup align="start">
              {/* short enough that the listbox never meets the 414 px viewport's edge */}
              <Select.Item value="7d">Last 7 days, rolling</Select.Item>
              <Select.Item value="30d">Last 30 days</Select.Item>
            </Select.Popup>
          </Select.Root>,
        ),
      );
      await until(() => expect(get('select-popup').dataset['side']).toBe('bottom'));
      await settle();
      const popup = get('select-popup').getBoundingClientRect();
      const trigger = get('select-trigger').getBoundingClientRect();
      // the start edge: left in ltr, right in rtl
      const gap = dir === 'ltr' ? popup.left - trigger.left : popup.right - trigger.right;
      expect(Math.abs(gap)).toBeLessThanOrEqual(1);
    });
  }
});

describe('directional glyphs', () => {
  for (const dir of ['ltr', 'rtl'] as const) {
    test(`Pagination's arrows ${dir === 'rtl' ? 'flip' : 'stay'} in ${dir}; its other parts never flip`, async () => {
      await render(dir, <Pagination page={2} totalPages={5} getHref={(page) => `?page=${page}`} />);
      const mirrored = [...document.querySelectorAll<HTMLElement>('[data-mirror="rtl"]')];
      expect(mirrored.length).toBeGreaterThan(0);
      for (const element of mirrored) {
        expect(getComputedStyle(element).scale).toBe(dir === 'rtl' ? '-1 1' : 'none');
      }
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-slot="pagination"] *:not([data-mirror])',
      )) {
        expect(getComputedStyle(element).scale).toBe('none');
      }
    });
  }
});
