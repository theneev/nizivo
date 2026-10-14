// The a11y gate of the token build (plan §15.4 CI rules 1–4): the contrast matrix on the built
// tokens.css in both themes, and the drift, redundancy and expiry checks of every override and
// proposal in src/code-owned. scripts/a11y.ts runs it after `tz build`; CONTRAST.md is its golden.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colorOf, contrast, hex, rootDeclarations, type Scheme } from './contrast.ts';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
export const PAIRS_FILE: string = join(SRC, 'code-owned/a11y/contrast-pairs.json');
export const SCHEMES: Scheme[] = ['light', 'dark'];
const PREFIX = process.env.NZ_TOKEN_PREFIX ?? 'nz';

export type Role = 'text' | 'large-text' | 'non-text' | 'focus' | 'decorative' | 'disabled';
/** WCAG 2.2 AA (plan §15.1): 4.5:1 for text at every size, 12 px included; 3:1 for UI and large text. */
export const THRESHOLDS: Record<Role, number | undefined> = {
  text: 4.5,
  'large-text': 3,
  'non-text': 3,
  focus: 3,
  decorative: undefined,
  disabled: undefined,
};
export const OVERRIDE_KINDS = ['contrast', 'ladder', 'pairing'] as const;
type Kind = (typeof OVERRIDE_KINDS)[number];
const isKind = (value: unknown): value is Kind => OVERRIDE_KINDS.some((kind) => kind === value);
const isRole = (value: unknown): value is Role => typeof value === 'string' && value in THRESHOLDS;
const WARN_DAYS = 14;
/** `issue` is required: the tracking issue's URL, or an explicit null until one is filed (§15.4). */
const isIssue = (value: unknown): boolean =>
  value === null || (typeof value === 'string' && value.startsWith('https://'));

type Json = Record<string, unknown>;
const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function readJson(path: string): Json {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(value)) throw new Error(`${path}: not a JSON object`);
  return value;
}

function walk(node: Json, visit: (id: string, token: Json) => void, path: string[] = []): void {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || !isRecord(child)) continue;
    if ('$value' in child) visit([...path, key].join('.'), child);
    else walk(child, visit, [...path, key]);
  }
}

function tokenFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith('.tokens.json')) {
      out.push(relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
    }
  }
  return out.toSorted();
}

const v = (name: string): string => `--${PREFIX}-${name}`;
/** The CSS variable of a token id, as the build names it. */
export const cssName = (id: string): string =>
  `--${PREFIX}-${id.replace(/^color\./, '').replaceAll('.', '-')}`;
const shortName = (id: string): string => cssName(id).slice(PREFIX.length + 3);

// ----------------------------------------------------------------------------------- sources

export interface Override {
  scheme: Scheme;
  id: string;
  value: unknown;
  figmaVariableId: string;
  figmaVariable: string;
  figmaValueAtOverride: unknown;
  kind: Kind;
  reason: string;
  wcag: string[];
  approvedBy: string[];
  expires: string;
  file: string;
}

export interface Proposal {
  id: string;
  /** The Figma variable or text style to create, prefix-free. */
  figmaName: string;
  values: Partial<Record<Scheme | 'default' | 'reduced' | 'all', unknown>>;
  reason: string;
  approvedBy: string[];
  expires: string;
  file: string;
}

