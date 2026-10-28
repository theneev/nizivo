// The resolved token set behind tokens.json and the js-refs entry (plan §5.2, §7.1): every token's
// literal value in every context, read from the same transforms plugin-css prints into tokens.css,
// so the JSON, the JS refs and the CSS agree by construction (plan §15.4).
//
// A value is evaluated from the token's tokens.css declaration: `var(--nz-…)` is replaced by that
// variable's own value in the same context, `light-dark(a, b)` by the theme's side, and an outside
// hook such as `var(--font-geist-sans, "Geist")` by its fallback. The motion and viewport contexts
// read the scoped permutations' declarations, exactly as the cascade does in a browser.
import type { Resolver, TokenNormalized, TokenTransformed } from '@terrazzo/parser';
import { FORMAT_ID } from '@terrazzo/plugin-css';
import {
  BASE_INPUT,
  INVERSE_SCHEME,
  PREFIX,
  currentResolver,
  subValueVariableName,
} from './css.ts';

export type Provenance = 'design' | 'code-owned' | 'override' | 'proposal';

/** A typography value: the `font` shorthand and its parts, as tokens.css declares them. */
export interface TypographyValue {
  font: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

export type Value = string | TypographyValue;

export interface ContextValue {
  value: Value;
  provenance: Provenance;
  aliasOf?: string;
}

export interface ResolvedToken extends ContextValue {
  id: string;
  type: TokenNormalized['$type'];
  /** The custom property tokens.css declares, or null for a token it never emits (§7.2). */
  cssVariable: string | null;
  public: boolean;
  /** A typography token's part variables, keyed like its value. */
  parts?: Record<string, string>;
  customMedia?: string;
  /** Contexts whose entry differs from the default one, per modifier. */
  modes: Record<string, Record<string, ContextValue>>;
  description?: string;
  deprecated?: string | true;
  status?: string;
  design?: { name: string };
}

export interface Modifier {
  contexts: string[];
  default: string;
}

export interface ResolvedSet {
  modifiers: Record<string, Modifier>;
  tokens: ResolvedToken[];
}

type Input = Record<string, string>;
type GetTransforms = (params: { format: string; input: Input }) => TokenTransformed[];

/** The modifier whose contexts tokens.css folds into `light-dark()` rather than a scoped block. */
const THEME = 'theme';
const DARK = 'dark';

/** Part names as plugin-css prints them, in the order of its `font` shorthand. */
const TYPOGRAPHY_PARTS = [
  ['fontFamily', 'font-family'],
  ['fontSize', 'font-size'],
  ['fontWeight', 'font-weight'],
  ['lineHeight', 'line-height'],
  ['letterSpacing', 'letter-spacing'],
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Numeric-aware id order, the same as contract.json's variable order. */
export const compareIds = (a: string, b: string): number =>
  a.localeCompare(b, 'en-US', { numeric: true });

/** The index of the `)` that closes the `(` at `open`. */
function closingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return i;
  }
  throw new Error(`Unbalanced parentheses in "${text}"`);
}

/** Splits a function's arguments at its top-level commas. */
function splitArgs(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && depth === 0) {
      out.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(text.slice(start).trim());
  return out;
}

/**
 * Evaluates `var()` and `light-dark()` in a declaration value against `lookup`, which returns a
 * variable's raw declaration (or undefined when tokens.css does not declare it).
 */
