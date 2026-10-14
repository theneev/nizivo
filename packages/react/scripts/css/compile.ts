// The Lightning CSS build of one stylesheet and the guard on what it emits (ARCHITECTURE.md
// §4.1 L3, §8.1, §21.1 exit criterion 3). Pure: no file system, so the tests run it on strings.
import { transform } from 'lightningcss';
import {
  FUNCTIONS,
  OFF_FLOOR_PROPERTIES,
  OFF_FLOOR_PSEUDOS,
  RULES,
  SUPPORTS_GATED_PROPERTIES,
  TARGETS,
  UNMODELLED_PROPERTIES,
  VENDOR_PSEUDO_CLASSES,
  VENDOR_PSEUDO_ELEMENTS,
} from './floor.ts';

export interface CompileOptions {
  /** The canonical layer statement, the line in contracts/layers.css. */
  layerStatement: string;
  /** The layer this stylesheet writes into (`nz.components`; `nz.base` and `nz.utilities` for base.css). */
  layer: string | readonly string[];
  /** `@custom-media` definitions to substitute: custom-media.css from @nizivo/tokens. */
  customMedia?: string | undefined;
}

export interface Compiled {
  /** The emitted file: the canonical layer statement on line 1, then minified CSS. */
  code: string;
  problems: string[];
}

type Json = Record<string, unknown>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Compiles one stylesheet for the floor. Line 1 of the source must be the canonical layer
 * statement; Lightning CSS's minifier would split that statement around the layer block, so the
 * build strips it and writes it back, verbatim, as line 1 of the output.
 */
export function compileCss(source: string, filename: string, options: CompileOptions): Compiled {
  const [first = '', ...rest] = source.split('\n');
  if (first.trim() !== options.layerStatement) {
    return {
      code: '',
      problems: [`line 1 must be the canonical layer statement: ${options.layerStatement} (§8.1)`],
    };
  }
  // Line 1 stays as an empty line so Lightning CSS reports source line numbers.
  const body = `\n${rest.join('\n')}${options.customMedia === undefined ? '' : `\n${options.customMedia}`}`;
  const problems: string[] = [];
  let output: string;
  try {
    const result = transform({
      filename,
      code: encoder.encode(body),
      targets: TARGETS,
      minify: true,
      errorRecovery: true,
      drafts: { customMedia: true },
    });
    for (const warning of result.warnings) {
      problems.push(
        `Lightning CSS could not keep this (line ${warning.loc.line}:${warning.loc.column}): ${warning.message}`,
      );
    }
    output = decoder.decode(result.code);
  } catch (error) {
    const loc = isRecord(error) && isRecord(error.loc) ? error.loc : undefined;
    const at = loc === undefined ? '' : ` (line ${String(loc.line)}:${String(loc.column)})`;
    return { code: '', problems: [`Lightning CSS failed${at}: ${errorMessage(error)}`] };
  }
  const code = `${options.layerStatement}\n${output}\n`;
  // the warnings above already name the source line of anything the output parse would repeat
  const guard = guardCss(code, filename, {
    ...options,
    reportParseWarnings: problems.length === 0,
  });
  return { code, problems: [...problems, ...guard] };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Parses CSS into Lightning CSS's AST (its top-level rules), and returns the parse warnings.
 * Nothing is lowered or minified.
 */
export function parseCss(code: string, filename: string): { rules: unknown[]; warnings: string[] } {
  let rules: unknown[] = [];
  const result = transform({
    filename,
    code: encoder.encode(code),
    errorRecovery: true,
    visitor: {
      StyleSheet(stylesheet) {
        rules = stylesheet.rules;
      },
    },
  });
  return {
    rules,
    warnings: result.warnings.map(
      (warning) => `line ${warning.loc.line}:${warning.loc.column}: ${warning.message}`,
    ),
  };
}

/**
 * The guard on emitted CSS: line 1 is the canonical statement, every other top-level rule is a
 * block of the file's one layer, and nothing is outside what the floor parses or what Lightning CSS
 * understood.
 */
export function guardCss(
  code: string,
  filename: string,
  options: Pick<CompileOptions, 'layerStatement' | 'layer'> & { reportParseWarnings?: boolean },
): string[] {
  const problems: string[] = [];
  if (code.split('\n', 1)[0] !== options.layerStatement) {
    problems.push(`line 1 is not the canonical layer statement: ${options.layerStatement} (§8.1)`);
  }
  if (code.includes('--lightningcss-')) {
    problems.push(
      'Lightning CSS lowered a feature into --lightningcss-* variables (light-dark()?); the floor must get it native (§4.1 L3)',
    );
  }
  const { rules, warnings } = parseCss(code, filename);
  if (options.reportParseWarnings !== false) {
    problems.push(...warnings.map((warning) => `unparsable output, ${warning}`));
  }

  const layers: readonly string[] =
    typeof options.layer === 'string' ? [options.layer] : options.layer;
  const allowed = layers.join(' or @layer ');
  const [statement, ...blocks] = rules;
  if (!isRecord(statement) || statement.type !== 'layer-statement') {
    problems.push('the output does not start with the layer statement (§8.1)');
  }
  for (const rule of blocks) {
    if (!isRecord(rule) || !isRecord(rule.value)) continue;
    const name = list(rule.value.name).map(text).join('.');
    if (rule.type !== 'layer-block') {
      problems.push(`top-level @${String(rule.type)} outside @layer ${allowed} (§8.1)`);
    } else if (!layers.includes(name)) {
      problems.push(`@layer ${name} block: this file writes into @layer ${allowed} only (§8.1)`);
    }
    walkRules(list(rule.value.rules), problems);
  }
  return [...new Set(problems)];
}

/**
 * The gated properties an `@supports` condition tests positively, so its block may use them
 * (`SUPPORTS_GATED_PROPERTIES`). A condition under `not` gates nothing.
 */
function gatedBy(condition: unknown): string[] {
  if (hasType(condition, 'not')) return [];
  const found: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
    } else if (isRecord(node)) {
      if (node.type === 'declaration' && isRecord(node.propertyId)) {
        const name = text(node.propertyId.property);
        if (SUPPORTS_GATED_PROPERTIES.has(name)) found.push(name);
      }
      for (const item of Object.values(node)) if (typeof item === 'object') visit(item);
    }
  };
  visit(condition);
  return found;
}

