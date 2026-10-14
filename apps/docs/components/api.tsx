// The generated reference tables: props, parts, slots and data attributes, CSS hooks and the other
// exports of an entry, all rendered from contracts/api (packages/tooling/api/schema.ts).
import type {
  ComponentDoc,
  CssApiFile,
  CssFallback,
  CssHookDoc,
  InheritedProps,
  MemberDoc,
  RenderDoc,
  SlotInfo,
} from '@nizivo/tooling/api/schema';
import type { JSX, ReactNode } from 'react';
import type { OwnExport } from '../lib/api';
import { repoFileUrl } from '../lib/repo';
import { BlockMd, InlineMd } from './inline-md';
import { Table } from './table';

function Code({ children }: { children: ReactNode }): JSX.Element {
  return <code>{children}</code>;
}

function Values({ values }: { values: MemberDoc['values'] }): JSX.Element | null {
  if (!values || values.length === 0) return null;
  return (
    <span className="nz-docs-values">
      {values.map((v, i) => (
        <span key={String(v)}>
          {i > 0 && <span aria-hidden="true"> | </span>}
          <Code>{JSON.stringify(v)}</Code>
        </span>
      ))}
    </span>
  );
}

function TypeCell({ m }: { m: MemberDoc }): JSX.Element {
  return (
    <>
      <Code>{m.type}</Code>
      {m.values &&
        m.values.length > 0 &&
        m.type !== m.values.map((v) => JSON.stringify(v)).join(' | ') && (
          <div className="mt-1">
            <Values values={m.values} />
          </div>
        )}
    </>
  );
}

