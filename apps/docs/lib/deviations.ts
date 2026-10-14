// Data for the "Deviations from Figma" page (ARCHITECTURE.md §18.2), read at build time from the files
// that own each fact, never copied:
// - the a11y overrides, packages/tokens/src/code-owned/a11y/*.overrides.tokens.json (§15.3, §15.4);
// - the proposals, packages/tokens/src/code-owned/proposals*.tokens.json (§7.6);
// - the builder-chosen values: decision D-i in the plan's §23.4 table, and the "builder decides"
//   items of docs/figma/11-w2-server-safe-components.md, each with the answer the stylesheet ships
//   (lib/builder-choices.ts);
// - the browser degradations D1 and D2, verbatim from the plan's §18.2, and the Safari 17.5 status
//   from fixtures/floor-lane/RESULTS.md.
// packages/tokens/CONTRAST.md is generated from the same token files.
import { readdirSync } from 'node:fs';
import { contract } from './tokens';
import { isRecord } from '../scripts/json';
import { readRepoJson, readRepoText, repoPath } from './repo';

type Json = { [k: string]: unknown };

interface TokenNode {
  $type?: string;
  $value?: unknown;
  $extensions?: Record<string, Json>;
}

/** A string field of an extension, or '' when it is absent or not a string. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function tokenNode(obj: Json): TokenNode {
  const extensions: Record<string, Json> = {};
  if (isRecord(obj.$extensions)) {
    for (const [k, v] of Object.entries(obj.$extensions)) if (isRecord(v)) extensions[k] = v;
  }
  const node: TokenNode = { $value: obj.$value, $extensions: extensions };
  if (typeof obj.$type === 'string') node.$type = obj.$type;
  return node;
}

/** Depth-first walk over a DTCG file, yielding each token with its dotted path. */
function* tokensIn(node: unknown, path: string[] = []): Generator<[string, TokenNode]> {
  if (!isRecord(node)) return;
  if ('$value' in node) yield [path.join('.'), tokenNode(node)];
  for (const [k, v] of Object.entries(node))
    if (!k.startsWith('$')) yield* tokensIn(v, [...path, k]);
}

/** `color.text.secondary` → `--nz-text-secondary`, through the contract's `token` field. */
function cssName(tokenPath: string): string {
  const vars = contract().variables;
  const hit = Object.entries(vars).find(([, v]) => v.token === tokenPath && v.part === undefined);
  if (hit) return hit[0];
  return `--nz-${tokenPath.replace(/^color\./, '').replaceAll('.', '-')}`;
}

/** `{color.p.neutral.600}` → `neutral/600`; other references → their path. */
export function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    const ref = /^\{(.+)\}$/.exec(value)?.[1];
    if (!ref) return value;
    const prim = /^color\.p\.(.+)\.(\d+)$/.exec(ref);
    return prim ? `${prim[1]}/${prim[2]}` : ref.replace(/^color\./, '').replaceAll('.', '/');
  }
  if (typeof value === 'number') return String(value);
  if (isRecord(value)) {
    const v = value;
    if (typeof v.hex === 'string') {
      const alpha =
        typeof v.alpha === 'number' && v.alpha < 1 ? ` at ${Math.round(v.alpha * 100)}%` : '';
      return `${v.hex}${alpha}`;
    }
    if ('value' in v && 'unit' in v) return `${String(v.value)}${String(v.unit)}`;
    if ('fontSize' in v) {
      const size = formatValue(v.fontSize);
      return `${String(v.fontWeight)} ${size}/${String(v.lineHeight)}`;
    }
  }
  return JSON.stringify(value);
}

export interface OverrideRow {
  token: string;
  theme: string;
  figma: string;
  now: string;
  kind: string;
  wcag: string[];
  expires: string;
  reason: string;
}

export function overrides(): OverrideRow[] {
  const dir = 'packages/tokens/src/code-owned/a11y';
  const rows: OverrideRow[] = [];
  for (const file of readdirSync(repoPath(dir))
    .filter((f) => f.endsWith('.overrides.tokens.json'))
    .toSorted()
    .toReversed()) {
    const theme = file.replace('.overrides.tokens.json', '');
    for (const [path, node] of tokensIn(readRepoJson(`${dir}/${file}`, isRecord))) {
      const meta = node.$extensions?.['app.nizivo.override'];
      if (!meta) continue;
      rows.push({
        token: cssName(path),
        theme,
        figma: formatValue(meta.figmaValueAtOverride),
        now: formatValue(node.$value),
        kind: str(meta.kind),
        wcag: Array.isArray(meta.wcag) ? meta.wcag.map(String) : [],
        expires: str(meta.expires),
        reason: str(meta.reason),
      });
    }
  }
  if (rows.length === 0) throw new Error(`docs: no overrides found in ${dir}`);
  return rows;
}

export interface ProposalRow {
  token: string;
  figmaName: string;
  /** One value per mode file (`light`, `dark`, `default`, `reduced`), or one with mode ''. */
  values: { mode: string; value: string }[];
  expires: string;
  reason: string;
}

