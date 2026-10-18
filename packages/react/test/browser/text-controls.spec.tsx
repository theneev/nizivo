// Input, Textarea and NativeSelect in a real browser (ARCHITECTURE.md §8.5, §16.1, §9.5): server HTML
// hydrates with no mismatch, the Input box is the input's hit area, native validation shows inline
// through the Field, each control draws exactly one focus outline, a NativeSelect has the Select
// trigger's geometry at every size, so swapping one for the other does not shift layout, and under a
// coarse pointer every text field's text is 16 px, so iOS Safari does not zoom on focus (M25).
import { createRef, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import type { ControlSize } from '../../src/augment';
import { Field } from '../../src/field/field';
import { Input } from '../../src/input/input.client';
import { NativeSelect } from '../../src/native-select/native-select';
import { SelectRoot, SelectTrigger, SelectPopup, SelectItem } from '../../src/select/select.client';
import { Textarea } from '../../src/textarea/textarea.client';

// The shipped stylesheets: tokens, the generated a11y floor and each component's own.
const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/input/input.css',
    '../../src/textarea/textarea.css',
    '../../src/native-select/native-select.css',
    '../../src/select/select.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 8)
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

/** Server HTML in the document, then hydration; collects every hydration problem. */
async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const html = renderToString(app);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  const before = container.innerHTML;
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  // hydration adopted the server DOM as it was
  expect(container.innerHTML).toBe(before);
  return { container, problems };
}

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await new Promise((resolve) => setTimeout(resolve, 50));
  return container;
}

function one<T extends Element>(
  container: ParentNode,
  selector: string,
  type: abstract new () => T,
): T {
  const found = container.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`no ${type.name} matches ${selector}`);
  return found;
}

/** Every element that currently draws a solid outline. */
function outlined(): Element[] {
  return [...document.body.querySelectorAll('*')].filter(
    (element) => getComputedStyle(element).outlineStyle === 'solid',
  );
}

function Form({
  onSubmit,
  select = true,
}: {
  onSubmit: () => void;
  select?: boolean;
}): JSX.Element {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label="Title" required messages={{ valueMissing: 'Enter a product title.' }}>
        <Input name="title" prefix="#" />
      </Field>
      <Field label="Description" required messages={{ valueMissing: 'Describe the product.' }}>
        <Textarea name="description" />
      </Field>
      {select && (
        <Field label="Country" required>
          {(control) => (
            <NativeSelect {...control} placeholder="Choose a country">
              <option value="IN">India</option>
            </NativeSelect>
          )}
        </Field>
      )}
      <button type="submit">Save</button>
    </form>
  );
}

describe('hydration and Field wiring', () => {
  test('server HTML hydrates with no recoverable error and no console.error', async () => {
    const { problems } = await hydrate(<Form onSubmit={() => undefined} />);
    expect(problems).toEqual([]);
  });

  test('submit shows the native messages inline and focuses the first invalid control', async () => {
    const onSubmit = vi.fn<() => void>();
    const { container } = await hydrate(<Form onSubmit={onSubmit} select={false} />);
    const form = one(container, 'form', HTMLFormElement);
    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onSubmit).not.toHaveBeenCalled();
    const input = one(container, '.nz-input-control', HTMLInputElement);
    const textarea = one(container, '.nz-textarea', HTMLTextAreaElement);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(one(container, '.nz-input', HTMLElement).hasAttribute('data-invalid')).toBe(true);
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.hasAttribute('data-invalid')).toBe(true);
    const errors = [...container.querySelectorAll('[data-slot="field-error"]')].map(
      (e) => e.textContent,
    );
    expect(errors).toEqual(['Enter a product title.', 'Describe the product.']);
    // the affix id stays joined after the Field's error id
    const described = (input.getAttribute('aria-describedby') ?? '').split(' ');
    expect(described.map((id) => document.getElementById(id)?.textContent)).toEqual([
      'Enter a product title.',
      '#',
    ]);
  });

  test('mixed form: a zero-JS NativeSelect keeps the browser bubble, which takes focus last', async () => {
    // Field cancels its controls' `invalid` events and focuses the first one once the error is
    // rendered; the browser then reports the first control whose event was not cancelled (the
    // zero-JS select) and focuses it. A real click: a script's requestSubmit() would hold React's
    // commit until after the browser's report, which a user's press never does.
    const { container } = await hydrate(<Form onSubmit={() => undefined} />);
    await userEvent.click(one(container, 'button[type="submit"]', HTMLButtonElement));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.activeElement).toBe(one(container, '.nz-native-select-trigger', HTMLElement));
    expect(container.querySelectorAll('[data-slot="field-error"]')).toHaveLength(2);
  });
});

