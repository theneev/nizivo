/**
 * `contracts/api/css/<name>.json` from one built stylesheet (ARCHITECTURE.md §8.4 rule 4, §18.2).
 *
 * It reads `dist/css/<name>.css`, what ships: custom media already substituted and the build's
 * guards already passed. Lightning CSS re-prints it with targets below native nesting and no
 * minification, which flattens every selector to the form a consumer writes in an override. The
 * re-printed text is then parsed with Lightning CSS for the structure (layers, at-rules, selector
 * components, `var()` reads), while printed text (selectors, conditions, values) is sliced from
 * the re-print itself, so every string is exactly what Lightning CSS prints. Comments do not survive
 * the build, so a hook's description comes from a `/** … *\/` doc comment in the source stylesheet.
 *
 * What a `var()` name is comes from `classifyVariable` in `@nizivo/stylelint-config/contract`, the
 * classifier the stylelint rule and the emitted-CSS check use, so the three cannot disagree.
 * Pure: no file system.
 */
import { transform } from 'lightningcss';
import {
  classifyVariable,
  type ComponentManifest,
  type VariableKind,
} from '../stylelint-config/contract.js';
import type { CssApiFile, CssFallback, CssHookDoc, CssHookRead, PrivateValue } from './schema.ts';
import { compareStrings, GENERATED_COMMENT, normalizeText } from './text.ts';

export interface CssInput {
  /** The built stylesheet (`dist/css/<name>.css`). */
  code: string;
  /** The repo-relative path of `code`, for messages. */
  filename: string;
  /** The exports-map key: `./css/alert.css`. */
  entry: string;
  /** The component the stylesheet belongs to; undefined for a shared file such as `base.css`. */
  component?: ComponentManifest | undefined;
  /** Every token name in `@nizivo/tokens/contract.json`. */
  tokens: ReadonlySet<string>;
  /** The source stylesheet, for hook descriptions; undefined when there is none. */
  source?: string | undefined;
}

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Below native CSS nesting (Chrome 112), so Lightning CSS prints every selector flattened. */
const FLAT_TARGETS = { chrome: 100 << 16 };

/** At-rules whose block applies conditionally; their prelude becomes a `conditions` entry. */
const CONDITIONAL = new Set(['media', 'supports', 'container', 'starting-style', 'scope']);

/** At-rules with descriptors, never `var()` reads, a selector or a hook. */
const DESCRIPTOR_RULES = new Set(['property', 'font-face', 'font-palette-values', 'counter-style']);

interface Read {
  name: string;
  /** The fallback as printed, or undefined for `var(--x)` without one. */
  fallback: string | undefined;
  /** The `var()` names inside the fallback, in order. */
  inner: string[];
}

interface Declaration {
  property: string;
  value: string;
  reads: Read[];
}

interface Selector {
  text: string;
  /** The `data-*` conditions on the subject compound. */
  when: Record<string, string>;
  /** The last `nz-*` class of the subject compound, minus `nz-`. */
  slot: string | undefined;
}

