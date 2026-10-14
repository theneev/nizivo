// Fixture: a server-safe component with an inner slot written by a helper.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';

/** Chip tones. */
export type ChipTone = 'neutral' | 'critical';

/** Sizes, in declaration order. */
export const CHIP_SIZES = ['sm', 'md'] as const;

export type ChipSize = (typeof CHIP_SIZES)[number];

/** Variants. Augment this interface to add one. */
export interface ChipVariantMap {
  soft: true;
  solid: true;
}

export type ChipVariant = keyof ChipVariantMap;

export interface ChipState {
  tone: ChipTone;
  size: ChipSize | undefined;
}

/** Strings the chip renders. */
export interface ChipLabels {
  /** The remove button's name. @default 'Remove' */
  remove: string;
}

export interface ChipProps extends Omit<ComponentPropsWithRef<'span'>, 'title'> {
  /** Figma "Tone". @default 'neutral' */
  tone?: ChipTone;
  size?: ChipSize;
  /**
   * The look.
   * @default 'soft'
   */
  variant?: ChipVariant;
  /**
   * One line of text. The chip
   * truncates it.
   *
   * - short words fit;
   * - long ones are cut.
   */
  title?: ReactNode;
  /** Never announced. */
  role?: ComponentPropsWithRef<'span'>['role'];
  /** @deprecated Use `title`. */
  label?: string | undefined;
  labels?: Partial<ChipLabels>;
  render?: RenderProp<ChipState>;
}

/** A compact label. */
export function Chip({
  tone = 'neutral',
  size,
  variant = 'soft',
  title,
  render,
  className,
  ...rest
}: ChipProps): ReactElement {
  return renderElement(
    'span',
    render,
    { tone, size },
    {
      'data-slot': 'chip',
      'data-tone': tone,
      ...rest,
      className: `nz-chip ${variant} ${className ?? ''}`,
      children: title === undefined ? null : text(title),
    },
  );
}

/**
 * The accessible label of a chip.
 * @param tone The chip's tone.
 * @param extra More words.
 * @returns The label.
 */
export function chipLabel(tone: ChipTone, ...extra: string[]): string {
  return [tone, ...extra].join(' ');
}

function text(title: ReactNode): ReactElement {
  return (
    <span className="nz-chip-text" data-slot="chip-text">
      {title}
    </span>
  );
}