function proposalFiles(): string[] {
  const base = 'packages/tokens/src/code-owned';
  const out = [`${base}/proposals.tokens.json`];
  const walk = (dir: string): void => {
    for (const e of readdirSync(repoPath(dir), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}/${e.name}`);
      else if (e.name.endsWith('.tokens.json')) out.push(`${dir}/${e.name}`);
    }
  };
  walk(`${base}/proposals`);
  return out;
}

export function proposals(): ProposalRow[] {
  const byToken = new Map<string, ProposalRow>();
  for (const file of proposalFiles()) {
    const mode = file.includes('/proposals/')
      ? (file.split('/').at(-1) ?? '').replace('.tokens.json', '')
      : '';
    for (const [path, node] of tokensIn(readRepoJson(file, isRecord))) {
      const meta = node.$extensions?.['app.nizivo.proposal'];
      if (!meta) continue;
      const token = path.startsWith('color.p.')
        ? `--nz-p-${path.slice(8).replaceAll('.', '-')}`
        : cssName(path);
      const row = byToken.get(token) ?? {
        token,
        figmaName: str(meta.figmaVariable) || str(meta.figmaStyle),
        values: [],
        expires: str(meta.expires),
        reason: str(meta.reason),
      };
      row.values.push({ mode, value: formatValue(node.$value) });
      byToken.set(token, row);
    }
  }
  const order = ['', 'light', 'dark', 'default', 'reduced'];
  const rows = [...byToken.values()];
  for (const r of rows) r.values.sort((a, b) => order.indexOf(a.mode) - order.indexOf(b.mode));
  if (rows.length === 0)
    throw new Error('docs: no proposals found under packages/tokens/src/code-owned');
  return rows;
}

const PLAN = 'docs/ARCHITECTURE.md';

/** The text of one `### <number>` section of the plan. */
function planSection(number: string): string {
  const text = readRepoText(PLAN);
  const start = text.search(new RegExp(`^### ${number.replace('.', '\\.')} `, 'm'));
  if (start < 0) throw new Error(`docs: ${PLAN} has no section ${number}`);
  const rest = text.slice(start + 4);
  const end = rest.search(/^#{2,3} /m);
  return end < 0 ? rest : rest.slice(0, end);
}

export interface Degradation {
  id: string;
  text: string;
}

/** D1, D2, …: the quoted entries of the plan's §18.2, verbatim. */
export function degradations(): Degradation[] {
  const out = [...planSection('18.2').matchAll(/^\s*- \*\*(D\d+)\.\*\* "(.+)"\s*$/gm)].map((m) => ({
    id: m[1] ?? '',
    text: m[2] ?? '',
  }));
  if (out.length === 0) throw new Error(`docs: no D<n> degradation entries in ${PLAN} §18.2`);
  return out;
}

export interface BuilderDecision {
  id: string;
  decision: string;
  choice: string;
  why: string;
  evidence: string;
}

/** Rows of the plan's §23.4 builder-defaults table, by id (`D-i`). */
export function builderDecision(id: string): BuilderDecision {
  const row = planSection('23.4')
    .split('\n')
    .find((l) => l.startsWith(`| ${id} |`));
  if (!row) throw new Error(`docs: ${PLAN} §23.4 has no row ${id}`);
  const cells = row.split(' | ').map((c) => c.replace(/^\|\s*|\s*\|$/g, '').trim());
  return {
    id,
    decision: cells[1] ?? '',
    choice: cells[2] ?? '',
    why: cells[4] ?? '',
    evidence: cells[6] ?? '',
  };
}

export interface BuilderItem {
  /** `Kbd`, from the `### 4.8 Kbd` heading. */
  component: string;
  /** The property column of a table row, or empty for a bullet. */
  property: string;
  figma: string;
  note: string;
}

/** Every "builder decides" item of the week 2 Figma facts file, under its component heading. */
export function builderItems(): { file: string; items: BuilderItem[] } {
  const file = 'docs/figma/11-w2-server-safe-components.md';
  const items: BuilderItem[] = [];
  let component = '';
  for (const line of readRepoText(file).split('\n')) {
    const h = /^### \d+\.\d+ (.+)$/.exec(line);
    if (h) component = (h[1] ?? '').replace(/\s*\(.*\)$/, '');
    if (!component || !/builder decides/i.test(line)) continue;
    if (line.startsWith('|')) {
      const cells = line.split(' | ').map((c) => c.replace(/^\|\s*|\s*\|$/g, '').trim());
      items.push({
        component,
        property: cells[0] ?? '',
        figma: cells[1] ?? '',
        note: cells[2] ?? '',
      });
    } else {
      items.push({ component, property: '', figma: '', note: line.replace(/^\s*-\s*/, '') });
    }
  }
  return { file, items };
}

export interface BuilderItemW3 {
  /** The item's number in the facts file's §5 table. */
  n: number;
  component: string;
  figma: string;
  options: string;
}

/** Every row of the week 3 Figma facts file's "Builder decides (consolidated)" table (§5). */
export function builderItemsW3(): { file: string; items: BuilderItemW3[] } {
  const file = 'docs/figma/12-w3-forms.md';
  const lines = readRepoText(file).split('\n');
  const start = lines.findIndex((l) => l.startsWith('## 5. Builder decides'));
  if (start < 0) throw new Error(`docs: ${file} has no "## 5. Builder decides" section`);
  const items: BuilderItemW3[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    const cells = line.split(' | ').map((c) => c.replace(/^\|\s*|\s*\|$/g, '').trim());
    const n = Number(cells[0]);
    if (!line.startsWith('|') || !Number.isInteger(n) || n <= 0) continue;
    items.push({ n, component: cells[1] ?? '', figma: cells[2] ?? '', options: cells[3] ?? '' });
  }
  if (items.length === 0) throw new Error(`docs: ${file} §5 has no rows`);
  return { file, items };
}

/** The floor lane's Safari 17.5 status line (fixtures/floor-lane/RESULTS.md). */
export function safariStatus(): { file: string; text: string } {
  const file = 'fixtures/floor-lane/RESULTS.md';
  const line = readRepoText(file)
    .split('\n')
    .find((l) => l.startsWith('- **Safari 17.5'));
  if (!line) throw new Error(`docs: ${file} has no Safari 17.5 status line`);
  return { file, text: line.replace(/^-\s*/, '') };
}
