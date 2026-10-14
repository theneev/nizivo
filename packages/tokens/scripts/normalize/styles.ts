// Figma text styles → `typography` tokens and effect styles → `shadow` tokens.
import { isRecord } from '../figma/snapshot.ts';
import { setToken, walkTokens, type Group } from './json.ts';
import { color, percent, pixels, px, rem, round } from './values.ts';

/** TokensBrücke's group names for exported styles. */
export const TYPOGRAPHY_STYLES = 'Typography-styles';
export const EFFECT_STYLES = 'Effect-styles';

/** Style names start `Grove/` or `Nizivo/` (plan §20.3); both map to `nz`. */
const STYLE_PREFIX = /^(?:Grove|Nizivo)$/;

const slug = (segment: string): string => segment.trim().toLowerCase().replace(/\s+/g, '-');

/** `Elevation/1 Card` is `elevation.1` (plan §7.2): a leading number names the step. */
const effectSlug = (segment: string): string => /^(\d+)\s+\S/.exec(segment)?.[1] ?? slug(segment);

/** Text-style properties DTCG `typography` has no field for; only their Figma defaults pass. */
const TEXT_DEFAULTS: Record<string, unknown> = {
  fontStyle: 'normal',
  textDecoration: 'NONE',
  textCase: 'ORIGINAL',
};

function typography(raw: Record<string, unknown>, name: string, where: string): Group {
  const value = raw.$value;
  if (raw.$type !== 'typography' || !isRecord(value)) throw new Error(`${where}: not a text style`);
  for (const [key, expected] of Object.entries(TEXT_DEFAULTS)) {
    if (value[key] !== expected) {
      throw new Error(`${where}: ${key} ${JSON.stringify(value[key])} has no DTCG field yet`);
    }
  }
  for (const key of ['paragraphSpacing', 'paragraphIndent']) {
    if (px(value[key], `${where} ${key}`) !== 0) throw new Error(`${where}: ${key} is not 0`);
  }
  if (typeof value.fontFamily !== 'string' || typeof value.fontWeight !== 'number') {
    throw new Error(`${where}: fontFamily or fontWeight missing`);
  }
  const fontSize = px(value.fontSize, `${where} fontSize`);
  // Figma tracking is a percent of the font size; DTCG allows only px or rem, so it is resolved
  // here and the percent is kept for the `em` output planned in week 2 (§7.2 `--nz-tracking-*`).
  const tracking = round(percent(value.letterSpacing, `${where} letterSpacing`));
  const styleId = isRecord(raw.$extensions) ? raw.$extensions.styleId : undefined;
  const figma: Group = typeof styleId === 'string' ? { styleId } : {};
  figma.name = name;
  figma.letterSpacingPercent = tracking;
  return {
    $type: 'typography',
    $value: {
      fontFamily: value.fontFamily,
      fontSize: rem(fontSize),
      fontWeight: value.fontWeight,
      letterSpacing: rem((fontSize * tracking) / 100),
      lineHeight: round(percent(value.lineHeight, `${where} lineHeight`) / 100),
    },
    ...description(raw),
    $extensions: { 'dev.nizivo.figma': figma },
  };
}

function shadowLayer(raw: unknown, where: string): Group {
  if (!isRecord(raw)) throw new Error(`${where}: not a shadow layer`);
  const layer: Group = {
    color: color(raw.color, where),
    offsetX: pixels(px(raw.offsetX, where)),
    offsetY: pixels(px(raw.offsetY, where)),
    blur: pixels(px(raw.blur, where)),
    spread: pixels(px(raw.spread, where)),
  };
  if (raw.inset === true) layer.inset = true;
  return layer;
}

function description(raw: Record<string, unknown>): Group {
  return typeof raw.$description === 'string' && raw.$description !== ''
    ? { $description: raw.$description }
    : {};
}

/**
 * Converts `Typography-styles` and `Effect-styles`. TokensBrücke exports no id for effect styles,
 * so their identity is the name. A `blur` effect (Surface/Glass) has no DTCG type and is skipped.
 */
export function normalizeStyles(
  kind: typeof TYPOGRAPHY_STYLES | typeof EFFECT_STYLES,
  body: Record<string, unknown>,
  tree: Group,
  source: string,
): string[] {
  const skipped: string[] = [];
  for (const [prefix, group] of Object.entries(body)) {
    if (prefix.startsWith('$') || !isRecord(group)) continue;
    if (!STYLE_PREFIX.test(prefix)) {
      let count = 0;
      walkTokens(group, () => count++);
      skipped.push(`${kind} "${prefix}/*" (${count} styles, not allowlisted)`);
      continue;
    }
    walkTokens(group, (segments, raw) => {
      const name = segments.join('/');
      const where = `${source} ${prefix}/${name}`;
      if (kind === TYPOGRAPHY_STYLES) {
        setToken(tree, ['font', ...segments.map(slug)], typography(raw, name, where), where);
        return;
      }
      if (raw.$type === 'blur') {
        skipped.push(`${kind} "${prefix}/${name}" (blur has no DTCG type)`);
        return;
      }
      if (raw.$type !== 'shadow' || !Array.isArray(raw.$value)) {
        throw new Error(`${where}: unsupported effect ${String(raw.$type)}`);
      }
      const token: Group = {
        $type: 'shadow',
        $value: raw.$value.map((layer, index) => shadowLayer(layer, `${where} [${index}]`)),
        ...description(raw),
        $extensions: { 'dev.nizivo.figma': { name } },
      };
      setToken(tree, segments.map(effectSlug), token, where);
    });
  }
  return skipped;
}