describe('ref', () => {
  test('reaches the native element, so a form library can focus it (§10.6)', async () => {
    const input = createRef<HTMLInputElement>();
    const textarea = createRef<HTMLTextAreaElement>();
    const select = createRef<HTMLSelectElement>();
    await mount(
      <>
        <Input ref={input} aria-label="Title" prefix="#" />
        <Textarea ref={textarea} aria-label="Note" />
        <NativeSelect ref={select} aria-label="Zone">
          <option>Europe</option>
        </NativeSelect>
      </>,
    );
    expect(input.current).toBeInstanceOf(HTMLInputElement);
    expect(textarea.current).toBeInstanceOf(HTMLTextAreaElement);
    expect(select.current).toBeInstanceOf(HTMLSelectElement);
  });
});

describe('Input hit area', () => {
  // `.nz-input` at x = 2, half-way down, is the padding at the box's start edge. Not (2, 2): that is
  // outside the 12 px rounded corner, which Firefox hit-tests and Chromium does not.
  test.each(['.nz-input-icon', '.nz-input-prefix', '.nz-input-suffix', '.nz-input'])(
    'a press on %s focuses the input',
    async (part) => {
      const container = await mount(
        <Input aria-label="Price" leadingIcon={<i>i</i>} prefix="₹" suffix="per kg" />,
      );
      const input = one(container, '.nz-input-control', HTMLInputElement);
      const target = one(container, part, HTMLElement);
      const y = Math.round(target.getBoundingClientRect().height / 2);
      await userEvent.click(target, { position: { x: 2, y } });
      expect(document.activeElement).toBe(input);
    },
  );

  test('a press on the input itself focuses it natively', async () => {
    const container = await mount(<Input aria-label="Price" prefix="₹" />);
    const input = one(container, '.nz-input-control', HTMLInputElement);
    await userEvent.click(input);
    expect(document.activeElement).toBe(input);
  });

  test('a disabled input is not focused by a press on the box', async () => {
    const container = await mount(<Input aria-label="Price" prefix="₹" disabled />);
    await userEvent.click(one(container, '.nz-input-prefix', HTMLElement));
    expect(document.activeElement).toBe(document.body);
  });
});

describe('focus: exactly one 2 px outline, on the visible box (§8.5)', () => {
  test.each([
    ['Input', '.nz-input', <Input key="i" aria-label="Title" />],
    ['Textarea', '.nz-textarea', <Textarea key="t" aria-label="Note" />],
    [
      'NativeSelect',
      '.nz-native-select-trigger',
      <NativeSelect key="n" aria-label="Zone">
        <option>Europe</option>
      </NativeSelect>,
    ],
  ])('%s', async (_name, box, control) => {
    const container = await mount(
      <>
        <button type="button">before</button>
        {control}
      </>,
    );
    one(container, 'button', HTMLButtonElement).focus();
    await userEvent.keyboard('{Tab}');
    const visible = one(container, box, HTMLElement);
    expect(outlined()).toEqual([visible]);
    expect(getComputedStyle(visible).outlineWidth).toBe('2px');
  });
});

/** What decides a control's box and its text position. */
function metrics(css: CSSStyleDeclaration): Record<string, string> {
  return Object.fromEntries(
    [
      'border-top-width',
      'border-inline-start-width',
      'padding-inline-start',
      'font-size',
      'font-weight',
      'line-height',
      'font-family',
    ].map((property) => [property, css.getPropertyValue(property)]),
  );
}