export function extractCss(input: CssInput): { file?: CssApiFile; errors: string[] } {
  const errors: string[] = [];
  const at = (problem: string) => `${input.filename}: ${problem}`;

  let flat: string;
  try {
    const result = transform({
      filename: input.filename,
      code: encoder.encode(input.code),
      targets: FLAT_TARGETS,
      minify: false,
    });
    for (const warning of result.warnings) errors.push(at(`Lightning CSS: ${warning.message}`));
    flat = decoder.decode(result.code);
  } catch (error) {
    return { errors: [at(`Lightning CSS could not parse it: ${message(error)}`)] };
  }
  let rules: unknown[] = [];
  transform({
    filename: input.filename,
    code: encoder.encode(flat),
    visitor: {
      StyleSheet(stylesheet) {
        rules = stylesheet.rules;
      },
    },
  });

  const lines = flat.split('\n');
  const offsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }
  /** The flat text's index of a rule's `loc` (0-based line, 1-based column). */
  const indexOf = (loc: unknown): number => {
    if (!isRecord(loc) || typeof loc.line !== 'number' || typeof loc.column !== 'number') {
      throw new Error('a rule without a source location');
    }
    return (offsets[loc.line] ?? 0) + loc.column - 1;
  };

  const layers: string[] = [];
  const classes = new Set<string>();
  const tokens = new Set<string>();
  const runtime = new Set<string>();
  const declaredPrivates = new Set<string>();
  const privateValues = new Map<string, PrivateValue[]>();
  const hookReads = new Map<string, { read: CssHookRead; fallback: string | undefined }[]>();
  const context = { component: input.component, tokens: input.tokens };
  const kinds = new Map<string, VariableKind>();
  const kindOf = (name: string): VariableKind => {
    let kind = kinds.get(name);
    if (kind === undefined) {
      kind = classifyVariable(name, context);
      kinds.set(name, kind);
    }
    return kind;
  };

  /** Records every `var()` name a declaration reads, and the hook reads. */
  const noteReads = (declaration: Declaration, selectors: Selector[], conditions: string[]) => {
    for (const read of declaration.reads) {
      const kind = kindOf(read.name);
      if (kind === 'token') tokens.add(read.name);
      else if (kind === 'runtime') runtime.add(read.name);
      else if (kind === 'hook') {
        const reads = hookReads.get(read.name) ?? [];
        for (const selector of selectors) {
          if (selector.slot === undefined) {
            errors.push(
              at(
                `${read.name} is read by "${selector.text}", whose subject has no nz-* class to name its slot`,
              ),
            );
            continue;
          }
          reads.push({
            read: {
              conditions,
              property: declaration.property,
              selector: selector.text,
              slot: selector.slot,
            },
            fallback: read.fallback,
          });
        }
        hookReads.set(read.name, reads);
      } else if (kind !== 'private') {
        errors.push(at(`${read.name} is not a token, a runtime variable, a hook or a private`));
      }
    }
  };

  const walk = (nodes: unknown[], conditions: string[]): void => {
    for (const node of nodes) {
      if (!isRecord(node) || !isRecord(node.value)) continue;
      const type = text(node.type);
      const value = node.value;
      if (type === 'layer-statement' || DESCRIPTOR_RULES.has(type)) continue;
      if (type === 'layer-block') {
        const name = list(value.name).map(text).join('.');
        if (!layers.includes(name)) layers.push(name);
        walk(list(value.rules), conditions);
      } else if (CONDITIONAL.has(type)) {
        walk(list(value.rules), [...conditions, prelude(flat, indexOf(value.loc))]);
      } else if (type === 'keyframes') {
        // Keyframes read tokens; a hook read inside one has no slot, so it is an error below.
        const keyframesAt = prelude(flat, indexOf(value.loc));
        for (const frame of list(value.keyframes)) {
          if (!isRecord(frame) || !isRecord(frame.declarations)) continue;
          const reads = [
            ...list(frame.declarations.declarations),
            ...list(frame.declarations.importantDeclarations),
          ].flatMap((declaration) => astReads(declaration));
          for (const name of reads) {
            const kind = kindOf(name);
            if (kind === 'token') tokens.add(name);
            else if (kind === 'runtime') runtime.add(name);
            else if (kind === 'hook') errors.push(at(`${name} is read inside ${keyframesAt}`));
            else if (kind !== 'private') {
              errors.push(at(`${name} is not a token, a runtime variable, a hook or a private`));
            }
          }
        }
      } else if (type === 'style') {
        const start = indexOf(value.loc);
        const open = findTopLevel(flat, start, '{');
        const close = matchingBrace(flat, open);
        const astSelectors = list(value.selectors);
        const selectorTexts = splitTopLevel(flat.slice(start, open), ',').map((part) =>
          part.trim(),
        );
        if (selectorTexts.length !== astSelectors.length) {
          errors.push(at(`could not align the selectors of "${flat.slice(start, open).trim()}"`));
          continue;
        }
        const selectors = astSelectors.map((selector, index) =>
          describeSelector(selector, selectorTexts[index] ?? '', classes),
        );
        const declarations = readDeclarations(flat.slice(open + 1, close), value, errors, at);
        for (const declaration of declarations) {
          if (declaration.property.startsWith('--_nz-')) {
            declaredPrivates.add(declaration.property);
            const values = privateValues.get(declaration.property) ?? [];
            for (const selector of selectors) {
              values.push({
                conditions,
                selector: selector.text,
                value: declaration.value,
                when: selector.when,
              });
            }
            privateValues.set(declaration.property, values);
          }
          noteReads(declaration, selectors, conditions);
        }
        if (list(value.rules).length > 0) {
          errors.push(at(`"${selectorTexts.join(', ')}" still nests rules after flattening`));
        }
      } else {
        errors.push(at(`@${type} is not a rule nz api knows how to read`));
      }
    }
  };

  try {
    walk(rules, []);
  } catch (error) {
    errors.push(at(message(error)));
  }

  const hooks: CssHookDoc[] = [];
  for (const [name, reads] of [...hookReads].toSorted(([a], [b]) => compareStrings(a, b))) {
    // a read without a slot is already an error
    if (reads.length === 0) continue;
    const fallbacks = new Set(reads.map((read) => read.fallback));
    if (fallbacks.size > 1) {
      const shown = [...fallbacks].map((fallback) => fallback ?? '(none)').join(' | ');
      errors.push(at(`hook ${name} is read with different fallbacks: ${shown} (§8.4 rule 1)`));
      continue;
    }
    const printed = reads[0]?.fallback;
    if (printed === undefined) {
      errors.push(at(`hook ${name} is read without a fallback (§8.4 rule 1)`));
      continue;
    }
    const fallback = describeFallback(printed, kindOf, privateValues, declaredPrivates);
    if (typeof fallback === 'string') {
      errors.push(at(`hook ${name}: ${fallback}`));
      continue;
    }
    const description =
      input.source === undefined ? undefined : hookDescription(input.source, name);
    hooks.push({
      ...(description === undefined ? {} : { description }),
      fallback,
      name,
      reads: reads
        .map((read) => read.read)
        .toSorted(
          (a, b) =>
            compareStrings(a.selector, b.selector) ||
            compareStrings(a.property, b.property) ||
            compareStrings(a.conditions.join('\n'), b.conditions.join('\n')),
        ),
    });
  }

  if (errors.length > 0) return { errors };
  return {
    errors,
    file: {
      $comment: GENERATED_COMMENT,
      classes: [...classes].toSorted(compareStrings),
      ...(input.component === undefined ? {} : { component: input.component.name }),
      entry: input.entry,
      hooks,
      layers,
      package: '@nizivo/react',
      runtime: [...runtime].toSorted(compareStrings),
      tokens: [...tokens].toSorted(compareStrings),
      version: 1,
    },
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The prelude of the at-rule at `index`: `@media (hover: hover)`. */
function prelude(flat: string, index: number): string {
  return flat.slice(index, findTopLevel(flat, index, '{')).trim();
}

/** The index of the first `char` at bracket depth 0 from `start`, outside strings. */
function findTopLevel(source: string, start: number, char: string): number {
  let depth = 0;
  let quote = '';
  for (let index = start; index < source.length; index += 1) {
    const current = source[index];
    if (quote !== '') {
      if (current === '\\') index += 1;
      else if (current === quote) quote = '';
    } else if (current === '"' || current === "'") quote = current;
    else if (current === '(' || current === '[') depth += 1;
    else if (current === ')' || current === ']') depth -= 1;
    else if (depth === 0 && current === char) return index;
  }
  throw new Error(`no "${char}" after offset ${start}`);
}

/** The index of the `}` that closes the `{` at `open`. */
function matchingBrace(source: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let index = open; index < source.length; index += 1) {
    const current = source[index];
    if (quote !== '') {
      if (current === '\\') index += 1;
      else if (current === quote) quote = '';
    } else if (current === '"' || current === "'") quote = current;
    else if (current === '{') depth += 1;
    else if (current === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`unbalanced block at offset ${open}`);
}

/** Splits at `separator` outside brackets, parentheses and strings. */
export function splitTopLevel(source: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let from = 0;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    if (quote !== '') {
      if (current === '\\') index += 1;
      else if (current === quote) quote = '';
    } else if (current === '"' || current === "'") quote = current;
    else if (current === '(' || current === '[') depth += 1;
    else if (current === ')' || current === ']') depth -= 1;
    else if (depth === 0 && current === separator) {
      parts.push(source.slice(from, index));
      from = index + 1;
    }
  }
  parts.push(source.slice(from));
  return parts;
}

