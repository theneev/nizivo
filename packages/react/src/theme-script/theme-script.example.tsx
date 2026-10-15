import type { JSX } from 'react';
import { Kbd } from '../kbd/index';
import { ThemeScript } from './index';

/**
 * In a root layout, ThemeScript goes in `<head>`; here it runs where it is rendered. It restores the
 * reader's saved theme (`localStorage` key `nz-theme`) and marks the page `data-nz-platform="apple"`
 * on Apple devices, so the shortcut below reads ⌘K there and Ctrl+K elsewhere.
 */
export function ThemeScriptExample(): JSX.Element {
  return (
    <p>
      <ThemeScript />
      Search with <Kbd keys="mod+k" />.
    </p>
  );
}
