// NizivoConfig `labels` in a browser (ARCHITECTURE.md §16.4, M55): the scope's labels name the
// client parts after hydration and in the overlays' portals (Dialog, Popover and Drawer's Close
// parts, MobileTabBar's More sheet, the Toaster), a part's own `labels` wins key by key, no provider
// means the English defaults, and a server part ignores the scope.
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { BannerDismiss } from '../../src/banner/index';
import { NizivoConfig, type NizivoLabels } from '../../src/config/index';
import { Dialog } from '../../src/dialog/index';
import { Drawer } from '../../src/drawer/index';
import { MobileTabBarMore } from '../../src/mobile-tab-bar/index';
import { NavItem } from '../../src/nav-item/index';
import { Pagination } from '../../src/pagination/index';
import { PasswordInput } from '../../src/password-input/index';
import { Popover } from '../../src/popover/index';
import { SearchField } from '../../src/search-field/index';
import { toast, Toaster } from '../../src/toast/index';
import { find, get, hydrate, mount, until } from './harness';

afterEach(() => {
  toast.dismiss();
});

const SCOPE: NizivoLabels = {
  bannerDismiss: { dismiss: 'Ausblenden' },
  dialog: { close: 'Dialog schließen' },
  drawer: { close: 'Leiste schließen' },
  mobileTabBarMore: { more: 'Mehr', close: 'Menü schließen' },
  passwordInput: { toggle: 'Passwort anzeigen' },
  popover: { close: 'Hinweis schließen' },
  searchField: { label: 'Suchen', clear: 'Suche leeren' },
  toaster: { region: 'Benachrichtigungen (F8)', dismiss: 'Verwerfen' },
  // a server part's key: ignored
  pagination: { nav: 'Seitennavigation' },
};

function name(element: Element | null): string | null {
  return element?.getAttribute('aria-label') ?? null;
}

function inline(own: NizivoLabels['searchField'] = {}): ReactNode {
  return (
    <>
      <SearchField defaultValue="mug" labels={own} />
      <PasswordInput aria-label="Password" />
      <BannerDismiss />
      <Pagination page={2} totalPages={3} getHref={(page) => `?page=${page}`} />
    </>
  );
}

function overlays(): ReactNode {
  return (
    <>
      <Dialog.Root>
        <Dialog.Trigger>Edit</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Title>Edit product</Dialog.Title>
          <Dialog.Close />
        </Dialog.Popup>
      </Dialog.Root>
      <Popover.Root>
        <Popover.Trigger>Status</Popover.Trigger>
        <Popover.Popup>
          <Popover.Title>Store is live</Popover.Title>
          <Popover.Close />
        </Popover.Popup>
      </Popover.Root>
      <Drawer.Root>
        <Drawer.Trigger>Filters</Drawer.Trigger>
        <Drawer.Popup>
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Close />
        </Drawer.Popup>
      </Drawer.Root>
    </>
  );
}

async function closeName(trigger: string, close: string): Promise<string | null> {
  await userEvent.click(get(trigger));
  await until(() => expect(find(close)).not.toBeNull());
  const label = name(get(close));
  await userEvent.keyboard('{Escape}');
  await until(() => expect(find(close)).toBeNull());
  return label;
}

