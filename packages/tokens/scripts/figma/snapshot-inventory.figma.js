// use_figma call 1 of the agent snapshot (read-only): inventory of the file.
// Returns the allowlisted collections in TokensBrücke snapshot shape, the names of
// everything the allowlist drops, payload sizes (to pick chunk boundaries under the
// ~20 KB return cap), the alias closure check and the effect-style shapes.
const COLLECTION_ALLOW = /^(Grove|Nizivo) /;
const STYLE_ALLOW = /^(Grove|Nizivo)\//;

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
const paintStyles = await figma.getLocalPaintStylesAsync();
const gridStyles = await figma.getLocalGridStylesAsync();

const kept = collections.filter((c) => COLLECTION_ALLOW.test(c.name));
const keptIds = new Set(kept.map((c) => c.id));
const keptVars = variables.filter((v) => keptIds.has(v.variableCollectionId));
const keptVarIds = new Set(keptVars.map((v) => v.id));

const copyCollection = (c) => {
  const out = {
    id: c.id,
    name: c.name,
    defaultModeId: c.defaultModeId,
    modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    variableIds: [...c.variableIds],
    hiddenFromPublishing: c.hiddenFromPublishing,
  };
  if (c.isExtension) {
    out.isExtension = true;
    out.parentVariableCollectionId = c.parentVariableCollectionId;
    out.rootVariableCollectionId = c.rootVariableCollectionId;
  }
  return out;
};

// The snapshot-variables.figma.js field copy plus hiddenFromPublishing: an upper bound, for sizing only.
const roughVariable = (v) => ({
  id: v.id,
  name: v.name,
  variableCollectionId: v.variableCollectionId,
  resolvedType: v.resolvedType,
  description: v.description,
  hiddenFromPublishing: v.hiddenFromPublishing,
  scopes: [...v.scopes],
  codeSyntax: { ...v.codeSyntax },
  valuesByMode: JSON.parse(JSON.stringify(v.valuesByMode)),
});

const missingAliasTargets = [];
for (const v of keptVars) {
  for (const [modeId, value] of Object.entries(v.valuesByMode)) {
    if (
      value &&
      typeof value === 'object' &&
      value.type === 'VARIABLE_ALIAS' &&
      !keptVarIds.has(value.id)
    ) {
      missingAliasTargets.push({ variable: v.name, modeId, target: value.id });
    }
  }
}

const byCollection = kept.map((c) => {
  const vars = keptVars.filter((v) => v.variableCollectionId === c.id);
  const perMode = Object.fromEntries(
    c.modes.map((m) => [m.name, vars.filter((v) => m.modeId in v.valuesByMode).length]),
  );
  return {
    name: c.name,
    count: vars.length,
    variableIdsCount: c.variableIds.length,
    perMode,
    types: [...new Set(vars.map((v) => v.resolvedType))],
    withWebCodeSyntax: vars.filter((v) => typeof v.codeSyntax.WEB === 'string').length,
    payloadBytes: JSON.stringify(vars.map(roughVariable)).length,
  };
});

const keptText = textStyles.filter((s) => STYLE_ALLOW.test(s.name));
const keptEffect = effectStyles.filter((s) => STYLE_ALLOW.test(s.name));

return {
  file: figma.root.name,
  collections: kept.map(copyCollection),
  byCollection,
  missingAliasTargets,
  textStyles: {
    kept: keptText.length,
    payloadBytes: JSON.stringify(
      keptText.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        fontName: { ...s.fontName },
        fontSize: s.fontSize,
        letterSpacing: { ...s.letterSpacing },
        lineHeight: { ...s.lineHeight },
        paragraphIndent: s.paragraphIndent,
        paragraphSpacing: s.paragraphSpacing,
        textCase: s.textCase,
        textDecoration: s.textDecoration,
        boundVariables: JSON.parse(JSON.stringify(s.boundVariables ?? {})),
      })),
    ).length,
  },
  effectStyles: {
    kept: keptEffect.map((s) => ({ name: s.name, effects: s.effects.map((e) => e.type) })),
  },
  paintStyles: { kept: paintStyles.filter((s) => STYLE_ALLOW.test(s.name)).map((s) => s.name) },
  gridStyles: { kept: gridStyles.filter((s) => STYLE_ALLOW.test(s.name)).map((s) => s.name) },
  dropped: {
    collections: collections.filter((c) => !keptIds.has(c.id)).map((c) => c.name),
    textStyles: textStyles.filter((s) => !STYLE_ALLOW.test(s.name)).map((s) => s.name),
    effectStyles: effectStyles.filter((s) => !STYLE_ALLOW.test(s.name)).map((s) => s.name),
    paintStyles: paintStyles.filter((s) => !STYLE_ALLOW.test(s.name)).map((s) => s.name),
    gridStyles: gridStyles.filter((s) => !STYLE_ALLOW.test(s.name)).map((s) => s.name),
  },
};
