// Runs the registry fixture (fixtures/registry) end to end: the shadcn CLI adds every item of the
// copy-paste registry (apps/docs/scripts/registry.ts; ARCHITECTURE.md §19.3, K13, D-dj) to a Vite app
// on the packed packages, which then typechecks, builds and renders.
//
//   node fixtures/runner/registry.ts [--skip-pack] [--skip-install] [--record]
//
// 1. pack.ts: build the monorepo, pack the four packages (--fixture registry).
// 2. pnpm install --frozen-lockfile in fixtures/registry (its own workspace root and lockfile).
// 3. Build the registry in memory and serve it from 127.0.0.1, then `shadcn add` every item by its
//    URL. Served items keep everything but `dependencies`: the CLI installs a dependency that names
//    a version even when the package is already there, and `~0.3.0` is not on npm until the
//    maintainer publishes it. Instead this run checks that each item's dependencies are the packed
//    packages at a range their versions satisfy (the item-policy linter checks the rest).
// 4. Every file the CLI wrote must equal the item's content, at the item's target.
// 5. src/registry.tsx renders every example of every pattern item, under the init item's
//    stylesheet and every component sheet item; tsc, vite build and vite preview, then Chromium:
//    no page error, every example rendered, each pattern's stylesheet applied, and the charts
//    stylesheet applied (a chart pattern imports it).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { patternNames } from '../../apps/docs/scripts/examples.ts';
import { buildRegistry, range, type RegistryItem } from '../../apps/docs/scripts/registry.ts';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, run, serve, version, writeResults } from './serve.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'registry');
const REGISTRY_PORT = 3422;
const PORT = 3423;
// 127.0.0.1, not localhost: the CLI resolves localhost to ::1 first
const REGISTRY = `http://127.0.0.1:${REGISTRY_PORT}`;
const BASE = `http://127.0.0.1:${PORT}`;
const BIN = join(FIXTURE_DIR, 'node_modules', '.bin');
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };

function isItem(value: unknown): value is RegistryItem {
  return typeof value === 'object' && value !== null && 'name' in value && 'files' in value;
}

/** Each served path → its body: the registry's items without `dependencies` (step 3). */
function served(files: Map<string, string>, release: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [path, text] of files) {
    if (!path.startsWith(`r/v${release}/`)) continue;
    const parsed: unknown = JSON.parse(text);
    out.set(
      `/${path}`,
      isItem(parsed) ? `${JSON.stringify({ ...parsed, dependencies: [] }, null, 2)}\n` : text,
    );
  }
  return out;
}

