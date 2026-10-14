// Input, Textarea and NativeSelect in a real browser (ARCHITECTURE.md §8.5, §16.1, §9.5): server HTML
// hydrates with no mismatch, the Input box is the input's hit area, native validation shows inline
// through the Field, each control draws exactly one focus outline, and a NativeSelect has the Select
// trigger's geometry at every size, so swapping one for the other does not shift layout.
import { createRef, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
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
  // `.nz-input` at (2, 2) is the padding at the box's start edge
  test.each(['.nz-input-icon', '.nz-input-prefix', '.nz-input-suffix', '.nz-input'])(
    'a press on %s focuses the input',
    async (part) => {
      const container = await mount(
        <Input aria-label="Price" leadingIcon={<i>i</i>} prefix="₹" suffix="per kg" />,
      );
      const input = one(container, '.nz-input-control', HTMLInputElement);
      await userEvent.click(one(container, part, HTMLElement), { position: { x: 2, y: 2 } });
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

describe('Textarea height', () => {
  test('rows sets the minimum height, with or without field-sizing', async () => {
    const container = await mount(
      <>
        <Textarea aria-label="Two" rows={2} />
        <Textarea aria-label="Six" rows={6} defaultValue={'a\nb'} />
      </>,
    );
    const [two, six] = [...container.querySelectorAll<HTMLTextAreaElement>('.nz-textarea')];
    if (two === undefined || six === undefined) throw new Error('no textareas');
    const line = Number.parseFloat(getComputedStyle(two).lineHeight);
    expect(six.getBoundingClientRect().height - two.getBoundingClientRect().height).toBeCloseTo(
      4 * line,
      0,
    );
  });

  test('grows with its content where field-sizing is supported, and keeps rows elsewhere', async () => {
    const lines = Array.from({ length: 8 }, (_, i) => `line ${i + 1}`).join('\n');
    const container = await mount(
      <>
        <Textarea aria-label="Empty" rows={2} />
        <Textarea aria-label="Full" rows={2} defaultValue={lines} />
      </>,
    );
    const [empty, full] = [...container.querySelectorAll<HTMLTextAreaElement>('.nz-textarea')];
    if (empty === undefined || full === undefined) throw new Error('no textareas');
    const line = Number.parseFloat(getComputedStyle(empty).lineHeight);
    const grown = full.getBoundingClientRect().height - empty.getBoundingClientRect().height;
    // Six more lines than rows=2 where field-sizing applies (Chromium, WebKit); none on the floor's
    // Firefox 129 and Safari 17.5, which keep the rows height (fixtures/floor-lane w3-controls).
    const expected = CSS.supports('field-sizing', 'content') ? 6 * line : 0;
    expect(grown).toBeCloseTo(expected, 0);
  });
});
