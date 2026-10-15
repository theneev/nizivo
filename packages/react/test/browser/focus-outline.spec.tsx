// The solid-outline check of exit criterion 14 (ARCHITECTURE.md §8.5, §21.1): every T0 control,
// reached from the keyboard, draws a solid focus outline of the token width (--nz-border-width-focus)
// and offset (2 px, or -2 px inside a clipped strip through data-focus-inset) on its visible part, in
// the token colour (--nz-border-focus), and nothing else on the page is outlined. Then the same under
// forced colours (Chromium, through the DevTools protocol): the outline stays solid at the token
// width and offset, in a system colour (one known gap, below), and focus still changes how the
// visible part is outlined. axe cannot see this,
// and the T0 parts have no conformance suite. The T1 parts (Select, Menu, Tabs, the overlay
// triggers) are checked by the overlay lane and the Tabs spec.
//
// The T0 controls of v0.1 (§9.5): Button (a <button> and a link through `render`), IconButton
// (and pressed), AlertDismiss, Input, Textarea, NativeSelect, Checkbox (and checked), Radio, Switch
// (and on), a SegmentedControl item and a TabNav link: the states whose forced-colours paint
// (stateIndicator) could take the ring's colour over. Field, Fieldset and the rest of the T0 set draw no focusable part of their own.
//
// Every engine: `NZ_BROWSER=webkit` (or `firefox`) runs it too. Chromium and Firefox must reach every
// control with Tab itself. WebKit on macOS moves Tab only between text fields and lists (it reaches
// Input, Textarea and NativeSelect), so a button, link or box it skips is focused by script right
// after a key press, which keeps the keyboard modality (:focus-visible). Forced colours run in
// Chromium only.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import { Alert, AlertDismiss } from '../../src/alert/index';
import { Button } from '../../src/button/index';
import { Checkbox } from '../../src/checkbox/index';
import { IconButton } from '../../src/icon-button/index';
import { Input } from '../../src/input/index';
import { NativeSelect } from '../../src/native-select/index';
import { Radio, RadioGroup } from '../../src/radio-group/index';
import { SegmentedControl } from '../../src/segmented-control/index';
import { Switch } from '../../src/switch/index';
import { TabNav } from '../../src/tab-nav/index';
import { Textarea } from '../../src/textarea/index';

// The shipped stylesheets: tokens, the generated a11y floor and each control's own.
const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/alert/alert.css',
    '../../src/button/button.css',
    '../../src/checkbox/checkbox.css',
    '../../src/fieldset/fieldset.css',
    '../../src/icon-button/icon-button.css',
    '../../src/input/input.css',
    '../../src/native-select/native-select.css',
    '../../src/radio-group/radio-group.css',
    '../../src/segmented-control/segmented-control.css',
    '../../src/switch/switch.css',
    '../../src/tab-nav/tab-nav.css',
    '../../src/textarea/textarea.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 14)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const isChromium = server.browser === 'chromium';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): ReactElement {
  return <a {...props}>{children}</a>;
}

const Mark = (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

interface Control {
  /** The element keyboard focus lands on. */
  focus: string;
  /** The part that must draw the outline (§8.5 focusTarget: self, within or nested-input). */
  visible: string;
  element: ReactElement;
}

const CONTROLS: Record<string, Control> = {
  Button: { focus: 'button.nz-button', visible: '.nz-button', element: <Button>Save</Button> },
  'Button as a link': {
    focus: 'a.nz-button',
    visible: '.nz-button',
    element: <Button render={<Link href="#orders" />}>Orders</Button>,
  },
  IconButton: {
    focus: '.nz-icon-button',
    visible: '.nz-icon-button',
    element: <IconButton label="Bold" icon={Mark} tooltip={false} />,
  },
  'IconButton, pressed': {
    focus: '.nz-icon-button',
    visible: '.nz-icon-button',
    element: <IconButton label="Bold" icon={Mark} tooltip={false} pressed />,
  },
  AlertDismiss: {
    focus: '.nz-alert-dismiss',
    visible: '.nz-alert-dismiss',
    element: (
      <Alert title="Payout sent" dismiss={<AlertDismiss />}>
        It arrives in two days.
      </Alert>
    ),
  },
  Input: {
    focus: '.nz-input-control',
    visible: '.nz-input',
    element: <Input aria-label="Price" prefix="₹" />,
  },
  Textarea: {
    focus: '.nz-textarea',
    visible: '.nz-textarea',
    element: <Textarea aria-label="Note" />,
  },
  NativeSelect: {
    focus: '.nz-native-select-trigger',
    visible: '.nz-native-select-trigger',
    element: (
      <NativeSelect aria-label="Zone">
        <option>Europe</option>
      </NativeSelect>
    ),
  },
  Checkbox: {
    focus: '.nz-checkbox-input',
    visible: '.nz-checkbox-input',
    element: <Checkbox name="track">Track inventory</Checkbox>,
  },
  'Checkbox, checked': {
    focus: '.nz-checkbox-input',
    visible: '.nz-checkbox-input',
    element: (
      <Checkbox name="track" defaultChecked>
        Track inventory
      </Checkbox>
    ),
  },
  Radio: {
    focus: '.nz-radio-input:checked',
    visible: '.nz-radio-input:checked',
    element: (
      <RadioGroup legend="Shipping" name="shipping" defaultValue="standard">
        <Radio value="standard">Standard</Radio>
        <Radio value="express">Express</Radio>
      </RadioGroup>
    ),
  },
  Switch: {
    focus: '.nz-switch-input',
    visible: '.nz-switch-input',
    element: <Switch name="store">Online store</Switch>,
  },
  'Switch, on': {
    focus: '.nz-switch-input',
    visible: '.nz-switch-input',
    element: (
      <Switch name="store" defaultChecked>
        Online store
      </Switch>
    ),
  },
  'SegmentedControl item': {
    focus: '.nz-segmented-control-input:checked',
    visible: '.nz-segmented-control-item:has(> input:checked)',
    element: (
      <SegmentedControl.Root aria-label="Range" defaultValue="30d">
        <SegmentedControl.Item value="7d">7D</SegmentedControl.Item>
        <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
      </SegmentedControl.Root>
    ),
  },
  'TabNav link': {
    focus: '.nz-tab-nav-link',
    visible: '.nz-tab-nav-link',
    element: (
      <TabNav.Root aria-label="Order status">
        <TabNav.Link href="#all" current>
          All orders
        </TabNav.Link>
        <TabNav.Link href="#archived">Archived</TabNav.Link>
      </TabNav.Root>
    ),
  },
};

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
});

