// The Field announcer (M29, ARCHITECTURE.md §16.5's one exception; src/field/FIELD-CONTRACT.md "The
// announcer"), in a real engine with real key presses. The region is in the server HTML, empty, before
// any message exists; it speaks an error once, and only when focus is already in the Field (where a
// focus move would not read it); typing, a focus move and the first render say nothing. Chromium
// also reads the region and the control back from its accessibility tree (DevTools protocol). What a
// screen reader then speaks is the accessibility owner's manual pass (NIZ-78), not this file's.
import {
  StrictMode,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type JSX,
  type ReactNode,
} from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import { mergeProps } from '../../src/contracts/merge-props';
import { Field } from '../../src/field/field';
import { useFieldControl } from '../../src/field/field-scope.client';

/** The contract's reference control shape (FIELD-CONTRACT.md), a stand-in for Input. */
function Control({
  id,
  name,
  required,
  'aria-describedby': describedBy,
  ...rest
}: ComponentPropsWithRef<'input'>): JSX.Element {
  const field = useFieldControl({ id, name, required, 'aria-describedby': describedBy });
  return <input {...mergeProps(field.controlProps, rest)} />;
}

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * Server HTML in the document, then hydration. `before` runs on the server DOM before any client
 * code (to focus a control as a fast user would); `regions` are the live regions as the server HTML
 * created them, so a test can check hydration kept those very nodes.
 */
async function hydrate(
  app: ReactNode,
  before?: (container: HTMLElement) => void,
): Promise<{ container: HTMLElement; problems: unknown[]; regions: Element[] }> {
  const tree = <Ready>{app}</Ready>;
  const container = document.createElement('div');
  container.innerHTML = renderToString(tree);
  document.body.append(container);
  before?.(container);
  const regions = [...container.querySelectorAll('[aria-live]')];
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, tree, { onRecoverableError: (error) => problems.push(error) }));
  await vi.waitFor(() => expect(container.querySelector('[data-ready]')).not.toBeNull());
  return { container, problems, regions };
}

function input(container: HTMLElement, id: string): HTMLInputElement {
  const element = container.querySelector(`#${id}`);
  if (!(element instanceof HTMLInputElement)) throw new Error(`no #${id}`);
  return element;
}

/** The announcer of the Field around `control`. */
function regionOf(control: Element): HTMLElement {
  const region = control.closest('[data-slot="field"]')?.querySelector(':scope > [aria-live]');
  if (!(region instanceof HTMLElement)) throw new Error('no announcer');
  return region;
}

/** Every text the region holds after each change, in order: what a live region would announce. */
function record(region: HTMLElement): string[] {
  const texts: string[] = [];
  new MutationObserver(() => texts.push(region.textContent ?? '')).observe(region, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  return texts;
}

function errorOf(control: Element): string {
  return (
    control.closest('[data-slot="field"]')?.querySelector('[data-slot="field-error"]')
      ?.textContent ?? ''
  );
}

/** Two frames: long enough for React to commit whatever a finished event scheduled. */
async function frames(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/**
 * Marks the tree once hydration has run every effect (a parent's run after its children's), so a
 * test waits on that signal and never on a fixed delay.
 */
function Ready({ children }: { children: ReactNode }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.setAttribute('data-ready', ''), []);
  return <div ref={ref}>{children}</div>;
}

/** Native validation: a required Title, an optional email, a server-safe zero-JS Field. */
function NativeForm(): JSX.Element {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <Field
        label="Title"
        ids={{ control: 'title' }}
        required
        messages={{ valueMissing: 'Enter a product title' }}
      >
        <Control />
      </Field>
      <Field
        label="Email"
        ids={{ control: 'email' }}
        messages={{ typeMismatch: 'Enter an email address' }}
      >
        <Control type="email" />
      </Field>
      <Field label="Notes">{(control) => <input {...control} />}</Field>
      <button type="submit">Save</button>
    </form>
  );
}

/** One required email: its message changes with what is typed. */
function EmailForm(): JSX.Element {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <Field
        label="Email"
        ids={{ control: 'email' }}
        required
        messages={{ valueMissing: 'Enter your email', typeMismatch: 'Enter an email like a@b.in' }}
      >
        <Control type="email" />
      </Field>
    </form>
  );
}

