// Every /docs page except the component, charts part and pattern pages: the hand-written MDX pages
// (the charts and patterns overviews included) and the generated pages of the utility entries
// (config, contracts, augment). Components have one route each under app/docs/(generated)/components,
// each charts part one under app/docs/(generated)/charts and each pattern one under
// app/docs/(generated)/patterns (scripts/generate.ts), so that each page bundles only
// the client modules its own examples use. All of them are Server Components, prerendered by the
// static export.
import type { Metadata } from 'next';
import type { JSX } from 'react';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { EntryPage } from '../../../components/entry-page';
import { InlineMd } from '../../../components/inline-md';
import { mdxComponents } from '../../../components/mdx';
import { hasChartsRoute } from '../../../lib/charts-api';
import { hasPatternRoute } from '../../../lib/patterns';
import { plainText } from '../../../lib/markdown';
import { outline } from '../../../lib/outline';
import { source, type DocsPage as SourcePage } from '../../../lib/source';

interface Props {
  params: Promise<{ slug?: string[] }>;
}

/** A component, charts part or pattern page, which its own generated route renders instead. */
function hasOwnRoute(page: SourcePage): boolean {
  return (
    (page.type === 'generated' && page.data.entry.kind === 'component') ||
    hasChartsRoute(page.slugs) ||
    hasPatternRoute(page.slugs)
  );
}

export default async function Page({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page || hasOwnRoute(page)) notFound();

  if (page.type === 'generated') {
    const data = page.data;
    const { toc } = outline(data.entry);
    return (
      <DocsPage toc={toc} tabIndex={-1}>
        <DocsTitle>{data.title}</DocsTitle>
        <DocsDescription>
          {data.description === undefined ? null : <InlineMd text={data.description} />}
        </DocsDescription>
        <DocsBody>
          <EntryPage entry={data.entry} />
        </DocsBody>
      </DocsPage>
    );
  }

  const data = page.data;
  const Mdx = data.body;
  return (
    <DocsPage toc={data.toc} full={data.full ?? false} tabIndex={-1}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>
        {data.description === undefined ? null : <InlineMd text={data.description} />}
      </DocsDescription>
      <DocsBody>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams(): { slug?: string[] }[] {
  const own = new Set(
    source
      .getPages()
      .filter(hasOwnRoute)
      .map((p) => p.slugs.join('/')),
  );
  return source.generateParams().filter((p) => !own.has((p.slug ?? []).join('/')));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const { description } = page.data;
  return {
    title: page.data.title,
    ...(description === undefined ? {} : { description: plainText(description) }),
  };
}
