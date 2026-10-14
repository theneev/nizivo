import { RenderProp } from '../contracts/render.js';
import { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
//#region src/chip/chip.d.ts
/** Chip tones. */
export type ChipTone = 'neutral' | 'critical';
/** Sizes, in declaration order. */
export declare const CHIP_SIZES: readonly ['sm', 'md'];
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
export declare function Chip({
  tone,
  size,
  variant,
  title,
  render,
  className,
  ...rest
}: ChipProps): ReactElement;
/**
 * The accessible label of a chip.
 * @param tone The chip's tone.
 * @param extra More words.
 * @returns The label.
 */
export declare function chipLabel(tone: ChipTone, ...extra: string[]): string;
//#endregion