export interface Sources {
  overrides: Override[];
  proposals: Proposal[];
  /** Figma value of every themed colour token, per scheme. */
  figma: Record<Scheme, Map<string, unknown>>;
  /** Figma variable id → { file, id, value } across src/figma-owned. */
  figmaVariables: Map<string, { file: string; id: string; value: unknown }>;
  /** Every Figma variable and style name (prefix-free) in src/figma-owned. */
  figmaNames: Set<string>;
  problems: string[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function readSources(src: string = SRC): Sources {
  const problems: string[] = [];
  const figmaOwned = join(src, 'figma-owned');
  const codeOwned = join(src, 'code-owned');
  const figma: Sources['figma'] = { light: new Map(), dark: new Map() };
  const figmaVariables: Sources['figmaVariables'] = new Map();
  const figmaNames = new Set<string>();

  for (const file of tokenFiles(figmaOwned)) {
    walk(readJson(join(figmaOwned, file)), (id, token) => {
      const meta = isRecord(token.$extensions) ? token.$extensions['dev.nizivo.figma'] : undefined;
      if (!isRecord(meta)) return;
      if (typeof meta.name === 'string') figmaNames.add(meta.name);
      if (typeof meta.variableId === 'string') {
        figmaVariables.set(`${file}#${meta.variableId}`, { file, id, value: token.$value });
      }
      for (const scheme of SCHEMES) {
        if (file === `color/${scheme}.tokens.json`) figma[scheme].set(id, token.$value);
      }
    });
  }

  const overrides: Override[] = [];
  const proposals = new Map<string, Proposal>();
  for (const file of tokenFiles(codeOwned)) {
    const scheme = SCHEMES.find(
      (s) => file.endsWith(`${s}.overrides.tokens.json`) || file.endsWith(`color/${s}.tokens.json`),
    );
    const motion = (['default', 'reduced'] as const).find((m) =>
      file.endsWith(`motion/${m}.tokens.json`),
    );
    walk(readJson(join(codeOwned, file)), (id, token) => {
      const extensions = isRecord(token.$extensions) ? token.$extensions : {};
      const override = extensions['app.nizivo.override'];
      const proposal = extensions['app.nizivo.proposal'];
      const where = `${file}: ${id}`;
      if (override !== undefined) {
        if (!file.startsWith('a11y/') || !scheme) {
          problems.push(`${where}: overrides live only in a11y/{light,dark}.overrides.tokens.json`);
          return;
        }
        if (
          !isRecord(override) ||
          typeof override.figmaVariableId !== 'string' ||
          typeof override.figmaVariable !== 'string' ||
          override.figmaValueAtOverride === undefined ||
          !isKind(override.kind) ||
          typeof override.reason !== 'string' ||
          !stringArray(override.wcag) ||
          !isIssue(override.issue) ||
          !stringArray(override.approvedBy) ||
          override.approvedBy.length === 0 ||
          typeof override.expires !== 'string' ||
          !DATE.test(override.expires)
        ) {
          problems.push(
            `${where}: app.nizivo.override needs figmaVariableId, figmaVariable, figmaValueAtOverride, kind (${OVERRIDE_KINDS.join(' | ')}), reason, wcag, issue (an https URL, or null until one is filed), approvedBy and expires (YYYY-MM-DD)`,
          );
          return;
        }
        overrides.push({
          scheme,
          id,
          value: token.$value,
          figmaVariableId: override.figmaVariableId,
          figmaVariable: override.figmaVariable,
          figmaValueAtOverride: override.figmaValueAtOverride,
          kind: override.kind,
          reason: override.reason,
          wcag: override.wcag,
          approvedBy: override.approvedBy,
          expires: override.expires,
          file,
        });
      } else if (proposal !== undefined) {
        const name = isRecord(proposal)
          ? (proposal.figmaVariable ?? proposal.figmaStyle)
          : undefined;
        if (
          !isRecord(proposal) ||
          typeof name !== 'string' ||
          typeof proposal.reason !== 'string' ||
          !stringArray(proposal.approvedBy) ||
          proposal.approvedBy.length === 0 ||
          typeof proposal.expires !== 'string' ||
          !DATE.test(proposal.expires)
        ) {
          problems.push(
            `${where}: app.nizivo.proposal needs figmaVariable or figmaStyle, reason, approvedBy and expires (YYYY-MM-DD)`,
          );
          return;
        }
        const known = proposals.get(id);
        if (known && (known.figmaName !== name || known.expires !== proposal.expires)) {
          problems.push(`${where}: its proposal metadata differs from ${known.file}`);
        }
        const entry = known ?? {
          id,
          figmaName: name,
          values: {},
          reason: proposal.reason,
          approvedBy: proposal.approvedBy,
          expires: proposal.expires,
          file,
        };
        entry.values[scheme ?? motion ?? 'all'] = token.$value;
        proposals.set(id, entry);
      }
    });
  }
  overrides.sort((a, b) => SCHEMES.indexOf(a.scheme) - SCHEMES.indexOf(b.scheme));
  return {
    overrides,
    proposals: [...proposals.values()],
    figma,
    figmaVariables,
    figmaNames,
    problems,
  };
}

// ------------------------------------------------------------------------------ the matrix

interface PairSpec {
  fg: string;
  on: string[];
  role: Role;
  use?: string;
}

export interface Measurement {
  bg: string;
  bgHex: string;
  ratio: number;
}

export interface PairResult {
  scheme: Scheme;
  fg: string;
  fgHex: string;
  role: Role;
  threshold: number | undefined;
  use: string | undefined;
  measurements: Measurement[];
  min: number;
  pass: boolean;
}

export function readPairs(path: string = PAIRS_FILE): PairSpec[] {
  const file = readJson(path);
  const groups = isRecord(file.groups) ? file.groups : {};
  if (!Array.isArray(file.pairs)) throw new Error(`${path}: no pairs`);
  return file.pairs.map((pair: unknown, index) => {
    if (
      !isRecord(pair) ||
      typeof pair.fg !== 'string' ||
      !stringArray(pair.on) ||
      !isRole(pair.role)
    ) {
      throw new Error(
        `${path}: pair ${index} needs fg, on and a role (${Object.keys(THRESHOLDS).join(', ')})`,
      );
    }
    const on = pair.on.flatMap((name) => {
      const group = groups[name];
      return stringArray(group) ? group : [name];
    });
    const spec: PairSpec = { fg: pair.fg, on: [...new Set(on)], role: pair.role };
    if (typeof pair.use === 'string') spec.use = pair.use;
    return spec;
  });
}

/** Evaluates every pair in `scheme`, with `replace` swapping a variable's declaration (redundancy test). */
export function measure(
  css: string,
  pairs: PairSpec[],
  scheme: Scheme,
  replace: Record<string, string> = {},
): PairResult[] {
  const variables = rootDeclarations(css);
  for (const [name, value] of Object.entries(replace)) variables.set(name, value);
  return pairs.map(({ fg, on, role, use }) => {
    const fgColor = colorOf(v(fg), scheme, variables);
    const measurements = on.map((bg) => {
      const bgColor = colorOf(v(bg), scheme, variables);
      return { bg, bgHex: hex(bgColor), ratio: contrast(fgColor, bgColor) };
    });
    const min = Math.min(...measurements.map((m) => m.ratio));
    const threshold = THRESHOLDS[role];
    return {
      scheme,
      fg,
      fgHex: hex(fgColor),
      role,
      threshold,
      use,
      measurements,
      min,
      pass: threshold === undefined || min >= threshold,
    };
  });
}

/** A ratio as shown in the matrix: rounded down, so a displayed value never overstates. */
export const shown = (ratio: number): string => (Math.floor(ratio * 100) / 100).toFixed(2);

// ---------------------------------------------------------------------------------- checks

export interface Report {
  results: PairResult[];
  errors: string[];
  warnings: string[];
  sources: Sources;
}

/** `{color.p.red.500}` → `var(--nz-p-red-500)`; a literal Figma colour is not expected here. */
function figmaCss(value: unknown): string {
  const alias = typeof value === 'string' ? /^\{([a-z0-9.-]+)\}$/.exec(value) : null;
  if (!alias?.[1]) throw new Error(`Expected a Figma alias, got ${JSON.stringify(value)}`);
  return `var(${cssName(alias[1])})`;
}

const days = (from: Date, to: string): number =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - from.getTime()) / 86_400_000);