function walkRules(
  rules: unknown[],
  problems: string[],
  gated: ReadonlySet<string> = new Set(),
): void {
  for (const rule of rules) {
    if (!isRecord(rule) || !isRecord(rule.value)) continue;
    const type = text(rule.type);
    const value = rule.value;
    if (type === 'layer-block' || type === 'layer-statement') {
      problems.push('nested @layer: the canonical statement fixes every layer (§8.1)');
    } else if (!RULES.has(type)) {
      problems.push(`@${type} is outside the browser floor or not allowed in shipped CSS`);
      continue;
    }
    if (type === 'container' && hasType(value.condition, 'style')) {
      problems.push('@container style() queries are outside the browser floor (Firefox 129)');
    }
    if (type === 'style') {
      const selectors = list(value.selectors);
      for (const selector of selectors) checkSelector(selector, problems);
      if (selectors.length > 1 && selectors.some(isVendorSelector)) {
        problems.push(
          'a vendor pseudo-class or pseudo-element needs a rule of its own: other engines drop the whole selector list',
        );
      }
    }
    const declarations = isRecord(value.declarations) ? value.declarations : undefined;
    for (const declaration of [
      ...list(declarations?.declarations),
      ...list(declarations?.importantDeclarations),
    ]) {
      checkDeclaration(declaration, problems, gated);
    }
    for (const keyframe of list(value.keyframes)) {
      if (!isRecord(keyframe) || !isRecord(keyframe.declarations)) continue;
      for (const declaration of list(keyframe.declarations.declarations)) {
        checkDeclaration(declaration, problems, gated);
      }
    }
    const inner = type === 'supports' ? new Set([...gated, ...gatedBy(value.condition)]) : gated;
    walkRules(list(value.rules), problems, inner);
  }
}