describe('the region exists before the message', () => {
  test('server HTML: one empty polite region per client Field, last in it; none on the zero-JS path', async () => {
    const html = renderToString(<NativeForm />);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const fields = [...doc.querySelectorAll('[data-slot="field"]')];
    expect(fields).toHaveLength(3);
    // Title and Email (FieldScope); the zero-JS Notes Field renders no client code and no region
    expect(fields.map((field) => field.querySelectorAll('[aria-live]').length)).toEqual([1, 1, 0]);
    for (const field of fields.slice(0, 2)) {
      const region = field.querySelector('[aria-live]');
      expect(region?.outerHTML).toBe(
        '<span class="nz-visually-hidden" aria-live="polite" aria-atomic="true"></span>',
      );
      expect(region?.parentElement?.lastElementChild).toBe(region);
    }
    expect(
      doc.querySelectorAll('[role="alert"], [role="status"], [aria-live="assertive"]'),
    ).toHaveLength(0);
  });

  test('hydration keeps the server nodes, with no mismatch, and says nothing', async () => {
    const { container, problems, regions } = await hydrate(
      <StrictMode>
        <NativeForm />
      </StrictMode>,
    );
    expect(problems).toEqual([]);
    expect(regions).toHaveLength(2);
    expect([...container.querySelectorAll('[aria-live]')]).toEqual(regions);
    for (const region of regions) expect(region.textContent).toBe('');
  });

  test('a server error, focus already in its control at hydration (Strict Mode): nothing is spoken', async () => {
    const app = (
      <StrictMode>
        <form>
          <Field label="Price" ids={{ control: 'price' }} error="Enter a price above zero.">
            <Control defaultValue="0" />
          </Field>
        </form>
      </StrictMode>
    );
    let texts: string[] = [];
    const { container, problems } = await hydrate(app, (dom) => {
      input(dom, 'price').focus();
      texts = record(regionOf(input(dom, 'price')));
    });
    await frames();
    expect(problems).toEqual([]);
    expect(document.activeElement).toBe(input(container, 'price'));
    expect(texts).toEqual([]);
    expect(regionOf(input(container, 'price')).textContent).toBe('');
  });
});

describe('native validation', () => {
  test('Enter in the focused first invalid control: focus stays, the error is spoken once', async () => {
    const { container, regions } = await hydrate(<NativeForm />);
    const title = input(container, 'title');
    const region = regionOf(title);
    // the node the server HTML created, live before the message exists
    expect(region).toBe(regions[0]);
    expect(region.textContent).toBe('');
    const texts = record(region);
    const others = record(regionOf(input(container, 'email')));
    await userEvent.click(title);
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(region.textContent).toBe('Enter a product title'));
    expect(document.activeElement).toBe(title);
    expect(errorOf(title)).toBe('Enter a product title');
    // the region the server rendered received the text, once; no other Field spoke
    expect(texts).toEqual(['Enter a product title']);
    await frames();
    expect(texts).toEqual(['Enter a product title']);
    expect(others).toEqual([]);
  });

  test('a submit from the button moves focus to the control, whose description reads it: silent', async () => {
    const { container } = await hydrate(<NativeForm />);
    const title = input(container, 'title');
    const texts = record(regionOf(title));
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(document.activeElement).toBe(title));
    expect(title.getAttribute('aria-invalid')).toBe('true');
    await frames();
    expect(texts).toEqual([]);
  });

  test('a later invalid control that holds focus stays silent while focus moves to the first', async () => {
    const { container } = await hydrate(<NativeForm />);
    const title = input(container, 'title');
    const email = input(container, 'email');
    const texts = [record(regionOf(title)), record(regionOf(email))];
    await userEvent.click(email);
    await userEvent.keyboard('x{Enter}');
    await vi.waitFor(() => expect(document.activeElement).toBe(title));
    expect(errorOf(email)).toBe('Enter an email address');
    await frames();
    expect(texts).toEqual([[], []]);
  });

  // The form's first invalid control is not a client Field (a plain input, or a zero-JS Field):
  // nothing in the commit moves focus, so the browser does, after the Field has seen `invalid`
  test.each([
    ['a plain input', <input key="plain" id="plain" aria-label="Plain" required />],
    [
      'a zero-JS Field',
      <Field key="code" label="Code" ids={{ control: 'code' }} required>
        {(control) => <input {...control} />}
      </Field>,
    ],
  ])(
    'Enter in a client Field after %s that is invalid: focus leaves, nothing is spoken',
    async (_kind, before) => {
      const { container } = await hydrate(
        <form onSubmit={(event) => event.preventDefault()}>
          {before}
          <Field
            label="Title"
            ids={{ control: 'title' }}
            required
            messages={{ valueMissing: 'Enter a product title' }}
          >
            <Control />
          </Field>
          <button type="submit">Save</button>
        </form>,
      );
      const title = input(container, 'title');
      const texts = record(regionOf(title));
      await userEvent.click(title);
      await userEvent.keyboard('{Enter}');
      await vi.waitFor(() => expect(document.activeElement).not.toBe(title));
      await frames();
      expect(texts).toEqual([]);
      // the browser's own message bubble is open on that control; leaving the control closes it,
      // so it cannot take the next test's first click (Firefox)
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    },
  );

  test('the same message again is not repeated; typing is silent; a message typing changed is spoken on the next Enter', async () => {
    const { container } = await hydrate(<EmailForm />);
    const email = input(container, 'email');
    const region = regionOf(email);
    const texts = record(region);
    await userEvent.click(email);
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(region.textContent).toBe('Enter your email'));
    await userEvent.keyboard('{Enter}');
    await frames();
    expect(texts).toEqual(['Enter your email']);
    // typing changes the message, silently: the region is emptied, never given the new text
    await userEvent.keyboard('x');
    await vi.waitFor(() => expect(errorOf(email)).toBe('Enter an email like a@b.in'));
    await frames();
    expect(texts).toEqual(['Enter your email', '']);
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(region.textContent).toBe('Enter an email like a@b.in'));
    expect(texts).toEqual(['Enter your email', '', 'Enter an email like a@b.in']);
    // fixed: the error and the region clear together, and nothing is spoken
    await userEvent.keyboard('@b.in');
    await vi.waitFor(() => expect(email.hasAttribute('aria-invalid')).toBe(false));
    expect(texts.at(-1)).toBe('');
  });

  test('the region is emptied 7 s after it speaks; the error stays', async () => {
    const { container } = await hydrate(<EmailForm />);
    const email = input(container, 'email');
    const region = regionOf(email);
    email.focus();
    // only the timers; frames (not vi.waitFor, which advances fake time) wait for React's commits
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    email.form?.requestSubmit();
    await frames();
    expect(region.textContent).toBe('Enter your email');
    vi.advanceTimersByTime(6999);
    await frames();
    expect(region.textContent).toBe('Enter your email');
    vi.advanceTimersByTime(1);
    await frames();
    expect(region.textContent).toBe('');
    expect(errorOf(email)).toBe('Enter your email');
    expect(document.activeElement).toBe(email);
    // a reader moving through the form now meets the error once, as visible text
    vi.useRealTimers();
    await expect.element(page.elementLocator(container)).toMatchAriaInlineSnapshot(`
      - text: Email
      - textbox "Email"
      - text: Enter your email
    `);
  });
});

