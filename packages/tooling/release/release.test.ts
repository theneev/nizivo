import { describe, expect, test } from 'vitest';
import { checkDirectives, type DirectiveInput } from './directives.ts';
import { checkTarball } from './tarball.ts';

// The shapes tsdown's unbundled build writes today (packages/react/dist), cut down to one server
// component (button), one engine component (select) and the shared engine modules.
const DIST: Record<string, string> = {
  'dist/index.js':
    'import { Button } from "./button/button.js";\nimport { SelectRoot } from "./select/select.client.js";\nimport { select_parts_exports } from "./select/select.parts.js";\nexport { Button, select_parts_exports as Select, SelectRoot };\n',
  'dist/button/index.js': 'export { Button } from "./button.js";\n',
  'dist/button/button.js':
    'import { cx } from "../_internal/cx.js";\nimport { jsx } from "react/jsx-runtime";\nfunction Button() {}\nexport { Button };\n',
  'dist/_internal/cx.js': 'function cx() {}\nexport { cx };\n',
  'dist/select/index.js':
    'import { SelectRoot } from "./select.client.js";\nimport { select_parts_exports } from "./select.parts.js";\nexport { select_parts_exports as Select, SelectRoot };\n',
  'dist/select/select.parts.js':
    'import { __exportAll } from "../_virtual/_rolldown/runtime.js";\nimport { SelectRoot } from "./select.client.js";\nvar select_parts_exports = /* @__PURE__ */ __exportAll({ Root: () => SelectRoot });\nexport { SelectRoot as Root, select_parts_exports };\n',
  'dist/select/select.client.js':
    '"use client";\nimport { Root } from "../_engines/react-aria/select.client.js";\nfunction SelectRoot() {}\nexport { SelectRoot };\n',
  'dist/_engines/react-aria/select.client.js':
    '"use client";\nimport { engineDom } from "./dom.js";\nimport { Select } from "react-aria-components";\nconst Root = () => {};\nexport { Root };\n',
  'dist/_engines/react-aria/dom.js':
    'import { attributes } from "./dom-allowlist.js";\nfunction engineDom() {}\nexport { engineDom };\n',
  'dist/_engines/react-aria/dom-allowlist.js': 'var attributes = [];\nexport { attributes };\n',
  'dist/config/index.js': 'export { NizivoConfig } from "./config.client.js";\n',
  'dist/config/config.client.js':
    '"use client";\nfunction NizivoConfig() {}\nexport { NizivoConfig };\n',
  'dist/_virtual/_rolldown/runtime.js': 'var __exportAll = () => {};\nexport { __exportAll };\n',
};

const SRC: Record<string, string> = {
  'src/index.ts':
    "export { Button } from './button/index';\nexport { Select, SelectRoot } from './select/index';\n",
  'src/button/index.ts': "export { Button } from './button';\n",
  'src/button/button.tsx': "import { cx } from '../_internal/cx';\nexport function Button() {}\n",
  'src/button/button.example.tsx': "'use client';\nexport default function Example() {}\n",
  'src/_internal/cx.ts': 'export function cx() {}\n',
  'src/select/index.ts':
    "export { SelectRoot } from './select.client';\nexport * as Select from './select.parts';\n",
  'src/select/select.parts.ts': "export { SelectRoot as Root } from './select.client';\n",
  'src/select/select.client.tsx':
    "'use client';\n// PUBLIC Select parts.\nimport * as Engine from './engine';\nexport function SelectRoot() {}\n",
  'src/select/engine.ts': "export { Root } from '../_engines/react-aria/select.client';\n",
  'src/select/select.contract.ts': 'export interface SelectRootProps {}\n',
  'src/_engines/react-aria/select.client.tsx':
    "'use client';\nimport { Select } from 'react-aria-components';\nexport const Root = () => {};\n",
  'src/_engines/react-aria/dom.ts':
    "import { attributes } from './dom-allowlist.json';\nexport function engineDom() {}\n",
  'src/_engines/react-aria/dom-allowlist.json': '{ "attributes": [] }\n',
  'src/config/index.ts': "export { NizivoConfig } from './config.client';\n",
  'src/config/config.client.tsx': "'use client';\nexport function NizivoConfig() {}\n",
};

/** `base` with `over` applied; an undefined value removes the file. */
function merge(
  base: Record<string, string>,
  over: Record<string, string | undefined>,
): Map<string, string> {
  return new Map(
    Object.entries({ ...base, ...over }).flatMap(([file, text]) =>
      text === undefined ? [] : [[file, text] as const],
    ),
  );
}

function input(
  dist: Record<string, string | undefined> = {},
  src: Record<string, string | undefined> = {},
  components: Record<string, string> = {},
): DirectiveInput {
  return {
    dist: merge(DIST, dist),
    src: merge(SRC, src),
    components: new Map(Object.entries({ button: 'server', select: 'engine', ...components })),
    partsOnly: true,
  };
}

