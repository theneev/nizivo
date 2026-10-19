// A small reader for React's static markup (react-dom/server output), enough for the chart
// conformance suite to ask structural questions ("is there a tab stop inside the plot?") without a
// DOM. React's output is well formed: every element is closed or self-closing (`<path …/>`), the
// HTML void elements stand alone, attribute values are double-quoted and entity-escaped.
export interface Node {
  tag: string;
  attrs: Map<string, string>;
  children: Node[];
  /** The element's own text, concatenated (not its descendants'). */
  text: string;
  parent: Node | undefined;
}

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

function decode(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (entity) => ENTITIES[entity] ?? entity);
}

const TOKEN =
  /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([^\s=>/]+)(?:="([^"]*)")?/g;

/** Parses markup into a root node (tag `#root`) holding the top-level elements. */
export function parse(markup: string): Node {
  const root: Node = { tag: '#root', attrs: new Map(), children: [], text: '', parent: undefined };
  let current = root;
  for (const match of markup.matchAll(TOKEN)) {
    const [, close, open, attributes = '', selfClose, text] = match;
    if (text !== undefined) {
      current.text += decode(text);
    } else if (close !== undefined) {
      if (current.tag !== close) {
        throw new Error(`markup: </${close}> closes <${current.tag}>`);
      }
      current = current.parent ?? root;
    } else if (open !== undefined) {
      const attrs = new Map<string, string>();
      for (const [, name, value] of attributes.matchAll(ATTR)) {
        if (name !== undefined) attrs.set(name, decode(value ?? ''));
      }
      const node: Node = { tag: open, attrs, children: [], text: '', parent: current };
      current.children.push(node);
      if (selfClose !== '/' && !VOID.has(open)) current = node;
    }
  }
  if (current !== root) throw new Error(`markup: <${current.tag}> is never closed`);
  return root;
}

/** Every element under `node` (not `node` itself), in document order. */
export function descendants(node: Node): Node[] {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

/** Elements under `node` that pass `test`. */
export function all(node: Node, test: (n: Node) => boolean): Node[] {
  return descendants(node).filter(test);
}

/** The text of `node` and its descendants. */
export function textOf(node: Node): string {
  return node.text + node.children.map((child) => textOf(child)).join('');
}

export function classes(node: Node): string[] {
  return (node.attrs.get('class') ?? '').split(/\s+/).filter(Boolean);
}

export const bySlot =
  (slot: string) =>
  (node: Node): boolean =>
    node.attrs.get('data-slot') === slot;

export const byClass =
  (name: string) =>
  (node: Node): boolean =>
    classes(node).includes(name);

/** Whether `node` lies inside `ancestor` (or is it). */
export function within(node: Node, ancestor: Node): boolean {
  for (let n: Node | undefined = node; n !== undefined; n = n.parent)
    if (n === ancestor) return true;
  return false;
}

/**
 * A keyboard stop the markup claims: an explicit tabindex of 0 or more, or a natively focusable
 * element (a link with href, a form control, a summary, contenteditable). `tabindex="-1"` is a
 * roving member, not a stop.
 */
export function isTabStop(node: Node): boolean {
  const tabindex = node.attrs.get('tabindex');
  if (tabindex !== undefined) return Number(tabindex) >= 0;
  if (node.attrs.has('disabled')) return false;
  if (node.tag === 'a') return node.attrs.has('href');
  if (node.attrs.get('contenteditable') === 'true' || node.attrs.get('contenteditable') === '') {
    return true;
  }
  return ['button', 'input', 'select', 'textarea', 'summary', 'iframe'].includes(node.tag);
}

/** An element that announces: a live region or an implicitly live role. */
export function isLiveRegion(node: Node): boolean {
  const live = node.attrs.get('aria-live');
  if (live !== undefined && live !== 'off') return true;
  return ['status', 'alert', 'log', 'marquee', 'timer'].includes(node.attrs.get('role') ?? '');
}
