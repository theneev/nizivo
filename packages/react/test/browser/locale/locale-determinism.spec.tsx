// Locale determinism (ARCHITECTURE.md §16.4, M56): in a browser whose language is German, every
// component example renders the same text on the server and after hydration. The page runs with
// Playwright's `locale: 'de-DE'` (the `<engine>-de-DE` instance in test/browser/vitest.config.ts),
// so `navigator.language` and Intl's default locale are de-DE here.
//
// Each exported `*Example` of src/<name>/<name>.example.tsx (the set the visual lane and the docs
// render) goes through react-dom/server's `renderToString` in this page, into a container, and is
// hydrated with `hydrateRoot`. Its text (`textContent`, and every non-empty `aria-label`,
// `aria-valuetext`, `title`, `placeholder` and `value`) must be the same before and after, with no
// recoverable error and no console error. Empty attributes show no text and are left out: React
// Aria's native validation adds `title=""` to a Select's hidden <select> in a layout effect, so the
// browser shows no validation tooltip of its own.
//
// The server render runs in the same German page, so a part that formats with the default locale
// would render German on both sides and pass that comparison, and a popup that opens on hydration
// portals outside the container. More checks catch those: no text in the page (popups included)
// shows a German number or date format (an example's own `locale="de-DE"` part aside) or one of
// React Aria's German strings, and no Intl constructor or `toLocale…String` call runs without an
// explicit locale while an example renders or hydrates. Each was seen to fail with the fault it is
// for: NumberValue formatting with the default locale (9 examples), and EngineLocale without its
// `I18nProvider` (6 open overlays: "Schließen" for "Dismiss").
//
// No example is skipped: the ones open from the start (Dialog, Drawer, Menu, Popover, Select,
// Tooltip) and the toast stack add their popups to <body> after hydration, outside the container.
import { useEffect, type ComponentType } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';

const MODULES = import.meta.glob<Record<string, unknown>>('../../../src/*/*.example.tsx', {
  eager: true,
});

/**
 * Examples that set `locale="de-DE"` on one part, the last child of their root: that part's German
 * text is expected, and is what the German-format check must find there (its positive control).
 */
const GERMAN_PART: ReadonlySet<string> = new Set([
  'DeltaExample',
  'NumberValueExample',
  'CountUpExample',
]);

/** The attributes recorded beside the text, when not empty. */
const ATTRIBUTES = ['aria-label', 'aria-valuetext', 'title', 'placeholder', 'value'] as const;

/**
 * Formats a de-DE default would produce where en-US gives another: a decimal comma ("12,4 %", but
 * not Indian grouping, "₹4,82,190", which an example writes as a literal), a dot between thousands
 * ("1.250"), a numeric date ("24.10.2026"), a narrow or no-break space before % or € ("12 %",
 * "1.250,00 €"), German compact suffixes and month or weekday names.
 */
