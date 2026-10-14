// The outline of a generated page: its title, one-line description, table of contents, search record
// and Markdown (llms-full.txt). The page component (components/entry-page.tsx) renders the same
// sections from the same data, so the three never disagree.
import type { ComponentDoc, ReactApiFile } from '@nizivo/tooling/api/schema';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { isValidElement, type ReactNode } from 'react';
import type { CatalogEntry } from './catalog';
import { figmaNodes } from './catalog';
import { cssApi, documentedComponents, importLines, ownExports, reactApi } from './api';
import { exampleId, examplesFor } from './examples';
import { plainText } from './markdown';
import { notesFor } from './notes';

export interface Section {
  id: string;
  title: string;
  depth: 2 | 3;
}

export interface Outline {
  title: string;
  description: string;
  sections: Section[];
  toc: TOCItemType[];
  structuredData: StructuredData;
  markdown: string;
}

const plain = plainText;

/** The text of a rendered heading (an MDX table-of-contents title). */
function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((n: ReactNode) => nodeText(n)).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

export function partId(doc: { name: string }, ns?: string): string {
  return `${ns ? `${ns}-` : ''}${doc.name}`.toLowerCase().replaceAll('.', '-');
}

/**
 * The one-line description, as inline Markdown: the notes frontmatter, else the first paragraph of
 * the main export's JSDoc, else a stock line.
 */
function describe(entry: CatalogEntry, api: ReactApiFile): string {
  const notes = notesFor(entry.name);
  if (notes?.description) return notes.description;
  const main = ownExports(api).find((e) => e.name === entry.title);
  const doc = main?.description?.split('\n\n')[0];
  if (doc) return doc;
  return entry.kind === 'component'
    ? `${entry.title}, from ${entry.specifier}.`
    : `The ${entry.specifier} entry.`;
}