/** Whether `value` holds, at any depth, an object whose `type` is `type`. */
function hasType(value: unknown, type: string): boolean {
  if (Array.isArray(value)) return value.some((item) => hasType(item, type));
  if (!isRecord(value)) return false;
  return value.type === type || Object.values(value).some((item) => hasType(item, type));
}

/** A pseudo-class or pseudo-element that one engine parses and the others drop. */
function isVendorPseudo(component: Json): boolean {
  if (component.kind !== 'custom') return false;
  const name = text(component.name);
  return component.type === 'pseudo-element'
    ? VENDOR_PSEUDO_ELEMENTS.has(name)
    : component.type === 'pseudo-class' && VENDOR_PSEUDO_CLASSES.has(name);
}

const isVendorSelector = (selector: unknown): boolean =>
  selectorComponents(selector).some(isVendorPseudo);

function checkSelector(selector: unknown, problems: string[]): void {
  for (const component of selectorComponents(selector)) {
    const type = text(component.type);
    if (type !== 'pseudo-class' && type !== 'pseudo-element') continue;
    const kind = text(component.kind);
    const name = kind === 'custom' || kind === 'custom-function' ? text(component.name) : kind;
    const shown = `${type === 'pseudo-element' ? '::' : ':'}${name}`;
    if (isVendorPseudo(component)) continue;
    if (kind === 'custom' || kind === 'custom-function') {
      problems.push(`${shown} is not a selector the browser floor parses`);
    } else if (OFF_FLOOR_PSEUDOS.has(kind)) {
      problems.push(`${shown} is outside the browser floor`);
    }
  }
}

/** Every component of a selector, with those nested in :is(), :where(), :not(), :has() and `of`. */
export function selectorComponents(selector: unknown): Json[] {
  const found: Json[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
    } else if (isRecord(value)) {
      if (typeof value.type === 'string') found.push(value);
      for (const item of Object.values(value)) if (typeof item === 'object') visit(item);
    }
  };
  visit(selector);
  return found;
}

/** A token list with nothing but white space: `color: ;`, which browsers drop. */
const isBlank = (tokens: unknown): boolean =>
  list(tokens).every(
    (token) => isRecord(token) && isRecord(token.value) && token.value.type === 'white-space',
  );

function checkDeclaration(
  declaration: unknown,
  problems: string[],
  gated: ReadonlySet<string>,
): void {
  if (!isRecord(declaration)) return;
  const property = text(declaration.property);
  const value = declaration.value;
  if (property === 'custom' && isRecord(value)) {
    const name = text(value.name);
    if (!name.startsWith('--')) {
      if (SUPPORTS_GATED_PROPERTIES.has(name)) {
        if (!gated.has(name)) {
          problems.push(
            `"${name}" is outside the browser floor; use it only inside @supports (${name}: …) over a floor fallback`,
          );
        }
      } else if (!UNMODELLED_PROPERTIES.has(name)) {
        problems.push(
          `"${name}" is not a property Lightning CSS knows or the floor list in scripts/css/floor.ts accepts`,
        );
      }
      if (isBlank(value.value)) problems.push(`"${name}" has an empty value`);
    }
  } else if (OFF_FLOOR_PROPERTIES.has(property)) {
    problems.push(`"${property}" is outside the browser floor`);
  } else if (property === 'unparsed' && isRecord(value) && isRecord(value.propertyId)) {
    const name = text(value.propertyId.property);
    if (OFF_FLOOR_PROPERTIES.has(name)) problems.push(`"${name}" is outside the browser floor`);
    if (isBlank(value.value)) problems.push(`"${name}" has an empty value`);
  }
  for (const name of functionNames(value)) {
    if (!FUNCTIONS.has(name.toLowerCase())) {
      problems.push(`${name}() is not a function the browser floor parses`);
    }
  }
}

/** The names of the functions in a declaration value that Lightning CSS kept as tokens. */
function functionNames(value: unknown): string[] {
  const names: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
    } else if (isRecord(node)) {
      if (node.type === 'function' && isRecord(node.value) && typeof node.value.name === 'string') {
        names.push(node.value.name);
      }
      for (const item of Object.values(node)) if (typeof item === 'object') visit(item);
    }
  };
  visit(value);
  return names;
}
