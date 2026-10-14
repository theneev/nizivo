// Token data for the Foundations pages, read at build time from the built @nizivo/tokens package:
// contract.json for names, types and visibility, tokens.css for values. Nothing is hand-copied, so a
// token sync changes these pages with no edit here.
import { isRecord } from '../scripts/json';
import { readRepoJson, readRepoText } from './repo';

export type TokenType =
  | 'color'
  | 'dimension'
  | 'duration'
  | 'number'
  | 'shadow'
  | 'string'
  | 'cubicBezier'
  | 'fontFamily'
  | 'typography';

export interface ContractVariable {
  token: string;
  type: TokenType;
  public: boolean;
  part?: string;
}

export interface TokenContract {
  prefix: string;
  layer: string;
  layers: string[];
  customMedia: Record<string, { query: string; status?: string }>;
  variables: Record<string, ContractVariable>;
}

const BUILD_HINT = 'run `pnpm build` so @nizivo/tokens writes its dist';

function isContract(value: unknown): value is TokenContract {
  return (
    isRecord(value) &&
    typeof value.layer === 'string' &&
    isRecord(value.variables) &&
    isRecord(value.customMedia)
  );
}

export function contract(): TokenContract {
  return readRepoJson('packages/tokens/dist/contract.json', isContract, BUILD_HINT);
}

interface Rule {
  /** Enclosing at-rules and the selector, outermost first: `['@layer nz.tokens', ':root']`. */
  path: string[];
  decls: [string, string][];
}

/** A small reader for the generated tokens.css: nested blocks and declarations, comments dropped. */
function parseCss(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  const stack: Rule[] = [];
  let buf = '';
  for (const ch of text) {
    if (ch === '{') {
      const rule: Rule = { path: [...(stack.at(-1)?.path ?? []), buf.trim()], decls: [] };
      rules.push(rule);
      stack.push(rule);
      buf = '';
    } else if (ch === '}') {
      flush();
      stack.pop();
    } else if (ch === ';') {
      flush();
    } else {
      buf += ch;
    }
  }
  return rules;

  function flush(): void {
    const decl = buf.trim();
    buf = '';
    const top = stack.at(-1);
    const colon = decl.indexOf(':');
    if (!top || colon < 1 || !decl.startsWith('--')) return;
    top.decls.push([decl.slice(0, colon).trim(), decl.slice(colon + 1).trim()]);
  }
}

export interface TokenValues {
  /** `:root` in `@layer nz.tokens`. */
  base: Map<string, string>;
  /** `@media (prefers-reduced-motion: reduce)` overrides. */
  reduced: Map<string, string>;
  /** Overrides per custom-media name (`--nz-sm`, `--nz-lg`), in contract order. */
  breakpoints: { name: string; query: string; status?: string; values: Map<string, string> }[];
}

let valuesCache: TokenValues | undefined;

export function tokenValues(): TokenValues {
  if (valuesCache) return valuesCache;
  const css = readRepoText('packages/tokens/dist/tokens.css', BUILD_HINT);
  const rules = parseCss(css);
  const media = contract().customMedia;
  const pick = (path: string[]): Map<string, string> =>
    new Map(
      rules
        .filter((r) => r.path.length === path.length && r.path.every((p, i) => p === path[i]))
        .flatMap((r) => r.decls),
    );
  const layer = `@layer ${contract().layer}`;
  const base = pick([layer, ':root']);
  if (base.size === 0) throw new Error('docs: no :root block in @nizivo/tokens/dist/tokens.css');
  valuesCache = {
    base,
    reduced: pick([layer, '@media (prefers-reduced-motion: reduce)', ':root']),
    breakpoints: Object.entries(media).map(([name, m]) => {
      const bp: TokenValues['breakpoints'][number] = {
        name,
        query: m.query,
        values: pick([layer, `@media ${m.query}`, ':root']),
      };
      if (m.status !== undefined) bp.status = m.status;
      return bp;
    }),
  };
  return valuesCache;
}

/** Splits `a, b` at top-level commas. */
function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Rewrites every `fn(…)` call in `s` with `replace(args)`; returns null when there is none. */
function rewriteCall(s: string, fn: string, replace: (args: string[]) => string): string | null {
  const at = s.search(new RegExp(`(?<![\\w-])${fn}\\(`));
  if (at < 0) return null;
  let depth = 0;
  const open = at + fn.length;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    if (s[i] === ')') depth--;
    if (depth === 0) {
      return s.slice(0, at) + replace(splitArgs(s.slice(open + 1, i))) + s.slice(i + 1);
    }
  }
  return null;
}

/**
 * The literal value of a token in one scheme: `light-dark()` picks its side and `var()` follows the
 * base values. `--nz-text-primary` in dark → `#f6f7f4`.
 */
export function resolveToken(
  name: string,
  scheme: 'light' | 'dark',
  values = tokenValues().base,
): string {
  const start = values.get(name);
  if (start === undefined) throw new Error(`docs: ${name} is not in tokens.css`);
  let v: string = start;
  for (let guard = 0; guard < 50; guard++) {
    const next: string | null =
      rewriteCall(v, 'light-dark', (a) => (scheme === 'light' ? (a[0] ?? '') : (a[1] ?? ''))) ??
      rewriteCall(v, 'var', (a) => values.get(a[0] ?? '') ?? a[1] ?? `‹${a[0] ?? ''}›`);
    if (next === null) return v;
    v = next;
  }
  throw new Error(`docs: ${name} does not resolve (a var() cycle?)`);
}

/** The token a value points at in one scheme, one step deep: `var(--nz-p-green-700)` → `--nz-p-green-700`. */
export function referenceOf(name: string, scheme: 'light' | 'dark'): string | undefined {
  const raw = tokenValues().base.get(name) ?? '';
  const side =
    rewriteCall(raw, 'light-dark', (a) => (scheme === 'light' ? (a[0] ?? '') : (a[1] ?? ''))) ??
    raw;
  return /^var\((--[\w-]+)\)$/.exec(side.trim())?.[1];
}

/** `--nz-p-green-700` → `green/700`; any other token keeps its name without `--nz-`. */
export function shortName(token: string): string {
  const p = /^--nz-p-(.+)-(\d+)$/.exec(token);
  if (p) return `${p[1]}/${p[2]}`;
  return token.replace(/^--nz-/, '');
}

/** Public tokens of a type, in contract (sorted) order, optionally filtered by name prefix. */
export function publicTokens(type: TokenType, prefix?: string): string[] {
  return Object.entries(contract().variables)
    .filter(
      ([n, v]) => v.public && v.type === type && (prefix === undefined || n.startsWith(prefix)),
    )
    .map(([n]) => n);
}

/** The numeric suffix of a token name: `--nz-space-0-5` → 0.5. */
function numericSuffix(s: string): number {
  return Number((/-(\d+(?:-\d+)?)$/.exec(s)?.[1] ?? 'NaN').replace('-', '.'));
}

/** Natural order for scales: `space-0-5` before `space-1`, `radius-xs` … `radius-2xl` by value. */
export function byNumericSuffix(a: string, b: string): number {
  return numericSuffix(a) - numericSuffix(b);
}

/** A length in rem → px at the default 16 px root, for the reader's convenience. */
export function remToPx(value: string): string | undefined {
  const m = /^(-?[\d.]+)rem$/.exec(value);
  return m ? `${Number(m[1]) * 16}px` : undefined;
}
