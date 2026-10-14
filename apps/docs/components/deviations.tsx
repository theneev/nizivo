// The "Deviations from Figma" tables (ARCHITECTURE.md §18.2), each read from the file that owns it
// (lib/deviations.ts). The only hand-typed text is the builder's answers (lib/builder-choices.ts),
// and the build checks each against the stylesheet that ships it.
import type { JSX } from 'react';
import {
  builderDecision,
  builderItems,
  degradations,
  overrides,
  proposals,
  safariStatus,
} from '../lib/deviations';
import { builderChoice } from '../lib/builder-choices';
import { catalog } from '../lib/catalog';
import { repoFileUrl } from '../lib/repo';
import { InlineMd } from './inline-md';
import { Table } from './table';

function Source({ path }: { path: string }): JSX.Element {
  return (
    <p className="text-sm text-fd-muted-foreground">
      Source: <a href={repoFileUrl(path)}>{path}</a>
    </p>
  );
}

export function OverridesTable(): JSX.Element {
  const rows = overrides();
  return (
    <>
      <p>
        {rows.length} Figma variables are re-pointed in code. Each one expires and must then be
        renewed, dropped, or adopted in Figma.
      </p>
      <Table label="Overrides">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Theme</th>
            <th scope="col">Figma</th>
            <th scope="col">Now</th>
            <th scope="col">Kind</th>
            <th scope="col">Expires</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.token}-${r.theme}`}>
              <th scope="row" className="font-normal">
                <code>{r.token}</code>
              </th>
              <td>{r.theme}</td>
              <td>
                <code>{r.figma}</code>
              </td>
              <td>
                <code>{r.now}</code>
              </td>
              <td>
                {r.kind}
                {r.wcag.length > 0 && (
                  <div className="text-fd-muted-foreground">WCAG {r.wcag.join(', ')}</div>
                )}
              </td>
              <td className="whitespace-nowrap">{r.expires}</td>
              <td>
                <InlineMd text={r.reason} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Source path="packages/tokens/src/code-owned/a11y" />
    </>
  );
}

export function ProposalsTable(): JSX.Element {
  const rows = proposals();
  return (
    <>
      <p>
        {rows.length} tokens and styles that Figma does not have yet. Each one is proposed back to
        design.
      </p>
      <Table label="Proposals">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Figma name to create</th>
            <th scope="col">Value</th>
            <th scope="col">Expires</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.token}>
              <th scope="row" className="font-normal">
                <code>{r.token}</code>
              </th>
              <td>
                <code>{r.figmaName}</code>
              </td>
              <td>
                {r.values.map((v) => (
                  <div key={v.mode}>
                    {v.mode !== '' && <span className="text-fd-muted-foreground">{v.mode}: </span>}
                    <code>{v.value}</code>
                  </div>
                ))}
              </td>
              <td className="whitespace-nowrap">{r.expires}</td>
              <td>
                <InlineMd text={r.reason} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Source path="packages/tokens/src/code-owned" />
    </>
  );
}

export function BuilderChoices(): JSX.Element {
  const di = builderDecision('D-i');
  const { file, items } = builderItems();
  const pages = new Map(catalog().map((e) => [e.title.toLowerCase(), e.url]));
  const plan = 'docs/ARCHITECTURE.md';
  return (
    <>
      <h3 id="d-i">D-i: {<InlineMd text={di.decision} base={plan} />}</h3>
      <p>
        <InlineMd text={di.choice} base={plan} />
      </p>
      <p>
        <strong>Why:</strong> <InlineMd text={di.why} base={plan} />
      </p>
      <p className="text-sm text-fd-muted-foreground">
        Evidence: <InlineMd text={di.evidence} base={plan} />. Source:{' '}
        <a href={repoFileUrl(`${plan}#234-builder-defaults-2026-10-14`)}>{plan} §23.4</a>
      </p>
      <h3 id="builder-decides">Values Figma leaves to the builder</h3>
      <p>
        Where the week 2 Figma facts give no token for a value (off-scale or unspecified), the
        builder chose one. The Figma column is what the facts file records, where <code>!</code>{' '}
        marks a value typed into the Figma file rather than bound to a variable; the Chosen column
        is what the stylesheet ships. Where a CSS hook sets the value, the component name links to
        its hooks.
      </p>
      <Table label="Builder-chosen values">
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col">Property</th>
            <th scope="col">Figma</th>
            <th scope="col">Chosen</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const url = pages.get(it.component.toLowerCase());
            const choice = builderChoice(it.component, it.property);
            return (
              <tr key={`${it.component}-${it.property}-${it.note.slice(0, 24)}`}>
                <th scope="row" className="font-normal">
                  {url ? (
                    <a href={choice.hook === undefined ? url : `${url}#css-hooks`}>
                      {it.component}
                    </a>
                  ) : (
                    it.component
                  )}
                </th>
                <td>{it.property || '–'}</td>
                <td>
                  {it.figma && (
                    <p className="my-0">
                      <InlineMd text={it.figma} base={file} />
                    </p>
                  )}
                  <p className="my-0 text-fd-muted-foreground">
                    <InlineMd text={it.note} base={file} />
                  </p>
                </td>
                <td>
                  <InlineMd text={choice.chosen} />
                  {choice.hook !== undefined && (
                    <div className="text-fd-muted-foreground">
                      Hook: <code>{choice.hook}</code>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <Source path={file} />
    </>
  );
}

export function Degradations(): JSX.Element {
  const list = degradations();
  const safari = safariStatus();
  return (
    <>
      <dl>
        {list.map((d) => (
          <div key={d.id}>
            <dt>
              <strong>{d.id}</strong>
            </dt>
            <dd className="ms-0">
              <InlineMd text={d.text} />
            </dd>
          </div>
        ))}
      </dl>
      <Source path="docs/ARCHITECTURE.md" />
      <p>
        <InlineMd text={safari.text} base={safari.file} />
      </p>
      <Source path={safari.file} />
    </>
  );
}