describe('NativeSelect has the Select trigger geometry', () => {
  const SIZES: ControlSize[] = ['sm', 'md', 'lg'];
  test.each(SIZES)('size %s', async (size) => {
    const container = await mount(
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <SelectRoot aria-label="Period" size={size} defaultValue="7d">
          <SelectTrigger />
          <SelectPopup>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectPopup>
        </SelectRoot>
        <NativeSelect aria-label="Period" size={size} defaultValue="7d">
          <option value="7d">Last 7 days</option>
        </NativeSelect>
      </div>,
    );
    const trigger = one(container, '.nz-select-trigger', HTMLElement);
    const native = one(container, '.nz-native-select-trigger', HTMLSelectElement);
    const a = getComputedStyle(trigger);
    const b = getComputedStyle(native);
    expect(native.getBoundingClientRect().height).toBe(trigger.getBoundingClientRect().height);
    expect(one(container, '.nz-native-select', HTMLElement).getBoundingClientRect().height).toBe(
      trigger.getBoundingClientRect().height,
    );
    expect(metrics(b)).toEqual(metrics(a));
    // the chevron: same size, same distance from the end edge
    const chevron = (root: Element, edge: Element): { size: number; end: number } => {
      const rect = one(root, '.nz-glyph-chevrons-up-down', SVGElement).getBoundingClientRect();
      return { size: rect.width, end: edge.getBoundingClientRect().right - rect.right };
    };
    expect(chevron(one(container, '.nz-native-select', HTMLElement), native)).toEqual(
      chevron(one(container, '.nz-select', HTMLElement), trigger),
    );
  });
});

/** The block size `rows` asks for: its lines, the 12 px padding twice and the 1 px border twice. */
const rowsHeight = (el: HTMLTextAreaElement, rows: number): number =>
  rows * Number.parseFloat(getComputedStyle(el).lineHeight) + 2 * 12 + 2 * 1;

describe('Textarea height (Figma 7367:316, M36 #4)', () => {
  test('12 px padding on every side; 112 px minimum; more rows than that grow it', async () => {
    const container = await mount(
      <>
        <Textarea aria-label="Two" rows={2} />
        <Textarea aria-label="Six" rows={6} defaultValue={'a\nb'} />
      </>,
    );
    const [two, six] = [...container.querySelectorAll<HTMLTextAreaElement>('.nz-textarea')];
    if (two === undefined || six === undefined) throw new Error('no textareas');
    const computed = getComputedStyle(two);
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(computed.getPropertyValue(`padding-${side}`)).toBe('12px');
    }
    // with or without field-sizing: rows 2 asks for 2 × 21 + 26 = 68 px, under the minimum
    expect(two.getBoundingClientRect().height).toBeCloseTo(112, 0);
    expect(six.getBoundingClientRect().height).toBeCloseTo(rowsHeight(six, 6), 0);
    expect(rowsHeight(six, 6)).toBeGreaterThan(112);
  });

  test('--nz-textarea-min-block-size lowers the minimum, and rows set the height again', async () => {
    const container = await mount(<Textarea aria-label="Message" rows={1} />);
    const composer = container.querySelector<HTMLTextAreaElement>('.nz-textarea');
    if (composer === null) throw new Error('no textarea');
    composer.style.setProperty('--nz-textarea-min-block-size', '0px');
    expect(composer.getBoundingClientRect().height).toBeCloseTo(rowsHeight(composer, 1), 0);
  });

  test('grows with its content where field-sizing is supported, and keeps its height elsewhere', async () => {
    const lines = Array.from({ length: 8 }, (_, i) => `line ${i + 1}`).join('\n');
    const container = await mount(
      <>
        <Textarea aria-label="Empty" rows={2} />
        <Textarea aria-label="Full" rows={2} defaultValue={lines} />
      </>,
    );
    const [empty, full] = [...container.querySelectorAll<HTMLTextAreaElement>('.nz-textarea')];
    if (empty === undefined || full === undefined) throw new Error('no textareas');
    expect(empty.getBoundingClientRect().height).toBeCloseTo(112, 0);
    // Eight lines where field-sizing applies (Chromium, WebKit); the floor's Firefox 129 and Safari
    // 17.5 keep the minimum and scroll (fixtures/floor-lane w3-controls).
    const expected = CSS.supports('field-sizing', 'content') ? rowsHeight(full, 8) : 112;
    expect(full.getBoundingClientRect().height).toBeCloseTo(expected, 0);
  });
});