/** The page that renders every pattern example: written after `shadcn add`, gitignored. */
function registryPage(items: readonly RegistryItem[]): string {
  const patterns = items.filter((it) => it.type === 'registry:block');
  const sheets = items.filter((it) => it.name.endsWith('-css'));
  return [
    '// written by fixtures/runner/registry.ts after `shadcn add`; do not edit',
    "import type { ComponentType, JSX } from 'react';",
    "import './components/nizivo/nizivo.css';",
    ...sheets.map((it) => `import './components/nizivo/${it.name}.css';`),
    ...patterns.map((it, i) => `import * as p${i} from '@/components/nizivo/${it.name}';`),
    '',
    'const MODULES: [string, Record<string, unknown>][] = [',
    ...patterns.map((it, i) => `  ['${it.name}', p${i}],`),
    '];',
    '',
    'function isComponent(value: unknown): value is ComponentType {',
    "  return typeof value === 'function';",
    '}',
    '',
    'export function Registry(): JSX.Element {',
    '  return (',
    '    <main>',
    '      {MODULES.flatMap(([name, module]) =>',
    '        Object.entries(module)',
    "          .filter(([key, value]) => key.endsWith('Example') && isComponent(value))",
    '          .map(([key, value]) => {',
    '            const Example = value as ComponentType;',
    '            return (',
    '              <section key={`${name}/${key}`} data-example={`${name}/${key}`}>',
    '                <Example />',
    '              </section>',
    '            );',
    '          }),',
    '      )}',
    '    </main>',
    '  );',
    '}',
    '',
  ].join('\n');
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      'skip-pack': { type: 'boolean' },
      'skip-install': { type: 'boolean' },
      record: { type: 'boolean' },
    },
  });
  if (values['skip-pack'] !== true) packInto(FIXTURE_DIR, { build: true });
  if (values['skip-install'] !== true) {
    run('corepack', ['pnpm@12.11.2', 'install', '--frozen-lockfile'], FIXTURE_DIR, env);
  }
  const failures: string[] = [];

  const registry = buildRegistry(patternNames());
  for (const problem of registry.problems) failures.push(`item policy: ${problem}`);
  const items = [...registry.files]
    .filter(([path]) => path.startsWith(`r/v${registry.version}/`))
    .map(([, text]): unknown => JSON.parse(text))
    .filter(isItem);

  // step 3: each dependency is a packed package at a range its version satisfies
  const packed = new Map(
    ['charts', 'icons', 'react', 'tokens'].map((p) => [
      `@nizivo/${p}`,
      range(version(FIXTURE_DIR, `@nizivo/${p}`)),
    ]),
  );
  for (const it of items) {
    for (const dep of it.dependencies) {
      const at = dep.lastIndexOf('@');
      if (packed.get(dep.slice(0, at)) !== dep.slice(at + 1)) {
        failures.push(`${it.name}: dependency ${dep} is not a packed package's range`);
      }
    }
  }

  const bodies = served(registry.files, registry.version);
  const server = createServer((req, res) => {
    const body = bodies.get(req.url ?? '');
    res.writeHead(body === undefined ? 404 : 200, { 'content-type': 'application/json' });
    res.end(body ?? '{}');
  });
  await new Promise<void>((resolve) => server.listen(REGISTRY_PORT, '127.0.0.1', resolve));
  const nizivo = join(FIXTURE_DIR, 'src', 'components');
  rmSync(nizivo, { recursive: true, force: true });
  rmSync(join(FIXTURE_DIR, 'src', 'registry.tsx'), { force: true });
  let addSeconds: number;
  try {
    const started = performance.now();
    // spawned, not spawnSync: this process serves the registry the CLI fetches from
    const add = await new Promise<{ status: number | null; output: string }>((resolve) => {
      const child = spawn(
        join(BIN, 'shadcn'),
        [
          'add',
          '--yes',
          '--overwrite',
          ...items.map((it) => `${REGISTRY}/r/v${registry.version}/${it.name}.json`),
        ],
        { cwd: FIXTURE_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let output = '';
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.on('close', (status) => resolve({ status, output }));
    });
    addSeconds = Math.round((performance.now() - started) / 100) / 10;
    if (add.status !== 0) {
      failures.push(`shadcn add exited ${add.status}:\n${add.output}`);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // step 4: every file at its target, byte for byte
  let written = 0;
  for (const it of items) {
    for (const f of it.files) {
      const file = join(FIXTURE_DIR, 'src', f.target);
      if (!existsSync(file)) failures.push(`${it.name}: ${f.target} was not written`);
      else if (readFileSync(file, 'utf8') !== f.content) {
        failures.push(`${it.name}: ${f.target} differs from the item`);
      } else written += 1;
    }
  }

  // step 5: the app on what the CLI wrote
  writeFileSync(join(FIXTURE_DIR, 'src', 'registry.tsx'), registryPage(items));
  const examples = new Map<string, number>();
  const pageErrors: string[] = [];
  let unstyled: string[] = [];
  let chartFrame = 'not checked';
  if (failures.length === 0) {
    run(join(BIN, 'tsc'), ['--noEmit', '-p', '.'], FIXTURE_DIR, env);
    rmSync(join(FIXTURE_DIR, 'dist'), { recursive: true, force: true });
    const output = run(join(BIN, 'vite'), ['build'], FIXTURE_DIR, env);
    for (const line of output.split('\n')) {
      if (/warn|error/i.test(line) && !/│ gzip:/.test(line)) failures.push(`build: ${line.trim()}`);
    }
    const stop = await serve(
      join(BIN, 'vite'),
      ['preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
      FIXTURE_DIR,
      env,
      BASE,
    );
    try {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') pageErrors.push(message.text());
        });
        await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
        const found = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('[data-example]')].map((el) => ({
            id: el.dataset['example'] ?? '',
            empty: el.childElementCount === 0,
          })),
        );
        for (const { id, empty } of found) {
          const name = id.split('/')[0] ?? '';
          examples.set(name, (examples.get(name) ?? 0) + 1);
          if (empty) failures.push(`${id} rendered nothing`);
        }
        chartFrame = await page.evaluate(() => {
          const frame = document.querySelector('.nz-chart-frame');
          return frame === null ? 'missing' : getComputedStyle(frame).display;
        });
        // a pattern's stylesheet applied: its nz.patterns rules reach at least one nzp- element
        unstyled = await page.evaluate(
          (names) => {
            const styled = new Set<string>();
            for (const sheet of document.styleSheets) {
              const walk = (rules: CSSRuleList): void => {
                for (const rule of rules) {
                  if (rule instanceof CSSStyleRule) {
                    for (const m of rule.selectorText.matchAll(/\.nzp-([a-z0-9-]+)/g)) {
                      if (document.querySelector(`.nzp-${m[1]}`) !== null) styled.add(m[1] ?? '');
                    }
                  }
                  if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList)
                    walk(rule.cssRules);
                }
              };
              walk(sheet.cssRules);
            }
            return names.filter((n) => ![...styled].some((s) => s === n || s.startsWith(`${n}-`)));
          },
          items
            .filter((it) => it.files.length > 1 && it.type === 'registry:block')
            .map((it) => it.name),
        );
      } finally {
        await browser.close();
      }
    } finally {
      await stop();
    }
    for (const it of items.filter((i) => i.type === 'registry:block')) {
      if ((examples.get(it.name) ?? 0) === 0) failures.push(`${it.name}: no example rendered`);
    }
    for (const name of unstyled)
      failures.push(`${name}: its stylesheet styles nothing on the page`);
    if (items.some((i) => i.dependencies.some((d) => d.startsWith('@nizivo/charts@')))) {
      // a pattern that draws charts brings @nizivo/charts/styles.css (init brings only react's)
      if (chartFrame !== 'flex')
        failures.push(`.nz-chart-frame is display ${chartFrame}, not flex`);
    }
    for (const error of pageErrors) failures.push(`page: ${error}`);
  }

  const result = {
    fixture: 'registry',
    command: 'shadcn add <every item>; tsc; vite build && vite preview',
    versions: {
      shadcn: version(FIXTURE_DIR, 'shadcn'),
      vite: version(FIXTURE_DIR, 'vite'),
      typescript: version(FIXTURE_DIR, 'typescript'),
      react: version(FIXTURE_DIR, 'react'),
      registry: registry.version,
    },
    items: items.length,
    filesWritten: written,
    addSeconds,
    examples: Object.fromEntries([...examples].toSorted(([a], [b]) => (a < b ? -1 : 1))),
    pass: failures.length === 0,
    failures,
  };
  writeResults(resultsFile(FIXTURE_DIR, 'registry.json', values.record === true), result);
  console.log(
    `registry: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`} (${items.length} items, ${written} files)`,
  );
  return result.pass ? 0 : 1;
}

process.exitCode = await main();
