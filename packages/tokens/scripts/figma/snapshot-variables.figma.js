// use_figma payload call (read-only): one allowlisted collection, or a slice of it.
// Set COLLECTION and SLICE per call (see PULL-AGENT.md for the values used); keep each
// return under the ~20 KB cap using the payloadBytes from snapshot-inventory.figma.js.
// Output: the TokensBrücke snapshot `variables` shape, copied onto plain objects.
const COLLECTION = 'Grove Primitives';
const SLICE = [0, 27];

const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const copyValue = (value) => {
  if (value === null || typeof value !== 'object') return value;
  if (value.type === 'VARIABLE_ALIAS') return { type: 'VARIABLE_ALIAS', id: value.id };
  if ('r' in value) return { r: value.r, g: value.g, b: value.b, a: value.a };
  // Composed colours, easing objects and anything newer: plain data, copied as-is.
  const copy = JSON.parse(JSON.stringify(value));
  if (Object.keys(copy).length === 0) throw new Error('empty copy of a variable value');
  return copy;
};

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const collection = collections.find((c) => c.name === COLLECTION);
if (!collection) throw new Error(`collection not found: ${COLLECTION}`);

const ids = collection.variableIds.slice(SLICE[0], SLICE[1]);
const variables = [];
let hidden = 0;
for (const id of ids) {
  // oxlint-disable-next-line no-await-in-loop -- one small read per variable, kept as it was run
  const v = await figma.variables.getVariableByIdAsync(id);
  if (!v) throw new Error(`variable not found: ${id}`);
  if (v.hiddenFromPublishing) hidden++;
  variables.push({
    id: v.id,
    name: v.name,
    variableCollectionId: v.variableCollectionId,
    resolvedType: v.resolvedType,
    description: v.description,
    scopes: [...v.scopes],
    codeSyntax: { ...v.codeSyntax },
    valuesByMode: Object.fromEntries(
      Object.entries(v.valuesByMode).map(([modeId, value]) => [modeId, copyValue(value)]),
    ),
  });
}

const json = JSON.stringify(variables);
return {
  part: `${COLLECTION} [${SLICE[0]}, ${SLICE[1]})`,
  count: variables.length,
  hiddenFromPublishing: hidden,
  length: json.length,
  hash: fnv1a(json),
  variables,
};