/**
 * Every `var()` in a printed value, outermost first (the order of their `var(` in the text):
 * its name, its fallback as printed, and the `var()` names inside the fallback.
 */
export function printedReads(value: string): Read[] {
  const reads: Read[] = [];
  const pattern = /\bvar\(/g;
  for (let match = pattern.exec(value); match !== null; match = pattern.exec(value)) {
    const open = match.index + match[0].length - 1;
    const close = closingParen(value, open);
    const body = value.slice(open + 1, close);
    const [name = '', ...rest] = splitTopLevel(body, ',');
    const fallback = rest.length === 0 ? undefined : rest.join(',').trim();
    reads.push({
      name: name.trim(),
      fallback,
      inner:
        fallback === undefined
          ? []
          : [...fallback.matchAll(/\bvar\(\s*(--[\w-]+)/g)].map((inner) => inner[1] ?? ''),
    });
  }
  return reads;
}

function closingParen(source: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let index = open; index < source.length; index += 1) {
    const current = source[index];
    if (quote !== '') {
      if (current === '\\') index += 1;
      else if (current === quote) quote = '';
    } else if (current === '"' || current === "'") quote = current;
    else if (current === '(') depth += 1;
    else if (current === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`unbalanced var() in "${source}"`);
}

/** The `var()` names a Lightning CSS declaration node reads, in document order. */
function astReads(node: unknown): string[] {
  const names: string[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!isRecord(value)) return;
    if (value.type === 'var' && isRecord(value.value) && isRecord(value.value.name)) {
      names.push(text(value.value.name.ident));
      visit(value.value.fallback);
      return;
    }
    for (const item of Object.values(value)) if (typeof item === 'object') visit(item);
  };
  visit(node);
  return names;
}

/**
 * The declarations of a flat style rule as printed, paired with the AST: Lightning CSS prints the
 * normal declarations, then the `!important` ones, in AST order. The `var()` names read from the
 * text must equal those in the AST, or the two have drifted apart and nothing is trusted.
 */
function readDeclarations(
  block: string,
  rule: Json,
  errors: string[],
  at: (message: string) => string,
): Declaration[] {
  const declarationsNode = isRecord(rule.declarations) ? rule.declarations : {};
  const ast = [
    ...list(declarationsNode.declarations),
    ...list(declarationsNode.importantDeclarations),
  ];
  const printed = splitTopLevel(block, ';')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (printed.length !== ast.length) {
    errors.push(at(`could not align the declarations of "${block.trim().slice(0, 80)}"`));
    return [];
  }
  return printed.map((declaration, index) => {
    const colon = declaration.indexOf(':');
    const property = declaration.slice(0, colon).trim();
    const value = declaration
      .slice(colon + 1)
      .replace(/\s*!important$/, '')
      .trim();
    const reads = printedReads(value);
    const expected = astReads(ast[index]);
    if (reads.map((read) => read.name).join(' ') !== expected.join(' ')) {
      errors.push(at(`could not align the var() reads of "${declaration}"`));
    }
    return { property, value, reads };
  });
}

/** Lightning CSS's attribute operators, as written in CSS. */
const EQUAL = 'equal';

function describeSelector(selector: unknown, printed: string, classes: Set<string>): Selector {
  const components = list(selector).filter(isRecord);
  for (const name of classNames(components)) if (name.startsWith('nz-')) classes.add(name);
  let subjectStart = 0;
  components.forEach((component, index) => {
    if (component.type === 'combinator') subjectStart = index + 1;
  });
  const subject = components.slice(subjectStart);
  const when: Record<string, string> = {};
  let slot: string | undefined;
  for (const component of subject) {
    if (component.type === 'class' && text(component.name).startsWith('nz-')) {
      slot = text(component.name).slice('nz-'.length);
    } else if (component.type === 'attribute' && text(component.name).startsWith('data-')) {
      const operation = isRecord(component.operation) ? component.operation : undefined;
      if (operation === undefined) when[text(component.name)] = '';
      else if (operation.operator === EQUAL) when[text(component.name)] = text(operation.value);
    }
  }
  return { text: printed, when, slot };
}

/** Every class a selector names, with those nested in :is(), :where(), :not() and :has(). */
function classNames(components: Json[]): string[] {
  const names: string[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
    } else if (isRecord(value)) {
      if (value.type === 'class' && typeof value.name === 'string') names.push(value.name);
      for (const item of Object.values(value)) if (typeof item === 'object') visit(item);
    }
  };
  visit(components);
  return names;
}

