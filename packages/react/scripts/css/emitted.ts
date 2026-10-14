// The emitted-CSS vocabulary check (ARCHITECTURE.md §4.1 L3, §8.3, §21.1 exit criterion 3): parses
// what the build wrote and fails on any class outside nz-*, any data-* name or value outside the
// vocabulary and the component manifests, native overlay state, and any var() read the contract
// does not define.
import {
  attributeProblem,
  CLASS_PATTERN,
  type ComponentManifest,
  type Components,
  NATIVE_OVERLAY_STATE,
  variableProblem,
  type Vocabulary,
} from '@nizivo/stylelint-config/contract';
import { parseCss, selectorComponents } from './compile.ts';

export interface EmittedContext {
  vocabulary: Vocabulary;
  components: Components;
  /** The component this stylesheet belongs to; undefined for shared files such as base.css. */
  component?: ComponentManifest | undefined;
  /** Custom properties the built tokens.css declares; undefined while it is not published. */
  tokens?: ReadonlySet<string> | undefined;
}

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Lightning CSS's attribute operators, as written in CSS. */
const OPERATORS: Readonly<Record<string, string>> = {
  equal: '=',
  includes: '~=',
  'dash-match': '|=',
  prefix: '^=',
  substring: '*=',
  suffix: '$=',
};

/** The custom property a declaration node declares, if it is one. */
function declaredName(node: Json): string | undefined {
  if (node.property !== 'custom' || !isRecord(node.value)) return undefined;
  const name = text(node.value.name);
  return name.startsWith('--') ? name : undefined;
}

export function checkEmitted(code: string, filename: string, context: EmittedContext): string[] {
  const problems: string[] = [];
  const { rules } = parseCss(code, filename);
  const declared = new Set<string>();
  const reads: { name: string; hasFallback: boolean }[] = [];

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!isRecord(node)) return;
    if (node.type === 'style' && isRecord(node.value) && Array.isArray(node.value.selectors)) {
      for (const selector of node.value.selectors) checkSelector(selector, context, problems);
    }
    const name = declaredName(node);
    if (name !== undefined) declared.add(name);
    if (node.type === 'var' && isRecord(node.value) && isRecord(node.value.name)) {
      reads.push({
        name: text(node.value.name.ident),
        hasFallback: Array.isArray(node.value.fallback),
      });
    }
    for (const item of Object.values(node)) if (typeof item === 'object') visit(item);
  };
  visit(rules);

  for (const read of reads) {
    if (read.name.startsWith('--_nz-')) {
      if (!declared.has(read.name)) {
        problems.push(`private ${read.name} is read but never declared`);
      }
      continue;
    }
    const problem = variableProblem(read, context);
    if (problem !== undefined) problems.push(problem);
  }
  return [...new Set(problems)];
}

/** The custom properties a stylesheet declares at any depth: what a built tokens.css defines. */
export function declaredProperties(code: string, filename: string): Set<string> {
  const names = new Set<string>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!isRecord(node)) return;
    const name = declaredName(node);
    if (name !== undefined) names.add(name);
    for (const item of Object.values(node)) if (typeof item === 'object') visit(item);
  };
  visit(parseCss(code, filename).rules);
  return names;
}

function checkSelector(selector: unknown, context: EmittedContext, problems: string[]): void {
  for (const component of selectorComponents(selector)) {
    const type = text(component.type);
    if (type === 'class') {
      const name = text(component.name);
      if (!CLASS_PATTERN.test(name)) {
        problems.push(`class .${name} is outside nz-<component>[-<part>] (§8.2)`);
      }
    } else if (type === 'attribute') {
      const name = text(component.name);
      if (name === 'open') {
        problems.push('[open] is native overlay state: select [data-open] (§8.3 rule 2)');
        continue;
      }
      const operation = isRecord(component.operation) ? component.operation : undefined;
      const problem = attributeProblem(
        {
          name,
          operator: operation === undefined ? undefined : OPERATORS[text(operation.operator)],
          value: operation === undefined ? undefined : text(operation.value),
        },
        context,
      );
      if (problem !== undefined) problems.push(problem);
    } else if (type === 'pseudo-class' || type === 'pseudo-element') {
      const shown = `${type === 'pseudo-element' ? '::' : ':'}${text(component.kind)}`;
      if (NATIVE_OVERLAY_STATE.has(shown)) {
        problems.push(
          `${shown} is native overlay state: select the data-* vocabulary (§8.3 rule 2)`,
        );
      }
    }
  }
}
