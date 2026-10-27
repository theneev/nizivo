// The AI kit's controls in a browser (ARCHITECTURE.md §21.4a, D-dn): ModelSelector (hydration, the
// trigger shows the chosen model's name only, a choice by keyboard), InlineAssist (one Tab stop, the
// arrow keys, Home and End, mirrored right to left, the actions' values) and VoiceOrb (the state in a
// live region, the button's name follows it).
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { InlineAssist } from '../../src/unstable/inline-assist/inline-assist.client';
import { ModelSelector } from '../../src/unstable/model-selector/model-selector.client';
import { VoiceOrb, type VoiceState } from '../../src/unstable/voice-orb/voice-orb';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/icon-button/icon-button.css',
    '../../src/select/select.css',
    '../../src/popover/popover.css',
    '../../src/unstable/model-selector/model-selector.css',
    '../../src/unstable/inline-assist/inline-assist.css',
    '../../src/unstable/voice-orb/voice-orb.css',
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
  // Two of Select's own changes, from React Aria, are left out: its native validation adds
  // `title=""` to the hidden <select> (as the locale spec notes), and the trigger's server
  // `aria-describedby` names the description and error slots, which useSlotId drops once it finds
  // neither in the DOM. Everything else must be the server's DOM as it was.
  const html = (): string =>
    container.innerHTML.replaceAll(' title=""', '').replaceAll(/ aria-describedby="[^"]*"/g, '');
  const before = html();
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  expect(html()).toBe(before);
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

const MODELS = [
  { value: 'fast', label: 'Fast', description: 'Quick answers for simple tasks' },
  { value: 'balanced', label: 'Balanced', description: 'Good for most work' },
  { value: 'deep', label: 'Deep', description: 'Slower, more careful reasoning' },
];

describe('ModelSelector', () => {
  test('hydrates; the trigger shows the chosen name only and is named "Balanced Model"', async () => {
    const container = await hydrate(<ModelSelector models={MODELS} defaultValue="balanced" />);
    const trigger = one(container, '[data-slot="model-selector-trigger"]');
    expect(one(container, '[data-slot="model-selector-value"]').textContent).toBe('Balanced');
    expect(trigger.textContent).not.toContain('Good for most work');
    const labelledBy = trigger.getAttribute('aria-labelledby') ?? '';
    const name = labelledBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
    // the visible text is in the name (WCAG 2.5.3)
    expect(name).toBe('Balanced Model');
    expect(trigger.hasAttribute('aria-label')).toBe(false);
  });

  test('the first model by default; a choice from the list reaches onValueChange', async () => {
    const chosen: string[] = [];
    const container = await mount(
      <ModelSelector models={MODELS} onValueChange={(value) => chosen.push(value)} />,
    );
    expect(one(container, '[data-slot="model-selector-value"]').textContent).toBe('Fast');
    await userEvent.click(one(container, '[data-slot="model-selector-trigger"]'));
    await settle();
    const options = [
      ...document.querySelectorAll<HTMLElement>('[data-slot="model-selector-item"]'),
    ];
    expect(options.map((option) => option.textContent)).toEqual([
      'FastQuick answers for simple tasks',
      'BalancedGood for most work',
      'DeepSlower, more careful reasoning',
    ]);
    const deep = options[2];
    if (deep === undefined) throw new Error('no Deep');
    await userEvent.click(deep);
    await settle();
    expect(chosen).toEqual(['deep']);
    expect(one(container, '[data-slot="model-selector-value"]').textContent).toBe('Deep');
  });
});

const ACTIONS = [
  { value: 'improve', label: 'Improve' },
  { value: 'shorten', label: 'Shorten' },
  { value: 'translate', label: 'Translate', disabled: true },
];

const buttons = (container: HTMLElement): HTMLButtonElement[] => [
  ...container.querySelectorAll<HTMLButtonElement>('[data-slot="inline-assist-action"]'),
];

describe('InlineAssist', () => {
  test('hydrates as a named toolbar with one Tab stop, and takes no focus on its own', async () => {
    const container = await hydrate(<InlineAssist actions={ACTIONS} />);
    const toolbar = one(container, '[data-slot="inline-assist"]');
    expect(toolbar.getAttribute('role')).toBe('toolbar');
    expect(toolbar.getAttribute('aria-label')).toBe('Writing tools');
    expect(buttons(container).map((button) => button.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(document.activeElement).toBe(document.body);
  });

  test('the arrow keys skip a disabled action and wrap; Home and End; the stop follows', async () => {
    const container = await mount(<InlineAssist actions={ACTIONS} />);
    const [improve, shorten, , ask] = buttons(container);
    improve?.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(shorten);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(ask);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(improve);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(ask);
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(improve);
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(ask);
    expect(buttons(container).map((button) => button.tabIndex)).toEqual([-1, -1, -1, 0]);
  });

  test('right to left, ArrowLeft moves forward', async () => {
    const container = await mount(
      <div dir="rtl">
        <InlineAssist actions={ACTIONS} />
      </div>,
    );
    const [improve, shorten] = buttons(container);
    improve?.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(shorten);
  });

  test('an action gives its value; Ask AI… calls onAsk', async () => {
    const values: string[] = [];
    const onAsk = vi.fn<() => void>();
    const container = await mount(
      <InlineAssist actions={ACTIONS} onAction={(value) => values.push(value)} onAsk={onAsk} />,
    );
    const [, shorten, , ask] = buttons(container);
    if (shorten === undefined || ask === undefined) throw new Error('no buttons');
    await userEvent.click(shorten);
    await userEvent.click(ask);
    expect(values).toEqual(['shorten']);
    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(ask.textContent).toBe('Ask AI…');
  });
});

function Voice(): JSX.Element {
  const [state, setState] = useState<VoiceState>('idle');
  return (
    <VoiceOrb state={state} onToggle={() => setState(state === 'idle' ? 'listening' : 'idle')} />
  );
}

describe('VoiceOrb', () => {
  test('the label says the state in a live region; the button starts and stops', async () => {
    const container = await mount(<Voice />);
    const label = one(container, '[data-slot="voice-orb-label"]');
    expect(label.getAttribute('aria-live')).toBe('polite');
    expect(label.textContent).toBe('Tap to talk');
    const button = (): HTMLElement => one(container, '[data-slot="voice-orb-button"]');
    expect(button().getAttribute('aria-label')).toBe('Start talking');
    expect(one(container, '[data-slot="voice-orb-orb"]').getAttribute('aria-hidden')).toBe('true');
    await userEvent.click(button());
    expect(label.textContent).toBe('Listening…');
    expect(button().getAttribute('aria-label')).toBe('Stop');
    await userEvent.click(button());
    expect(label.textContent).toBe('Tap to talk');
  });
});
