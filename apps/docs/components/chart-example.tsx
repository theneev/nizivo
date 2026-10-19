// A @nizivo/charts example on a hand-written page (content/docs/charts/*.mdx). The snippet is cut
// from the part's own packages/charts/src/<part>/<part>.example.tsx (the modules the charts visual
// lane shoots), with its relative imports rewritten to the public subpaths, the way
// scripts/examples.ts does it for @nizivo/react.
//
// Why this is not scripts/generate.ts: the generator, the per-component routes and the props tables
// read @nizivo/react only, and charts has no contracts/api output yet. Every hand-written page shares
// one server graph (.source/server imports every MDX file, and every route imports lib/source.ts), so
// a client module an MDX page imports ships on every page of the site. A preview is therefore live
// only for a part whose module reaches no client module, from a docs copy of its example file in
// components/charts-live/ that must equal the package's file with its imports rewritten (checked here,
// at build time, so the preview and the code under it cannot drift). Everything else is source only,
// with the reason. When generate.ts learns charts, this file and charts-live/ go away.
import type { JSX, ReactElement } from 'react';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { Callout } from 'fumadocs-ui/components/callout';
import { CODE_THEMES } from '../lib/code';
import { readRepoText } from '../lib/repo';
import { isRecord } from '../scripts/json';
import { BlockMd, InlineMd } from './inline-md';
import './charts.css';

/** The charts parts that have an example file, by folder name. */
type Part =
  | 'area-chart'
  | 'bar-chart'
  | 'chart-frame'
  | 'chart-tooltip'
  | 'donut-chart'
  | 'legend'
  | 'sparkline';

interface Block {
  name: string;
  exported: boolean;
  doc?: string;
  /** Leading `//` comment lines and the declaration. */
  text: string;
  /** The declaration alone. */
  body: string;
}

interface Import {
  typeOnly: boolean;
  names: { text: string; local: string }[];
  from: string;
}

const IMPORT = /^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)';$/gm;

function fail(file: string, message: string): never {
  throw new Error(`docs (charts): ${file}: ${message}`);
}

/**
 * Where a part is imported from today: its own subpath once @nizivo/charts' exports map has it,
 * else the barrel when the barrel re-exports it, else nothing (it is not public yet).
 */
function entryOf(part: string): string | undefined {
  const pkg: unknown = JSON.parse(readRepoText('packages/charts/package.json'));
  const exportsMap = isRecord(pkg) && isRecord(pkg.exports) ? pkg.exports : {};
  if (`./${part}` in exportsMap) return `@nizivo/charts/${part}`;
  const barrel = readRepoText('packages/charts/src/index.ts');
  if (barrel.includes(`export * from './${part}/index';`)) return '@nizivo/charts';
  return undefined;
}

/**
 * `./index` and `../<part>/index` → the part's public entry (`entryOf`). A part with no entry yet
 * keeps its planned subpath, `@nizivo/charts/<part>`; its page says it is not exported yet.
 */
function publicSpecifier(file: string, part: string, from: string): string {
  if (from === 'react') return from;
  const target = from === './index' ? part : /^\.\.\/([a-z0-9-]+)\/index$/.exec(from)?.[1];
  if (target === undefined) {
    return fail(file, `cannot map the import '${from}' to a public entry of @nizivo/charts`);
  }
  return entryOf(target) ?? `@nizivo/charts/${target}`;
}

function parseImports(file: string, source: string, part: Part): Import[] {
  const out: Import[] = [];
  // A long import is wrapped over several lines by oxfmt; join it back into one.
  const joined = source.replaceAll(/\{\n([^}]*)\n\}/g, (_s, inner: string) => {
    return `{${inner.replaceAll('\n', ' ')}}`;
  });
  for (const m of joined.matchAll(IMPORT)) {
    out.push({
      typeOnly: m[1] !== undefined,
      names: (m[2] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .map((s) => ({
          text: s,
          local:
            s
              .replace(/^type\s+/, '')
              .split(/\s+as\s+/)
              .at(-1) ?? s,
        })),
      from: publicSpecifier(file, part, m[3] ?? ''),
    });
  }
  return out;
}

