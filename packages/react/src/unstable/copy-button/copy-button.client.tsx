'use client';
// CopyButton (ARCHITECTURE.md §21.4a; D-do; Figma's Copy Button 7416:21): copies text to the
// clipboard, then reads "Copied" for 2 seconds, which a polite live region announces; its name stays
// "Copy". It lives on the dark code surfaces (CodeBlock). If the clipboard refuses, nothing claims a
// copy: `onCopyFailed` hears why. UNSTABLE: v0.5 is new and unreviewed.
import { useEffect, useState, type ComponentPropsWithRef, type JSX, type MouseEvent } from 'react';
import { useLabels } from '../../config/config.client';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { CheckGlyph, CopyGlyph } from '../../_internal/glyphs';

/** CopyButton's own strings (§16.4): serialisable, English defaults. */
export interface CopyButtonLabels {
  /** @default 'Copy' */
  copy: string;
  /** Shown and announced for 2 seconds after a copy. @default 'Copied' */
  copied: string;
}

export interface CopyButtonState {
  copied: boolean;
}

export interface CopyButtonProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'value' | 'children'
> {
  /** The text to copy. */
  value: string;
  onCopied?: (value: string) => void;
  onCopyFailed?: (error: unknown) => void;
  labels?: Partial<CopyButtonLabels>;
  /** Must render a `<button>`. */
  render?: RenderProp<CopyButtonState>;
}

/** How long "Copied" shows, in milliseconds (Figma: 2 s). */
const COPIED_FOR = 2000;

export function CopyButton({
  value,
  onCopied,
  onCopyFailed,
  labels: labelsProp,
  render,
  className,
  onClick,
  ...rest
}: CopyButtonProps): JSX.Element {
  const labels = useLabels('copyButton', labelsProp);
  // each copy counts: the effect ends "Copied" 2 seconds after the latest one
  const [copies, setCopies] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (copies === 0) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR);
    return () => clearTimeout(timer);
  }, [copies]);

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    onClick?.(event);
    if (event.defaultPrevented) return;
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setCopies((count) => count + 1);
        onCopied?.(value);
      },
      (error: unknown) => onCopyFailed?.(error),
    );
  }

  const copy = labels?.copy ?? 'Copy';
  const done = labels?.copied ?? 'Copied';
  return (
    <>
      {renderElement(
        'button',
        render,
        { copied },
        {
          type: 'button',
          'data-slot': 'copy-button',
          'data-variant': copied ? 'copied' : 'idle',
          ...rest,
          className: cx('nz-copy-button', className),
          onClick: handleClick,
          children: (
            <>
              <span className="nz-copy-button-icon" aria-hidden="true">
                {copied ? <CheckGlyph /> : <CopyGlyph />}
              </span>
              {/* the visible word changes; the name stays "Copy", and the region below says so */}
              <span aria-hidden="true">{copied ? done : copy}</span>
              <span className="nz-visually-hidden">{copy}</span>
            </>
          ),
        },
      )}
      <span className="nz-visually-hidden" aria-live="polite">
        {copied ? done : ''}
      </span>
    </>
  );
}