const GERMAN = [
  /\d,\d{1,2}(?![\d,])/,
  /\d\.\d{3}(?![\d.])/,
  /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/,
  /\d[\u00a0\u202f][%€]/,
  /\d\s?(?:Mio|Mrd|Tsd)\./,
  /\b(?:Januar|Februar|März|Juni|Juli|Oktober|Dezember|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\b/,
];

/**
 * React Aria's own German strings (its de-DE catalogues, where they differ from en-US): an engine
 * root that misses its `I18nProvider` takes the browser's language after hydration, and a popup
 * that opens then (portalled to <body>, so outside the before-and-after comparison) would show
 * them, "Schließen" for "Dismiss" first.
 */
type Catalogue = { default: Record<string, unknown> };
const ENGINE_DE = import.meta.glob<Catalogue>(
  [
    '../../../node_modules/react-aria/dist/private/intl/*/de-DE.mjs',
    '../../../node_modules/react-aria-components/dist/private/intl/de-DE.mjs',
  ],
  { eager: true },
);
const ENGINE_EN = import.meta.glob<Catalogue>(
  [
    '../../../node_modules/react-aria/dist/private/intl/*/en-US.mjs',
    '../../../node_modules/react-aria-components/dist/private/intl/en-US.mjs',
  ],
  { eager: true },
);
const ENGINE_GERMAN: readonly string[] = Object.entries(ENGINE_DE).flatMap(([path, german]) => {
  const english = ENGINE_EN[path.replace(/de-DE\.mjs$/, 'en-US.mjs')]?.default ?? {};
  return Object.entries(german.default).flatMap(([key, value]) =>
    typeof value === 'string' && value.length >= 5 && value !== english[key] ? [value] : [],
  );
});

interface Example {
  key: string;
  name: string;
  Component: ComponentType;
}

const examples: Example[] = Object.entries(MODULES)
  .flatMap(([path, module]) =>
    Object.entries(module)
      .filter(
        (entry): entry is [string, ComponentType] =>
          entry[0].endsWith('Example') && typeof entry[1] === 'function',
      )
      .map(([name, Component]) => ({
        key: `${/\/src\/([a-z0-9-]+)\//.exec(path)?.[1] ?? path}/${name}`,
        name,
        Component,
      })),
  )
  .toSorted((a, b) => a.key.localeCompare(b.key, 'en-US'));

/** Text and attributes of `root`, one line each. */
function record(root: Element): string[] {
  const lines = [`text: ${root.textContent ?? ''}`];
  for (const element of root.querySelectorAll('*')) {
    for (const name of ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value !== null && value !== '')
        lines.push(`${element.tagName.toLowerCase()} ${name}: ${value}`);
    }
  }
  return lines;
}

/** The lines that read German; `<data value>` is a machine value ("0.032"), not text. */
function germanIn(lines: readonly string[]): string[] {
  return lines.filter(
    (line) =>
      !line.startsWith('data value: ') &&
      (GERMAN.some((pattern) => pattern.test(line)) ||
        ENGINE_GERMAN.some((text) => line.includes(text))),
  );
}

/**
 * The page split around an example's `locale="de-DE"` part (its root's last child): the part's
 * lines, and the rest of the page's.
 */
function withoutGermanPart(key: string): { part: string[]; rest: string[] } {
  const clone = document.body.cloneNode(true);
  if (!(clone instanceof HTMLElement)) throw new Error('no body');
  const element = clone.firstElementChild?.firstElementChild?.lastElementChild;
  if (!element) throw new Error(`${key}: no de-DE part`);
  const part = record(element);
  element.remove();
  return { part, rest: record(clone) };
}

/**
 * Renders nothing, so the server HTML is the example's own; its effect runs once the root has
 * committed its hydration.
 */
function Hydrated({ onHydrated }: { onHydrated: () => void }): null {
  useEffect(() => onHydrated(), [onHydrated]);
  return null;
}

function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// ---- Intl calls without a locale -------------------------------------------------------------

type IntlName =
  | 'Collator'
  | 'DateTimeFormat'
  | 'DisplayNames'
  | 'ListFormat'
  | 'NumberFormat'
  | 'PluralRules'
  | 'RelativeTimeFormat'
  | 'Segmenter';
const INTL: readonly IntlName[] = [
  'Collator',
  'DateTimeFormat',
  'DisplayNames',
  'ListFormat',
  'NumberFormat',
  'PluralRules',
  'RelativeTimeFormat',
  'Segmenter',
];
const LOCALE_METHODS: readonly [object, string][] = [
  [Number.prototype, 'toLocaleString'],
  [BigInt.prototype, 'toLocaleString'],
  [Date.prototype, 'toLocaleString'],
  [Date.prototype, 'toLocaleDateString'],
  [Date.prototype, 'toLocaleTimeString'],
  [Array.prototype, 'toLocaleString'],
  [String.prototype, 'localeCompare'],
];

function isDefaultLocale(locales: unknown): boolean {
  return locales === undefined || (Array.isArray(locales) && locales.length === 0);
}

