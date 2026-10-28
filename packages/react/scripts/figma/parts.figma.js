// use_figma call (read-only): a fingerprint of each unstable part's Figma set, for the promotion
// rule (plan §20: a set unchanged for two sync cycles is a candidate). Set IDS to the
// `figma.canonical` ids printed by `node scripts/figma/promotion.ts ids`. Each node is serialized
// with its whole subtree (instances included, so a change to a component a set uses counts as a
// change to the set) and hashed inside Figma; only the hashes come back. Where the set sits on the
// canvas is left out, and so are node ids.
/* oxlint-disable no-await-in-loop -- one node at a time, in order, as the first snapshot was run */
const IDS = [];

const fnv1a = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

// figma.mixed is a symbol, which JSON.stringify would drop silently.
const plain = (value) =>
  JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === 'symbol' ? 'mixed' : v)) ?? 'null');

const round = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : n);

const FIELDS = [
  'visible',
  'opacity',
  'blendMode',
  'isMask',
  'rotation',
  'layoutMode',
  'layoutWrap',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'counterAxisAlignContent',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'itemSpacing',
  'counterAxisSpacing',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'layoutPositioning',
  'layoutAlign',
  'layoutGrow',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'clipsContent',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'cornerSmoothing',
  'fills',
  'strokes',
  'strokeWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
  'strokeAlign',
  'strokeCap',
  'strokeJoin',
  'dashPattern',
  'effects',
  'fillStyleId',
  'strokeStyleId',
  'effectStyleId',
  'boundVariables',
  'constraints',
  'vectorPaths',
  'arcData',
  'pointCount',
  'innerRadius',
  'booleanOperation',
  'characters',
  'fontName',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'paragraphSpacing',
  'textAlignHorizontal',
  'textAlignVertical',
  'textAutoResize',
  'textCase',
  'textDecoration',
  'textTruncation',
  'maxLines',
  'textStyleId',
  'variantProperties',
  'componentProperties',
  'componentPropertyReferences',
  'description',
];

let nodes = 0;

const describe = async (node, isRoot) => {
  nodes++;
  const out = { type: node.type, name: node.name, w: round(node.width), h: round(node.height) };
  if (!isRoot) {
    out.x = round(node.x);
    out.y = round(node.y);
  }
  for (const field of FIELDS) {
    if (field in node) out[field] = plain(node[field]);
  }
  // Read component properties only from their owner: a set, or a component outside a set.
  if (
    node.type === 'COMPONENT_SET' ||
    (node.type === 'COMPONENT' && node.parent?.type !== 'COMPONENT_SET')
  ) {
    out.componentPropertyDefinitions = plain(node.componentPropertyDefinitions);
  }
  if (node.type === 'TEXT' && node.characters.length > 0) {
    out.segments = plain(
      node.getStyledTextSegments([
        'fontName',
        'fontSize',
        'fills',
        'textStyleId',
        'boundVariables',
      ]),
    );
  }
  if (node.type === 'INSTANCE') {
    const main = await node.getMainComponentAsync();
    out.main = main === null ? null : { key: main.key, name: main.name };
  }
  if ('children' in node) {
    out.children = [];
    for (const child of node.children) out.children.push(await describe(child, false));
  }
  return out;
};

const parts = [];
for (const id of IDS) {
  const node = await figma.getNodeByIdAsync(id);
  if (node === null) {
    parts.push({ id, found: false });
    continue;
  }
  nodes = 0;
  const json = JSON.stringify(await describe(node, true));
  parts.push({
    id,
    found: true,
    type: node.type,
    name: node.name,
    nodes,
    bytes: json.length,
    hash: fnv1a(json),
  });
}

return { part: 'unstable-sets', count: parts.length, check: fnv1a(JSON.stringify(parts)), parts };
