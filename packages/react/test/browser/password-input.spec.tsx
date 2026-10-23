// PasswordInput in a browser (ARCHITECTURE.md §16.1 D20, gap report A §4): hydration, the toggle
// (aria-pressed with a constant name, by pointer and keyboard), the revert to type="password" on
// its form's submit (a plain form and a React action), the box's hit area, Field validation, and
// one focus outline at a time.
import { useActionState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import { Field } from '../../src/field/field';
import { PasswordInput } from '../../src/password-input/password-input.client';

const isWebKit = server.browser === 'webkit';
const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/inline-error/inline-error.css',
    '../../src/field/field.css',
    '../../src/input/input.css',
    '../../src/password-input/password-input.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 6)
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

async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const before = container.innerHTML;
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  expect(container.innerHTML).toBe(before);
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

function parts(container: ParentNode): {
  box: HTMLElement;
  input: HTMLInputElement;
  toggle: HTMLButtonElement;
} {
  const box = container.querySelector('.nz-password-input');
  const input = container.querySelector('.nz-password-input-control');
  const toggle = container.querySelector('.nz-password-input-toggle');
  if (
    !(box instanceof HTMLElement) ||
    !(input instanceof HTMLInputElement) ||
    !(toggle instanceof HTMLButtonElement)
  ) {
    throw new Error('no PasswordInput');
  }
  return { box, input, toggle };
}

function outlined(): Element[] {
  return [...document.body.querySelectorAll('*')].filter(
    (element) => getComputedStyle(element).outlineStyle === 'solid',
  );
}

describe('the toggle', () => {
  test('hydrates with no mismatch; a press shows the password, a second hides it', async () => {
    const onVisibleChange = vi.fn<(visible: boolean, details: { reason: string }) => void>();
    const { container, problems } = await hydrate(
      <Field label="Password">
        <PasswordInput defaultValue="hunter2" onVisibleChange={onVisibleChange} />
      </Field>,
    );
    expect(problems).toEqual([]);
    const { input, toggle } = parts(container);
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-controls')).toBe(input.id);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(toggle);
    expect(input.type).toBe('text');
    expect(input.value).toBe('hunter2');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    // the name never changes: the pressed state carries it
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(toggle.querySelector('.nz-glyph-eye-off')).not.toBeNull();
    expect(onVisibleChange).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ reason: 'toggle' }),
    );

    await userEvent.click(toggle);
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.querySelector('.nz-glyph-eye')).not.toBeNull();
    expect(onVisibleChange).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ reason: 'toggle' }),
    );
  });

  test('keyboard: Tab goes from the input to the toggle; Space and Enter press it', async () => {
    const container = await mount(<PasswordInput aria-label="Password" />);
    const { input, toggle } = parts(container);
    input.focus();
    await userEvent.keyboard('{Tab}');
    // WebKit on macOS does not Tab to a button by default (CLAUDE.md): focus it by script there
    if (isWebKit && document.activeElement !== toggle) toggle.focus();
    expect(document.activeElement).toBe(toggle);
    await userEvent.keyboard(' ');
    expect(input.type).toBe('text');
    await userEvent.keyboard('{Enter}');
    expect(input.type).toBe('password');
  });

  test('one focus outline at a time: the box’s on the input, the toggle’s on the toggle', async () => {
    const container = await mount(
      <>
        <button type="button">before</button>
        <PasswordInput aria-label="Password" />
      </>,
    );
    const { box, toggle } = parts(container);
    container.querySelector('button')?.focus();
    await userEvent.keyboard('{Tab}');
    expect(outlined()).toEqual([box]);
    await userEvent.keyboard('{Tab}');
    if (isWebKit && document.activeElement !== toggle) toggle.focus();
    expect(document.activeElement).toBe(toggle);
    expect(outlined()).toEqual([toggle]);
    expect(getComputedStyle(toggle).outlineWidth).toBe('2px');
  });

  test('a press on the box’s padding focuses the input; the toggle keeps its own press', async () => {
    const container = await mount(<PasswordInput aria-label="Password" />);
    const { box, input, toggle } = parts(container);
    // the start padding, halfway down: (2, 2) is in the rounded corner, which Firefox hit-tests as
    // outside the box
    await userEvent.click(box, { position: { x: 2, y: box.getBoundingClientRect().height / 2 } });
    expect(document.activeElement).toBe(input);
    await userEvent.click(toggle);
    // WebKit on macOS does not focus a button on click
    expect(isWebKit || document.activeElement === toggle).toBe(true);
    expect(input.type).toBe('text');
  });

  test('a disabled Field disables the toggle', async () => {
    const container = await mount(
      <Field label="Password" disabled>
        <PasswordInput />
      </Field>,
    );
    const { input, toggle } = parts(container);
    expect(toggle.disabled).toBe(true);
    toggle.click();
    await settle();
    expect(input.type).toBe('password');
  });
});

describe('hidden again on submit', () => {
  test('a plain form: the submit turns it back to a password before the handler runs', async () => {
    const seen: string[] = [];
    const onVisibleChange = vi.fn<(visible: boolean, details: { reason: string }) => void>();
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.querySelector('input');
          seen.push(input?.type ?? '');
        }}
      >
        <PasswordInput
          aria-label="Password"
          defaultValue="hunter2"
          onVisibleChange={onVisibleChange}
        />
        <button type="submit">Sign in</button>
      </form>,
    );
    const { input, toggle } = parts(container);
    await userEvent.click(toggle);
    expect(input.type).toBe('text');
    await userEvent.click(container.querySelector('button[type="submit"]') ?? toggle);
    await settle();
    expect(seen).toEqual(['password']);
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(onVisibleChange).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ reason: 'submit' }),
    );
  });

  test('a React action: hidden on submit, and the value is submitted', async () => {
    const received: string[] = [];
    function SignIn(): JSX.Element {
      const [, action] = useActionState((_: null, data: FormData) => {
        const value = data.get('password');
        received.push(typeof value === 'string' ? value : '');
        return null;
      }, null);
      return (
        <form action={action}>
          <PasswordInput aria-label="Password" name="password" />
          <button type="submit">Sign in</button>
        </form>
      );
    }
    const container = await mount(<SignIn />);
    const { input, toggle } = parts(container);
    await userEvent.type(input, 'correct horse');
    await userEvent.click(toggle);
    expect(input.type).toBe('text');
    await userEvent.click(container.querySelector('button[type="submit"]') ?? toggle);
    await vi.waitFor(() => expect(received).toEqual(['correct horse']));
    expect(input.type).toBe('password');
  });

  test('a submit of another form leaves it shown', async () => {
    const container = await mount(
      <>
        <form>
          <PasswordInput aria-label="Password" />
        </form>
        <form onSubmit={(event) => event.preventDefault()}>
          <button type="submit">Other</button>
        </form>
      </>,
    );
    const { input, toggle } = parts(container);
    await userEvent.click(toggle);
    await userEvent.click(container.querySelector('button[type="submit"]') ?? toggle);
    await settle();
    expect(input.type).toBe('text');
  });
});

describe('inside a Field', () => {
  test('a required, empty password: the message inline and focus on the input, no submit', async () => {
    const onSubmit = vi.fn<() => void>();
    const container = await mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Password" required messages={{ valueMissing: 'Enter your password.' }}>
          <PasswordInput />
        </Field>
        <button type="submit">Sign in</button>
      </form>,
    );
    const { input } = parts(container);
    await userEvent.click(container.querySelector('button[type="submit"]') ?? input);
    await settle();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(error?.textContent).toBe('Enter your password.');
  });
});