/**
 * A Server Action or a form library: the error comes back as the `error` prop, after a delay; with
 * `node`, as an element rebuilt on every render (`error` is a ReactNode, not only a string).
 */
function Served({ answers, node = false }: { answers: string[]; node?: boolean }): JSX.Element {
  const [error, setError] = useState('Enter a title');
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState('');
  function submit(event: FormEvent): void {
    event.preventDefault();
    setPending(true);
    const next = answers.shift() ?? '';
    // the reply arrives in a later task, as a server's does
    setTimeout(() => {
      setError(next);
      setPending(false);
    }, 30);
  }
  const message = typed === 'live' ? 'Checked as you type' : error;
  return (
    <form data-pending={pending || undefined} onSubmit={submit}>
      <Field
        label="Title"
        ids={{ control: 'title' }}
        error={node && message !== '' ? <span>{message}</span> : message}
      >
        {/* a pending re-render reaches FieldScope with the old error */}
        <Control
          data-pending={pending || undefined}
          onInput={(e) => setTyped(e.currentTarget.value)}
        />
      </Field>
      <button type="submit">Save</button>
    </form>
  );
}

describe('the error prop', () => {
  test.each([
    ['a string', false],
    ['an element', true],
  ])(
    '%s: a new error after a submit from inside is spoken once; a pending re-render and the same reply are not',
    async (_kind, node) => {
      const answers = ['Title is taken', 'Title is taken'];
      const { container } = await hydrate(<Served answers={answers} node={node} />);
      const title = input(container, 'title');
      const region = regionOf(title);
      const texts = record(region);
      await userEvent.click(title);
      await userEvent.keyboard('{Enter}');
      await vi.waitFor(() => expect(region.textContent).toBe('Title is taken'));
      expect(container.querySelector('form')?.hasAttribute('data-pending')).toBe(false);
      expect(texts).toEqual(['Title is taken']);
      // the same reply again: no change, nothing new
      await userEvent.keyboard('{Enter}');
      await vi.waitFor(() =>
        expect(container.querySelector('form')?.hasAttribute('data-pending')).toBe(false),
      );
      await frames();
      expect(texts).toEqual(['Title is taken']);
      // that request found nothing new to say; typing now withdraws it, so an error the app derives
      // from the keystrokes stays silent
      await userEvent.keyboard('live');
      await vi.waitFor(() => expect(errorOf(title)).toBe('Checked as you type'));
      await frames();
      expect(texts).toEqual(['Title is taken', '']);
    },
  );

  test('an app that clears its errors when a submit starts: each new reply is spoken', async () => {
    const answers = ['Title is taken', 'Title is too long'];
    function ClearFirst(): JSX.Element {
      const [error, setError] = useState('');
      function submit(event: FormEvent): void {
        event.preventDefault();
        setError('');
        const next = answers.shift() ?? '';
        setTimeout(() => setError(next), 30);
      }
      return (
        <form noValidate onSubmit={submit}>
          <Field label="Title" ids={{ control: 'title' }} error={error}>
            <Control />
          </Field>
        </form>
      );
    }
    const { container } = await hydrate(<ClearFirst />);
    const title = input(container, 'title');
    const region = regionOf(title);
    const texts = record(region);
    await userEvent.click(title);
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(region.textContent).toBe('Title is taken'));
    // the clearing commit empties the region but keeps the request, so the reply is spoken
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(region.textContent).toBe('Title is too long'));
    expect(document.activeElement).toBe(title);
    expect(texts).toEqual(['Title is taken', '', 'Title is too long']);
  });

  test('an error the app derives while the user types is silent', async () => {
    const { container } = await hydrate(<Served answers={[]} />);
    const title = input(container, 'title');
    const texts = record(regionOf(title));
    await userEvent.click(title);
    await userEvent.keyboard('live');
    await vi.waitFor(() => expect(errorOf(title)).toBe('Checked as you type'));
    await frames();
    expect(texts).toEqual([]);
  });

  test('a submit from the button: the reply is not spoken in a Field focus is not in', async () => {
    const { container } = await hydrate(<Served answers={['Title is taken']} />);
    const title = input(container, 'title');
    const texts = record(regionOf(title));
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(errorOf(title)).toBe('Title is taken'));
    await frames();
    expect(texts).toEqual([]);
  });
});

