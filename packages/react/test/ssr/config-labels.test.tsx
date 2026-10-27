// NizivoConfig `labels` (ARCHITECTURE.md §16.4, M55): the client parts read the scope's labels, a
// part's own `labels` wins key by key, no provider means the English defaults, and the server parts
// (which cannot read a context under React Server Components) keep per-instance `labels` only.
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { isClient, rekey } from '../helpers/graph';
import { AlertDismiss } from '../../src/alert/index';
import { BannerDismiss } from '../../src/banner/index';
import { Breadcrumb } from '../../src/breadcrumb/index';
import { Button } from '../../src/button/index';
import { Chip, ChipGroup } from '../../src/chip-group/index';
import { NizivoConfig, type NizivoLabels } from '../../src/config/index';
import { Field } from '../../src/field/index';
import { FileUpload } from '../../src/file-upload/index';
import { Form, SubmitButton } from '../../src/form/index';
import { Input } from '../../src/input/index';
import { enUS } from '../../src/locales/en-US';
import { MobileTabBarMore } from '../../src/mobile-tab-bar/index';
import { NavItem } from '../../src/nav-item/index';
import { Pagination } from '../../src/pagination/index';
import { PasswordInput } from '../../src/password-input/index';
import { QuantityStepper } from '../../src/quantity-stepper/index';
import { DateRangePicker } from '../../src/unstable/date-range-picker/index';
import { SearchField } from '../../src/search-field/index';

