// The page source: the hand-written MDX pages (content/docs) plus one generated page per public
// subpath of @nizivo/react (lib/catalog.ts). Adding a subpath to the exports map adds its page.
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { loader, type InferPageType } from 'fumadocs-core/source';
import type { MetaData, PageData, VirtualFile } from 'fumadocs-core/source';
import { docs } from '../.source/server';
import { catalog, type CatalogEntry } from './catalog';
import { plainText } from './markdown';
import { allNotes } from './notes';
import { outline } from './outline';

export interface GeneratedPageData extends PageData {
  title: string;
  description: string;
  /** The catalog entry the page documents. */
  entry: CatalogEntry;
  structuredData: StructuredData;
}

function generatedFiles(): VirtualFile<{ pageData: GeneratedPageData; metaData: MetaData }>[] {
  const entries = catalog();
  const components = entries.filter((e) => e.kind === 'component');
  const utilities = entries.filter((e) => e.kind === 'utility');
  for (const n of allNotes()) {
    const name = n.info.path.replace(/\.mdx$/, '');
    if (!components.some((c) => c.name === name)) {
      throw new Error(
        `docs: content/components/${n.info.path} has no public component subpath '${name}'.`,
      );
    }
  }
  const files: VirtualFile<{ pageData: GeneratedPageData; metaData: MetaData }>[] = [
    {
      type: 'meta',
      path: 'components/meta.json',
      data: { title: 'Components', pages: ['index', ...components.map((c) => c.name)] },
    },
    {
      type: 'meta',
      path: 'utilities/meta.json',
      data: { title: 'Utilities', pages: utilities.map((c) => c.name) },
    },
  ];
  for (const entry of entries) {
    const o = outline(entry);
    files.push({
      type: 'page',
      path: `${entry.kind === 'component' ? 'components' : 'utilities'}/${entry.name}.mdx`,
      data: { title: o.title, description: o.description, entry, structuredData: o.structuredData },
    });
  }
  return files;
}

export const source = loader({
  baseUrl: '/docs',
  source: {
    mdx: docs.toFumadocsSource(),
    generated: { files: generatedFiles() },
  },
  plugins: [
    {
      // Descriptions are inline Markdown, rendered on each page; the sidebar and the previous and
      // next cards print the page tree's text as is, so they get it plain.
      name: 'nizivo:plain-descriptions',
      transformPageTree: {
        file(node) {
          if (typeof node.description === 'string') node.description = plainText(node.description);
          return node;
        },
      },
    },
  ],
});

export type DocsPage = InferPageType<typeof source>;