/** The file's top-level declarations (the example files are oxfmt-formatted). */
function parseBlocks(file: string, source: string): Block[] {
  const lines = source.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  let pending: string[] = [];
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.startsWith('import ')) {
      while (i < lines.length && !(lines[i] ?? '').endsWith(';')) i++;
      i++;
      continue;
    }
    if (line.trim() === '') {
      pending = [];
      i++;
      continue;
    }
    if (line.startsWith('//')) {
      pending.push(line);
      i++;
      continue;
    }
    const start = i;
    let doc: string | undefined;
    if (line.startsWith('/**')) {
      let j = i;
      while (j < lines.length && !(lines[j] ?? '').includes('*/')) j++;
      doc = lines
        .slice(i, j + 1)
        .join('\n')
        .replace(/^\/\*\*|\*\/$/g, '')
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      i = j + 1;
    }
    const head = lines[i] ?? '';
    const fn = /^(export\s+)?function\s+([A-Za-z0-9_]+)/.exec(head);
    const decl = /^(export\s+)?(?:const|let|type|interface)\s+([A-Za-z0-9_]+)/.exec(head);
    const m = fn ?? decl;
    if (!m) fail(file, `line ${i + 1}: unsupported top-level statement '${head}'`);
    let end = i;
    if (fn) {
      while (end < lines.length && lines[end] !== '}') end++;
    } else if (!head.trimEnd().endsWith(';')) {
      end = i + 1;
      while (end < lines.length && !/^[}\])]/.test(lines[end] ?? '')) end++;
    }
    if (end >= lines.length) fail(file, `line ${i + 1}: declaration does not end`);
    blocks.push({
      name: m[2] ?? '',
      exported: m[1] !== undefined,
      ...(doc !== undefined && { doc }),
      text: [...pending, ...lines.slice(start, end + 1)].join('\n'),
      body: lines.slice(i, end + 1).join('\n'),
    });
    pending = [];
    i = end + 1;
  }
  return blocks;
}

/**
 * Whether `text` refers to `name`: not as a property (`x.name`) or part of a longer name. A spread
 * (`...name`) is a use, so its dots are blanked first.
 */
function uses(text: string, name: string): boolean {
  return new RegExp(`(?<![\\w.$])${name}(?![\\w$])`).test(text.replaceAll('...', '   '));
}

/** The example's imports (only the names it uses), its helpers (transitively) and the function. */
function snippet(example: Block, blocks: Block[], imports: Import[]): string {
  const helpers = new Set<Block>();
  const queue = [example.body];
  while (queue.length > 0) {
    const text = queue.pop() ?? '';
    for (const b of blocks) {
      if (b === example || b.exported || helpers.has(b) || !uses(text, b.name)) continue;
      helpers.add(b);
      queue.push(b.text);
    }
  }
  const body = [...blocks.filter((b) => helpers.has(b)).map((b) => b.text), example.body].join(
    '\n\n',
  );
  const lines = imports.flatMap((d) => {
    const names = d.names.filter((n) => uses(body, n.local)).map((n) => n.text);
    return names.length === 0
      ? []
      : [`import ${d.typeOnly ? 'type ' : ''}{ ${names.join(', ')} } from '${d.from}';`];
  });
  return `${lines.join('\n')}\n\n${body}\n`;
}

const sourcePath = (part: Part): string => `packages/charts/src/${part}/${part}.example.tsx`;
const livePath = (part: Part): string => `apps/docs/components/charts-live/${part}.example.tsx`;

/** The package's example file with its relative imports rewritten to the public subpaths. */
function publicSource(part: Part): string {
  const file = sourcePath(part);
  const source = readRepoText(file);
  return source.replaceAll(/from '(\.[^']+)';/g, (_m, from: string) => {
    return `from '${publicSpecifier(file, part, from)}';`;
  });
}

const LIVE_HEADER =
  '// Copied from packages/charts/src/%s/%s.example.tsx, imports made public; do not edit.\n' +
  '// components/chart-example.tsx checks at build time that it still equals the package file.\n';

/** Every `@nizivo/charts` specifier as the barrel: the subpath and the barrel are the same module. */
const anyEntry = (text: string): string =>
  text.replaceAll(/from '@nizivo\/charts(?:\/[a-z0-9-]+)?';/g, "from '@nizivo/charts';");

/**
 * The docs copy must be the package file, imports rewritten, under its header. Which public entry a
 * copy imports (the barrel today, the subpath once it is exported) does not count, so adding an
 * export never breaks this check.
 */
