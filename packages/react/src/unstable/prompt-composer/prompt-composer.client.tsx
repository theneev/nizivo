'use client';
// PromptComposer (ARCHITECTURE.md §21.4a; D-dn; Figma's Prompt Composer 7396:83): where people write
// to the assistant. A textarea that grows with the text (where the browser has `field-sizing`, as
// Textarea), a row of tools (`tools`: attach, dictate, a ModelSelector) and a send button that is
// enabled once there is text. Enter sends, Shift+Enter adds a line, and Enter while an input method
// is composing does neither. The textarea keeps a visible name for assistive technology through
// `labels.label`; the placeholder is a hint, not the name. UNSTABLE: the AI kit is new and unreviewed.
import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useLabels } from '../../config/config.client';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { ArrowUpGlyph } from '../../_internal/glyphs';

/** PromptComposer's own strings (§16.4): serialisable, English defaults. */
export interface PromptComposerLabels {
  /** The textarea's name. @default 'Message' */
  label: string;
  /** @default 'Ask anything…' */
  placeholder: string;
  /** The send button's name. @default 'Send' */
  send: string;
}

export interface PromptComposerState {
  empty: boolean;
  pending: boolean;
}

export interface PromptComposerProps extends Omit<
  ComponentPropsWithRef<'form'>,
  'onSubmit' | 'children' | 'defaultValue'
> {
  /** The text (controlled). */
  value?: string;
  /** The text at first (uncontrolled). @default '' */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Enter or the send button, with text that is not only spaces. Uncontrolled, the text clears after. */
  onSend?: (value: string) => void;
  /** Left of the send button: IconButtons that attach or dictate, a ModelSelector. */
  tools?: ReactNode;
  /** An answer is on its way: the send button is disabled; the text stays editable. @default false */
  pending?: boolean;
  /** The textarea's `name`, for a form that posts it. */
  name?: string;
  disabled?: boolean;
  labels?: Partial<PromptComposerLabels>;
  /** Must render a `<form>`. */
  render?: RenderProp<PromptComposerState>;
}

export function PromptComposer({
  value,
  defaultValue = '',
  onValueChange,
  onSend,
  tools,
  pending = false,
  name,
  disabled = false,
  labels: labelsProp,
  render,
  className,
  ...rest
}: PromptComposerProps): JSX.Element {
  const labels = useLabels('promptComposer', labelsProp);
  const [own, setOwn] = useState(defaultValue);
  const text = value === undefined ? own : value;
  const empty = text.trim() === '';
  const inputId = useId();

  function change(next: string): void {
    setOwn(next);
    onValueChange?.(next);
  }

  function send(): void {
    if (empty || pending || disabled) return;
    onSend?.(text);
    if (value === undefined) setOwn('');
  }

  return renderElement(
    'form',
    render,
    { empty, pending },
    {
      'data-slot': 'prompt-composer',
      'data-disabled': disabled ? '' : undefined,
      ...rest,
      onSubmit: (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        send();
      },
      className: cx('nz-prompt-composer', className),
      children: (
        <>
          <label className="nz-visually-hidden" htmlFor={inputId}>
            {labels?.label ?? 'Message'}
          </label>
          <textarea
            id={inputId}
            className="nz-prompt-composer-input"
            data-slot="prompt-composer-input"
            rows={1}
            name={name}
            disabled={disabled}
            placeholder={labels?.placeholder ?? 'Ask anything…'}
            value={text}
            onChange={(event) => change(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              send();
            }}
          />
          <div className="nz-prompt-composer-toolbar">
            <div className="nz-prompt-composer-tools">{tools}</div>
            <button
              type="submit"
              className="nz-prompt-composer-send"
              data-slot="prompt-composer-send"
              aria-label={labels?.send ?? 'Send'}
              // focusable while there is nothing to send, so its name is still found; it does nothing
              aria-disabled={empty || pending || disabled ? true : undefined}
              disabled={disabled}
            >
              <ArrowUpGlyph />
            </button>
          </div>
        </>
      ),
    },
  );
}
