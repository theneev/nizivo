// use_figma payload call (read-only): allowlisted text and effect styles.
// Output: the TokensBrücke snapshot `textStyles` and `effectStyles` shapes, copied
// onto plain objects (style objects are live proxies).
const STYLE_ALLOW = /^(Grove|Nizivo)\//;

const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const plain = (value, what) => {
  const copy = JSON.parse(JSON.stringify(value ?? {}));
  if (value && Object.keys(copy).length === 0 && Object.keys(value).length > 0) {
    throw new Error(`empty copy of ${what}`);
  }
  return copy;
};

const textStyles = (await figma.getLocalTextStylesAsync())
  .filter((s) => STYLE_ALLOW.test(s.name))
  .map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    fontName: { family: s.fontName.family, style: s.fontName.style },
    fontSize: s.fontSize,
    letterSpacing: { value: s.letterSpacing.value, unit: s.letterSpacing.unit },
    lineHeight:
      s.lineHeight.unit === 'AUTO'
        ? { unit: 'AUTO' }
        : { value: s.lineHeight.value, unit: s.lineHeight.unit },
    paragraphIndent: s.paragraphIndent,
    paragraphSpacing: s.paragraphSpacing,
    textCase: s.textCase,
    textDecoration: s.textDecoration,
    boundVariables: plain(s.boundVariables, `${s.name} boundVariables`),
  }));

const effectStyles = (await figma.getLocalEffectStylesAsync())
  .filter((s) => STYLE_ALLOW.test(s.name))
  .map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    effects: s.effects.map((e) => {
      const copy = plain(e, `${s.name} effect`);
      if (typeof copy.type !== 'string') throw new Error(`effect without a type in ${s.name}`);
      return copy;
    }),
    boundVariables: plain(s.boundVariables, `${s.name} boundVariables`),
  }));

const textJson = JSON.stringify(textStyles);
const effectJson = JSON.stringify(effectStyles);
return {
  part: 'styles',
  textCount: textStyles.length,
  effectCount: effectStyles.length,
  textHash: fnv1a(textJson),
  effectHash: fnv1a(effectJson),
  length: textJson.length + effectJson.length,
  textStyles,
  effectStyles,
};
