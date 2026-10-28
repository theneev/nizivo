// The body of a generated page: one public subpath of @nizivo/react. Every section is rendered from
// generated data (contracts/api, component.json, the examples); the
// optional notes file (content/components/<name>.mdx) adds prose and the keyboard map.
import type { JSX } from 'react';
import { Heading } from 'fumadocs-ui/components/heading';
import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import { CODE_THEMES } from '../lib/code';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { ReactApiFile, SlotInfo } from '@nizivo/tooling/api/schema';
import type { CatalogEntry } from '../lib/catalog';
import { stylesheetKeys } from '../lib/catalog';
import { cssApi, documentedComponents, importLines, ownExports, reactApi } from '../lib/api';
import { examplesFor } from '../lib/examples';
import { notesFor } from '../lib/notes';
import { partId } from '../lib/outline';
import { repoFileUrl } from '../lib/repo';
import { ComponentDocView, HooksTable, OtherExports, SlotsTable } from './api';
import { Example, type ExampleModule } from './example';
import { BlockMd, InlineMd } from './inline-md';
import { Table } from './table';

type FocusMode = NonNullable<SlotInfo['focusTarget']>;

const FOCUS_TEXT: Record<FocusMode, string> = {
  self: 'draws the focus outline itself on keyboard focus',
  engine: 'draws the focus outline when the engine reports keyboard focus, not on pointer hover',
  'nested-input': 'draws the outline when the hidden input inside it has keyboard focus',
  within: 'draws the outline when the field inside it has focus',
};

/**
 * Focus and forced-colours facts come from the API record's slots (contracts/api, written by `nz api`
 * from component.json), the same source as the Slots table, so the two sections cannot disagree.
 */
