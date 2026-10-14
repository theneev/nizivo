// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5, §14.3).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/** Aspect-ratio presets, emitted as `data-ratio` and cropped with `object-fit` (§14.3). */
export type ImageRatio = '1/1' | '4/5' | '3/2' | '16/9';

export interface ImageState {
  ratio: ImageRatio | undefined;
  priority: boolean;
}

export interface ImageProps extends Omit<
  ComponentPropsWithRef<'img'>,
  'src' | 'alt' | 'width' | 'height' | 'children'
> {
  src: string;
  /** Required. `alt=""` marks a decorative image. */
  alt: string;
  /** Intrinsic width in px. Required with `height`, so the box is reserved before the image loads. */
  width: number;
  height: number;
  ratio?: ImageRatio;
  /** An above-the-fold image: eager loading and `fetchpriority="high"`. @default false */
  priority?: boolean;
  /**
   * A framework image component, for example `render={<NextImage src={hero} alt="" />}`; it receives
   * every prop, including `className` and `data-slot`.
   */
  render?: RenderProp<ImageState>;
}

/** An `<img>` that never writes an inline `style`, so it renders under a strict CSP (§19.3). */
export function Image({
  src,
  alt,
  width,
  height,
  ratio,
  priority = false,
  loading,
  fetchPriority,
  decoding,
  render,
  className,
  ...rest
}: ImageProps): ReactElement {
  return renderElement(
    'img',
    render,
    { ratio, priority },
    {
      'data-slot': 'image',
      'data-ratio': ratio,
      ...rest,
      className: cx('nz-image', className),
      src,
      alt,
      width,
      height,
      loading: priority ? 'eager' : (loading ?? 'lazy'),
      fetchPriority: priority ? 'high' : fetchPriority,
      decoding: decoding ?? 'async',
    },
  );
}
