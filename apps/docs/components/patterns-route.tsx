// The page of one pattern (repo-root patterns/, MIT), rendered by its generated route
// (app/docs/(generated)/patterns/<name>/page.tsx, written by scripts/generate.ts). The route passes
// its own example module, so the page's client bundle holds only the client modules that pattern
// renders, as on the charts pages. The prose is the hand-written MDX page
// content/docs/patterns/<name>.mdx, which writes, without importing anything:
//   <PatternExample name="OrderSummaryExample" />  preview and source of one exported example
//   <PatternStylesheet />                           the pattern's stylesheet, when it has one
import { createElement, type ComponentType, type JSX } from 'react';
import type { Metadata } from 'next';
import type { MDXComponents } from 'mdx/types';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/notebook/page';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { Callout } from 'fumadocs-ui/components/callout';
import { CODE_THEMES } from '../lib/code';
import { plainText } from '../lib/markdown';
import { patternCss, patternExample } from '../lib/patterns';
import { source } from '../lib/source';
import type { ExampleModule } from './example';
import { BlockMd, InlineMd } from './inline-md';
import { mdxComponents } from './mdx';
// @nizivo/charts' stylesheet, for the patterns that compose charts (a pattern imports no CSS of its
// own); it loads on the pattern pages only, as charts-route.tsx loads it on the charts pages.
import './charts.css';
import './patterns.css';

function mdxPage(name: string) {
  const page = source.getPage(['patterns', name]);
  if (page === undefined || page.type === 'generated') {
    throw new Error(`docs: no page content/docs/patterns/${name}.mdx for the pattern '${name}'.`);
  }
  return page;
}

function isComponent(value: unknown): value is ComponentType {
  return typeof value === 'function';
}

/** The patterns components a route hands its MDX page, bound to that pattern and its examples. */
function patternsMdx(name: string, examples: ExampleModule): MDXComponents {
  function PatternExample({
    name: exported,
    title,
  }: {
    /** The exported example function: `OrderSummaryExample`. */
    name: string;
    /** The section's name (the page writes the heading); the example's title by default. */
    title?: string;
  }): JSX.Element {
    const example = patternExample(name, exported);
    const comp = examples[exported];
    if (example.live && !isComponent(comp)) {
      throw new Error(
        `docs: .generated/patterns/examples/${name}.example.tsx does not export ${exported}`,
      );
    }
    return (
      <section aria-label={title ?? example.title} className="mt-2">
        {example.description !== undefined && <BlockMd text={example.description} />}
        <div className="not-prose nz-docs-example">
          {example.live && isComponent(comp) ? (
            <div
              className="nz-docs-preview nz-docs-pattern-preview"
              data-example={`patterns/${name}/${exported}`}
            >
              {createElement(comp)}
            </div>
          ) : (
            <Callout type="info" title="Source only">
              <InlineMd text={example.reason ?? ''} />
            </Callout>
          )}
          <ServerCodeBlock
            themes={CODE_THEMES}
            code={example.code}
            lang="tsx"
            codeblock={{ className: 'nz-docs-example-code' }}
          />
        </div>
      </section>
    );
  }

  function PatternStylesheet(): JSX.Element {
    const css = patternCss(name);
    if (css === undefined) {
      throw new Error(
        `docs: the pattern '${name}' has no stylesheet, patterns/src/${name}/${name}.css.`,
      );
    }
    return (
      <ServerCodeBlock
        themes={CODE_THEMES}
        code={css}
        lang="css"
        codeblock={{ title: `${name}.css` }}
      />
    );
  }

  return { PatternExample, PatternStylesheet };
}

export function PatternsRoute({
  name,
  examples,
}: {
  name: string;
  examples: ExampleModule;
}): JSX.Element {
  const page = mdxPage(name);
  const data = page.data;
  const Mdx = data.body;
  return (
    <DocsPage toc={data.toc} full={data.full ?? false} tabIndex={-1}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>
        {data.description === undefined ? null : <InlineMd text={data.description} />}
      </DocsDescription>
      <DocsBody>
        <Mdx components={{ ...mdxComponents, ...patternsMdx(name, examples) }} />
      </DocsBody>
    </DocsPage>
  );
}

export function patternsMetadata(name: string): Metadata {
  const { title, description } = mdxPage(name).data;
  return { title, ...(description === undefined ? {} : { description: plainText(description) }) };
}
