// NO directive: every part is server-safe, so the Card namespace is RSC-safe (ARCHITECTURE.md §10.5).
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';

/**
 * Figma "Style": Surface | Subtle | Inverse, plus the tinted surfaces of the dashboard widgets (KPI
 * Tile "Tinted", Insight Card Brand and Accent; figma/04 §2/§3, M41): `brand` (bg/brand-subtle) and
 * `accent` (bg/accent-subtle).
 */
export type CardTone = 'surface' | 'subtle' | 'inverse' | 'brand' | 'accent';
export type CardTitleLevel = 2 | 3 | 4 | 5 | 6;
/** 24 px (`md`, Figma) or 20 px (`sm`). */
export type CardPadding = 'sm' | 'md';
/** 0 draws no shadow (the rest elevation); 1 draws `--nz-elevation-1`. */
export type CardElevation = 0 | 1;

export interface CardRootState {
  tone: CardTone;
  padding: CardPadding;
  elevation: CardElevation;
}

export interface CardRootProps extends ComponentPropsWithRef<'div'> {
  /**
   * `inverse` sets `data-nz-scheme="inverse"`, so every token inside resolves in the inverse scheme.
   * @default 'surface'
   */
  tone?: CardTone;
  /** @default 'md' */
  padding?: CardPadding;
  /** No shadow at rest until design says otherwise (decision 8j). @default 0 */
  elevation?: CardElevation;
  render?: RenderProp<CardRootState>;
}

export interface CardHeaderProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export interface CardTitleProps extends ComponentPropsWithRef<'h3'> {
  /** The heading level; its look is Heading/H4 at every level. @default 3 */
  level?: CardTitleLevel;
  render?: RenderProp<Record<string, never>>;
}

export interface CardDescriptionProps extends ComponentPropsWithRef<'p'> {
  render?: RenderProp<Record<string, never>>;
}

/** Figma "Show action": the control at the end of the header, for example an IconButton. */
export interface CardActionProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

/** Figma's "Slot" frame. */
export interface CardBodyProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export interface CardFooterProps extends ComponentPropsWithRef<'div'> {
  render?: RenderProp<Record<string, never>>;
}

export function CardRoot({
  tone = 'surface',
  padding = 'md',
  elevation = 0,
  render,
  className,
  ...rest
}: CardRootProps): ReactElement {
  return renderElement(
    'div',
    render,
    { tone, padding, elevation },
    {
      'data-slot': 'card',
      'data-tone': tone,
      'data-padding': padding,
      'data-elevation': elevation === 1 ? '1' : undefined,
      'data-nz-scheme': tone === 'inverse' ? 'inverse' : undefined,
      ...rest,
      className: cx('nz-card', className),
    },
  );
}

export function CardHeader({ render, className, ...rest }: CardHeaderProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    { 'data-slot': 'card-header', ...rest, className: cx('nz-card-header', className) },
  );
}

export function CardTitle({ level = 3, render, className, ...rest }: CardTitleProps): ReactElement {
  return renderElement(
    `h${level}`,
    render,
    {},
    { 'data-slot': 'card-title', ...rest, className: cx('nz-card-title', className) },
  );
}

export function CardDescription({
  render,
  className,
  ...rest
}: CardDescriptionProps): ReactElement {
  return renderElement(
    'p',
    render,
    {},
    { 'data-slot': 'card-description', ...rest, className: cx('nz-card-description', className) },
  );
}

export function CardAction({ render, className, ...rest }: CardActionProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    { 'data-slot': 'card-action', ...rest, className: cx('nz-card-action', className) },
  );
}

export function CardBody({ render, className, ...rest }: CardBodyProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    { 'data-slot': 'card-body', ...rest, className: cx('nz-card-body', className) },
  );
}

export function CardFooter({ render, className, ...rest }: CardFooterProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    { 'data-slot': 'card-footer', ...rest, className: cx('nz-card-footer', className) },
  );
}
