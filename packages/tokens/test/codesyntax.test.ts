import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, test, vi } from 'vitest';
import {
  APPLIED,
  applyScript,
  planFingerprints,
  planMarkdown,
  type RewritePlan,
} from '../scripts/figma/codesyntax-rewrite.ts';
import { PACKAGE_ROOT, isRecord, readJson } from '../scripts/figma/snapshot.ts';

const read = (path: string): string => readFileSync(resolve(PACKAGE_ROOT, path), 'utf8');

function isPlan(value: unknown): value is RewritePlan {
  return (
    isRecord(value) &&
    typeof value.source === 'string' &&
    typeof value.prefix === 'string' &&
    isRecord(value.summary) &&
    Array.isArray(value.variables) &&
    Array.isArray(value.renames) &&
    Array.isArray(value.manual)
  );
}

// The committed plan is the record of the 2026-10-14 run; snapshot.json changes on every pull.
const planJson = readJson(resolve(PACKAGE_ROOT, 'figma/codesyntax-rewrite.plan.json'));
if (!isPlan(planJson)) throw new Error('figma/codesyntax-rewrite.plan.json is not a rewrite plan');
const PLAN = planJson;
const APPLY = read('scripts/figma/codesyntax-apply.figma.js');

interface ApplyResult {
  dryRun: boolean;
  changed: number;
  skipped: unknown[];
}

function isApplyResult(value: unknown): value is ApplyResult {
  return (
    isRecord(value) &&
    typeof value.dryRun === 'boolean' &&
    typeof value.changed === 'number' &&
    Array.isArray(value.skipped)
  );
}

/**
 * Runs the apply script with DRY_RUN = false against a stand-in for the Plugin API whose variables
 * and styles hold either the pre-rename (`current`) or the renamed (`proposed`) values.
 */
async function runApply(state: 'current' | 'proposed') {
  const setVariableCodeSyntax = vi.fn<(platform: string, value: string) => void>();
  const rename = vi.fn<(name: string) => void>();
  const variables = new Map(
    PLAN.variables.map((v) => [
      v.id,
      { name: v.name, codeSyntax: { WEB: v[state] }, setVariableCodeSyntax },
    ]),
  );
  const named = new Map(
    PLAN.renames.map((r) => [
      r.id,
      {
        get name() {
          return r[state];
        },
        set name(value: string) {
          rename(value);
        },
      },
    ]),
  );
  const figma = {
    variables: {
      getVariableByIdAsync: async (id: string) => variables.get(id) ?? null,
      getVariableCollectionByIdAsync: async (id: string) => named.get(id) ?? null,
    },
    getStyleByIdAsync: async (id: string) => named.get(id) ?? null,
  };
  const body = APPLY.replace('const DRY_RUN = true;', 'const DRY_RUN = false;');
  expect(body).not.toBe(APPLY);
  // use_figma runs the script as the body of an async function, so `return` ends it.
  const pending: unknown = runInNewContext(`(async () => {\n${body}\n})()`, { figma });
  const result: unknown = await pending;
  if (!isApplyResult(result)) throw new Error(`unexpected result ${JSON.stringify(result)}`);
  return { result, setVariableCodeSyntax, rename };
}

describe('codeSyntax rewrite: the record of the 2026-10-14 rename', () => {
  test('the committed plan has the fingerprints the applied run matched', () => {
    expect(planFingerprints(PLAN)).toEqual({
      variables: APPLIED.variables,
      renames: APPLIED.renames,
    });
  });

  test('plan.md and the apply script are what the generator prints from the plan', () => {
    expect(planMarkdown(PLAN)).toBe(read('figma/codesyntax-rewrite.plan.md'));
    expect(applyScript(PLAN)).toBe(APPLY);
  });

  test('a second run against the renamed file changes nothing, even with DRY_RUN = false', async () => {
    const { result, setVariableCodeSyntax, rename } = await runApply('proposed');
    expect(result.dryRun).toBe(false);
    expect(result.changed).toBe(0);
    expect(result.skipped).toHaveLength(175 + 33);
    expect(setVariableCodeSyntax).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
  });

  test('control: against the file before the rename it writes every row', async () => {
    const { result, setVariableCodeSyntax, rename } = await runApply('current');
    expect(result.changed).toBe(175 + 33);
    expect(result.skipped).toHaveLength(0);
    expect(setVariableCodeSyntax).toHaveBeenCalledTimes(175);
    expect(rename).toHaveBeenCalledTimes(33);
  });
});
