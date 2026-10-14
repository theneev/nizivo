// A live example and its source. The module is the generated copy in .generated/examples, which
// imports the public subpaths, so the preview renders the built package (dist) exactly as an app
// would, and the code under it is what a reader copies. Highlighting runs at build time (Shiki).
// The component's route (app/docs/(generated)/components/<name>/page.tsx) imports the module and
// passes it down, so each page bundles only its own examples' client modules.
import { createElement, type ComponentType, type JSX } from 'react';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { CODE_THEMES } from '../lib/code';
import { Callout } from 'fumadocs-ui/components/callout';
import { Heading } from 'fumadocs-ui/components/heading';
import type { ExampleEntry } from '../lib/examples';
import { exampleId } from '../lib/examples';
import { BlockMd, InlineMd } from './inline-md';

/** The exports of one `.generated/examples/<name>.example.tsx`. */
export type ExampleModule = Readonly<Record<string, unknown>>;

function isComponent(value: unknown): value is ComponentType {
  return typeof value === 'function';
}

/** The example rendered as an element: a module export, so it is the same component every render. */
function preview(name: string, module: ExampleModule, e: ExampleEntry): JSX.Element {
  const comp = module[e.export];
  if (!isComponent(comp)) {
    throw new Error(`docs: .generated/examples/${name}.example.tsx does not export ${e.export}`);
  }
  return createElement(comp);
}

export function Example({
  name,
  module,
  example,
}: {
  name: string;
  module: ExampleModule;
  example: ExampleEntry;
}): JSX.Element {
  const live = example.live ? preview(name, module, example) : undefined;
  return (
    // Named by its title alone: the heading also holds Fumadocs' "Copy Anchor Link" button.
    <section aria-label={example.title} className="mt-6">
      <Heading as="h3" id={exampleId(example)}>
        {example.title}
      </Heading>
      {example.description !== undefined && <BlockMd text={example.description} />}
      <div className="not-prose nz-docs-example">
        {live ? (
          <div className="nz-docs-preview" data-example={`${name}/${example.export}`}>
            {live}
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