/** Records every Intl construction and `toLocale…` call that leaves the locale to the browser. */
function watchIntl(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const note = (what: string): void => {
    // the caller's first frames, without this spec's own
    const stack = (new Error('default locale').stack ?? '')
      .split('\n')
      .filter((line) => /:\d+:\d+\)?$/.test(line) && !line.includes('locale-determinism.spec'))
      .slice(0, 4);
    calls.push([what, ...stack].join('\n'));
  };
  const restores: (() => void)[] = [];
  for (const name of INTL) {
    const original: unknown = Reflect.get(Intl, name);
    if (typeof original !== 'function') continue;
    const proxy = new Proxy(original, {
      construct(target, args: unknown[], newTarget): object {
        if (isDefaultLocale(args[0])) note(`new Intl.${name}()`);
        // `new Intl.X()` hands the proxy as newTarget; a subclass hands its own
        return Reflect.construct(
          target,
          args,
          newTarget === Reflect.get(Intl, name) ? target : newTarget,
        );
      },
      apply(target, self, args: unknown[]) {
        if (isDefaultLocale(args[0])) note(`Intl.${name}()`);
        return Reflect.apply(target, self, args);
      },
    });
    Reflect.set(Intl, name, proxy);
    restores.push(() => Reflect.set(Intl, name, original));
  }
  for (const [proto, method] of LOCALE_METHODS) {
    const original: unknown = Reflect.get(proto, method);
    if (typeof original !== 'function') continue;
    const localeAt = method === 'localeCompare' ? 1 : 0;
    Reflect.set(proto, method, function (this: unknown, ...args: unknown[]): unknown {
      if (isDefaultLocale(args[localeAt])) note(`${method}()`);
      return Reflect.apply(original, this, args);
    });
    restores.push(() => Reflect.set(proto, method, original));
  }
  return { calls, restore: () => restores.forEach((undo) => undo()) };
}

// ---- the cases -------------------------------------------------------------------------------

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

test('the page is German: navigator.language and Intl’s default locale are de-DE', () => {
  expect(navigator.language).toBe('de-DE');
  expect(new Intl.NumberFormat().resolvedOptions().locale).toBe('de-DE');
  expect(new Intl.NumberFormat().format(1234.5)).toBe('1.234,5');
  expect(
    new Intl.DateTimeFormat(undefined, { timeZone: 'UTC' }).format(Date.UTC(2026, 9, 24)),
  ).toBe('24.10.2026');
});

test('every example module was found', () => {
  expect(Object.keys(MODULES).length).toBeGreaterThan(60);
  expect(examples.length).toBeGreaterThan(130);
  // React Aria's catalogues moved: the engine-string check would find nothing
  expect(Object.keys(ENGINE_DE).length).toBeGreaterThan(10);
  expect(ENGINE_GERMAN).toContain('Schließen');
});

describe('server text = hydrated text, in a de-DE browser', () => {
  for (const { key, name, Component } of examples) {
    test(`${key} keeps its text`, async () => {
      const errors: string[] = [];
      vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
      });
      let hydrated: (() => void) | undefined;
      const done = new Promise<void>((resolve) => {
        hydrated = resolve;
      });
      const app = (
        <>
          <Component />
          <Hydrated onHydrated={() => hydrated?.()} />
        </>
      );

      const intl = watchIntl();
      let before: string[];
      let after: string[];
      let page: string[];
      const container = document.createElement('div');
      try {
        container.innerHTML = renderToString(app);
        document.body.append(container);
        before = record(container);
        roots.push(
          hydrateRoot(container, app, {
            onRecoverableError: (error) => errors.push(`recoverable: ${String(error)}`),
          }),
        );
        await done;
        await frame();
        await frame();
        after = record(container);
        // popups and toasts portal to <body>: they are checked for German formats too
        page = record(document.body);
      } finally {
        intl.restore();
      }

      // soft: a failing example reports every check it fails
      expect.soft(errors, 'hydration logged an error').toEqual([]);
      expect.soft(after, 'text or attributes changed after hydration').toEqual(before);
      expect.soft(intl.calls, 'Intl ran with the browser’s default locale').toEqual([]);

      const { part, rest } = GERMAN_PART.has(name)
        ? withoutGermanPart(key)
        : { part: [], rest: page };
      // the positive control: an example's own locale="de-DE" part is caught, and only there
      expect
        .soft(germanIn(part).length > 0, 'the example’s de-DE part reads German')
        .toBe(GERMAN_PART.has(name));
      expect
        .soft(germanIn(rest), 'German text: a de-DE number or date format, or a React Aria string')
        .toEqual([]);
    });
  }
});