describe('what assistive technology is given', () => {
  test('aria snapshot: the control keeps its name and description; the spoken text sits in the region', async () => {
    const { container } = await hydrate(<EmailForm />);
    const email = input(container, 'email');
    await userEvent.click(email);
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(regionOf(email).textContent).toBe('Enter your email'));
    await expect.element(page.elementLocator(container)).toMatchAriaInlineSnapshot(`
      - text: Email
      - textbox "Email"
      - text: Enter your email Enter your email
    `);
  });

  describe.runIf(server.browser === 'chromium')('Chromium accessibility tree', () => {
    test('the region is a polite atomic live root before and after; the control is invalid and described', async () => {
      const { container } = await hydrate(<EmailForm />);
      const email = input(container, 'email');
      const session = cdp();
      // The tests run in an iframe: find each element through the whole tree by a probe attribute.
      const node = async (element: Element): Promise<AXNode> => {
        element.setAttribute('data-probe', 'ax');
        try {
          const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
          const backendNodeId = find(root);
          if (backendNodeId === undefined) throw new Error('the probe is not in the DOM tree');
          const { nodes } = await session.send('Accessibility.getPartialAXTree', {
            backendNodeId,
            fetchRelatives: false,
          });
          const found = nodes[0] as AXNode | undefined;
          if (found === undefined) throw new Error('no accessibility node');
          return found;
        } finally {
          element.removeAttribute('data-probe');
        }
      };
      const region = regionOf(email);
      const before = await node(region);
      expect(property(before, 'live')).toBe('polite');
      expect(property(before, 'atomic')).toBe(true);
      expect(before.ignored).toBe(false);

      await userEvent.click(email);
      await userEvent.keyboard('{Enter}');
      await vi.waitFor(() => expect(regionOf(email).textContent).toBe('Enter your email'));
      const after = await node(region);
      expect(property(after, 'live')).toBe('polite');
      expect(after.name?.value ?? '').toBe('');
      const control = await node(email);
      expect(property(control, 'invalid')).toBe('true');
      expect(control.description?.value).toBe('Enter your email');
      expect(control.name?.value).toBe('Email');
    });
  });
});

interface AXValue {
  type: string;
  value?: unknown;
}
interface AXNode {
  ignored: boolean;
  name?: AXValue;
  description?: AXValue;
  properties?: { name: string; value: AXValue }[];
}

interface DOMNode {
  backendNodeId: number;
  attributes?: string[];
  children?: DOMNode[];
  contentDocument?: DOMNode;
  shadowRoots?: DOMNode[];
}

/** The backend id of the node that carries `data-probe="ax"`, in any frame. */
function find(node: DOMNode): number | undefined {
  const attributes = node.attributes ?? [];
  for (let i = 0; i < attributes.length; i += 2) {
    if (attributes[i] === 'data-probe' && attributes[i + 1] === 'ax') return node.backendNodeId;
  }
  for (const child of [
    ...(node.children ?? []),
    ...(node.shadowRoots ?? []),
    ...(node.contentDocument ? [node.contentDocument] : []),
  ]) {
    const found = find(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

function property(node: AXNode, name: string): unknown {
  return node.properties?.find((entry) => entry.name === name)?.value.value;
}
