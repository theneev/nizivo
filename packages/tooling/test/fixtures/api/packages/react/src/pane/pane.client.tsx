'use client';
// Fixture: the public Pane parts; the engine adapter names no element.
import { createContext, type JSX } from 'react';
import { toRenderFn } from '../contracts/render';
import * as Engine from './engine';
import type { PaneRootProps, PaneTriggerProps } from './pane.contract';

const Scope = createContext<'sm' | 'md'>('md');
const renderDiv = toRenderFn<unknown>(undefined, 'div');

export function PaneRoot({ size = 'md', ...props }: PaneRootProps): JSX.Element {
  return (
    <Scope value={size}>
      <Engine.Root
        {...props}
        className="nz-pane"
        data-slot="pane"
        data-size={size}
        render={renderDiv}
      />
    </Scope>
  );
}

export function PaneTrigger({
  className,
  render,
  children,
  ...rest
}: PaneTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      className={`nz-pane-trigger ${className ?? ''}`}
      data-slot="pane-trigger"
      panel={{ className: 'nz-pane-panel', 'data-slot': 'pane-panel' }}
      render={toRenderFn(render, 'button')}
    >
      <span className="nz-pane-icon" data-slot="pane-icon" aria-hidden="true" />
      {children}
    </Engine.Trigger>
  );
}