/** An element's computed font size, or its pseudo-element's. */
const fontSize = (el: Element, pseudo?: string): string => getComputedStyle(el, pseudo).fontSize;

/** The typed text of every field at one size, their heights and the Select pair's text metrics. */
async function measureFields(size: ControlSize) {
  const container = await mount(
    <>
      <Input aria-label="Title" size={size} placeholder="e.g. Stoneware mug" suffix="kg" />
      <Textarea aria-label="Note" rows={2} placeholder="Add a note" />
      <NativeSelect aria-label="Zone" size={size} placeholder="Choose a zone">
        <option value="eu">Europe</option>
      </NativeSelect>
      <SelectRoot aria-label="Period" size={size} placeholder="Choose a period">
        <SelectTrigger />
        <SelectPopup>
          <SelectItem value="7d">Last 7 days</SelectItem>
        </SelectPopup>
      </SelectRoot>
    </>,
  );
  const input = one(container, '.nz-input-control', HTMLInputElement);
  const textarea = one(container, '.nz-textarea', HTMLTextAreaElement);
  const native = one(container, '.nz-native-select-trigger', HTMLSelectElement);
  const trigger = one(container, '.nz-select-trigger', HTMLElement);
  return {
    text: {
      input: fontSize(input),
      placeholder: fontSize(input, '::placeholder'),
      suffix: fontSize(one(container, '.nz-input-suffix', HTMLElement)),
      textarea: fontSize(textarea),
      textareaPlaceholder: fontSize(textarea, '::placeholder'),
      nativeSelect: fontSize(native),
      selectTrigger: fontSize(trigger),
      selectValue: fontSize(one(container, '.nz-select-value', HTMLElement)),
    },
    heights: {
      input: one(container, '.nz-input', HTMLElement).getBoundingClientRect().height,
      nativeSelect: native.getBoundingClientRect().height,
      selectTrigger: trigger.getBoundingClientRect().height,
    },
    line: Number.parseFloat(getComputedStyle(textarea).lineHeight),
    pair: [metrics(getComputedStyle(native)), metrics(getComputedStyle(trigger))],
  };
}

describe.runIf(server.browser === 'chromium')(
  'text fields under a coarse pointer: 16 px text, heights on the size scale (M25)',
  () => {
    const SIZES: ControlSize[] = ['sm', 'md', 'lg'];

    test.each(SIZES)('size %s', async (size) => {
      const fine = await measureFields(size);
      document.body.replaceChildren();
      expect(matchMedia('(pointer: coarse)').matches).toBe(false);
      const session = cdp();
      // Chromium's touch emulation also switches the primary pointer to coarse (DevTools device mode)
      await session.send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 1,
      });
      try {
        expect(matchMedia('(pointer: coarse)').matches).toBe(true);
        const coarse = await measureFields(size);
        // every field's text, its placeholder and the Input's affix: Body/L or Label/L, 16 px
        for (const value of Object.values(coarse.text)) expect(value).toBe('16px');
        // desktop is untouched: Body/M and Label/M, 14 px
        for (const value of Object.values(fine.text)) expect(value).toBe('14px');
        // the control heights stay on the size scale; only the Textarea's rows grow (Body/L's line)
        expect(coarse.heights).toEqual(fine.heights);
        expect(fine.line).toBeCloseTo(21, 1);
        expect(coarse.line).toBeCloseTo(25.6, 1);
        // a NativeSelect and a Select still swap with no change to the text
        expect(coarse.pair[0]).toEqual(coarse.pair[1]);
      } finally {
        await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      }
    });
  },
);
