'use client';
// CodeBlock (ARCHITECTURE.md §21.4a; D-do; Figma's Code Block 7416:53): copyable code on the dark
// code surface. A command is one shell line after a "$" (one tab per package manager); a snippet is
// lines of code (one tab per language). Several versions are a tablist (the kit's Tabs, drawn here
// as pills); Copy copies the shown one. Code never wraps: a long line scrolls sideways, and the
// scrolling region takes focus, so a keyboard can scroll it too. The "$" is not copied.
// UNSTABLE: v0.5 is new and unreviewed.
import { useState, type ComponentPropsWithRef, type JSX } from 'react';
import { useLabels } from '../../config/config.client';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { Tabs } from '../../tabs/index';
import { CopyButton } from '../copy-button/index';

/** One version of the code: "pnpm" and its command, "tsx" and its snippet. */
export interface CodeBlockItem {
  label: string;
  code: string;
}

/** CodeBlock's own strings (§16.4): serialisable, English defaults. */
export interface CodeBlockLabels {
  /** The tablist's name. @default 'Versions' */
  versions: string;
}

export interface CodeBlockProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** The versions, in tab order; one shows no tabs. */
  items: readonly CodeBlockItem[];
  /** The kind of code: a one-line shell command after a "$", or a snippet. @default 'snippet' */
  variant?: 'command' | 'snippet';
  /** The label of the version shown first. @default the first */
  defaultValue?: string;
  labels?: Partial<CodeBlockLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function CodeBlock({
  items,
  variant = 'snippet',
  defaultValue,
  labels: labelsProp,
  render,
  className,
  ...rest
}: CodeBlockProps): JSX.Element {
  const labels = useLabels('codeBlock', labelsProp);
  const [shown, setShown] = useState(defaultValue ?? items[0]?.label ?? '');
  const current = items.find((item) => item.label === shown) ?? items[0];

  const code = (item: CodeBlockItem): JSX.Element => (
    // a scrolling region a keyboard can reach (axe scrollable-region-focusable)
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the sideways scroll needs a stop
    <pre className="nz-code-block-code" data-slot="code-block-code" tabIndex={0}>
      {variant === 'command' && (
        <span className="nz-code-block-prompt" aria-hidden="true">
          ${' '}
        </span>
      )}
      <code>{item.code}</code>
    </pre>
  );

  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'code-block',
      'data-variant': variant,
      ...rest,
      className: cx('nz-code-block', className),
      children:
        items.length > 1 ? (
          <Tabs.Root value={shown} onValueChange={setShown} className="nz-code-block-tabs">
            <div className="nz-code-block-bar">
              <Tabs.List aria-label={labels?.versions ?? 'Versions'}>
                {items.map((item) => (
                  <Tabs.Tab key={item.label} value={item.label}>
                    {item.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              <CopyButton value={current?.code ?? ''} />
            </div>
            {items.map((item) => (
              <Tabs.Panel key={item.label} value={item.label}>
                {code(item)}
              </Tabs.Panel>
            ))}
          </Tabs.Root>
        ) : (
          <>
            <div className="nz-code-block-bar">
              <span className="nz-code-block-label">{current?.label}</span>
              <CopyButton value={current?.code ?? ''} />
            </div>
            {current !== undefined && code(current)}
          </>
        ),
    },
  );
}