function checkLiveCopy(part: Part): void {
  const expected = LIVE_HEADER.replaceAll('%s', part) + publicSource(part);
  if (anyEntry(readRepoText(livePath(part))) !== anyEntry(expected)) {
    fail(
      livePath(part),
      `is not ${sourcePath(part)} with public imports. Copy the package's example file again: ` +
        `the two header lines, then the file with './index' and '../<part>/index' imports ` +
        `pointing at '@nizivo/charts/<part>' (or '@nizivo/charts' while the subpath is not exported).`,
    );
  }
}

const importsIsland = (part: string): boolean =>
  readRepoText(`packages/charts/src/${part}/${part}.tsx`).includes('/_island/');

/** Why a part's example has no preview, from the package as it is now. */
function noPreviewReason(part: Part): string {
  if (importsIsland(part)) {
    return (
      "This part's module imports the ChartInteraction island, a `'use client'` module. The " +
      'hand-written pages of this site share one module graph, so a live preview here would load ' +
      "the island on every page of the site, rendered or not (measured in this site's build on " +
      '2026-10-19). The preview arrives when the docs generator gives each charts part its own route.'
    );
  }
  if (entryOf(part) === undefined) {
    return (
      `\`@nizivo/charts\` does not export this part yet (\`./${part}\` is not in its exports map, ` +
      'and the barrel does not re-export it), so this site cannot import it. It imports no client ' +
      'module, so the preview can be live here once the export lands.'
    );
  }
  return 'The preview is not wired up on this page yet; the code is the package example.';
}

/**
 * The import line of a part, from the package as it is now: its subpath once exported, the barrel
 * while only the barrel re-exports it, or its planned subpath while neither does.
 */
export function ChartImport({ part, names }: { part: Part; names: string }): JSX.Element {
  const entry = entryOf(part);
  const note =
    entry === `@nizivo/charts/${part}`
      ? undefined
      : entry === undefined
        ? `Not exported yet: \`@nizivo/charts/${part}\` is the planned subpath, before 0.2.0.`
        : `\`./${part}\` is not in the exports map yet, so today the part is imported from the barrel, \`@nizivo/charts\`; the subpath comes before 0.2.0.`;
  return (
    <>
      <ServerCodeBlock
        themes={CODE_THEMES}
        code={`import { ${names} } from '${entry ?? `@nizivo/charts/${part}`}';`}
        lang="tsx"
      />
      {note !== undefined && <BlockMd text={note} />}
    </>
  );
}

export function ChartExample({
  part,
  name,
  title,
  live,
  reason,
}: {
  part: Part;
  /** The exported example function: `ChartFrameDetailsExample`. */
  name: string;
  /** The section's name: the heading the page writes above it. */
  title: string;
  /** The preview, from components/charts-live/<part>.example.tsx. */
  live?: ReactElement;
  /** Why there is no preview; derived from the package when absent. */
  reason?: string;
}): JSX.Element {
  const file = sourcePath(part);
  const source = readRepoText(file);
  const blocks = parseBlocks(file, source);
  const example = blocks.find((b) => b.exported && b.name === name);
  if (example === undefined) fail(file, `exports no example function ${name}`);
  if (live !== undefined) {
    // A live preview's client modules would ship on every page (the header above).
    if (importsIsland(part)) {
      fail(file, `${name}: ${part} imports the ChartInteraction island, so it cannot be live here`);
    }
    checkLiveCopy(part);
  }
  const code = snippet(example, blocks, parseImports(file, source, part));
  return (
    // The page writes the example's heading (`### Basic`), so it is in the table of contents.
    <section aria-label={title} className="mt-2">
      {example.doc !== undefined && <BlockMd text={example.doc} />}
      <div className="not-prose nz-docs-example">
        {live === undefined ? (
          <Callout type="info" title="Source only">
            <InlineMd text={reason ?? noPreviewReason(part)} />
          </Callout>
        ) : (
          <div className="nz-docs-preview nz-docs-chart-preview" data-example={`${part}/${name}`}>
            {live}
          </div>
        )}
        <ServerCodeBlock
          themes={CODE_THEMES}
          code={code}
          lang="tsx"
          codeblock={{ className: 'nz-docs-example-code' }}
        />
      </div>
    </section>
  );
}
