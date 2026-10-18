import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { generateApi } from '../api/generate.ts';
import type {
  ApiExport,
  ComponentExport,
  CssApiFile,
  NamespaceExport,
  ReactApiFile,
  ReexportedExport,
  TypeExport,
} from '../api/schema.ts';

const bin = fileURLToPath(new URL('../bin/nz.ts', import.meta.url));
const fixture = fileURLToPath(new URL('fixtures/api', import.meta.url));
/** React's types, for the checker reading the fixture's `.d.ts` files. */
const reactModules = fileURLToPath(new URL('../../react/node_modules', import.meta.url));
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A writable copy of the fixture, with its `built/` folders as the `dist/` they stand for. */
function copyFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'nz-api-'));
  roots.push(root);
  cpSync(fixture, root, { recursive: true });
  for (const name of ['react', 'tokens']) {
    renameSync(join(root, 'packages', name, 'built'), join(root, 'packages', name, 'dist'));
  }
  symlinkSync(reactModules, join(root, 'packages', 'react', 'node_modules'), 'dir');
  return root;
}

function nz(...args: string[]) {
  const result = spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const edit = (file: string, change: (text: string) => string) =>
  writeFileSync(file, change(readFileSync(file, 'utf8')));

interface Generated {
  /** Every path under `contracts/api`. */
  paths: string[];
  react: Map<string, ReactApiFile>;
  css: Map<string, CssApiFile>;
}

/** Generated files by their path under `contracts/api`. */
function generated(root: string): Generated {
  const { files, errors } = generateApi(root);
  expect(errors).toEqual([]);
  const prefix = join(root, 'contracts', 'api', '/');
  const result: Generated = { paths: [], react: new Map(), css: new Map() };
  for (const [file, content] of files) {
    const path = file.slice(prefix.length);
    result.paths.push(path);
    if (content === null) continue;
    if (path.startsWith('react/')) result.react.set(path, JSON.parse(content));
    else result.css.set(path, JSON.parse(content));
  }
  return result;
}

function reactFile(files: Generated, path: string): ReactApiFile {
  const file = files.react.get(path);
  if (file === undefined) throw new Error(`${path} was not generated`);
  return file;
}

/** An export documented in this file (not a re-export). */
function ownExport(file: ReactApiFile, name: string): Exclude<ApiExport, ReexportedExport> {
  const found = file.exports.find((item) => item.name === name);
  if (found === undefined || found.definedIn !== undefined) {
    throw new Error(`${file.entry} documents no ${name}`);
  }
  return found;
}

function componentExport(file: ReactApiFile, name: string): ComponentExport {
  const found = ownExport(file, name);
  if (found.kind !== 'component') throw new Error(`${name} is a ${found.kind}`);
  return found;
}

function typeExport(file: ReactApiFile, name: string): TypeExport {
  const found = ownExport(file, name);
  if (found.kind !== 'type') throw new Error(`${name} is a ${found.kind}`);
  return found;
}

function namespaceExport(file: ReactApiFile, name: string): NamespaceExport {
  const found = ownExport(file, name);
  if (found.kind !== 'namespace') throw new Error(`${name} is a ${found.kind}`);
  return found;
}

function problems(root: string): string[] {
  return generateApi(root).errors;
}

describe('the fixture', () => {
  let files: Generated;
  let chip: ReactApiFile;
  let pane: ReactApiFile;
  beforeAll(() => {
    files = generated(copyFixture());
    chip = reactFile(files, 'react/chip.json');
    pane = reactFile(files, 'react/pane.json');
  });
  test('writes one file per JavaScript entry and per stylesheet', () => {
    expect(files.paths.toSorted()).toEqual([
      'css/chip.json',
      'react/chip.json',
      'react/index.json',
      'react/pane.json',
    ]);
  });

  test('a component: inline @default, literal values in declaration order, deprecation', () => {
    const component = componentExport(chip, 'Chip');
    expect(component.description).toBe('A compact label.');
    expect(component.client).toBe(false);
    expect(component.source).toBe('packages/react/src/chip/chip.tsx');
    const props = Object.fromEntries(component.props.map((prop) => [prop.name, prop]));
    expect(props.tone).toEqual({
      default: "'neutral'",
      description: 'Figma "Tone".',
      name: 'tone',
      required: false,
      type: 'ChipTone',
      values: ['neutral', 'critical'],
    });
    // `keyof` follows the interface, `(typeof X)[number]` the tuple
    expect(props.variant?.values).toEqual(['soft', 'solid']);
    expect(props.variant?.default).toBe("'soft'");
    expect(props.size?.values).toEqual(['sm', 'md']);
    expect(props.title?.description).toBe(
      'One line of text. The chip truncates it.\n\n- short words fit;\n- long ones are cut.',
    );
    // a trailing `| undefined` restates the `?`
    expect(props.label).toEqual({
      deprecated: 'Use `title`.',
      name: 'label',
      required: false,
      type: 'string',
    });
  });

  test('an Omit<> DOM base is summarised, with its element, omitted keys and overrides', () => {
    expect(componentExport(chip, 'Chip').inherits).toEqual([
      {
        base: "ComponentPropsWithRef<'span'>",
        element: 'span',
        omitted: ['title'],
        overridden: ['role'],
        text: "Omit<ComponentPropsWithRef<'span'>, 'title'>",
      },
    ]);
  });

  test('a render prop documents the state fields; the props and state types point back', () => {
    expect(componentExport(chip, 'Chip').render).toEqual({
      state: [
        {
          name: 'size',
          required: true,
          type: 'ChipSize | undefined',
          values: ['sm', 'md'],
        },
        { name: 'tone', required: true, type: 'ChipTone', values: ['neutral', 'critical'] },
      ],
      stateType: 'ChipState',
    });
    expect(typeExport(chip, 'ChipProps').propsOf).toBe('Chip');
    expect(typeExport(chip, 'ChipProps').members).toBeUndefined();
    expect(typeExport(chip, 'ChipState').stateOf).toBe('Chip');
    expect(typeExport(chip, 'ChipLabels').members).toEqual([
      {
        default: "'Remove'",
        description: "The remove button's name.",
        name: 'remove',
        required: true,
        type: 'string',
      },
    ]);
  });

  test('functions and constants', () => {
    expect(ownExport(chip, 'chipLabel')).toEqual({
      client: false,
      description: 'The accessible label of a chip.',
      import: "import { chipLabel } from '@nizivo/react/chip'",
      kind: 'function',
      name: 'chipLabel',
      signatures: [
        {
          parameters: [
            { description: "The chip's tone.", name: 'tone', optional: false, type: 'ChipTone' },
            {
              description: 'More words.',
              name: 'extra',
              optional: false,
              rest: true,
              type: 'string[]',
            },
          ],
          returns: { description: 'The label.', type: 'string' },
          text: 'function chipLabel(tone: ChipTone, ...extra: string[]): string',
        },
      ],
      source: 'packages/react/src/chip/chip.tsx',
    });
    expect(ownExport(chip, 'CHIP_SIZES')).toMatchObject({
      kind: 'constant',
      type: "readonly ['sm', 'md']",
    });
  });

  test('slots: the root, and an inner slot written by a helper the component calls', () => {
    expect(chip.slots).toEqual([
      {
        attributes: [
          {
            group: 'presentational',
            meaning: 'The tone prop',
            name: 'data-tone',
            prop: 'tone',
            values: ['neutral', 'critical'],
          },
        ],
        interactive: false,
        part: true,
        renderedBy: 'Chip',
        slot: 'chip',
        stateIndicator: [],
      },
      {
        attributes: [],
        interactive: false,
        part: false,
        renderedBy: 'Chip',
        slot: 'chip-text',
        stateIndicator: [],
      },
    ]);
    expect(componentExport(chip, 'Chip').slot).toBe('chip');
  });

  test('a compound: parts in manifest order, client leaves, flat names point at the namespace', () => {
    const namespace = namespaceExport(pane, 'Pane');
    expect(
      namespace.parts.map((part) => [part.name, part.flatName, part.client, part.slot]),
    ).toEqual([
      ['Root', 'PaneRoot', true, 'pane'],
      ['Trigger', 'PaneTrigger', true, 'pane-trigger'],
    ]);
    expect(namespace.parts[0]?.props.find((prop) => prop.name === 'size')).toEqual({
      default: "'md'",
      description: '32 / 40 px.',
      name: 'size',
      required: false,
      type: "'sm' | 'md'",
      values: ['sm', 'md'],
    });
    expect(ownExport(pane, 'PaneTrigger')).toEqual({
      import: "import { PaneTrigger } from '@nizivo/react/pane'",
      kind: 'part',
      name: 'PaneTrigger',
      partOf: 'Pane.Trigger',
    });
    expect(typeExport(pane, 'PaneTriggerState').stateOf).toBe('Pane.Trigger');
  });

  test('engine parts carry the attributes the adapter merges, through each prop it is given', () => {
    const attributes = Object.fromEntries(
      pane.slots.map((slot) => [slot.slot, slot.attributes.map((attribute) => attribute.name)]),
    );
    expect(attributes).toEqual({
      pane: ['data-disabled', 'data-open', 'data-size'],
      'pane-icon': [],
      'pane-panel': ['data-side'],
      'pane-trigger': ['data-open', 'data-pressed'],
    });
    const trigger = pane.slots.find((slot) => slot.slot === 'pane-trigger');
    expect(trigger).toMatchObject({ focusTarget: 'self', interactive: true, part: true });
    const panel = pane.slots.find((slot) => slot.slot === 'pane-panel');
    expect(panel).toMatchObject({ part: false, renderedBy: 'Pane.Trigger' });
  });

  test('an attribute mirrors a prop only when the prop can take every value it carries', () => {
    // Pane.Trigger's `side` takes 'start' | 'end'; the panel's data-side is 'top' | 'bottom'.
    const panel = pane.slots.find((slot) => slot.slot === 'pane-panel');
    expect(panel?.attributes).toEqual([
      { group: 'state', meaning: 'Resolved side', name: 'data-side', values: ['top', 'bottom'] },
    ]);
    // Chip's data-tone and `tone` take the same values, so it mirrors (see the slots test).
    expect(chip.slots[0]?.attributes[0]?.prop).toBe('tone');
  });

  test('forced-colours indicators from the manifest, on their slots, in manifest order', () => {
    const indicators = Object.fromEntries(
      pane.slots.map((slot) => [slot.slot, slot.stateIndicator]),
    );
    expect(indicators).toEqual({
      pane: [],
      'pane-icon': [],
      'pane-panel': [{ paint: 'border' }],
      'pane-trigger': [{ paint: 'highlight', state: '[data-open]' }],
    });
  });

  test('the root barrel re-exports, each pointing at the entry that documents it', () => {
    const index = reactFile(files, 'react/index.json');
    expect(index.component).toBeUndefined();
    expect(index.slots).toEqual([]);
    expect(index.exports.find((item) => item.name === 'Pane')).toEqual({
      definedIn: './pane',
      import: "import { Pane } from '@nizivo/react'",
      kind: 'namespace',
      name: 'Pane',
    });
    expect(index.exports.every((item) => item.definedIn !== undefined)).toBe(true);
  });

  test('a stylesheet: hooks with their fallbacks, reads, conditions and descriptions', () => {
    const css = files.css.get('css/chip.json');
    if (css === undefined) throw new Error('css/chip.json was not generated');
    expect(css.component).toBe('chip');
    expect(css.hooks.map((hook) => [hook.name, hook.fallback.kind, hook.description])).toEqual([
      ['--nz-chip-bg', 'private', undefined],
      ['--nz-chip-fg-hover', 'token', undefined],
      ['--nz-chip-gap', 'token', 'Space between the icon and the text, in a 4 px step'],
      ['--nz-chip-text-max', 'literal', undefined],
    ]);
    expect(css.hooks[1]?.reads).toEqual([
      {
        conditions: ['@media (hover: hover)'],
        property: 'color',
        selector: '.nz-chip:hover',
        slot: 'chip',
      },
    ]);
  });
});

describe('nz api', () => {
  test('--check lists new files, then passes after a write, then summarises a change', () => {
    const root = copyFixture();
    const before = nz('api', '--check', '--root', root);
    expect(before.status).toBe(1);
    expect(before.output).toBe(
      'nz api --check: 4 file(s) out of date; run `pnpm nz api` after `pnpm build`\n' +
        '  contracts/api/css/chip.json (new)\n' +
        '  contracts/api/react/chip.json (new)\n' +
        '  contracts/api/react/index.json (new)\n' +
        '  contracts/api/react/pane.json (new)\n',
    );
    expect(nz('api', '--root', root).status).toBe(0);
    expect(nz('api', '--check', '--root', root)).toEqual({
      status: 0,
      output: expect.stringMatching(/^nz api --check: up to date \(4 files, \d+ ms\)\n$/),
    });

    edit(join(root, 'contracts/api/react/chip.json'), (text) =>
      text.replace('"A compact label."', '"An old label."'),
    );
    // a line missing from the committed file: only that line is shown, not the lines it shifts
    edit(join(root, 'contracts/api/css/chip.json'), (text) =>
      text.replace(/\n *"description": "Space between[^\n]*/, ''),
    );
    mkdirSync(join(root, 'contracts/api/react/unstable'));
    writeFileSync(join(root, 'contracts/api/react/unstable/gone.json'), '{}\n');
    const after = nz('api', '--check', '--root', root);
    expect(after.status).toBe(1);
    expect(after.output).toContain(
      '  contracts/api/css/chip.json: +1 −0 lines, first change at line 54\n' +
        '    +       "description": "Space between the icon and the text, in a 4 px step",\n' +
        '  contracts/api/react/chip.json: +1 −1 lines, first change at line 26\n' +
        '    -       "description": "An old label.",\n' +
        '    +       "description": "A compact label.",\n',
    );
    expect(after.output).toContain('  contracts/api/react/unstable/gone.json (delete)');
  });

  test('a stale dist fails instead of writing a stale contract', () => {
    const root = copyFixture();
    edit(join(root, 'packages/react/src/chip/index.ts'), (text) =>
      text.replace('chipLabel }', 'chipLabel, chipLabel as label }'),
    );
    expect(problems(root)).toEqual([
      'packages/react/dist/chip/index.d.ts: its exports differ from packages/react/src/chip/index.ts; missing label (rebuild @nizivo/react)',
    ]);
  });

  test('a missing build is named', () => {
    const root = copyFixture();
    rmSync(join(root, 'packages/react/dist'), { recursive: true });
    const result = nz('api', '--root', root);
    expect(result.status).toBe(1);
    expect(result.output).toContain('./dist/chip/index.d.ts is missing; build @nizivo/react first');
  });

  test('the root is found through a same-file builder and through a wrapper around {renderElement(…)}', () => {
    const builder = copyFixture();
    edit(join(builder, 'packages/react/src/chip/chip.tsx'), (text) =>
      text.replace(
        '}: ChipProps): ReactElement {\n  return renderElement(',
        "}: ChipProps): ReactElement {\n  return chipElement(render, tone, size, variant, title, className, rest);\n}\n\nfunction chipElement(\n  render: ChipProps['render'],\n  tone: ChipTone,\n  size: ChipSize | undefined,\n  variant: ChipVariant,\n  title: ReactNode,\n  className: string | undefined,\n  rest: object,\n): ReactElement {\n  return renderElement(",
      ),
    );
    const chip = reactFile(generated(builder), 'react/chip.json');
    expect(chip.slots.find((slot) => slot.slot === 'chip')).toMatchObject({ part: true });

    const wrapper = copyFixture();
    edit(join(wrapper, 'packages/react/src/chip/chip.tsx'), (text) =>
      text
        .replace(
          '}: ChipProps): ReactElement {\n  return renderElement(',
          '}: ChipProps): ReactElement {\n  return (\n    <>\n      {renderElement(',
        )
        .replace(
          '      children: title === undefined ? null : text(title),\n    },\n  );\n}',
          '      children: title === undefined ? null : text(title),\n    },\n  )}\n    </>\n  );\n}',
        ),
    );
    const wrapped = reactFile(generated(wrapper), 'react/chip.json');
    expect(wrapped.slots.find((slot) => slot.slot === 'chip')).toMatchObject({ part: true });
  });

  test('a `<Name>Static` twin in a leaf-free module shares its base’s slots and root (M31)', () => {
    const root = copyFixture();
    const src = join(root, 'packages/react/src/chip');
    const dist = join(root, 'packages/react/dist/chip');
    writeFileSync(
      join(src, 'chip-static.tsx'),
      [
        "import type { ReactElement } from 'react';",
        "import { renderElement } from '../contracts/render';",
        "import type { ChipStaticProps } from './chip';",
        '',
        '/** A chip from a module with no client import. */',
        'export function ChipStatic({ className, ...rest }: ChipStaticProps): ReactElement {',
        '  return chipElement(className, rest);',
        '}',
        '',
        'function chipElement(className: string | undefined, rest: object): ReactElement {',
        "  return renderElement('span', undefined, {}, {",
        "    'data-slot': 'chip',",
        '    ...rest,',
        '    className: `nz-chip ${className ?? ""}`,',
        '  });',
        '}',
        '',
      ].join('\n'),
    );
    edit(join(src, 'chip.tsx'), (text) =>
      text.replace(
        '/** A compact label. */',
        "/** The static twin's props. */\nexport interface ChipStaticProps extends ChipProps {\n  /** Required here. */\n  'aria-label': string;\n}\n\n/** A compact label. */",
      ),
    );
    edit(join(src, 'index.ts'), (text) =>
      text
        .replace(
          "from './chip';\nexport type",
          "from './chip';\nexport { ChipStatic } from './chip-static';\nexport type",
        )
        .replace('  ChipState,', '  ChipState,\n  ChipStaticProps,'),
    );
    writeFileSync(
      join(dist, 'chip-static.d.ts'),
      "import { ChipStaticProps } from './chip.js';\nimport { ReactElement } from 'react';\n/** A chip from a module with no client import. */\nexport declare function ChipStatic({ className, ...rest }: ChipStaticProps): ReactElement;\n",
    );
    writeFileSync(
      join(dist, 'chip-static.js'),
      'function ChipStatic({ className, ...rest }) {\n  return { className, ...rest };\n}\nexport { ChipStatic };\n',
    );
    edit(join(dist, 'chip.d.ts'), (text) =>
      text.replace(
        '/** A compact label. */',
        "/** The static twin's props. */\nexport interface ChipStaticProps extends ChipProps {\n  /** Required here. */\n  'aria-label': string;\n}\n/** A compact label. */",
      ),
    );
    edit(join(dist, 'index.d.ts'), (text) =>
      text
        .replace(
          "} from './chip.js';",
          "} from './chip.js';\nimport { ChipStatic } from './chip-static.js';",
        )
        .replace('  Chip,\n  type ChipLabels,', '  Chip,\n  ChipStatic,\n  type ChipLabels,')
        .replace('  ChipState,\n  ChipTone,', '  ChipState,\n  ChipStaticProps,\n  ChipTone,')
        .replace('  type ChipState,', '  type ChipState,\n  type ChipStaticProps,'),
    );
    const chip = reactFile(generated(root), 'react/chip.json');
    expect(componentExport(chip, 'Chip').slot).toBe('chip');
    expect(componentExport(chip, 'ChipStatic').slot).toBe('chip');
    expect(chip.slots.find((slot) => slot.slot === 'chip')).toMatchObject({
      part: true,
      renderedBy: 'Chip',
    });
  });

  test('an attribute outside the vocabulary, a slot without its class, a misnamed root', () => {
    const root = copyFixture();
    edit(join(root, 'packages/react/src/chip/chip.tsx'), (text) =>
      text
        .replace("'data-tone': tone,", "'data-tone': tone,\n      'data-mood': tone,")
        .replace('className="nz-chip-text"', 'className="nz-chip-label"'),
    );
    edit(join(root, 'packages/react/src/pane/pane.client.tsx'), (text) =>
      text.replaceAll('pane-trigger', 'pane-button'),
    );
    expect(problems(root)).toEqual([
      'packages/react/src/chip/chip.tsx: the element with data-slot "chip-text" must have the class nz-chip-text (§8.2)',
      'packages/react/src/chip: data-slot "chip": data-mood is not in contracts/vocabulary.json (§8.3)',
      'packages/react/src/pane: PaneTrigger renders data-slot "pane-button" as its root; §8.2 names it "pane-trigger"',
      'packages/react/src/pane: interactive slot "pane-trigger" is rendered by no component',
      'packages/react/src/pane: stateIndicator slot "pane-trigger" is rendered by no component',
    ]);
  });
});

/** `nz api` reads the built packages; tooling cannot depend on them (tokens depends on tooling). */
const built = ['react/dist/index.d.ts', 'tokens/dist/contract.json'].every((file) =>
  existsSync(fileURLToPath(new URL(`../../${file}`, import.meta.url))),
);
if (!built) {
  console.warn('skipping the contracts/api check: build @nizivo/tokens and @nizivo/react first');
}

test.skipIf(!built)('contracts/api is up to date with the built packages', () => {
  const result = nz('api', '--check');
  expect(result.output).toMatch(/^nz api --check: up to date \(\d+ files, \d+ ms\)\n$/);
  expect(result.status).toBe(0);
});
