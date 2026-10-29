// The site's sections (M90): the header's tabs (Figma's Docs Header 7416:78) and the sidebar's
// scope. No Node import, so the header, a client module, can use it. Each section names the routes
// it covers; a page belongs to the section with the longest matching route (Tokens over
// Foundations). The sidebar shows the current section's pages only: `sectionTree` regroups the
// page tree into one root folder per section, which Fumadocs' notebook layout scopes the sidebar
// and the previous and next cards to. URLs do not change.
import type * as PageTree from 'fumadocs-core/page-tree';

export interface Section {
  label: string;
  href: string;
  covers: readonly string[];
}

export const SECTIONS: readonly Section[] = [
  {
    label: 'Docs',
    href: '/docs/',
    covers: ['/docs/', '/docs/getting-started/', '/docs/guides/', '/docs/icons/'],
  },
  {
    label: 'Components',
    href: '/docs/components/',
    covers: ['/docs/components/', '/docs/dashboard/', '/docs/charts/', '/docs/utilities/'],
  },
  { label: 'Foundations', href: '/docs/foundations/colour/', covers: ['/docs/foundations/'] },
  {
    label: 'Tokens',
    href: '/docs/foundations/tokens/',
    covers: ['/docs/foundations/tokens/', '/docs/foundations/javascript/'],
  },
  { label: 'Patterns', href: '/docs/patterns/', covers: ['/docs/patterns/'] },
  { label: 'Changelog', href: '/docs/changelog/', covers: ['/docs/changelog/'] },
];

/** The section a path belongs to: the one with the longest matching route. */
export function sectionOf(path: string): Section | undefined {
  const withSlash = path.endsWith('/') ? path : `${path}/`;
  let best: { section: Section; length: number } | undefined;
  for (const section of SECTIONS) {
    for (const route of section.covers) {
      const hit = route === '/docs/' ? withSlash === route : withSlash.startsWith(route);
      if (hit && (best === undefined || route.length > best.length)) {
        best = { section, length: route.length };
      }
    }
  }
  return best?.section;
}

/** The first page's URL under a node, to place a folder or a separator. */
function firstUrl(node: PageTree.Node): string | undefined {
  if (node.type === 'page') return node.url;
  if (node.type === 'folder') {
    if (node.index !== undefined) return node.index.url;
    for (const child of node.children) {
      const url = firstUrl(child);
      if (url !== undefined) return url;
    }
  }
  return undefined;
}

/**
 * The page tree as one root folder per section, in the header's order. A separator stays with the
 * section of the first node after it; a node of its group that lands in another section (All
 * tokens, under Foundations in the tree) goes there without it.
 */
export function sectionTree(tree: PageTree.Root): PageTree.Root {
  const groups = new Map<string, PageTree.Node[]>(SECTIONS.map((s) => [s.label, []]));
  let separator: PageTree.Separator | undefined;
  for (const node of tree.children) {
    if (node.type === 'separator') {
      separator = node;
      continue;
    }
    const url = firstUrl(node);
    const label = (url === undefined ? undefined : sectionOf(url))?.label ?? 'Docs';
    const group = groups.get(label) ?? [];
    if (separator !== undefined) group.push(separator);
    separator = undefined;
    group.push(node);
    groups.set(label, group);
  }
  return {
    ...tree,
    children: SECTIONS.map((s): PageTree.Folder => ({
      type: 'folder',
      $id: `section:${s.label}`,
      name: s.label,
      root: true,
      children: groups.get(s.label) ?? [],
    })),
  };
}

/** Two page URLs, with or without the trailing slash. */
function same(a: string, b: string): boolean {
  return a.replace(/\/$/, '') === b.replace(/\/$/, '');
}

/**
 * The group a page sits in, for the eyebrow above its title: the separator or folder over it in its
 * section ("Getting started", "Charts"), else the section's name.
 */
export function groupOf(tree: PageTree.Root, url: string): string | undefined {
  const find = (nodes: readonly PageTree.Node[], name: string | undefined): string | undefined => {
    let label = name;
    for (const node of nodes) {
      if (node.type === 'separator') {
        if (typeof node.name === 'string') label = node.name;
      } else if (node.type === 'page') {
        if (same(node.url, url)) return label;
      } else {
        const folder = typeof node.name === 'string' ? node.name : label;
        if (node.index !== undefined && same(node.index.url, url)) return folder;
        const hit = find(node.children, folder);
        if (hit !== undefined) return hit;
      }
    }
    return undefined;
  };
  return find(tree.children, undefined);
}
