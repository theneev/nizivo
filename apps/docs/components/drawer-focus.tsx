'use client';
// Fumadocs' mobile navigation drawer covers the page with a backdrop but is not modal: Escape does
// not close it, Tab walks out into the page hidden behind it, and in WebKit focus never enters it.
// While it is open this makes the rest of the page inert, moves focus into the drawer, closes it on
// Escape, and on close returns focus to the button that opened it (unless the reader followed a
// link). It renders nothing.
import { useEffect } from 'react';
import { useSidebar } from 'fumadocs-ui/components/sidebar/base';

const DRAWER = 'nd-sidebar-mobile';

export function DrawerFocus(): null {
  const { open, setOpen, mode } = useSidebar();
  useEffect(() => {
    if (mode !== 'drawer' || !open) return undefined;
    const drawer = document.getElementById(DRAWER);
    if (!drawer) return undefined;
    const opener = [...document.querySelectorAll<HTMLElement>(`[aria-controls="${DRAWER}"]`)].find(
      (button) => !drawer.contains(button),
    );
    const href = location.href;

    // Every sibling of the drawer and of its ancestors, except the backdrop, which closes it on a tap.
    const made: HTMLElement[] = [];
    for (let node: HTMLElement = drawer; node.parentElement !== null; node = node.parentElement) {
      if (node === document.body) break;
      for (const sibling of node.parentElement.children) {
        if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert) continue;
        if (sibling.nextElementSibling === drawer && sibling.hasAttribute('data-state')) continue;
        sibling.inert = true;
        made.push(sibling);
      }
    }
    // The drawer mounts hidden (visibility: hidden) and shows a render later; focus it then.
    const frame = requestAnimationFrame(() => {
      drawer.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();
    });

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      for (const element of made) element.inert = false;
      // A link in the drawer navigates; anything else (Escape, the close button, the backdrop)
      // leaves the reader on this page, back on the button that opened the drawer.
      requestAnimationFrame(() => {
        if (location.href === href && opener?.isConnected === true) opener.focus();
      });
    };
  }, [open, mode, setOpen]);
  return null;
}
