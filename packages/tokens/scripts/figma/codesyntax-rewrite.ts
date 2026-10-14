// Dry run of the one-off Grove → Nizivo rename in the design file (plan §7.7, §20.3; handoff §2.1).
// Reads figma/snapshot.json and writes, without touching Figma:
//   figma/codesyntax-rewrite.plan.json  every variable's current codeSyntax.WEB and the proposed
//                                       var(--nz-…), plus the collection and style renames
//   figma/codesyntax-rewrite.plan.md    the same, for design review
//   scripts/figma/codesyntax-apply.figma.js  the use_figma script that WOULD apply the plan.
// Running the apply script writes to the design file and needs the maintainer's approval.
//
// Usage: node scripts/figma/codesyntax-rewrite.ts
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
  FIGMA_DIR,
  PACKAGE_ROOT,
  SNAPSHOT_PATH,
  printJson,
  readSnapshot,
  type Snapshot,
} from './snapshot.ts';

// Published packages always use `nz` (plan §7.3); forks rebuild with their own prefix.
const PREFIX = 'nz';
const PLAN_JSON = resolve(FIGMA_DIR, 'codesyntax-rewrite.plan.json');
const PLAN_MD = resolve(FIGMA_DIR, 'codesyntax-rewrite.plan.md');
const APPLY_SCRIPT = resolve(PACKAGE_ROOT, 'scripts/figma/codesyntax-apply.figma.js');

// Plan §7.2: Figma variables that the token build does not emit as CSS custom properties.
const NOT_EMITTED: Record<string, string> = {
  'layout/viewport': 'not emitted in CSS: frame widths, not breakpoints (plan §7.2)',
};

export interface VariableRewrite {
  id: string;
  collection: string;
  name: string;
  current: string | null;
  proposed: string;
  status: 'rewrite' | 'unchanged' | 'mismatch' | 'missing';
  note?: string;
}

export interface Rename {
  id: string;
  kind: 'collection' | 'textStyle' | 'effectStyle';
  current: string;
  proposed: string;
}

export interface RewritePlan {
  source: string;
  prefix: string;
  summary: Record<string, number>;
  variables: VariableRewrite[];
  renames: Rename[];
  manual: string[];
}

const isPrimitives = (collection: string) => collection.endsWith(' Primitives');

/** The CSS name plan §7.2 gives a variable: `--nz-p-green-700`, `--nz-bg-surface`, `--nz-space-4`. */
export function cssName(collection: string, name: string): string {
  const body = name.replaceAll('/', '-').replaceAll(' ', '-').toLowerCase();
  return `--${PREFIX}-${isPrimitives(collection) ? 'p-' : ''}${body}`;
}

const rename =
  (kind: Rename['kind']) =>
  (item: { id: string; name: string }): Rename => ({
    id: item.id,
    kind,
    current: item.name,
    proposed: item.name.replace(/^Grove(?=[ /])/, 'Nizivo'),
  });

export function buildPlan(snapshot: Snapshot): RewritePlan {
  const collectionName = new Map(snapshot.variableCollections.map((c) => [c.id, c.name]));

  const variables = snapshot.variables.map((variable): VariableRewrite => {
    const collection = collectionName.get(variable.variableCollectionId) ?? '';
    const current = variable.codeSyntax.WEB ?? null;
    const proposed = `var(${cssName(collection, variable.name)})`;
    // A current value that only differs by the grove prefix is the expected case.
    const legacy = proposed.replace(`var(--${PREFIX}-`, 'var(--grove-');
    const status =
      current === null
        ? 'missing'
        : current === proposed
          ? 'unchanged'
          : current === legacy
            ? 'rewrite'
            : 'mismatch';
    const note = NOT_EMITTED[variable.name];
    return {
      id: variable.id,
      collection,
      name: variable.name,
      current,
      proposed,
      status,
      ...(note === undefined ? {} : { note }),
    };
  });

  const renames = [
    ...snapshot.variableCollections.map(rename('collection')),
    ...snapshot.textStyles.map(rename('textStyle')),
    ...snapshot.effectStyles.map(rename('effectStyle')),
  ].filter((item) => item.proposed !== item.current);

  const count = (status: VariableRewrite['status']) =>
    variables.filter((v) => v.status === status).length;
  return {
    source: relative(PACKAGE_ROOT, SNAPSHOT_PATH),
    prefix: PREFIX,
    summary: {
      variables: variables.length,
      withWebCodeSyntax: variables.filter((v) => v.current !== null).length,
      rewrite: count('rewrite'),
      unchanged: count('unchanged'),
      mismatch: count('mismatch'),
      missing: count('missing'),
      collectionRenames: renames.filter((r) => r.kind === 'collection').length,
      textStyleRenames: renames.filter((r) => r.kind === 'textStyle').length,
      effectStyleRenames: renames.filter((r) => r.kind === 'effectStyle').length,
    },
    variables,
    renames,
    manual: [
      'Rename the file "Grove UI Library" to "Nizivo UI Library" (File menu; the Plugin API cannot).',
    ],
  };
}

/** A Markdown table padded the way oxfmt pads one, so the generated file passes `oxfmt --check`. */
function mdTable(header: string[], rows: string[][]): string[] {
  const widths = header.map((cell, i) =>
    Math.max(3, cell.length, ...rows.map((row) => (row[i] ?? '').length)),
  );
  const line = (cells: string[]) =>
    `| ${cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join(' | ')} |`;
  return [line(header), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)];
}

const code = (text: string | null) => `\`${text ?? '(none)'}\``;