describe('NizivoConfig labels in a browser', () => {
  test('the scope names the client parts and hydrates without a mismatch', async () => {
    const { problems } = await hydrate(<NizivoConfig labels={SCOPE}>{inline()}</NizivoConfig>);
    expect(problems).toEqual([]);
    expect(name(document.querySelector('.nz-search-field-control'))).toBe('Suchen');
    expect(name(document.querySelector('.nz-search-field-clear'))).toBe('Suche leeren');
    expect(name(document.querySelector('.nz-password-input-toggle'))).toBe('Passwort anzeigen');
    expect(name(get('banner-dismiss'))).toBe('Ausblenden');
    // Pagination is a server part: the scope's pagination key does not reach it
    expect(name(document.querySelector('nav'))).toBe('Pagination');
  });

  test("a part's own labels win key by key, after typing too", async () => {
    await mount(<NizivoConfig labels={SCOPE}>{inline({ clear: 'Leeren' })}</NizivoConfig>);
    const control = document.querySelector<HTMLInputElement>('.nz-search-field-control');
    expect(name(control)).toBe('Suchen');
    expect(name(document.querySelector('.nz-search-field-clear'))).toBe('Leeren');
    await userEvent.click(document.querySelector('.nz-search-field-clear') ?? document.body);
    await userEvent.type(control ?? document.body, 'jug');
    await until(() =>
      expect(name(document.querySelector('.nz-search-field-clear'))).toBe('Leeren'),
    );
  });

  test('without a provider the English defaults show', async () => {
    const { problems } = await hydrate(inline());
    expect(problems).toEqual([]);
    expect(name(document.querySelector('.nz-search-field-control'))).toBe('Search');
    expect(name(document.querySelector('.nz-search-field-clear'))).toBe('Clear search');
    expect(name(document.querySelector('.nz-password-input-toggle'))).toBe('Show password');
    expect(name(get('banner-dismiss'))).toBe('Dismiss');
  });

  test("the scope reaches the overlays' Close parts in their portals", async () => {
    await mount(<NizivoConfig labels={SCOPE}>{overlays()}</NizivoConfig>);
    expect(await closeName('dialog-trigger', 'dialog-close')).toBe('Dialog schließen');
    expect(await closeName('popover-trigger', 'popover-close')).toBe('Hinweis schließen');
    expect(await closeName('drawer-trigger', 'drawer-close')).toBe('Leiste schließen');
  });

  test("a Close part's own labels win over the scope", async () => {
    await mount(
      <NizivoConfig labels={SCOPE}>
        <Dialog.Root>
          <Dialog.Trigger>Edit</Dialog.Trigger>
          <Dialog.Popup>
            <Dialog.Title>Edit product</Dialog.Title>
            <Dialog.Close labels={{ close: 'Fertig' }} />
          </Dialog.Popup>
        </Dialog.Root>
      </NizivoConfig>,
    );
    expect(await closeName('dialog-trigger', 'dialog-close')).toBe('Fertig');
  });

  test("the overlays' Close parts without a scope keep the English name", async () => {
    await mount(overlays());
    expect(await closeName('dialog-trigger', 'dialog-close')).toBe('Close');
    expect(await closeName('popover-trigger', 'popover-close')).toBe('Close');
    expect(await closeName('drawer-trigger', 'drawer-close')).toBe('Close');
  });

  test("MobileTabBar's More: its own key names the button and the sheet's Close", async () => {
    await mount(
      <NizivoConfig labels={SCOPE}>
        <ul>
          <MobileTabBarMore>
            <NavItem href="#analytics">Analytics</NavItem>
          </MobileTabBarMore>
        </ul>
      </NizivoConfig>,
    );
    expect(get('mobile-tab-bar-more-label').textContent).toBe('Mehr');
    // mobileTabBarMore.close, not drawer.close: More passes its own string to the sheet's Close
    expect(await closeName('mobile-tab-bar-more-trigger', 'drawer-close')).toBe('Menü schließen');
  });

  test('the Toaster takes its region and dismiss names from the scope', async () => {
    await mount(
      <NizivoConfig labels={SCOPE}>
        <Toaster labels={{ dismiss: 'Schließen' }} />
      </NizivoConfig>,
    );
    toast('Order archived');
    await until(() => expect(find('toast')).not.toBeNull());
    expect(name(get('toast-region'))).toBe('Benachrichtigungen (F8)');
    // the Toaster's own labels win for dismiss
    expect(name(get('toast-close'))).toBe('Schließen');
  });

  test('the Toaster without a scope keeps the English names', async () => {
    await mount(<Toaster />);
    toast('Order archived');
    await until(() => expect(find('toast')).not.toBeNull());
    expect(name(get('toast-region'))).toBe('Notifications (F8)');
    expect(name(get('toast-close'))).toBe('Dismiss');
  });
});