async function frames(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** A text field (every engine moves Tab out of one), then the control. */
async function mount(control: Control): Promise<{ before: HTMLInputElement; root: HTMLElement }> {
  const container = document.createElement('div');
  container.style.padding = '8px';
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(
    <>
      <input aria-label="Before" data-before="" />
      {control.element}
    </>,
  );
  await frames();
  const before = container.querySelector('[data-before]');
  if (!(before instanceof HTMLInputElement)) throw new Error('no text field to start from');
  return { before, root: container };
}

function one(container: ParentNode, selector: string): HTMLElement {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
}

interface Ring {
  style: string;
  width: string;
  offset: string;
  color: string;
}

function ring(element: Element): Ring {
  const css = getComputedStyle(element);
  return {
    style: css.outlineStyle,
    width: css.outlineWidth,
    offset: css.outlineOffset,
    color: css.outlineColor,
  };
}

/** Every element that currently draws a solid outline. */
function outlined(): Element[] {
  return [...document.body.querySelectorAll('*')].filter(
    (element) => getComputedStyle(element).outlineStyle === 'solid',
  );
}

/**
 * A token resolved where `near` is, as computed: a length, or a colour through `color` (exempt from
 * forced colours, so it is the token's own value there too).
 */
function token(near: Element, property: 'color' | 'width', name: string): string {
  const probe = document.createElement('span');
  probe.style.forcedColorAdjust = 'none';
  if (property === 'color') probe.style.color = `var(${name})`;
  else probe.style.outline = `var(${name}) solid`;
  near.parentElement?.append(probe);
  const css = getComputedStyle(probe);
  const value = property === 'color' ? css.color : css.outlineWidth;
  probe.remove();
  return value;
}

/**
 * Focuses the control from the keyboard: Tab from the text field before it. Where the engine's Tab
 * skips it (WebKit on macOS), script focus right after the key press, as the header explains.
 * Returns how focus arrived.
 */
async function keyboardFocus(before: HTMLInputElement, target: HTMLElement): Promise<string> {
  before.focus();
  await userEvent.keyboard('{Tab}');
  await frames(20);
  if (document.activeElement === target) return 'tab';
  target.focus();
  await frames(20);
  return 'script after a key';
}

describe('focus outline on every T0 control (exit criterion 14)', () => {
  test.each(Object.entries(CONTROLS))('%s', async (_name, control) => {
    const { before, root } = await mount(control);
    const target = one(root, control.focus);
    const visible = one(root, control.visible);
    const width = token(visible, 'width', '--nz-border-width-focus');
    const colour = token(visible, 'color', '--nz-border-focus');
    const offset = visible.closest('[data-focus-inset]') === null ? '2px' : '-2px';

    const via = await keyboardFocus(before, target);
    // WebKit on macOS Tabs only into the text fields and the select; every other engine, everywhere
    expect(server.browser === 'webkit' || via === 'tab').toBe(true);
    expect(document.activeElement).toBe(target);
    // exactly one outline on the page, on the visible part, in the token width, offset and colour
    expect(outlined()).toEqual([visible]);
    expect(ring(visible)).toEqual({ style: 'solid', width, offset, color: colour });
  });
});

describe.runIf(isChromium)('focus outline in forced colours (exit criterion 14)', () => {
  test.each(Object.entries(CONTROLS))('%s', async (_name, control) => {
    const session = cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'forced-colors', value: 'active' }],
    });
    try {
      const { before, root } = await mount(control);
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
      const target = one(root, control.focus);
      const visible = one(root, control.visible);
      const width = token(visible, 'width', '--nz-border-width-focus');
      const colour = token(visible, 'color', '--nz-border-focus');
      const offset = visible.closest('[data-focus-inset]') === null ? '2px' : '-2px';
      before.focus();
      await frames(20);
      const unfocused = ring(visible);

      expect(await keyboardFocus(before, target)).toBe('tab');
      const focused = ring(visible);
      // The system colours replace the token colour; the outline itself must stay.
      expect({ style: focused.style, width: focused.width, offset: focused.offset }).toEqual({
        style: 'solid',
        width,
        offset,
      });
      expect(focused.color).not.toMatch(/^rgba\(.*, 0\)$|^transparent$/);
      // The user's palette paints the ring: a system colour, never the token green. A checked
      // Checkbox, Radio or Switch opts out of forced colours (forced-color-adjust: none) to paint its
      // Highlight fill, so the generated rule sets outline-color: CanvasText (week 6 fix).
      expect(focused.color).not.toBe(colour);
      // Focus must change something a user sees: a part already outlined in forced colours (the
      // checked segment's Highlight outline) still has to move or recolour its outline.
      expect(focused).not.toEqual(unfocused);
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  });
});