export function MembersTable({
  members,
  label,
}: {
  members: MemberDoc[];
  label: string;
}): JSX.Element {
  if (members.length === 0) return <p>None.</p>;
  return (
    <Table label={label}>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Type</th>
          <th scope="col">Default</th>
          <th scope="col">Description</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.name}>
            <th scope="row" className="whitespace-nowrap font-normal">
              <Code>{m.name}</Code>
              {m.required && <span className="nz-docs-flag">required</span>}
            </th>
            <td>
              <TypeCell m={m} />
            </td>
            <td>
              {m.default !== undefined ? (
                <Code>{m.default}</Code>
              ) : (
                <span aria-label="none">–</span>
              )}
            </td>
            <td>
              {m.deprecated !== undefined && (
                <p>
                  <strong>Deprecated.</strong>{' '}
                  {typeof m.deprecated === 'string' && <InlineMd text={m.deprecated} />}
                </p>
              )}
              {m.description !== undefined && <BlockMd text={m.description} />}
              {m.inheritedFrom !== undefined && (
                <p className="text-fd-muted-foreground">
                  From <Code>{m.inheritedFrom}</Code>.
                </p>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function Inherits({ inherits }: { inherits: InheritedProps[] }): JSX.Element | null {
  if (inherits.length === 0) return null;
  return (
    <ul>
      {inherits.map((i) => (
        <li key={i.text}>
          {i.element !== undefined ? (
            <>
              Also takes every attribute of{' '}
              <a
                href={`https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/${i.element}`}
              >
                <Code>{`<${i.element}>`}</Code>
              </a>
            </>
          ) : (
            <>
              Also takes <Code>{i.base}</Code>
            </>
          )}
          {i.omitted.length > 0 && (
            <>
              {' '}
              except{' '}
              {i.omitted.map((o, n) => (
                <span key={o}>
                  {n > 0 && ', '}
                  <Code>{o}</Code>
                </span>
              ))}
            </>
          )}
          {i.overridden.length > 0 && (
            <>
              ;{' '}
              {i.overridden.map((o, n) => (
                <span key={o}>
                  {n > 0 && ', '}
                  <Code>{o}</Code>
                </span>
              ))}{' '}
              {i.overridden.length === 1 ? 'is' : 'are'} redeclared above
            </>
          )}
          .{' '}
          <span className="text-fd-muted-foreground">
            (<Code>{i.text}</Code>)
          </span>
        </li>
      ))}
    </ul>
  );
}

function RenderState({ render, name }: { render: RenderDoc; name: string }): JSX.Element {
  return (
    <>
      <p>
        <Code>render</Code> takes an element, or, in client code, a function of the props and{' '}
        {render.stateType !== undefined ? (
          <>
            this state (<Code>{render.stateType}</Code>):
          </>
        ) : (
          'no state.'
        )}
      </p>
      {render.state.length > 0 && (
        <MembersTable members={render.state} label={`${name} render state`} />
      )}
    </>
  );
}

function Tier({ client }: { client: boolean }): JSX.Element {
  return client ? (
    <span className="nz-docs-flag" data-kind="client">
      Client component
    </span>
  ) : (
    <span className="nz-docs-flag" data-kind="server">
      Server component
    </span>
  );
}

/** One component's (or one part's) API: what it renders, its props, inherited attributes, render state. */
export function ComponentDocView({ doc, name }: { doc: ComponentDoc; name: string }): JSX.Element {
  return (
    <>
      <p>
        <Tier client={doc.client} />{' '}
        {doc.slot !== undefined ? (
          <>
            Renders <Code>{`data-slot="${doc.slot}"`}</Code> with the class{' '}
            <Code>{`nz-${doc.slot}`}</Code>.
          </>
        ) : (
          <>Renders no element of its own.</>
        )}{' '}
        Props: <Code>{doc.propsType}</Code>. Source:{' '}
        <a href={repoFileUrl(doc.source)}>
          <Code>{doc.source.replace('packages/react/', '')}</Code>
        </a>
        .
      </p>
      <MembersTable members={doc.props} label={`${name} props`} />
      <Inherits inherits={doc.inherits} />
      {doc.render !== undefined && <RenderState render={doc.render} name={name} />}
    </>
  );
}

/**
 * `renders`: the components and parts (`Badge`, `Select.Trigger`) that take `render`. A slot's
 * `part` flag only says the element is a component's root; `Select.Root` and the engine-owned
 * popups are roots that take no `render` (ARCHITECTURE.md §8.2, "Which parts take `render`").
 */
export function SlotsTable({
  slots,
  renders,
}: {
  slots: SlotInfo[];
  renders: ReadonlySet<string>;
}): JSX.Element {
  if (slots.length === 0)
    return (
      <p>
        This entry renders no element with a <Code>data-slot</Code>.
      </p>
    );
  return (
    <Table label="Slots and data attributes">
      <thead>
        <tr>
          <th scope="col">Slot</th>
          <th scope="col">Rendered by</th>
          <th scope="col">Data attributes</th>
        </tr>
      </thead>
      <tbody>
        {slots.map((s) => (
          <tr key={s.slot}>
            <th scope="row" className="font-normal">
              <Code>{s.slot}</Code>
              <div className="text-fd-muted-foreground">
                <Code>{`.nz-${s.slot}`}</Code>
              </div>
            </th>
            <td>
              <Code>{s.renderedBy}</Code>
              <div className="text-fd-muted-foreground">
                {!s.part
                  ? 'inner element (CSS only)'
                  : renders.has(s.renderedBy)
                    ? 'root (takes render)'
                    : 'root (no render)'}
                {s.interactive && `; interactive, focus: ${s.focusTarget ?? 'self'}`}
                {s.stateIndicator.length > 0 &&
                  `; forced colours: ${s.stateIndicator
                    .map((i) => (i.state === undefined ? i.paint : `${i.paint} on ${i.state}`))
                    .join(', ')}`}
              </div>
            </td>
            <td>
              {s.attributes.length === 0 ? (
                <span className="text-fd-muted-foreground">none</span>
              ) : (
                <ul className="my-0">
                  {s.attributes.map((a) => (
                    <li key={a.name} className="my-0">
                      <Code>{a.name}</Code>
                      {a.presence ? (
                        <span className="text-fd-muted-foreground"> (present or absent)</span>
                      ) : (
                        a.values !== undefined && (
                          <>
                            : <Values values={a.values} />
                          </>
                        )
                      )}
                      {a.prop !== undefined && (
                        <span className="text-fd-muted-foreground">
                          {' '}
                          ← <Code>{a.prop}</Code>
                        </span>
                      )}
                      <div className="text-fd-muted-foreground">{a.meaning}</div>
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function whenText(when: Record<string, string>): string {
  const keys = Object.entries(when);
  if (keys.length === 0) return 'default';
  return keys.map(([k, v]) => (v === '' ? k : `${k}="${v}"`)).join(' ');
}

function Fallback({ fallback }: { fallback: CssFallback }): JSX.Element {
  switch (fallback.kind) {
    case 'token':
      return <Code>{fallback.name}</Code>;
    case 'hook':
      return (
        <>
          <Code>{fallback.name}</Code>{' '}
          <span className="text-fd-muted-foreground">(deprecated alias)</span>
        </>
      );
    case 'literal':
      return <Code>{fallback.value}</Code>;
    case 'expression':
      return <Code>{fallback.value}</Code>;
    case 'private':
      return (
        <ul className="my-0">
          {fallback.values.map((v) => (
            <li key={`${v.selector}${v.conditions.join()}`} className="my-0">
              <span className="text-fd-muted-foreground">{whenText(v.when)}</span>
              {v.conditions.length > 0 && (
                <span className="text-fd-muted-foreground"> {v.conditions.join(' ')}</span>
              )}
              : <Code>{v.value}</Code>
            </li>
          ))}
        </ul>
      );
    default: {
      const unknown: never = fallback;
      return unknown;
    }
  }
}

function Reads({ hook }: { hook: CssHookDoc }): JSX.Element {
  return (
    <ul className="my-0">
      {hook.reads.map((r) => (
        <li key={`${r.selector}|${r.property}|${r.conditions.join()}`} className="my-0">
          <Code>{r.property}</Code> on{' '}
          <span className="nz-docs-break">
            <Code>{r.selector}</Code>
          </span>
          {r.conditions.length > 0 && (
            <span className="text-fd-muted-foreground"> {r.conditions.join(' ')}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function HooksTable({ css }: { css: CssApiFile }): JSX.Element {
  return (
    <>
      {css.hooks.length === 0 ? (
        <p>This stylesheet reads no public hook.</p>
      ) : (
        <Table label="CSS hooks">
          <thead>
            <tr>
              <th scope="col">Hook</th>
              <th scope="col">Default</th>
              <th scope="col">Read as</th>
            </tr>
          </thead>
          <tbody>
            {css.hooks.map((h) => (
              <tr key={h.name}>
                <th scope="row" className="font-normal">
                  <Code>{h.name}</Code>
                  {h.description !== undefined && (
                    <div className="text-fd-muted-foreground">
                      <InlineMd text={h.description} />
                    </div>
                  )}
                </th>
                <td>
                  <Fallback fallback={h.fallback} />
                </td>
                <td>
                  <Reads hook={h} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p>
        Layers:{' '}
        {css.layers.map((l, i) => (
          <span key={l}>
            {i > 0 && ', '}
            <Code>{l}</Code>
          </span>
        ))}
        . Classes:{' '}
        {css.classes.map((c, i) => (
          <span key={c}>
            {i > 0 && ', '}
            <Code>{`.${c}`}</Code>
          </span>
        ))}
        .
        {css.runtime.length > 0 && (
          <>
            {' '}
            Runtime variables:{' '}
            {css.runtime.map((r, i) => (
              <span key={r}>
                {i > 0 && ', '}
                <Code>{r}</Code>
              </span>
            ))}
            .
          </>
        )}
      </p>
      {css.tokens.length > 0 && (
        <details>
          <summary>Tokens this stylesheet reads ({css.tokens.length})</summary>
          <p>
            {css.tokens.map((t, i) => (
              <span key={t}>
                {i > 0 && ', '}
                <Code>{t}</Code>
              </span>
            ))}
          </p>
        </details>
      )}
    </>
  );
}

/** Types, functions, hooks and constants an entry exports, besides its components. */
export function OtherExports({ exports }: { exports: OwnExport[] }): JSX.Element | null {
  const rest = exports.filter(
    (e) => e.kind !== 'component' && e.kind !== 'namespace' && e.kind !== 'part',
  );
  if (rest.length === 0) return null;
  return (
    <dl>
      {rest.map((e) => (
        <div key={e.name} className="mb-4">
          <dt>
            <Code>{e.name}</Code> <span className="text-fd-muted-foreground">{e.kind}</span>
          </dt>
          <dd className="ms-0">
            <p className="my-1">
              <Code>{e.import}</Code>
            </p>
            {e.description !== undefined && <BlockMd text={e.description} />}
            {e.kind === 'type' && e.text !== undefined && (
              <p className="my-1">
                <Code>{`type ${e.name}${e.typeParameters.length > 0 ? `<${e.typeParameters.join(', ')}>` : ''} = ${e.text}`}</Code>
              </p>
            )}
            {e.kind === 'type' && e.propsOf !== undefined && (
              <p className="my-1 text-fd-muted-foreground">
                The props of <Code>{e.propsOf}</Code>, listed above.
              </p>
            )}
            {e.kind === 'type' && e.stateOf !== undefined && (
              <p className="my-1 text-fd-muted-foreground">
                The render state of <Code>{e.stateOf}</Code>, listed above.
              </p>
            )}
            {e.kind === 'type' && e.members !== undefined && (
              <MembersTable members={e.members} label={`${e.name} members`} />
            )}
            {(e.kind === 'function' || e.kind === 'hook') &&
              e.signatures.map((s) => (
                <p key={s.text} className="my-1">
                  <Code>{s.text}</Code>
                </p>
              ))}
            {e.kind === 'constant' && (
              <p className="my-1">
                <Code>{`const ${e.name}: ${e.type}`}</Code>
              </p>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
