// The page of one @nizivo/charts part, rendered by its generated route
// (app/docs/(generated)/charts/<part>/page.tsx, written by scripts/generate.ts). The route passes its
// own example module, so the page's client bundle holds only the client modules those examples
// import: AreaChart's ChartInteraction island loads on the AreaChart page alone. The prose is the
// hand-written MDX page content/docs/charts/<part>.mdx, rendered here with the components below, so
// the MDX names its examples and tables without importing anything (an import from an MDX page would
// join the server graph every route shares, .source/server, and ship on every page).
//
// What a charts MDX page writes (no import lines):
//   <ChartImport />                         the import line, from the part's public entry today
//   <ChartExample name="AreaChartExample" /> preview and snippet of one exported example
//   <ChartProps />                          the part's props table (contracts/api/charts)
//   <ChartMembers name="AreaChartLabels" /> the members of an exported interface (labels, options)
//   <ChartCssHooks />                       the part's CSS hooks (contracts/api/charts/css)
//   <ChartOtherExports />                   every other export the part's source declares
//   <ChartsTable label="…">…</ChartsTable>  a focusable scroller around a hand-written table
import { createElement, type ComponentType, type JSX } from 'react';
import type { Metadata } from 'next';
import type { MDXComponents } from 'mdx/types';
import type { InheritedProps, MemberDoc } from '@nizivo/tooling/api/schema';
import { DocsBody, DocsPage } from 'fumadocs-ui/layouts/notebook/page';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { Callout } from './callout';
import { PageHead } from './page-head';
import { CODE_THEMES } from '../lib/code';
import {
  chartsCss,
  chartsEntryKey,
  chartsExample,
  chartsSpecifier,
  findChartsExport,
  partExports,
} from '../lib/charts-api';
import { pascal } from '../lib/catalog';
import { plainText } from '../lib/markdown';
import { repoFileUrl } from '../lib/repo';
import { source } from '../lib/source';
import { HooksTable, MembersTable, OtherExports } from './api';
import { ChartsTable } from './charts-table';
import type { ExampleModule } from './example';
import { BlockMd, InlineMd } from './inline-md';
import { mdxComponents } from './mdx';
import './charts.css';

function mdxPage(part: string) {
  const page = source.getPage(['charts', part]);
  if (page === undefined || page.type === 'generated') {
    throw new Error(
      `docs: no page content/docs/charts/${part}.mdx for the charts route '${part}'.`,
    );
  }
  return page;
}

function isComponent(value: unknown): value is ComponentType {
  return typeof value === 'function';
}

function Code({ children }: { children: string }): JSX.Element {
  return <code>{children}</code>;
}

function codeList(names: readonly string[]): JSX.Element[] {
  return names.map((n, i) => (
    <span key={n}>
      {i > 0 && ', '}
      <Code>{n}</Code>
    </span>
  ));
}

/** React's DOM props a part also takes, one line per base. */
function Inherits({ inherits }: { inherits: InheritedProps[] }): JSX.Element | null {
  if (inherits.length === 0) return null;
  return (
    <ul>
      {inherits.map((i) => (
        <li key={i.text}>
          Also takes every{' '}
          {i.element === undefined ? (
            <Code>{i.base}</Code>
          ) : (
            <a
              href={`https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/${i.element}`}
            >
              <Code>{`<${i.element}>`}</Code>
            </a>
          )}{' '}
          attribute
          {i.omitted.length > 0 && <> except {codeList(i.omitted)}</>}
          {i.overridden.length > 0 && <>; {codeList(i.overridden)} redeclared above</>}.
        </li>
      ))}
    </ul>
  );
}

