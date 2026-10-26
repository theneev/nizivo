/**
 * The parts of docs/ARCHITECTURE.md the docs site reads, copied into apps/docs/lib/plan.json: the
 * numbered headings (for `§12.2` links), §18.2 (the degradations) and §23.4 (the builder defaults).
 * The docs build hashes that file instead of the whole plan, so a commit that changes only other
 * parts of the plan (a status paragraph, an M-row) no longer rebuilds and re-checks the site, and
 * `nz gen --check` fails when the copy drifts. Pure: it reads the plan and returns contents, it never
 * writes.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HEADER, printJson } from './format.ts';

export const PLAN = 'docs/ARCHITECTURE.md';
export const PLAN_EXTRACT = 'apps/docs/lib/plan.json';
/** The `### <number>` sections the docs read whole. */
export const PLAN_SECTIONS = ['18.2', '23.4'] as const;

export interface PlanExtractResult {
  /** Absolute path → content. Empty when the repo has no plan or no docs app. */
  files: Map<string, string>;
  errors: string[];
}

/** The text after `### <number> ` up to the next `##` or `###` heading. */
function section(text: string, number: string): string | undefined {
  const start = text.search(new RegExp(`^### ${number.replace('.', '\\.')} `, 'm'));
  if (start < 0) return undefined;
  const rest = text.slice(start + 4);
  const end = rest.search(/^#{2,3} /m);
  return end < 0 ? rest : rest.slice(0, end);
}

export function generatePlanExtract(root: string): PlanExtractResult {
  const files = new Map<string, string>();
  const errors: string[] = [];
  const plan = join(root, PLAN);
  if (!existsSync(plan) || !existsSync(join(root, 'apps', 'docs'))) return { files, errors };
  const text = readFileSync(plan, 'utf8');

  // `## 12. Overlays` or `### 12.2 Focus` → { "12.2": "12.2 Focus" }, the first heading per number
  const headings: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = /^#{2,4} (\d+(?:\.\d+)*)\.? .+$/.exec(line);
    if (m?.[1] !== undefined && !(m[1] in headings)) headings[m[1]] = line.replace(/^#+ /, '');
  }

  const sections: Record<string, string> = {};
  for (const number of PLAN_SECTIONS) {
    const body = section(text, number);
    if (body === undefined) errors.push(`${PLAN} has no section ${number}`);
    else sections[number] = body;
  }

  files.set(
    join(root, PLAN_EXTRACT),
    printJson({ $comment: `${HEADER}; from ${PLAN}`, headings, sections }),
  );
  return { files, errors };
}
