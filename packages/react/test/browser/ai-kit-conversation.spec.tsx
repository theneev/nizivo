// The AI kit's conversation in a browser (ARCHITECTURE.md §21.4a, D-dn): PromptComposer (hydration,
// its name, Enter sends and clears, Shift+Enter adds a line, nothing to send while empty or
// pending, controlled text) and ChatLog with ChatMessage (a named polite log, senders in text).
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { ChatLog, ChatMessage } from '../../src/unstable/chat-message/chat-message';
import { PromptComposer } from '../../src/unstable/prompt-composer/prompt-composer.client';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/unstable/chat-message/chat-message.css',
    '../../src/unstable/prompt-composer/prompt-composer.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 4)
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

function one(container: ParentNode, selector: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}

const input = (container: HTMLElement): HTMLTextAreaElement => {
  const element = container.querySelector('textarea');
  if (element === null) throw new Error('no textarea');
  return element;
};

describe('PromptComposer', () => {
  test('hydrates; the textarea is named by its label, not its placeholder', async () => {
    const container = await hydrate(<PromptComposer />);
    const textarea = input(container);
    expect(textarea.labels?.[0]?.textContent).toBe('Message');
    expect(textarea.placeholder).toBe('Ask anything…');
    const send = one(container, '[data-slot="prompt-composer-send"]');
    expect(send.getAttribute('aria-label')).toBe('Send');
    expect(send.getAttribute('aria-disabled')).toBe('true');
  });

  test('Enter sends and clears; Shift+Enter adds a line; spaces alone send nothing', async () => {
    const sent: string[] = [];
    const container = await mount(<PromptComposer onSend={(value) => sent.push(value)} />);
    const textarea = input(container);
    await userEvent.click(textarea);
    await userEvent.keyboard('   {Enter}');
    expect(sent).toEqual([]);
    await userEvent.clear(textarea);
    await userEvent.keyboard('Which mugs{Shift>}{Enter}{/Shift}sold out?');
    expect(textarea.value).toBe('Which mugs\nsold out?');
    expect(one(container, '[data-slot="prompt-composer-send"]').hasAttribute('aria-disabled')).toBe(
      false,
    );
    await userEvent.keyboard('{Enter}');
    expect(sent).toEqual(['Which mugs\nsold out?']);
    expect(textarea.value).toBe('');
  });

  test('the send button sends; pending keeps it from sending', async () => {
    const sent: string[] = [];
    function Composer(): JSX.Element {
      const [pending, setPending] = useState(false);
      return (
        <PromptComposer
          pending={pending}
          defaultValue="Draft a launch post"
          onSend={(value) => {
            sent.push(value);
            setPending(true);
          }}
        />
      );
    }
    const container = await mount(<Composer />);
    const send = one(container, '[data-slot="prompt-composer-send"]');
    await userEvent.click(send);
    expect(sent).toEqual(['Draft a launch post']);
    await userEvent.type(input(container), 'Another');
    expect(send.getAttribute('aria-disabled')).toBe('true');
    // Playwright will not click an aria-disabled button; a DOM click still reaches it
    send.click();
    await settle();
    expect(sent).toEqual(['Draft a launch post']);
  });
});

function Controlled({ onSend }: { onSend: (value: string) => void }): JSX.Element {
  const [text, setText] = useState('');
  return (
    <PromptComposer
      value={text}
      onValueChange={(next) => setText(next.toUpperCase())}
      onSend={onSend}
    />
  );
}

describe('PromptComposer, controlled', () => {
  test('the value prop wins and is not cleared by sending', async () => {
    const onSend = vi.fn<(value: string) => void>();
    const container = await mount(<Controlled onSend={onSend} />);
    await userEvent.type(input(container), 'mug{Enter}');
    expect(input(container).value).toBe('MUG');
    expect(onSend).toHaveBeenCalledWith('MUG');
  });
});

describe('ChatLog and ChatMessage', () => {
  test('a named polite log; each turn names its sender in text', async () => {
    const container = await hydrate(
      <ChatLog>
        <ChatMessage from="user" time="09:41">
          Tag the mug.
        </ChatMessage>
        <ChatMessage from="assistant">Done.</ChatMessage>
      </ChatLog>,
    );
    const log = one(container, '[data-slot="chat-log"]');
    expect(log.getAttribute('role')).toBe('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(log.getAttribute('aria-label')).toBe('Conversation');
    const metas = [...container.querySelectorAll('[data-slot="chat-message-meta"]')];
    expect(metas.map((meta) => meta.textContent)).toEqual(['You · 09:41', 'Assistant']);
  });
});