/** The charts components a route hands its MDX page, bound to that part and its examples. */
function chartsMdx(part: string, examples: ExampleModule): MDXComponents {
  const component = pascal(part);

  function ChartImport({ names }: { names?: string }): JSX.Element {
    const specifier = chartsSpecifier(part);
    if (specifier === undefined) {
      throw new Error(`docs: @nizivo/charts does not export '${part}' yet.`);
    }
    const runtime =
      names ??
      partExports(part)
        .filter((e) => e.kind === 'component')
        .map((e) => e.name)
        .join(', ');
    const barrelOnly = chartsEntryKey(part) === '.';
    return (
      <>
        <ServerCodeBlock
          themes={CODE_THEMES}
          code={`import { ${runtime} } from '${specifier}';`}
          lang="tsx"
        />
        {barrelOnly && (
          <BlockMd
            text={`\`./${part}\` is not in the exports map yet, so the part is imported from the barrel, \`@nizivo/charts\`.`}
          />
        )}
      </>
    );
  }

  function ChartExample({
    name,
    title,
    reason,
  }: {
    /** The exported example function: `AreaChartExample`. */
    name: string;
    /** The section's name (the page writes the heading); the example's title by default. */
    title?: string;
    /** Shows the example as source only, with this reason. */
    reason?: string;
  }): JSX.Element {
    const example = chartsExample(part, name);
    const live = reason === undefined && example.live;
    const comp = examples[name];
    if (live && !isComponent(comp)) {
      throw new Error(
        `docs: .generated/charts/examples/${part}.example.tsx does not export ${name}`,
      );
    }
    return (
      // The page writes the example's heading (`### Basic`), so it is in the table of contents.
      <section aria-label={title ?? example.title} className="mt-2">
        {example.description !== undefined && <BlockMd text={example.description} />}
        <div className="not-prose nz-docs-example">
          {live && isComponent(comp) ? (
            <div className="nz-docs-preview nz-docs-chart-preview" data-example={`${part}/${name}`}>
              {createElement(comp)}
            </div>
          ) : (
            <Callout type="info" title="Source only">
              <InlineMd text={reason ?? example.reason ?? ''} />
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

  function ChartProps({ name = component }: { name?: string }): JSX.Element {
    const doc = findChartsExport(part, name);
    if (doc.kind !== 'component') {
      throw new Error(`docs: ${name} is a ${doc.kind}, not a component (contracts/api/charts).`);
    }
    return (
      <>
        <p>
          {doc.client ? 'Client component' : 'Server component'}. Props:{' '}
          <Code>{doc.propsType}</Code>. Source:{' '}
          <a href={repoFileUrl(doc.source)}>
            <Code>{doc.source.replace('packages/charts/', '')}</Code>
          </a>
          .
        </p>
        <MembersTable members={doc.props} label={`${name} props`} />
        <Inherits inherits={doc.inherits} />
        {doc.render !== undefined && (
          <>
            <p>
              <Code>render</Code> takes an element, or, in client code, a function of the props and{' '}
              {doc.render.stateType === undefined ? (
                'no state.'
              ) : (
                <>
                  this state (<Code>{doc.render.stateType}</Code>):
                </>
              )}
            </p>
            {doc.render.state.length > 0 && (
              <MembersTable members={doc.render.state} label={`${name} render state`} />
            )}
          </>
        )}
      </>
    );
  }

  function ChartMembers({ name }: { name: string }): JSX.Element {
    const doc = findChartsExport(part, name);
    const members: MemberDoc[] | undefined = doc.kind === 'type' ? doc.members : undefined;
    if (members === undefined) {
      throw new Error(`docs: ${name} is not an interface with members (contracts/api/charts).`);
    }
    return <MembersTable members={members} label={`${name} members`} />;
  }

  function ChartCssHooks(): JSX.Element {
    return <HooksTable css={chartsCss(part)} />;
  }

  function ChartOtherExports(): JSX.Element | null {
    return <OtherExports exports={partExports(part)} />;
  }

  return {
    ChartImport,
    ChartExample,
    ChartProps,
    ChartMembers,
    ChartCssHooks,
    ChartOtherExports,
    ChartsTable,
  };
}

export function ChartsRoute({
  part,
  examples,
}: {
  part: string;
  examples: ExampleModule;
}): JSX.Element {
  const page = mdxPage(part);
  const data = page.data;
  const Mdx = data.body;
  return (
    <DocsPage toc={data.toc} full={data.full ?? false} tabIndex={-1}>
      <PageHead url={page.url} title={data.title} description={data.description} />
      <DocsBody>
        <Mdx components={{ ...mdxComponents, ...chartsMdx(part, examples) }} />
      </DocsBody>
    </DocsPage>
  );
}

export function chartsMetadata(part: string): Metadata {
  const { title, description } = mdxPage(part).data;
  return { title, ...(description === undefined ? {} : { description: plainText(description) }) };
}