export function check(
  css: string,
  { today = new Date(), src = SRC, pairsFile = PAIRS_FILE } = {},
): Report {
  const sources = readSources(src);
  const pairs = readPairs(pairsFile);
  const errors = [...sources.problems];
  const warnings: string[] = [];
  const results = SCHEMES.flatMap((scheme) => measure(css, pairs, scheme));

  // 1. Contrast matrix: any AA miss fails, in both themes.
  for (const r of results.filter((result) => !result.pass)) {
    const misses = r.measurements.filter((m) => m.ratio < (r.threshold ?? 0));
    errors.push(
      `${r.scheme} ${r.fg} (${r.role}, needs ${r.threshold}:1): ${misses.map((m) => `${m.bg} ${shown(m.ratio)}`).join(', ')}`,
    );
  }

  const today0 = new Date(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  const expiry = (what: string, expires: string): void => {
    const left = days(today0, expires);
    if (left < 0)
      errors.push(`${what} expired on ${expires}; renew it with both owners or remove it`);
    else if (left <= WARN_DAYS) warnings.push(`${what} expires on ${expires} (${left} days)`);
  };

  for (const o of sources.overrides) {
    const what = `${o.scheme} override ${o.id}`;
    // 2. Drift: Figma still holds the value the override was written against.
    const figma = sources.figmaVariables.get(`color/${o.scheme}.tokens.json#${o.figmaVariableId}`);
    if (!figma)
      errors.push(`${what}: ${o.figmaVariableId} is not in color/${o.scheme}.tokens.json`);
    else if (figma.id !== o.id)
      errors.push(`${what}: ${o.figmaVariableId} is ${figma.id} in Figma now`);
    else if (JSON.stringify(figma.value) !== JSON.stringify(o.figmaValueAtOverride)) {
      errors.push(
        `${what}: Figma changed this token (${JSON.stringify(o.figmaValueAtOverride)} → ${JSON.stringify(figma.value)}); re-evaluate the override`,
      );
    }
    // 3. Redundancy: Figma now has the override's value, or (contrast) passes on its own.
    if (JSON.stringify(o.value) === JSON.stringify(figma?.value)) {
      errors.push(`${what}: Figma now has this value; delete the override`);
    } else if (o.kind === 'contrast' && figma) {
      const name = shortName(o.id);
      const touched = pairs.filter((p) => p.fg === name || p.on.includes(name));
      const alone = measure(css, touched, o.scheme, { [cssName(o.id)]: figmaCss(figma.value) });
      if (touched.length === 0)
        errors.push(`${what}: a contrast override needs a pair in contrast-pairs.json`);
      else if (alone.every((r) => r.pass)) {
        errors.push(`${what}: Figma's value passes on its own; delete the override`);
      }
    }
    // 4. Expiry.
    expiry(what, o.expires);
  }

  for (const p of sources.proposals) {
    const what = `proposal ${p.id}`;
    if (sources.figmaNames.has(p.figmaName)) {
      errors.push(`${what}: Figma now defines ${p.figmaName}; delete the proposal`);
    }
    expiry(what, p.expires);
  }
  return { results, errors, warnings, sources };
}

// -------------------------------------------------------------------------------- CONTRAST.md

/** A Markdown table laid out the way oxfmt prints one, so the golden passes `oxfmt --check`. */
export function table(header: string[], rows: string[][]): string {
  const widths = header.map((cell, i) =>
    Math.max(3, cell.length, ...rows.map((row) => (row[i] ?? '').length)),
  );
  const line = (cells: string[]): string =>
    `| ${cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join(' | ')} |`;
  return [line(header), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}

const valueText = (value: unknown): string => {
  const alias = typeof value === 'string' ? /^\{(.+)\}$/.exec(value)?.[1] : undefined;
  if (alias)
    return alias.startsWith('color.p.') ? alias.slice('color.p.'.length) : shortName(alias);
  if (isRecord(value) && typeof value.hex === 'string') {
    return typeof value.alpha === 'number' && value.alpha < 1
      ? `${value.hex} at ${Math.round(value.alpha * 100)}%`
      : value.hex;
  }
  if (isRecord(value) && typeof value.value === 'number')
    return `${value.value}${String(value.unit)}`;
  if (isRecord(value) && isRecord(value.fontSize)) {
    return `${String(value.fontWeight)} ${valueText(value.fontSize)}/${String(value.lineHeight)}`;
  }
  return JSON.stringify(value);
};
const MODES = ['light', 'dark', 'default', 'reduced', 'all'] as const;

export function renderMatrix({ results, sources }: Report): string {
  const overridden = (scheme: Scheme, name: string) =>
    sources.overrides.find((o) => o.scheme === scheme && shortName(o.id) === name);
  const proposed = (name: string) => sources.proposals.find((p) => shortName(p.id) === name);
  const source = (scheme: Scheme, name: string): string => {
    const o = overridden(scheme, name);
    if (o) return `override (${o.kind}): Figma ${valueText(o.figmaValueAtOverride)}`;
    return proposed(name) ? 'proposal' : 'Figma';
  };
  const out = [
    '# Contrast matrix',
    '',
    'Generated by `pnpm tokens:contrast` from the built `dist/tokens.css` and',
    '`src/code-owned/a11y/contrast-pairs.json`. Do not edit; `pnpm test` fails when it is stale and',
    '`pnpm build` fails when a pair misses its threshold (plan §15.1, §15.4).',
    '',
    'WCAG 2.2 relative luminance. Text needs 4.5:1 at every size, 12 px included (decision 8c);',
    'non-text and focus need 3:1 (1.4.11). Decorative and disabled rows are reported only. Ratios are',
    'rounded down. Inverse surfaces (Toast, Tooltip) take the other theme, so its rows cover them.',
    '',
    'Backgrounds: canvas, subtle, surface, surface-raised, hover and muted are `bg-*` tokens.',
  ];
  for (const scheme of SCHEMES) {
    const rows = results
      .filter((r) => r.scheme === scheme)
      .map((r) => [
        r.fg,
        r.fgHex,
        r.role,
        r.threshold === undefined ? '-' : `${r.threshold}`,
        r.measurements.map((m) => `${m.bg.replace(/^bg-/, '')} ${shown(m.ratio)}`).join(', '),
        shown(r.min),
        r.threshold === undefined ? 'report' : r.pass ? 'pass' : 'FAIL',
        source(scheme, r.fg),
      ]);
    out.push(
      '',
      `## ${scheme === 'light' ? 'Light' : 'Dark'}`,
      '',
      table(
        [
          'Foreground',
          'Value',
          'Role',
          'Needs',
          'Ratio on each background',
          'Min',
          'Result',
          'Source',
        ],
        rows,
      ),
    );
  }
  out.push(
    '',
    '## Overrides',
    '',
    'Existing Figma variables re-pointed in `src/code-owned/a11y/*.overrides.tokens.json` (plan §15.3, §15.4).',
    '',
    table(
      ['Token', 'Theme', 'Figma', 'Now', 'Kind', 'Expires', 'Reason'],
      sources.overrides.map((o) => [
        shortName(o.id),
        o.scheme,
        valueText(o.figmaValueAtOverride),
        valueText(o.value),
        o.kind,
        o.expires,
        o.reason,
      ]),
    ),
    '',
    '## Proposals',
    '',
    'Variables and styles Figma does not have yet, in `src/code-owned/proposals*` (plan §7.6).',
    '',
    table(
      ['Token', 'Figma name to create', 'Value', 'Expires', 'Reason'],
      sources.proposals.map((p) => [
        shortName(p.id),
        p.figmaName,
        new Set(Object.values(p.values).map(valueText)).size === 1
          ? valueText(Object.values(p.values)[0])
          : MODES.filter((mode) => mode in p.values)
              .map((mode) => `${mode} ${valueText(p.values[mode])}`)
              .join(', '),
        p.expires,
        p.reason,
      ]),
    ),
  );
  return `${out.join('\n')}\n`;
}