const SRC = rekey(
  import.meta.glob(['../../src/**/*.{ts,tsx}', '!../../src/**/*.example.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

type Key = keyof typeof enUS;

/** The catalogue keys NizivoConfig's labels reach, and the client module that reads each. */
const REACHED: Partial<Record<Key, string>> = {
  alertDismiss: 'src/alert/alert-dismiss.client.tsx',
  approvalCard: 'src/unstable/approval-card/approval-card.client.tsx',
  bannerDismiss: 'src/banner/banner-dismiss.client.tsx',
  // SubmitButton, Button's client twin: Button itself is a server part and keeps per-instance labels
  button: 'src/form/submit-button.client.tsx',
  chipGroup: 'src/chip-group/chip-group.client.tsx',
  commandMenu: 'src/unstable/command-menu/command-menu.client.tsx',
  dateRangePicker: 'src/unstable/date-range-picker/date-range-picker.client.tsx',
  dialog: 'src/dialog/dialog.client.tsx',
  drawer: 'src/drawer/drawer.client.tsx',
  feedbackBar: 'src/unstable/feedback-bar/feedback-bar.client.tsx',
  fileUpload: 'src/file-upload/file-upload.client.tsx',
  form: 'src/form/form.client.tsx',
  inlineAssist: 'src/unstable/inline-assist/inline-assist.client.tsx',
  mobileTabBarMore: 'src/mobile-tab-bar/mobile-tab-bar-more.client.tsx',
  modelSelector: 'src/unstable/model-selector/model-selector.client.tsx',
  passwordInput: 'src/password-input/password-input.client.tsx',
  popover: 'src/popover/popover.client.tsx',
  quantityStepper: 'src/quantity-stepper/quantity-stepper.client.tsx',
  searchField: 'src/search-field/search-field.client.tsx',
  toaster: 'src/toast/toaster.client.tsx',
};

const SERVER = 'a server part: it cannot read a context, so it takes `labels` per instance';

/** The keys it does not reach, and why. */
const NOT_REACHED: Partial<Record<Key, string>> = {
  appShell: SERVER,
  avatarGroup: SERVER,
  breadcrumb: SERVER,
  bulkActionBar: SERVER,
  aiBadge: SERVER,
  thinkingIndicator: SERVER,
  citation: SERVER,
  sourceCard: SERVER,
  suggestionGroup: SERVER,
  usageMeter: SERVER,
  toolCallCard: SERVER,
  responseBlock: SERVER,
  voiceOrb: SERVER,
  kpiTile: SERVER,
  metric: SERVER,
  mobileTabBar: SERVER,
  pageIndicator: SERVER,
  pagination: SERVER,
  rankedList: SERVER,
  sidebar: SERVER,
  tableSelection: SERVER,
  trendCard: SERVER,
};

describe('which parts read NizivoConfig labels', () => {
  test('every catalogue key is either reached or listed with a reason', () => {
    const keys = Object.keys(enUS).toSorted();
    expect([...Object.keys(REACHED), ...Object.keys(NOT_REACHED)].toSorted()).toEqual(keys);
  });

  test('each reached key is read by its client module', () => {
    for (const [key, file] of Object.entries(REACHED)) {
      const text = SRC.get(file) ?? '';
      expect({ file, client: isClient(text) }).toEqual({ file, client: true });
      expect(text).toContain(`useLabels('${key}', `);
    }
  });

  test('only client modules read it, each its own key', () => {
    const calls = [...SRC].flatMap(([file, text]) =>
      [...text.matchAll(/\buseLabels\('(\w+)'/g)].map((match) => ({
        file,
        key: match[1] ?? '',
        client: isClient(text),
      })),
    );
    expect(calls.toSorted((a, b) => a.key.localeCompare(b.key))).toEqual(
      Object.entries(REACHED).map(([key, file]) => ({ file, key, client: true })),
    );
  });
});

/** Distinct strings, so a match can only come from the scope. */
const SCOPE: NizivoLabels = {
  bannerDismiss: { dismiss: 'Ausblenden' },
  chipGroup: { unavailable: 'Ausverkauft' },
  fileUpload: { prompt: 'Dateien hier ablegen oder {browse}', browse: 'durchsuchen' },
  form: { summaryTitle: 'Es gibt ein Problem' },
  mobileTabBarMore: { more: 'Mehr' },
  passwordInput: { toggle: 'Passwort anzeigen' },
  quantityStepper: { decrement: 'Verringern', increment: 'Erhöhen' },
  dateRangePicker: { placeholder: 'Zeitraum wählen' },
  searchField: { label: 'Suchen', clear: 'Suche leeren' },
  alertDismiss: { dismiss: 'Schließen' },
  // the server parts' keys: ignored by them (SubmitButton, Button's client twin, reads `button`)
  breadcrumb: { nav: 'Brotkrumen' },
  button: { pending: 'Lädt…' },
  pagination: { nav: 'Seitennavigation', previous: 'Vorherige Seite' },
};

function clientParts(own: { searchField?: NizivoLabels['searchField'] } = {}): ReactNode {
  return (
    <>
      <SearchField defaultValue="mug" {...(own.searchField && { labels: own.searchField })} />
      <PasswordInput aria-label="Password" />
      <QuantityStepper aria-label="Quantity" />
      <DateRangePicker timeZone="UTC" />
      <BannerDismiss />
      <AlertDismiss />
      <ChipGroup aria-label="Glaze">
        <Chip value="sand" unavailable>
          Sand
        </Chip>
      </ChipGroup>
      <FileUpload aria-label="Images" />
      <MobileTabBarMore>
        <NavItem href="/analytics">Analytics</NavItem>
      </MobileTabBarMore>
      <Form summary errors={{ title: 'Enter a product title.' }}>
        <Field name="title" label="Product title">
          <Input />
        </Field>
      </Form>
      <SubmitButton pending>Save</SubmitButton>
    </>
  );
}

function serverParts(): ReactNode {
  return (
    <>
      <Breadcrumb.Root>
        <Breadcrumb.Item current>Mugs</Breadcrumb.Item>
      </Breadcrumb.Root>
      <Button pending>Save</Button>
      <Pagination page={2} totalPages={3} getHref={(page) => `?page=${page}`} />
    </>
  );
}

describe('NizivoConfig labels, server-rendered', () => {
  test('a scope label reaches each client part', () => {
    const html = renderToString(<NizivoConfig labels={SCOPE}>{clientParts()}</NizivoConfig>);
    for (const text of [
      'aria-label="Suchen"',
      'aria-label="Suche leeren"',
      'aria-label="Passwort anzeigen"',
      'aria-label="Verringern"',
      'aria-label="Erhöhen"',
      'aria-label="Ausblenden"',
      'aria-label="Schließen"',
      'Ausverkauft',
      'Dateien hier ablegen oder ',
      'durchsuchen',
      'Mehr',
      'Es gibt ein Problem',
      'Lädt…',
      'Zeitraum wählen',
    ]) {
      expect(html).toContain(text);
    }
    for (const english of [
      'Select dates',
      'Clear search',
      'Show password',
      'Decrease quantity',
      'Increase quantity',
      'Unavailable',
      'There is a problem',
    ]) {
      expect(html).not.toContain(english);
    }
  });

  test("a part's own labels win key by key; the other keys still come from the scope", () => {
    const html = renderToString(
      <NizivoConfig labels={SCOPE}>
        {clientParts({ searchField: { clear: 'Leeren' } })}
      </NizivoConfig>,
    );
    expect(html).toContain('aria-label="Leeren"');
    expect(html).toContain('aria-label="Suchen"');
    expect(html).not.toContain('Suche leeren');
  });

  test('without a provider, or with a provider without labels, the English defaults show', () => {
    for (const html of [
      renderToString(clientParts()),
      renderToString(<NizivoConfig locale="de-DE">{clientParts()}</NizivoConfig>),
    ]) {
      for (const text of [
        'aria-label="Search"',
        'aria-label="Clear search"',
        'aria-label="Show password"',
        'aria-label="Decrease quantity"',
        'aria-label="Increase quantity"',
        'aria-label="Dismiss"',
        'Unavailable',
        'Drop files here or ',
        'browse',
        'More',
        'There is a problem',
        'Loading…',
        'Select dates',
      ]) {
        expect(html).toContain(text);
      }
    }
  });

  test('a server part ignores the scope', () => {
    const scoped = renderToString(<NizivoConfig labels={SCOPE}>{serverParts()}</NizivoConfig>);
    expect(scoped).toBe(renderToString(serverParts()));
    for (const text of [
      'aria-label="Breadcrumb"',
      'Loading…',
      'aria-label="Pagination"',
      'aria-label="Previous page"',
    ]) {
      expect(scoped).toContain(text);
    }
    for (const german of ['Schließen', 'Brotkrumen', 'Lädt…', 'Seitennavigation']) {
      expect(scoped).not.toContain(german);
    }
  });

  test('a whole catalogue of the enUS shape is accepted', () => {
    const deDE: typeof enUS = { ...enUS, searchField: { label: 'Suchen', clear: 'Suche leeren' } };
    const html = renderToString(
      <NizivoConfig labels={deDE}>
        <SearchField defaultValue="mug" />
      </NizivoConfig>,
    );
    expect(html).toContain('aria-label="Suche leeren"');
  });
});
