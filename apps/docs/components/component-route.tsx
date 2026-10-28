// The page of one component, rendered by its generated route
// (app/docs/(generated)/components/<name>/page.tsx, written by scripts/generate.ts). The route passes
// its own example module, so the page's client bundle holds only the client modules those examples
// import. Title, description and table of contents come from the same source as search and
// llms-full.txt (lib/source.ts, lib/outline.ts).
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/notebook/page';
import { outline } from '../lib/outline';
import { source, type GeneratedPageData } from '../lib/source';
import { EntryPage } from './entry-page';
import { InlineMd } from './inline-md';
import { plainText } from '../lib/markdown';
import type { ExampleModule } from './example';

function pageData(name: string): GeneratedPageData {
  const page = source.getPage(['components', name]);
  if (page?.type !== 'generated') {
    throw new Error(
      `docs: no generated page for the component '${name}'. Run scripts/generate.ts (the docs build does).`,
    );
  }
  return page.data;
}

export function ComponentRoute({
  name,
  examples,
}: {
  name: string;
  examples: ExampleModule;
}): JSX.Element {
  const data = pageData(name);
  const { toc } = outline(data.entry);
  return (
    <DocsPage toc={toc} tabIndex={-1}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>
        <InlineMd text={data.description} />
      </DocsDescription>
      <DocsBody>
        <EntryPage entry={data.entry} examples={examples} />
      </DocsBody>
    </DocsPage>
  );
}

export function componentMetadata(name: string): Metadata {
  const data = pageData(name);
  return { title: data.title, description: plainText(data.description) };
}
