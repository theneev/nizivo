// The locale catalogues (@nizivo/react/locales/<tag>, ARCHITECTURE.md §16.4, seam K10).
// Drift: every en-US entry equals the component's own default, read from its source twice (the
// `@default` JSDoc of its `<Name>Labels` member and the code's fallback: `labels?.x ?? '…'` or a
// `<Name>Labels`-typed object literal), and every default in the source is in the catalogue.
// Plural lint: every plural object in a catalogue lists exactly its locale's CLDR categories.
import { describe, expect, test } from 'vitest';
import { isClient, rekey } from '../helpers/graph';
import { pluralLint } from '../helpers/plural-lint';
import { enUS } from '../../src/locales/en-US';

type Catalogue = Readonly<Record<string, object>>;

const SRC = rekey(
  import.meta.glob(['../../src/**/*.{ts,tsx}', '!../../src/**/*.example.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

/** Every catalogue module under src/locales, by path (`src/locales/en-US.ts`). */
const LOCALES = new Map(
  Object.entries(
    import.meta.glob<Record<string, Catalogue>>('../../src/locales/*.ts', { eager: true }),
  ).map(([path, module]) => [path.slice(path.indexOf('src/')), module]),
);

/**
 * Exported `*Labels` types that have no catalogue entry, and why. A new Labels type must be added
 * to the catalogue or here.
 */
const NOT_CATALOGUED: Record<string, string> = {
  MenuLabels: 'only `dismiss`, engine-owned (React Aria renders and translates it)',
  NizivoLabels:
    "NizivoConfig's `labels`: the catalogue's own shape, derived from it, not a part's strings",
  SelectLabels: "`placeholder` is a prop whose default is React Aria's localized string",
  TooltipLabels: 'no strings',
};

const STRING = String.raw`'((?:[^'\\]|\\.)*)'`;
const FALLBACK = new RegExp(String.raw`labels\?\.(\w+)\s*\?\?\s*${STRING}`, 'g');

function unquote(text: string): string {
  return text.replace(/\\(.)/g, '$1');
}

function folder(file: string): string {
  return file.split('/').slice(0, 2).join('/');
}

interface LabelsType {
  file: string;
  /** Member → its `@default '…'`, or undefined when the JSDoc has none. */
  members: Map<string, string | undefined>;
}

/** Every exported `*Labels` interface or type alias in the sources, with its members' JSDoc defaults. */
function labelsTypes(sources: Map<string, string>): Map<string, LabelsType> {
  const types = new Map<string, LabelsType>();
  for (const [file, text] of sources) {
    for (const match of text.matchAll(/^export type (\w+Labels)\b/gm)) {
      types.set(match[1] ?? '', { file, members: new Map() });
    }
    for (const match of text.matchAll(/^export interface (\w+Labels) \{\n([\s\S]*?)^\}/gm)) {
      const members = new Map<string, string | undefined>();
      for (const member of (match[2] ?? '').matchAll(
        /((?:\/\*\*[\s\S]*?\*\/\s*)?)^ {2}(\w+)\??:/gm,
      )) {
        const doc = new RegExp(String.raw`@default ${STRING}`).exec(member[1] ?? '');
        members.set(member[2] ?? '', doc === null ? undefined : unquote(doc[1] ?? ''));
      }
      types.set(match[1] ?? '', { file, members });
    }
  }
  return types;
}

/** The code's fallbacks for a Labels type: `labels?.x ?? '…'` in its folder, and typed literals. */
function codeDefaults(
  sources: Map<string, string>,
  type: string,
  file: string,
): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const add = (key: string, value: string) => found.set(key, [...(found.get(key) ?? []), value]);
  for (const [path, text] of sources) {
    if (folder(path) === folder(file)) {
      for (const match of text.matchAll(FALLBACK)) add(match[1] ?? '', unquote(match[2] ?? ''));
    }
    const literal = new RegExp(String.raw`:\s*${type}\s*=\s*\{([\s\S]*?)\};`, 'g');
    for (const match of text.matchAll(literal)) {
      for (const entry of (match[1] ?? '').matchAll(
        new RegExp(String.raw`(\w+):\s*${STRING}`, 'g'),
      )) {
        add(entry[1] ?? '', unquote(entry[2] ?? ''));
      }
    }
  }
  return found;
}

/** Catalogue key → the Labels type its annotation names (`dialog: Pick<DialogLabels, 'close'>`). */
function catalogueTypes(text: string): Map<string, string> {
  const block = /export const \w+: \{\n([\s\S]*?)\n\} = \{/.exec(text)?.[1] ?? '';
  return new Map(
    [...block.matchAll(/^ {2}(\w+): (?:Pick<)?(\w+Labels)\b/gm)].map((m) => [
      m[1] ?? '',
      m[2] ?? '',
    ]),
  );
}

/** Everything that differs between a catalogue and the sources' defaults. */
function drift(
  catalogue: Catalogue,
  catalogueText: string,
  sources: Map<string, string>,
): string[] {
  const problems: string[] = [];
  const types = labelsTypes(sources);
  const keyed = catalogueTypes(catalogueText);
  if ([...keyed.keys()].join() !== Object.keys(catalogue).join()) {
    problems.push(
      `the catalogue's type names ${[...keyed.keys()].join()}, its value ${Object.keys(catalogue).join()}`,
    );
  }
  const catalogued = new Set(keyed.values());

  for (const [key, typeName] of keyed) {
    const type = types.get(typeName);
    if (type === undefined) {
      problems.push(`${key}: ${typeName} is not an exported Labels interface`);
      continue;
    }
    const defaulted = [...type.members].filter(([, value]) => value !== undefined);
    const values = new Map(Object.entries(catalogue[key] ?? {}));
    const expectedKeys = defaulted.map(([member]) => member).toSorted();
    if ([...values.keys()].toSorted().join() !== expectedKeys.join()) {
      problems.push(
        `${key}: keys ${[...values.keys()].toSorted().join()}, ${typeName} defaults ${expectedKeys.join()}`,
      );
    }
    const code = codeDefaults(sources, typeName, type.file);
    for (const [member, jsdoc] of defaulted) {
      const value: unknown = values.get(member);
      if (value !== jsdoc)
        problems.push(
          `${key}.${member}: catalogue ${JSON.stringify(value)}, @default ${JSON.stringify(jsdoc)}`,
        );
      const fallbacks = code.get(member) ?? [];
      if (fallbacks.length === 0) problems.push(`${key}.${member}: no default found in the code`);
      for (const fallback of fallbacks) {
        if (fallback !== value)
          problems.push(
            `${key}.${member}: catalogue ${JSON.stringify(value)}, code ${JSON.stringify(fallback)}`,
          );
      }
    }
  }

  for (const [name, type] of types) {
    if (!catalogued.has(name) && NOT_CATALOGUED[name] === undefined) {
      problems.push(`${name} (${type.file}) is neither in the catalogue nor in NOT_CATALOGUED`);
    }
  }
  // Every `labels?.x ?? '…'` fallback in the sources belongs to a catalogued Labels member.
  for (const [path, text] of sources) {
    for (const match of text.matchAll(FALLBACK)) {
      const owner = [...types].find(
        ([name, type]) =>
          catalogued.has(name) &&
          folder(type.file) === folder(path) &&
          type.members.has(match[1] ?? ''),
      );
      if (owner === undefined)
        problems.push(`${path}: labels?.${match[1]} ?? '${match[2]}' has no catalogue entry`);
    }
  }
  return problems;
}

describe('locales/en-US', () => {
  const text = SRC.get('src/locales/en-US.ts') ?? '';

  test('every entry equals the component default, and every default is in it', () => {
    expect(drift(enUS, text, SRC)).toEqual([]);
  });

  test('the drift check fails when a component default changes without the catalogue', () => {
    const changed = new Map(SRC);
    const button = 'src/button/button.tsx';
    changed.set(
      button,
      (SRC.get(button) ?? '').replace(
        "labels?.pending ?? 'Loading…'",
        "labels?.pending ?? 'Loading'",
      ),
    );
    expect(changed.get(button)).not.toBe(SRC.get(button));
    expect(drift(enUS, text, changed)).toEqual([
      'button.pending: catalogue "Loading…", code "Loading"',
    ]);

    const store = 'src/toast/toaster.client.tsx';
    changed.set(
      store,
      (SRC.get(store) ?? '').replace("dismiss: 'Dismiss' }", "dismiss: 'Close' }"),
    );
    expect(drift(enUS, text, changed)).toContain(
      'toaster.dismiss: catalogue "Dismiss", code "Close"',
    );

    const docs = new Map(SRC);
    const metric = 'src/metric/metric.tsx';
    docs.set(metric, (SRC.get(metric) ?? '').replace("@default 'No data'", "@default 'Nothing'"));
    expect(drift(enUS, text, docs)).toContain(
      'metric.empty: catalogue "No data", @default "Nothing"',
    );
  });

  test('the module is the strings: no directive, type-only imports, one export', () => {
    expect(isClient(text)).toBe(false);
    const imports = text.match(/^import\b.*$/gm) ?? [];
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.filter((line) => !line.startsWith('import type {'))).toEqual([]);
    expect(text.match(/^export\b.*$/gm)).toEqual(['export const enUS: {']);
    expect(Object.keys(LOCALES.get('src/locales/en-US.ts') ?? {})).toEqual(['enUS']);
  });
});

describe('plural lint', () => {
  test('every catalogue under src/locales passes for its tag', () => {
    expect(LOCALES.size).toBeGreaterThan(0);
    for (const [path, module] of LOCALES) {
      const tag = /src\/locales\/(.+)\.ts$/.exec(path)?.[1] ?? '';
      const exported = Object.values(module);
      expect(exported).toHaveLength(1);
      expect({ path, problems: pluralLint(exported[0] ?? {}, tag) }).toEqual({
        path,
        problems: [],
      });
    }
  });

  test('a missing or an extra category fails', () => {
    const bad: Catalogue = {
      avatarGroup: {
        more: { one: '{count} more', two: '{count} more' },
        overflow: { one: '+{count}', other: '+{count}' },
      },
    };
    expect(pluralLint(bad, 'en-US')).toEqual([
      'avatarGroup.more: missing other for en-US',
      'avatarGroup.more: two not used by en-US',
    ]);
    expect(pluralLint(bad, 'pl')).toEqual([
      'avatarGroup.more: missing few, many, other for pl',
      'avatarGroup.more: two not used by pl',
      'avatarGroup.overflow: missing few, many for pl',
    ]);
  });

  test('a complete plural object passes in pl and ar', () => {
    const pl = { one: 'a', few: 'b', many: 'c', other: 'd' };
    const ar = { zero: 'a', one: 'b', two: 'c', few: 'd', many: 'e', other: 'f' };
    expect(pluralLint({ avatarGroup: { more: pl, overflow: '+{count}' } }, 'pl')).toEqual([]);
    expect(pluralLint({ avatarGroup: { more: ar } }, 'ar')).toEqual([]);
    expect(pluralLint({ avatarGroup: { more: ar } }, 'pl')).toEqual([
      'avatarGroup.more: zero, two not used by pl',
    ]);
  });
});