/** The fallback of a hook, or a problem. */
function describeFallback(
  printed: string,
  kindOf: (name: string) => VariableKind,
  privateValues: ReadonlyMap<string, PrivateValue[]>,
  declaredPrivates: ReadonlySet<string>,
): CssFallback | string {
  const reads = printedReads(printed);
  const single = /^var\(\s*(--[\w-]+)\s*(?:,[\s\S]*)?\)$/.exec(printed);
  const outer = reads[0];
  if (single !== null && outer !== undefined && closingParen(printed, 3) === printed.length - 1) {
    const name = outer.name;
    const kind = kindOf(name);
    if (kind === 'token' && outer.fallback === undefined) return { kind: 'token', name };
    if (kind === 'private' && outer.fallback === undefined) {
      if (!declaredPrivates.has(name)) return `private ${name} is read but never declared`;
      const values = (privateValues.get(name) ?? []).toSorted(
        (a, b) =>
          compareStrings(a.selector, b.selector) ||
          compareStrings(a.conditions.join('\n'), b.conditions.join('\n')) ||
          compareStrings(a.value, b.value),
      );
      return { kind: 'private', name, values };
    }
    if (kind === 'hook') return { kind: 'hook', name };
  }
  if (reads.length === 0) return { kind: 'literal', value: printed };
  const tokens = [...new Set(reads.map((read) => read.name).filter((n) => kindOf(n) === 'token'))];
  return { kind: 'expression', value: printed, tokens: tokens.toSorted(compareStrings) };
}