export function evaluate(
  text: string,
  dark: boolean,
  lookup: (name: string) => string | undefined,
  seen: string[] = [],
): string {
  const match = /\b(var|light-dark)\(/.exec(text);
  if (!match) return text;
  const [call, fn] = match;
  const open = match.index + call.length - 1;
  const close = closingParen(text, open);
  const args = splitArgs(text.slice(open + 1, close));
  let replacement: string;
  if (fn === 'light-dark') {
    const [light = '', darkSide = '', ...extra] = args;
    if (extra.length > 0 || !light || !darkSide) {
      throw new Error(`light-dark() takes two values: "${text}"`);
    }
    replacement = evaluate(dark ? darkSide : light, dark, lookup, seen);
  } else {
    const [name = '', ...fallback] = args;
    if (seen.includes(name)) throw new Error(`Circular reference: ${[...seen, name].join(' → ')}`);
    const declared = lookup(name);
    if (declared !== undefined) replacement = evaluate(declared, dark, lookup, [...seen, name]);
    else if (fallback.length > 0) replacement = evaluate(fallback.join(', '), dark, lookup, seen);
    else throw new Error(`${name} is not declared and has no fallback`);
  }
  return evaluate(
    `${text.slice(0, match.index)}${replacement}${text.slice(close + 1)}`,
    dark,
    lookup,
    seen,
  );
}

/** Every custom property a list of transforms declares, with its raw value. */
function declarations(transforms: TokenTransformed[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of transforms) {
    if (!t.localID) continue;
    if (t.type === 'SINGLE_VALUE') out.set(t.localID, t.value);
    else
      for (const [part, value] of Object.entries(t.value))
        out.set(subValueVariableName(t.localID, part), value);
  }
  return out;
}

/** override > proposal > code-owned (incl. generated from the design) > design, from the source markers. */
function provenance(token: TokenNormalized): Provenance {
  const ext = token.$extensions ?? {};
  if ('app.nizivo.override' in ext) return 'override';
  if ('app.nizivo.proposal' in ext) return 'proposal';
  if ('app.nizivo.derived' in ext) return 'code-owned';
  return 'dev.nizivo.figma' in ext ? 'design' : 'code-owned';
}

/** A dimension token tokens.css never declares (breakpoints, frame widths). */
function literal(token: TokenNormalized): string {
  if (token.$type !== 'dimension' || token.aliasOf) {
    throw new Error(`${token.id}: only literal dimensions can be left out of tokens.css`);
  }
  return `${token.$value.value}${token.$value.unit}`;
}

/** The design library's name for the token; its internal ids stay in the sources (M83). */
function designIdentity(token: TokenNormalized): ResolvedToken['design'] {
  const figma = token.$extensions?.['dev.nizivo.figma'];
  if (!isRecord(figma) || typeof figma['name'] !== 'string') return undefined;
  return { name: figma['name'] };
}

const sameEntry = (a: ContextValue, b: ContextValue): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** The modifiers, their contexts and defaults, from the resolver document. */
function modifiers(resolver: Resolver): Record<string, Modifier> {
  const out: Record<string, Modifier> = {};
  for (const [name, modifier] of Object.entries(resolver.source.modifiers ?? {})) {
    const contexts = Object.keys(modifier.contexts);
    const fallback = contexts[0];
    if (fallback === undefined) throw new Error(`Modifier ${name} has no context`);
    out[name] = {
      contexts,
      default: typeof modifier.default === 'string' ? modifier.default : fallback,
    };
  }
  for (const [name, value] of Object.entries(BASE_INPUT)) {
    if (out[name]?.default !== value)
      throw new Error(`BASE_INPUT.${name} is not the resolver default`);
  }
  return out;
}

/**
 * Every token in every context. Contexts are taken one modifier at a time from the defaults; the
 * resolver is orthogonal (each token is set by one modifier at most), which this checks.
 */
export function resolveTokens(getTransforms: GetTransforms): ResolvedSet {
  const resolver = currentResolver();
  if (!resolver.orthogonal) throw new Error('tokens.json assumes an orthogonal resolver');
  const mods = modifiers(resolver);
  const base = getTransforms({ format: FORMAT_ID, input: BASE_INPUT });
  const baseDeclared = declarations(base);
  const byId = new Map(base.map((t) => [t.id, t]));

  /** A context: the resolved token set and the declarations the cascade applies in it. */
  const context = (modifier?: string, name?: string) => {
    const input: Input = modifier && name ? { ...BASE_INPUT, [modifier]: name } : { ...BASE_INPUT };
    const scoped =
      modifier && name && modifier !== THEME
        ? declarations(getTransforms({ format: FORMAT_ID, input: { [modifier]: name } }))
        : new Map<string, string>();
    // A theme scope re-declares the inverse scheme; colours follow it through light-dark().
    const dark = input[THEME] === DARK;
    const scheme: [string, string] = [
      `--${PREFIX}-scheme-inverse`,
      INVERSE_SCHEME[dark ? 'dark' : 'light'],
    ];
    const declared = new Map([...baseDeclared, ...scoped, scheme]);
    return {
      set: resolver.apply(input),
      dark,
      lookup: (variable: string) => declared.get(variable),
    };
  };

  type Context = ReturnType<typeof context>;
  const entry = (id: string, ctx: Context): ContextValue => {
    const token = ctx.set[id];
    if (!token) throw new Error(`${id} is missing from a context`);
    const transform = byId.get(id);
    const localID = transform?.localID;
    let value: Value;
    if (!transform || !localID) value = literal(token);
    else if (transform.type === 'SINGLE_VALUE')
      value = evaluate(`var(${localID})`, ctx.dark, ctx.lookup);
    else {
      const part = (cssPart: string) =>
        evaluate(`var(${subValueVariableName(localID, cssPart)})`, ctx.dark, ctx.lookup);
      const parts = Object.fromEntries(
        TYPOGRAPHY_PARTS.map(([key, cssPart]) => [key, part(cssPart)]),
      );
      const {
        fontFamily = '',
        fontSize = '',
        fontWeight = '',
        lineHeight = '',
        letterSpacing = '',
      } = parts;
      value = {
        font: `${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`,
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing,
      };
    }
    const out: ContextValue = { value, provenance: provenance(token) };
    if (token.aliasOf) out.aliasOf = token.aliasOf;
    return out;
  };

  const defaults = context();
  const others = Object.entries(mods).flatMap(([modifier, { contexts, default: fallback }]) =>
    contexts
      .filter((name) => name !== fallback)
      .map((name) => ({ modifier, name, ctx: context(modifier, name) })),
  );

  const tokens = Object.values(defaults.set)
    .toSorted((a, b) => compareIds(a.id, b.id))
    .map((token): ResolvedToken => {
      const { id } = token;
      const transform = byId.get(id);
      const first = entry(id, defaults);
      const modes: ResolvedToken['modes'] = {};
      for (const { modifier, name, ctx } of others) {
        const other = entry(id, ctx);
        if (!sameEntry(other, first)) (modes[modifier] ??= {})[name] = other;
      }
      if (Object.keys(modes).length > 1) {
        throw new Error(
          `${id} varies along ${Object.keys(modes).join(' and ')}; tokens.json keeps one modifier per token`,
        );
      }
      const isBreakpoint = id.startsWith('breakpoint.');
      const localID = transform?.localID;
      const out: ResolvedToken = {
        id,
        type: token.$type,
        cssVariable: localID ?? null,
        public: localID ? !id.startsWith('color.p.') : isBreakpoint,
        value: first.value,
        provenance: first.provenance,
        modes,
      };
      if (first.aliasOf) out.aliasOf = first.aliasOf;
      if (localID && transform.type === 'MULTI_VALUE') {
        out.parts = Object.fromEntries(
          TYPOGRAPHY_PARTS.map(([key, cssPart]) => [key, subValueVariableName(localID, cssPart)]),
        );
      }
      if (isBreakpoint) out.customMedia = `--${PREFIX}-${id.slice('breakpoint.'.length)}`;
      if (token.$description) out.description = token.$description;
      if (token.$deprecated)
        out.deprecated = token.$deprecated === true ? true : String(token.$deprecated);
      const status = token.$extensions?.['app.nizivo.status'];
      if (typeof status === 'string') out.status = status;
      const design = designIdentity(token);
      if (design) out.design = design;
      return out;
    });
  return { modifiers: mods, tokens };
}
