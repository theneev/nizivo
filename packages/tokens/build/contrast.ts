// WCAG 2.2 contrast on the built tokens.css (plan §15.1, §15.4 CI rule 1). The maths is a port of
// docs/research/phase2/scripts/contrast/colorlib.py (relative luminance, sRGB threshold 0.04045);
// the evaluator reads the `:root` declarations of `@layer nz.tokens` and resolves `var()` and
// `light-dark()` for one colour scheme, the way a browser does for an element in that scheme.

export type Scheme = 'light' | 'dark';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
}

const linear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminance({ r, g, b }: Rgba): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** `fg` composited over an opaque `bg`. */
export function over(fg: Rgba, bg: Rgba): Rgba {
  return {
    r: fg.a * fg.r + (1 - fg.a) * bg.r,
    g: fg.a * fg.g + (1 - fg.a) * bg.g,
    b: fg.a * fg.b + (1 - fg.a) * bg.b,
    a: 1,
  };
}

/** WCAG contrast ratio of `fg` on an opaque `bg`; a translucent `fg` is composited first. */
export function contrast(fg: Rgba, bg: Rgba): number {
  if (bg.a < 1) throw new Error('A contrast background must be opaque');
  const [l1, l2] = [luminance(fg.a < 1 ? over(fg, bg) : fg), luminance(bg)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function hex({ r, g, b, a }: Rgba): string {
  const channels = a < 1 ? [r, g, b, a * 255] : [r, g, b];
  return `#${channels.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

export function parseColor(text: string): Rgba {
  const value = text.trim().toLowerCase();
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  if (short) {
    const [r, g, b] = short.slice(1).map((d) => Number.parseInt(d + d, 16));
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: 1 };
  }
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/.exec(value);
  if (long) {
    const [r, g, b, a] = long
      .slice(1)
      .map((d) => (d === undefined ? undefined : Number.parseInt(d, 16)));
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: a === undefined ? 1 : a / 255 };
  }
  const rgb =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+)(%?))?\s*\)$/.exec(value);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
    const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] ? 100 : 1);
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: alpha };
  }
  throw new Error(`Not a colour the contrast check can read: "${text}"`);
}

/** Splits `a, b(c, d), e` at its top-level commas. */
function splitArgs(text: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      args.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  args.push(text.slice(start).trim());
  return args;
}

/** Replaces the first `name(…)` call in `text` using `replace(args)`, or returns undefined. */
function replaceCall(
  text: string,
  name: string,
  replace: (args: string[]) => string,
): string | undefined {
  const match = new RegExp(`(^|[^a-z-])${name}\\(`).exec(text);
  if (!match) return undefined;
  const open = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) {
      return (
        text.slice(0, open - name.length) +
        replace(splitArgs(text.slice(open + 1, i))) +
        text.slice(i + 1)
      );
    }
  }
  throw new Error(`Unbalanced ${name}() in "${text}"`);
}

/** The custom properties declared in the first `:root` block (the base permutation). */
export function rootDeclarations(css: string): Map<string, string> {
  const start = css.indexOf(':root {');
  if (start === -1) throw new Error('tokens.css has no :root block');
  const end = css.indexOf('\n  }', start);
  const declarations = new Map<string, string>();
  for (const match of css.slice(start, end).matchAll(/^\s*(--[a-z0-9-]+):\s*(.+);$/gm)) {
    declarations.set(match[1] ?? '', match[2] ?? '');
  }
  return declarations;
}

/** Resolves `var()` and `light-dark()` in `value` for `scheme`. */
export function evaluate(
  value: string,
  scheme: Scheme,
  variables: Map<string, string>,
  seen: string[] = [],
): string {
  let text = value;
  for (;;) {
    const next =
      replaceCall(text, 'light-dark', ([light = '', dark = '']) =>
        scheme === 'light' ? light : dark,
      ) ??
      replaceCall(text, 'var', ([name = '', fallback]) => {
        if (seen.includes(name)) throw new Error(`Circular var(): ${[...seen, name].join(' → ')}`);
        const declared = variables.get(name);
        if (declared !== undefined) return evaluate(declared, scheme, variables, [...seen, name]);
        if (fallback !== undefined) return fallback;
        throw new Error(`${name} is not declared`);
      });
    if (next === undefined) return text.trim();
    text = next;
  }
}

export function colorOf(name: string, scheme: Scheme, variables: Map<string, string>): Rgba {
  return parseColor(evaluate(`var(${name})`, scheme, variables));
}
