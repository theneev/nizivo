// NO directive: the server-safe IconButton shell (ARCHITECTURE.md §9.5 "split", §10.2). With the
// default tooltip it hands its props to the IconButtonTooltip client leaf; `tooltip={false}` renders the
// <button> here, so a Server Component can use it without running client code. Both paths render the
// <button> with iconButtonElement (icon-button-static.tsx), so they write the same DOM. This module
// imports the leaf, so a bundler that ships every client module the server graph reaches (Turbopack,
// `next dev`) ships the tooltip chain with it even when `tooltip={false}`; IconButtonStatic does not.
import type { ReactElement } from 'react';
import { ariaKeyShortcuts } from '../_internal/keys';
import { IconButtonTooltip } from './icon-button.client';
import type { IconButtonProps } from './icon-button.contract';
import { iconButtonElement, warnUnnamed } from './icon-button-static';

export function IconButton({ tooltip = true, shortcut, ...props }: IconButtonProps): ReactElement {
  warnUnnamed(props.label, props['aria-labelledby']);
  // The tooltip shows the shortcut to sighted users; this tells assistive technology (a consumer's
  // own aria-keyshortcuts wins).
  const keyshortcuts = shortcut === undefined ? undefined : ariaKeyShortcuts(shortcut);
  const button =
    keyshortcuts === undefined || props['aria-keyshortcuts'] !== undefined
      ? props
      : { ...props, 'aria-keyshortcuts': keyshortcuts };
  if (tooltip === false) return iconButtonElement(button);
  return (
    <IconButtonTooltip
      {...button}
      tooltip={tooltip === true ? {} : tooltip}
      {...(shortcut === undefined ? {} : { shortcut })}
    />
  );
}
