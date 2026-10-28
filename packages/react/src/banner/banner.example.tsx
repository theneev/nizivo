import type { JSX } from 'react';
import { Button } from '../button/index';
import { Banner, BannerDismiss } from './index';

/** A stand-in for a product render (use `<img alt="" width={72} height={72} />`). */
function Render(): JSX.Element {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" fill="none" stroke="currentColor">
      <rect x="14" y="20" width="44" height="38" rx="6" />
      <path d="M14 32h44M28 20v12M44 20v12" />
    </svg>
  );
}

/** A stand-in for `@nizivo/icons`' triangle-alert. */
function Warning(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/**
 * A promo banner (tone `brand`): a render, a title and a line, one primary action. Server
 * rendered and static: no dismiss, no client JS.
 */
export function BannerExample(): JSX.Element {
  return (
    <Banner
      media={<Render />}
      title="Open a second storefront in minutes"
      action={<Button variant="primary">Add storefront</Button>}
    >
      Sell in EUR and GBP from the same catalogue.
    </Banner>
  );
}

/**
 * A warning the user can dismiss. `BannerDismiss` is the only part that hydrates; the Banner does
 * not hide itself: pass `onDismiss` from a client component, or a Server Action from a Server
 * Component, and stop rendering it.
 */
export function BannerWarningExample({ onDismiss }: { onDismiss?: () => void }): JSX.Element {
  return (
    <Banner
      tone="warning"
      icon={<Warning />}
      title="Your plan renews in 3 days"
      action={<Button>Update card</Button>}
      dismiss={<BannerDismiss {...(onDismiss && { onDismiss })} />}
    >
      Update the card on file to avoid interruption.
    </Banner>
  );
}