export function planMarkdown(plan: RewritePlan): string {
  const s = plan.summary;
  const review = plan.variables.filter(
    (v) => v.status === 'mismatch' || v.status === 'missing' || v.note,
  );
  return [
    '# codeSyntax and Grove → Nizivo rename: dry run',
    '',
    `Generated by \`scripts/figma/codesyntax-rewrite.ts\` from \`${plan.source}\`. Nothing has been written to Figma.`,
    'Applying it needs the maintainer’s approval, then one `use_figma` call running',
    '`scripts/figma/codesyntax-apply.figma.js` with `DRY_RUN = false`.',
    '',
    `- ${s.variables} variables, ${s.withWebCodeSyntax} with a WEB code syntax: ${s.rewrite} to rewrite, ${s.unchanged} already correct, ${s.mismatch} that do not follow the variable name, ${s.missing} without one.`,
    `- ${s.collectionRenames} collections, ${s.textStyleRenames} text styles and ${s.effectStyleRenames} effect styles to rename.`,
    ...plan.manual.map((step) => `- Manual: ${step}`),
    '',
    '## Needs a decision from design',
    '',
    ...(review.length === 0
      ? ['None.']
      : mdTable(
          ['Variable', 'Collection', 'Current', 'Proposed', 'Why'],
          review.map((v) => [
            code(v.name),
            v.collection,
            code(v.current),
            code(v.proposed),
            v.note ?? v.status,
          ]),
        )),
    '',
    '## Collection and style renames',
    '',
    ...mdTable(
      ['Kind', 'Current', 'Proposed'],
      plan.renames.map((r) => [r.kind, r.current, r.proposed]),
    ),
    '',
    '## Variables (codeSyntax.WEB)',
    '',
    ...mdTable(
      ['Collection', 'Variable', 'Current', 'Proposed'],
      plan.variables.map((v) => [v.collection, code(v.name), code(v.current), code(v.proposed)]),
    ),
    '',
  ].join('\n');
}

const quote = (item: string | null) => (item === null ? 'null' : `'${item}'`);

/** Array rows printed the way oxfmt prints them (single quotes, 100 columns). */
function jsRows(rows: (string | null)[][]): string {
  const lines = rows.map((row) => {
    const flat = `  [${row.map(quote).join(', ')}],`;
    return flat.length <= 100
      ? flat
      : `  [\n${row.map((item) => `    ${quote(item)},`).join('\n')}\n  ],`;
  });
  return `[\n${lines.join('\n')}\n]`;
}

/** The use_figma script that applies the plan; it refuses any variable whose WEB value drifted. */
export function applyScript(plan: RewritePlan): string {
  const variables = plan.variables
    .filter((v) => v.current !== v.proposed)
    .map((v) => [v.id, v.current, v.proposed]);
  const renames = plan.renames.map((r) => [r.kind, r.id, r.current, r.proposed]);
  return `// generated by scripts/figma/codesyntax-rewrite.ts; do not edit.
// use_figma script that WOULD apply figma/codesyntax-rewrite.plan.json to the design file:
// codeSyntax.WEB → var(--${plan.prefix}-…) on ${variables.length} variables, and the Grove → Nizivo rename of
// ${renames.length} collections and styles. NOT RUN: writing to the design file needs the maintainer's approval.
// With DRY_RUN = true it only checks that the file still matches the plan and returns what it would change.
// Changes go into the file's version history; restore an earlier version to undo.
const DRY_RUN = true;

// [variableId, expected current WEB, proposed WEB]
const VARIABLES = ${jsRows(variables)};
// [kind, id, expected current name, proposed name]
const RENAMES = ${jsRows(renames)};

const changed = [];
const skipped = [];

const variables = await Promise.all(
  VARIABLES.map(([id]) => figma.variables.getVariableByIdAsync(id)),
);
VARIABLES.forEach(([id, from, to], index) => {
  const variable = variables[index];
  const current = variable ? (variable.codeSyntax.WEB ?? null) : null;
  if (!variable || current !== from) {
    skipped.push({ id, reason: \`WEB is \${current}, plan expected \${from}\` });
    return;
  }
  if (!DRY_RUN) variable.setVariableCodeSyntax('WEB', to);
  changed.push({ id, name: variable.name, from, to });
});

const targets = await Promise.all(
  RENAMES.map(([kind, id]) =>
    kind === 'collection'
      ? figma.variables.getVariableCollectionByIdAsync(id)
      : figma.getStyleByIdAsync(id),
  ),
);
RENAMES.forEach(([kind, id, from, to], index) => {
  const target = targets[index];
  if (!target || target.name !== from) {
    skipped.push({ id, reason: \`\${kind} is \${target?.name}, plan expected \${from}\` });
    return;
  }
  if (!DRY_RUN) target.name = to;
  changed.push({ id, kind, from, to });
});

return { dryRun: DRY_RUN, changed: changed.length, skipped, sample: changed.slice(0, 5) };
`;
}

if (import.meta.main) {
  const plan = buildPlan(readSnapshot());
  writeFileSync(PLAN_JSON, printJson(plan));
  writeFileSync(PLAN_MD, planMarkdown(plan));
  writeFileSync(APPLY_SCRIPT, applyScript(plan));
  console.log(
    `codeSyntax dry run: ${JSON.stringify(plan.summary)}\n` +
      `Wrote ${[PLAN_JSON, PLAN_MD, APPLY_SCRIPT].map((p) => relative(PACKAGE_ROOT, p)).join(', ')}`,
  );
}