/**
 * The `/** … *\/` doc comment written directly above the first declaration that reads `hook` in the
 * source stylesheet: on its own line(s), between the previous statement and the declaration, with no
 * blank line before the declaration. Undefined when there is none. A plain `/* … *\/` comment is a
 * note for maintainers (Figma measurements, plan references) and is never published, the same split
 * as JSDoc in TypeScript.
 */
export function hookDescription(source: string, hook: string): string | undefined {
  const comments: [number, number][] = [];
  for (const match of source.matchAll(/\/\*[\s\S]*?\*\//g)) {
    comments.push([match.index, match.index + match[0].length]);
  }
  const inComment = (index: number) => comments.some(([from, to]) => index >= from && index < to);
  const read = new RegExp(`var\\(\\s*${hook.replace(/[-]/g, '\\-')}\\s*[,)]`, 'g');
  let first: number | undefined;
  for (const match of source.matchAll(read)) {
    if (!inComment(match.index)) {
      first = match.index;
      break;
    }
  }
  if (first === undefined) return undefined;
  // The previous statement ends at the last `;`, `{` or `}` outside a comment.
  let start = 0;
  for (let index = first - 1; index >= 0; index -= 1) {
    const char = source[index];
    if ((char === ';' || char === '{' || char === '}') && !inComment(index)) {
      start = index + 1;
      break;
    }
  }
  const lead = comments.filter(([from, to]) => from >= start && to <= first);
  const last = lead.at(-1);
  if (last === undefined) return undefined;
  // `/**/` is an empty plain comment, not a doc comment
  if (!source.startsWith('/**', last[0]) || last[1] - last[0] < 5) return undefined;
  const between = source.slice(last[1], first);
  // the declaration starts after the comment and white space only, on the next line
  if (!/^[ \t]*\n[ \t]*[\w-]+\s*:/.test(between)) return undefined;
  const lineStart = source.lastIndexOf('\n', last[0] - 1) + 1;
  if (source.slice(lineStart, last[0]).trim() !== '') return undefined;
  const body = source
    .slice(last[0] + 3, last[1] - 2)
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, ''))
    .join('\n');
  const description = normalizeText(body);
  return description === '' ? undefined : description;
}
