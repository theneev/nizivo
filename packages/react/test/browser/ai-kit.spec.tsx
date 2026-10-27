// The AI kit's client parts in a browser (ARCHITECTURE.md §21.4a, D-dn): FeedbackBar (hydration,
// the votes as toggles by pointer and keyboard, the thanks in the live region, the reasons after a
// thumbs down) and ApprovalCard (focus on Cancel when it mounts, Escape cancels, the confirm and
// Edit first), and ResponseBlock's live region while it streams.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import { ApprovalCard } from '../../src/unstable/approval-card/approval-card.client';
import {
  FeedbackBar,
  type FeedbackValue,
} from '../../src/unstable/feedback-bar/feedback-bar.client';
import { ResponseBlock } from '../../src/unstable/response-block/response-block';

// WebKit on macOS focuses no button on click and Tabs past buttons (CLAUDE.md, known failures)
const isWebKit = server.browser === 'webkit';
const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/icon-button/icon-button.css',
    '../../src/chip-group/chip-group.css',
    '../../src/unstable/ai-badge/ai-badge.css',
    '../../src/unstable/feedback-bar/feedback-bar.css',
    '../../src/unstable/approval-card/approval-card.css',
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

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

async function hydrate(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const before = container.innerHTML;
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  expect(container.innerHTML).toBe(before);
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

const REASONS = ['Not accurate', 'Too long'];

function votes(container: HTMLElement): [HTMLButtonElement, HTMLButtonElement] {
  const [up, down] = container.querySelectorAll<HTMLButtonElement>(
    '[data-slot="feedback-bar-vote"]',
  );
  if (up === undefined || down === undefined) throw new Error('no votes');
  return [up, down];
}

const prompt = (container: HTMLElement): string =>
  container.querySelector('[data-slot="feedback-bar-prompt"]')?.textContent ?? '';

function Controlled(): JSX.Element {
  const [value, setValue] = useState<FeedbackValue>('down');
  return (
    <FeedbackBar value={value} onValueChange={(next) => setValue(next === 'up' ? 'up' : value)} />
  );
}

describe('FeedbackBar', () => {
  test('hydrates, names its group by the prompt, and keeps constant vote names', async () => {
    const container = await hydrate(<FeedbackBar reasons={REASONS} />);
    const group = container.querySelector<HTMLElement>('[data-slot="feedback-bar"]');
    expect(group?.getAttribute('role')).toBe('group');
    const label = document.getElementById(group?.getAttribute('aria-labelledby') ?? '');
    expect(label?.textContent).toBe('Was this helpful?');
    expect(label?.getAttribute('aria-live')).toBe('polite');
    const [up, down] = votes(container);
    expect(up.getAttribute('aria-label')).toBe('Good answer');
    expect(down.getAttribute('aria-label')).toBe('Bad answer');
    expect(up.getAttribute('aria-pressed')).toBe('false');
  });

  test('a vote toggles: pressed, the thanks, and pressing it again clears it', async () => {
    const changes: FeedbackValue[] = [];
    const container = await mount(<FeedbackBar onValueChange={(value) => changes.push(value)} />);
    const [up, down] = votes(container);
    await userEvent.click(up);
    expect(up.getAttribute('aria-pressed')).toBe('true');
    expect(prompt(container)).toBe('Thanks — glad it helped.');
    // the vote keeps focus: the thanks replaces the prompt, not the button
    expect(isWebKit || document.activeElement === up).toBe(true);
    await userEvent.click(down);
    expect(up.getAttribute('aria-pressed')).toBe('false');
    expect(down.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(down);
    expect(down.getAttribute('aria-pressed')).toBe('false');
    expect(prompt(container)).toBe('Was this helpful?');
    expect(changes).toEqual(['up', 'down', null]);
  });

  test('the keyboard votes too', async () => {
    const container = await mount(<FeedbackBar />);
    const [up] = votes(container);
    up.focus();
    await userEvent.keyboard('{Enter}');
    expect(up.getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard(' ');
    expect(up.getAttribute('aria-pressed')).toBe('false');
  });

  test('reasons show only after a thumbs down, one to pick', async () => {
    const picked: string[] = [];
    const container = await mount(
      <FeedbackBar reasons={REASONS} onReasonChange={(reason) => picked.push(reason)} />,
    );
    expect(container.querySelector('[data-slot="chip-group"]')).toBeNull();
    await userEvent.click(votes(container)[1]);
    const group = container.querySelector<HTMLElement>('[data-slot="chip-group"]');
    expect(group?.getAttribute('aria-label')).toBe('What went wrong');
    expect(prompt(container)).toBe('Thanks. What went wrong?');
    const [first] = container.querySelectorAll<HTMLElement>('[data-slot="feedback-bar-reason"]');
    if (first === undefined) throw new Error('no reasons');
    await userEvent.click(first);
    expect(picked).toEqual(['Not accurate']);
    expect(first.querySelector('input')?.checked).toBe(true);
  });

  test('controlled: the value prop wins', async () => {
    const container = await mount(<Controlled />);
    const [up, down] = votes(container);
    expect(down.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(down);
    expect(down.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(up);
    expect(up.getAttribute('aria-pressed')).toBe('true');
  });
});

function Card(props: {
  onCancel?: () => void;
  onConfirm?: () => void;
  onEdit?: () => void;
  autoFocus?: boolean;
}): JSX.Element {
  return (
    <div>
      <button type="button">before</button>
      <ApprovalCard
        title="Send 3 emails to customers?"
        confirmLabel="Send emails"
        summary="To: 3 customers"
        {...props}
      >
        Sent emails cannot be unsent.
      </ApprovalCard>
    </div>
  );
}

function nth<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) throw new Error(`no item ${index}`);
  return item;
}

const actions = (container: HTMLElement): HTMLButtonElement[] => [
  ...container.querySelectorAll<HTMLButtonElement>('[data-slot="approval-card-action"]'),
];

describe('ApprovalCard', () => {
  test('hydrates as a section named by its title, with focus on Cancel', async () => {
    const container = await hydrate(<Card onEdit={() => {}} />);
    const section = container.querySelector('section');
    const title = document.getElementById(section?.getAttribute('aria-labelledby') ?? '');
    expect(title?.tagName).toBe('H3');
    expect(title?.textContent).toBe('Send 3 emails to customers?');
    expect(actions(container).map((b) => b.textContent)).toEqual([
      'Cancel',
      'Edit first',
      'Send emails',
    ]);
    expect(document.activeElement?.textContent).toBe('Cancel');
  });

  test('autoFocus={false} leaves focus alone; no Edit first without onEdit', async () => {
    const container = await mount(<Card autoFocus={false} />);
    expect(document.activeElement).toBe(document.body);
    expect(actions(container).map((b) => b.textContent)).toEqual(['Cancel', 'Send emails']);
  });

  test('Escape anywhere in the card cancels; the buttons call their handlers', async () => {
    const onCancel = vi.fn<() => void>();
    const onConfirm = vi.fn<() => void>();
    const onEdit = vi.fn<() => void>();
    const container = await mount(
      <Card onCancel={onCancel} onConfirm={onConfirm} onEdit={onEdit} />,
    );
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    if (isWebKit) nth(actions(container), 2).focus();
    else await userEvent.keyboard('{Tab}{Tab}');
    expect(document.activeElement?.textContent).toBe('Send emails');
    await userEvent.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(nth(actions(container), 1));
    expect(onEdit).toHaveBeenCalledTimes(1);
    await userEvent.click(nth(actions(container), 0));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

function Stream(): JSX.Element {
  const [status, setStatus] = useState<'thinking' | 'streaming' | 'complete'>('thinking');
  return (
    <>
      <button
        type="button"
        onClick={() => setStatus(status === 'thinking' ? 'streaming' : 'complete')}
      >
        next
      </button>
      <ResponseBlock status={status} onStop={() => {}}>
        {status === 'thinking' ? null : <p>An answer</p>}
      </ResponseBlock>
    </>
  );
}

describe('ResponseBlock', () => {
  test('one live region, busy while it streams, present before the answer arrives', async () => {
    const container = await mount(<Stream />);
    const region = container.querySelector<HTMLElement>('[data-slot="response-block-content"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.getAttribute('aria-busy')).toBe('true');
    const next = nth([...container.querySelectorAll('button')], 0);
    await userEvent.click(next);
    expect(container.querySelector('[data-slot="response-block-content"]')).toBe(region);
    expect(region?.getAttribute('aria-busy')).toBe('true');
    expect(container.textContent).toContain('Stop generating');
    await userEvent.click(next);
    expect(region?.hasAttribute('aria-busy')).toBe(false);
    expect(region?.textContent).toBe('An answer');
    expect(container.textContent).not.toContain('Stop generating');
  });
});