function docMarkdown(doc: ComponentDoc): string[] {
  const out = ['| Prop | Type | Default | Description |', '| --- | --- | --- | --- |'];
  for (const m of doc.props) {
    out.push(
      `| \`${m.name}\`${m.required ? ' (required)' : ''} | \`${m.type.replaceAll('|', '\\|')}\` | ${
        m.default !== undefined ? `\`${m.default}\`` : ''
      } | ${plain(m.description ?? '').replaceAll('|', '\\|')} |`,
    );
  }
  for (const i of doc.inherits) {
    out.push(
      '',
      `Also takes ${i.element ? `every <${i.element}> attribute` : i.base}${i.omitted.length > 0 ? ` except ${i.omitted.join(', ')}` : ''}.`,
    );
  }
  return out;
}

export function outline(entry: CatalogEntry): Outline {
  const api = reactApi(entry);
  const css = cssApi(entry);
  const title = entry.title;
  const description = describe(entry, api);
  const notes = notesFor(entry.name);
  const sections: Section[] = [{ id: 'import', title: 'Import', depth: 2 }];
  const contents: StructuredData['contents'] = [
    { heading: undefined, content: plain(description) },
  ];
  const md: string[] = [`# ${title}`, '', description, '', '## Import', '', '```tsx'];
  md.push(...importLines(api, entry.specifier));
  if (css) md.push(`import '@nizivo/react/${css.entry.slice(2)}';`);
  md.push('```', '');
  contents.push({ heading: 'import', content: importLines(api, entry.specifier).join(' ') });

  for (const t of notes?.toc ?? []) {
    sections.push({
      id: t.url.slice(1),
      title: plain(nodeText(t.title)),
      depth: t.depth === 3 ? 3 : 2,
    });
  }
  for (const c of notes?.structuredData.contents ?? []) contents.push(c);

  const examples = examplesFor(entry.name);
  if (entry.kind === 'component') {
    sections.push({ id: 'examples', title: 'Examples', depth: 2 });
    md.push('## Examples', '');
    for (const e of examples) {
      sections.push({ id: exampleId(e), title: e.title, depth: 3 });
      md.push(
        `### ${e.title}`,
        '',
        ...(e.description ? [plain(e.description), ''] : []),
        '```tsx',
        e.code.trimEnd(),
        '```',
        '',
      );
      contents.push({ heading: exampleId(e), content: `${e.title}. ${e.description ?? ''}` });
    }
    if (examples.length === 0) md.push('No example yet.', '');
  }

  const comps = documentedComponents(api);
  const standalone = comps.filter((c) => c.kind === 'component');
  const namespaces = comps.filter((c) => c.kind === 'namespace');
  if (standalone.length > 0) {
    sections.push({ id: 'props', title: 'Props', depth: 2 });
    md.push('## Props', '');
    for (const c of standalone) {
      if (standalone.length > 1) sections.push({ id: partId(c), title: c.name, depth: 3 });
      md.push(`### ${c.name}`, '', ...docMarkdown(c), '');
      contents.push({
        heading: 'props',
        content: `${c.name} props: ${c.props.map((m) => m.name).join(', ')}`,
      });
    }
  }
  for (const ns of namespaces) {
    sections.push({ id: 'parts', title: 'Parts', depth: 2 });
    md.push('## Parts', '');
    for (const p of ns.parts) {
      const id = partId(p, ns.name);
      sections.push({ id, title: `${ns.name}.${p.name}`, depth: 3 });
      md.push(`### ${ns.name}.${p.name}`, '', ...docMarkdown(p), '');
      contents.push({
        heading: id,
        content: `${ns.name}.${p.name} (${p.flatName}) props: ${p.props.map((m) => m.name).join(', ')}`,
      });
    }
  }
  const others = ownExports(api).filter(
    (e) => !['component', 'namespace', 'part'].includes(e.kind),
  );
  if (others.length > 0) {
    sections.push({
      id: 'exports',
      title: entry.kind === 'component' ? 'Other exports' : 'Exports',
      depth: 2,
    });
    md.push(`## ${entry.kind === 'component' ? 'Other exports' : 'Exports'}`, '');
    for (const e of others) {
      md.push(`- \`${e.name}\` (${e.kind})${e.description ? `: ${plain(e.description)}` : ''}`);
      contents.push({
        heading: 'exports',
        content: `${e.name} ${e.kind} ${plain(e.description ?? '')}`,
      });
    }
    md.push('');
  }
  if (entry.kind === 'component' || api.slots.length > 0) {
    sections.push({ id: 'slots', title: 'Data attributes and slots', depth: 2 });
    md.push('## Data attributes and slots', '');
    for (const s of api.slots) {
      md.push(
        `- \`${s.slot}\` (\`.nz-${s.slot}\`, rendered by ${s.renderedBy})${s.attributes.length > 0 ? `: ${s.attributes.map((a) => a.name).join(', ')}` : ''}`,
      );
    }
    contents.push({
      heading: 'slots',
      content: api.slots
        .map((s) => [s.slot, ...s.attributes.map((a) => a.name)].join(' '))
        .join(', '),
    });
    md.push('');
  }
  if (css) {
    sections.push({ id: 'css-hooks', title: 'CSS hooks', depth: 2 });
    md.push('## CSS hooks', '', `Stylesheet: \`@nizivo/react/${css.entry.slice(2)}\`.`, '');
    for (const h of css.hooks) md.push(`- \`${h.name}\``);
    contents.push({ heading: 'css-hooks', content: css.hooks.map((h) => h.name).join(', ') });
    md.push('');
  }
  if (entry.kind === 'component') {
    sections.push({ id: 'accessibility', title: 'Accessibility', depth: 2 });
    sections.push({ id: 'keyboard', title: 'Keyboard', depth: 3 });
    md.push('## Accessibility', '');
    for (const k of notes?.keyboard ?? []) {
      md.push(`- ${k.keys}: ${k.action}`);
      contents.push({ heading: 'accessibility', content: `${k.keys}: ${k.action}` });
    }
    md.push('');
    const figma = figmaNodes(entry.name);
    sections.push({ id: 'figma', title: 'Figma', depth: 2 });
    md.push(
      '## Figma',
      '',
      `Canonical: ${figma.canonical.join(', ') || 'none'}. Ghosts: ${figma.ghosts.join(', ') || 'none'}.`,
      '',
    );
  }

  const toc: TOCItemType[] = sections.map((s) => ({
    title: s.title,
    url: `#${s.id}`,
    depth: s.depth,
  }));
  const structuredData: StructuredData = {
    headings: sections.map((s) => ({ id: s.id, content: s.title })),
    contents,
  };
  return { title, description, sections, toc, structuredData, markdown: md.join('\n') };
}