function Accessibility({ entry, api }: { entry: CatalogEntry; api: ReactApiFile }): JSX.Element {
  const m = entry.manifest;
  const notes = notesFor(entry.name);
  const interactive = api.slots.filter((s) => s.interactive);
  const indicators = api.slots.flatMap((s) =>
    s.stateIndicator.map((i) => ({ slot: s.slot, ...i })),
  );
  return (
    <>
      <Heading as="h2" id="accessibility">
        Accessibility
      </Heading>
      {interactive.length === 0 ? (
        <p>Nothing in this component takes focus or keyboard input.</p>
      ) : (
        <>
          <p>
            These parts are interactive. Each gets the focus outline and <code>touch-action</code>{' '}
            rule from <code>@nizivo/react/css/base.css</code> (the <code>nz.base</code> layer), so
            the floor survives a restyle:
          </p>
          <ul>
            {interactive.map((s) => (
              <li key={s.slot}>
                <code>{s.slot}</code>: {FOCUS_TEXT[s.focusTarget ?? 'self']}.
              </li>
            ))}
          </ul>
        </>
      )}
      {indicators.length > 0 && (
        <p>
          In forced-colours mode these states keep a visible system colour:{' '}
          {indicators.map((s, i) => (
            <span key={`${s.slot}${s.state ?? ''}`}>
              {i > 0 && ', '}
              <code>
                {s.slot}
                {s.state ?? ''}
              </code>{' '}
              ({s.paint})
            </span>
          ))}
          .
        </p>
      )}
      {m?.tier === 'engine' && (
        <p>
          Behaviour comes from the <code>{m.engine}</code> engine through Nizivo&apos;s adapter:
          focus management, ARIA wiring and keyboard handling are the engine&apos;s.
        </p>
      )}
      {notes?.apg !== undefined && (
        <p>
          Pattern: <a href={notes.apg}>WAI-ARIA Authoring Practices</a>.
        </p>
      )}
      <Heading as="h3" id="keyboard">
        Keyboard
      </Heading>
      {notes?.keyboard && notes.keyboard.length > 0 ? (
        <>
          <Table label="Keyboard">
            <thead>
              <tr>
                <th scope="col">Keys</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {notes.keyboard.map((k) => (
                <tr key={k.keys}>
                  <th scope="row" className="font-normal">
                    {k.keys.split(/,\s*/).map((key, i) => (
                      <span key={key}>
                        {i > 0 && ', '}
                        <kbd>{key}</kbd>
                      </span>
                    ))}
                  </th>
                  <td>{k.action}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {notes.keyboardSource !== undefined && (
            <p className="text-sm text-fd-muted-foreground">
              Source: <InlineMd text={notes.keyboardSource} />
            </p>
          )}
        </>
      ) : interactive.length === 0 ? (
        <p>None.</p>
      ) : (
        <p>To be written.</p>
      )}
    </>
  );
}

const NO_EXAMPLES: ExampleModule = {};

/** The components and parts, by their slot-table label (`Badge`, `Select.Trigger`), that take `render`. */
function renderTakers(comps: ReturnType<typeof documentedComponents>): Set<string> {
  const out = new Set<string>();
  for (const c of comps) {
    if (c.kind === 'component' && c.render !== undefined) out.add(c.name);
    if (c.kind === 'namespace') {
      for (const p of c.parts) if (p.render !== undefined) out.add(`${c.name}.${p.name}`);
    }
  }
  return out;
}

export function EntryPage({
  entry,
  examples: module = NO_EXAMPLES,
}: {
  entry: CatalogEntry;
  /** The entry's example module; only component routes pass one (components/component-route.tsx). */
  examples?: ExampleModule;
}): JSX.Element {
  const api = reactApi(entry);
  const css = cssApi(entry);
  const notes = notesFor(entry.name);
  const comps = documentedComponents(api);
  const standalone = comps.filter((c) => c.kind === 'component');
  const namespaces = comps.filter((c) => c.kind === 'namespace');
  const examples = examplesFor(entry.name);
  // The stylesheets this component needs first (its manifest's cssDeps that ship as files).
  const sheets = stylesheetKeys();
  const deps = (api.component?.cssDeps ?? []).filter((d) => sheets.has(`./css/${d}.css`));
  const code = [
    ...importLines(api, entry.specifier),
    ...(css
      ? [
          '',
          '// Once per app (Getting started), after',
          `// @nizivo/tokens/tokens.css${deps.map((d) => ` and @nizivo/react/css/${d}.css`).join('')}`,
          `import '@nizivo/react/${css.entry.slice(2)}';`,
        ]
      : []),
  ].join('\n');
  const Notes = notes?.body;
  const clientExports = ownExports(api).filter(
    (e) =>
      (e.kind === 'component' || e.kind === 'function' || e.kind === 'hook') &&
      'client' in e &&
      e.client,
  );
  return (
    <>
      <p className="nz-docs-meta">
        {entry.manifest?.tier === 'engine' && (
          <>
            <span className="nz-docs-flag" data-kind="client">
              Client component
            </span>
            <span className="nz-docs-flag">Engine: {entry.manifest.engine ?? ''}</span>
          </>
        )}
        {entry.manifest && entry.manifest.tier !== 'engine' && (
          <span
            className="nz-docs-flag"
            data-kind={entry.manifest.tier === 'server' ? 'server' : undefined}
          >
            {entry.manifest.tier === 'server'
              ? clientExports.length > 0
                ? `Server component with client leaf ${clientExports.map((e) => e.name).join(', ')}`
                : 'Server component, no client JS'
              : `Tier: ${entry.manifest.tier}`}
          </span>
        )}
        {entry.manifest?.status === 'unstable' && <span className="nz-docs-flag">Unstable</span>}
      </p>
      {entry.kind === 'component' && (
        <>
          <Heading as="h2" id="examples">
            Examples
          </Heading>
          {examples.length === 0 ? (
            <p>No example yet.</p>
          ) : (
            examples.map((e) => (
              <Example key={e.export} name={entry.name} module={module} example={e} />
            ))
          )}
        </>
      )}
      <Heading as="h2" id="import">
        Import
      </Heading>
      <ServerCodeBlock themes={CODE_THEMES} code={code} lang="tsx" />
      {Notes && <Notes components={defaultMdxComponents} />}
      {standalone.length > 0 && (
        <>
          <Heading as="h2" id="props">
            Props
          </Heading>
          {standalone.map((c) => (
            <section key={c.name}>
              {standalone.length > 1 && (
                <Heading as="h3" id={partId(c)}>
                  {c.name}
                </Heading>
              )}
              {c.description !== undefined && <BlockMd text={c.description} />}
              <ComponentDocView doc={c} name={c.name} />
            </section>
          ))}
        </>
      )}
      {namespaces.map((ns) => (
        <section key={ns.name}>
          <Heading as="h2" id="parts">
            Parts
          </Heading>
          <p>
            Use the parts through the namespace (
            <code>{`${ns.name}.${ns.parts[0]?.name ?? 'Root'}`}</code>) or by their flat names (
            <code>{ns.parts[0]?.flatName}</code>); both work from Server Components.
          </p>
          {ns.parts.map((p) => (
            <section key={p.name}>
              <Heading as="h3" id={partId(p, ns.name)}>
                {`${ns.name}.${p.name}`}
              </Heading>
              {p.description !== undefined && <BlockMd text={p.description} />}
              <ComponentDocView doc={p} name={`${ns.name}.${p.name}`} />
            </section>
          ))}
        </section>
      ))}
      {ownExports(api).some((e) => !['component', 'namespace', 'part'].includes(e.kind)) && (
        <>
          <Heading as="h2" id="exports">
            {entry.kind === 'component' ? 'Other exports' : 'Exports'}
          </Heading>
          <OtherExports exports={ownExports(api)} />
        </>
      )}
      {(entry.kind === 'component' || api.slots.length > 0) && (
        <>
          <Heading as="h2" id="slots">
            Data attributes and slots
          </Heading>
          <p>
            Style parts by class (<code>.nz-&lt;slot&gt;</code>) and state by data attribute.
            Attribute meanings come from{' '}
            <a href={repoFileUrl('contracts/vocabulary.json')}>contracts/vocabulary.json</a>.
          </p>
          <SlotsTable slots={api.slots} renders={renderTakers(comps)} />
        </>
      )}
      {css && (
        <>
          <Heading as="h2" id="css-hooks">
            CSS hooks
          </Heading>
          <p>
            Set a hook on the component&apos;s class or any ancestor to restyle it without
            specificity games; leave it unset for the default shown.
          </p>
          <HooksTable css={css} />
        </>
      )}
      {entry.kind === 'component' && <Accessibility entry={entry} api={api} />}
    </>
  );
}