/** A Button module that imports `target`. */
function importing(target: string): string {
  return `import { x } from "${target}";\nfunction Button() {}\nexport { Button };\n`;
}

describe('directive guard', () => {
  test('passes the shape tsdown builds, and tolerates the elided engine.ts hop', () => {
    expect(checkDirectives(input())).toEqual([]);
  });

  test("'use client' is the first statement of every *.client.js leaf and of nothing else", () => {
    expect(
      checkDirectives(
        input({
          'dist/select/select.client.js': 'function SelectRoot() {}\nexport { SelectRoot };\n',
          'dist/button/button.js': '"use client";\nfunction Button() {}\nexport { Button };\n',
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "dist/select/select.client.js: a *.client.js leaf must start with 'use client'",
        "dist/button/button.js: carries 'use client' but is not a *.client.js leaf",
      ]),
    );
  });

  test('a directive below the first statement, or any use server, fails', () => {
    const late = 'import { x } from "./x.js";\n"use client";\nexport { x };\n';
    expect(
      checkDirectives(
        input({
          'dist/_internal/cx.js': `"use server";\nfunction cx() {}\nexport { cx };\n`,
          'dist/select/select.client.js': `"use client";\n${late}`,
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        "dist/_internal/cx.js:1: 'use server' in a published module",
        "dist/select/select.client.js:3: 'use client' below the first statement is ignored",
      ]),
    );
  });

  test('source and dist agree module by module', () => {
    expect(
      checkDirectives(
        input(
          { 'dist/config/config.client.js': undefined, 'dist/config/index.js': undefined },
          { 'src/_internal/cx.ts': "'use client';\nexport function cx() {}\n" },
        ),
      ),
    ).toEqual(
      expect.arrayContaining([
        "src/config/config.client.tsx: 'use client' module has no dist/config/config.client.js",
        "dist/_internal/cx.js: lost the 'use client' of src/_internal/cx.ts",
      ]),
    );
    expect(
      checkDirectives(input({ 'dist/extra.client.js': '"use client";\nexport const x = 1;\n' })),
    ).toEqual(["dist/extra.client.js: carries 'use client' but has no source module"]);
  });

  test('a server-tier component crosses into client code only through a component leaf', () => {
    // Its own leaf, or another component's (IconButton's tooltip), is a documented boundary.
    expect(
      checkDirectives(input({ 'dist/button/button.js': importing('../select/select.client.js') })),
    ).toEqual([]);
    expect(
      checkDirectives(
        input({ 'dist/button/button.js': importing('../_engines/react-aria/select.client.js') }),
      ),
    ).toEqual([
      "button (server): reaches dist/_engines/react-aria/select.client.js, not a component's *.client.js leaf (via dist/button/index.js → dist/button/button.js)",
    ]);
    expect(
      checkDirectives(input({ 'dist/button/button.js': importing('../config/config.client.js') })),
    ).toEqual([
      "button (server): reaches dist/config/config.client.js, not a component's *.client.js leaf (via dist/button/index.js → dist/button/button.js)",
    ]);
    expect(
      checkDirectives(
        input({ 'dist/button/button.js': importing('../_engines/react-aria/dom.js') }),
      ),
    ).toEqual([
      'button (server): reaches engine module dist/_engines/react-aria/dom.js (via dist/button/index.js → dist/button/button.js)',
    ]);
    expect(
      checkDirectives(input({ 'dist/button/button.js': importing('react-aria-components') })),
    ).toEqual(['button (server): dist/button/button.js imports react-aria-components']);
    expect(checkDirectives(input({}, {}, { badge: 'server' }))).toEqual([
      'dist/badge/index.js: missing (component.json tier "server")',
    ]);
  });

  test('namespace objects are built in directive-free *.parts.js modules', () => {
    expect(
      checkDirectives(
        input({
          'dist/select/index.js': `${DIST['dist/select/index.js']}var x = __exportAll({});\n`,
        }),
      ),
    ).toEqual(['dist/select/index.js: builds a namespace object outside a *.parts.js module']);
    expect(
      checkDirectives(
        input({
          'dist/select/select.client.js': `${DIST['dist/select/select.client.js']}var x = __exportAll({});\n`,
        }),
      ),
    ).toEqual(["dist/select/select.client.js: builds a namespace object in a 'use client' module"]);
  });

  test('export * as never targets or sits in a client module; export * never re-exports one', () => {
    expect(
      checkDirectives(
        input(
          {},
          {
            'src/select/index.ts':
              "export * as Select from './select.client';\nexport * from './select.client';\n",
            'src/select/select.client.tsx': `${SRC['src/select/select.client.tsx']}export * as Parts from './select.parts';\n`,
          },
        ),
      ),
    ).toEqual([
      "src/select/index.ts: export * as Select from 'use client' module src/select/select.client.tsx",
      "src/select/index.ts: export * from 'use client' module src/select/select.client.tsx",
      "src/select/select.client.tsx: export * as Parts inside a 'use client' module",
    ]);
    expect(
      checkDirectives(
        input({ 'dist/select/index.js': 'export * as Select from "./select.client.js";\n' }),
      ),
    ).toContain(
      "dist/select/index.js: export * as Select from 'use client' module dist/select/select.client.js",
    );
  });
});

const REACT = [
  'package/package.json',
  'package/LICENSE',
  'package/README.md',
  'package/THIRD_PARTY_NOTICES',
  'package/dist/index.js',
  'package/dist/index.d.ts',
  'package/dist/css/button.css',
  'package/dist/tokens.json',
];
const MANIFEST = { name: '@nizivo/react', version: '0.0.0', scripts: { build: 'tsdown' } };

describe('tarball allowlist', () => {
  test('passes the files a published package may ship', () => {
    expect(checkTarball('@nizivo/react', REACT, MANIFEST, () => 1)).toEqual([]);
    expect(
      checkTarball('@nizivo/react', [...REACT, 'package/CHANGELOG.md'], MANIFEST, () => 1),
    ).toEqual(['CHANGELOG.md: not in the allowlist']);
  });

  test('fails on anything else', () => {
    const extra = [
      'package/src/button/button.tsx',
      'package/dist/index.js.map',
      'package/dist/button/button.test.js',
      'package/dist/button/button.example.js',
      'package/dist/logo.png',
      'package/dist/fonts/inter.woff2',
      'package/dist/.env.local',
      'package/dist/button/button.tsx',
      'package/.npmrc',
      'other/file.js',
    ];
    expect(checkTarball('@nizivo/react', [...REACT, ...extra], MANIFEST, () => 1)).toEqual([
      'src/button/button.tsx: not in the allowlist',
      'dist/index.js.map: source map',
      'dist/button/button.test.js: test file',
      'dist/button/button.example.js: example or story',
      'dist/logo.png: file type not allowed',
      'dist/fonts/inter.woff2: file type not allowed',
      'dist/.env.local: env file',
      'dist/button/button.tsx: source file',
      '.npmrc: not in the allowlist',
      'other/file.js: outside the package/ folder',
    ]);
  });

  test('fails on a missing or empty licence or notice file, and on missing dist', () => {
    expect(
      checkTarball(
        '@nizivo/react',
        ['package/package.json', 'package/LICENSE'],
        MANIFEST,
        (path) => (path === 'LICENSE' ? 0 : 1),
      ),
    ).toEqual([
      'LICENSE: empty',
      'README.md: missing',
      'THIRD_PARTY_NOTICES: missing',
      'dist/: missing (build first)',
    ]);
    // Notices are react's: tokens may not ship one.
    expect(
      checkTarball(
        '@nizivo/tokens',
        [
          'package/package.json',
          'package/LICENSE',
          'package/THIRD_PARTY_NOTICES',
          'package/dist/index.js',
        ],
        { name: '@nizivo/tokens' },
        () => 1,
      ),
    ).toEqual(['THIRD_PARTY_NOTICES: not in the allowlist', 'README.md: missing']);
  });

  test('icons ships JavaScript, declarations and its notices only', () => {
    const icons = [
      'package/package.json',
      'package/LICENSE',
      'package/README.md',
      'package/THIRD_PARTY_NOTICES',
      'package/dist/index.js',
      'package/dist/index.d.ts',
      'package/dist/_internal/icon.js',
      'package/dist/icons/calendar.js',
      'package/dist/icons/calendar.d.ts',
      'package/dist/brands/instagram.js',
    ];
    const manifest = { name: '@nizivo/icons' };
    expect(checkTarball('@nizivo/icons', icons, manifest, () => 1)).toEqual([]);
    expect(
      checkTarball(
        '@nizivo/icons',
        [
          ...icons.filter((entry) => entry !== 'package/THIRD_PARTY_NOTICES'),
          'package/dist/icons.json',
          'package/dist/sprite.svg',
          'package/src/icons/calendar.ts',
        ],
        manifest,
        () => 1,
      ),
    ).toEqual([
      'dist/icons.json: file type not allowed',
      'dist/sprite.svg: file type not allowed',
      'src/icons/calendar.ts: not in the allowlist',
      'THIRD_PARTY_NOTICES: missing',
    ]);
  });

  test('the published package.json runs no lifecycle script and keeps no repo-local protocol', () => {
    expect(
      checkTarball(
        '@nizivo/react',
        REACT,
        {
          name: '@nizivo/react',
          private: true,
          scripts: { build: 'tsdown', postinstall: 'node x.js', prepare: 'husky' },
          dependencies: { '@nizivo/tokens': 'workspace:*', 'react-aria': '^3.53.1' },
          devDependencies: { tsdown: 'catalog:' },
        },
        () => 1,
      ),
    ).toEqual([
      'package.json: private is true',
      'package.json: lifecycle script "postinstall"',
      'package.json: lifecycle script "prepare"',
      'package.json: dependencies.@nizivo/tokens is "workspace:*"',
      'package.json: devDependencies.tsdown is "catalog:"',
    ]);
  });
});
