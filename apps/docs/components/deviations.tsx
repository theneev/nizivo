// The "Deviations from Figma" tables (ARCHITECTURE.md §18.2), each read from the file that owns it
// (lib/deviations.ts). The only hand-typed text is the builder's answers (lib/builder-choices.ts),
// and the build checks each against the stylesheet that ships it.
import type { JSX } from 'react';
import {
  ADOPTED_PREFIX,
  builderDecision,
  builderDefaults,
  builderItems,
  builderItemsW3,
  builderItemsW4,
  type BuilderItemW3,
  degradations,
  overrides,
  proposals,
  safariStatus,
} from '../lib/deviations';
import {
  builderChoice,
  builderChoiceW3,
  builderChoiceW4,
  type BuilderChoiceW3,
} from '../lib/builder-choices';
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
  if (rows.length === 0) {
    return (
      <p>
        None. Every Figma variable is used as Figma defines it: the 14 contrast overrides the code
        carried were adopted in Figma with the same values, and removed from the code on 2026-10-18.
      </p>
    );
  }
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

/** One week's §5 table of a Figma facts file, with what ships for every item. */
function BuilderChoicesWeek({
  week,
  file,
  items,
  choiceFor,
}: {
  week: number;
  file: string;
  items: BuilderItemW3[];
  choiceFor: (n: number) => BuilderChoiceW3;
}): JSX.Element {
  const pages = new Map(catalog().map((e) => [e.title.toLowerCase(), e.url]));
  return (
    <>
      <p>
        The week {week} Figma facts list {items.length} values that are off the scale, have no token
        or are not drawn. The Chosen column is what ships, checked against the file it cites.
      </p>
      <Table label={`Week ${week} builder-chosen values`}>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Component</th>
            <th scope="col">Figma</th>
            <th scope="col">Chosen</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const choice = choiceFor(it.n);
            const first = it.component.split(/,\s*/)[0] ?? '';
            const url = pages.get(first.toLowerCase());
            return (
              <tr key={it.n}>
                <th scope="row" className="font-normal">
                  {it.n}
                </th>
                <td>
                  {url ? (
                    <a href={choice.hook === undefined ? url : `${url}#css-hooks`}>
                      {it.component}
                    </a>
                  ) : (
                    it.component
                  )}
                </td>
                <td>
                  <InlineMd text={it.figma} base={file} />
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

/** Week 3: every §5 item of the forms facts file, with what ships. */
export function BuilderChoicesW3(): JSX.Element {
  const { file, items } = builderItemsW3();
  return <BuilderChoicesWeek week={3} file={file} items={items} choiceFor={builderChoiceW3} />;
}

/** Week 4: every §5 item of the Menu and Tabs facts file, with what ships. */
export function BuilderChoicesW4(): JSX.Element {
  const { file, items } = builderItemsW4();
  return <BuilderChoicesWeek week={4} file={file} items={items} choiceFor={builderChoiceW4} />;
}

/** Every builder default of the plan's §23.4 table, generated from it. */
export function BuilderDefaults(): JSX.Element {
  const rows = builderDefaults();
  const plan = 'docs/ARCHITECTURE.md';
  return (
    <>
      <p>
        The plan's decision log has {rows.length} builder defaults ({rows[0]?.id} to{' '}
        {rows.at(-1)?.id}): questions the plan did not settle, where the builder adopted an answer
        that the maintainer can override. Most are engineering choices rather than Figma values;
        they are listed here so that every choice the builder made is in one place.
      </p>
      <Table label="Builder defaults">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Decision</th>
            <th scope="col">What ships</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const adopted = ADOPTED_PREFIX.exec(r.choice)?.[1];
            return (
              <tr key={r.id}>
                <th scope="row" className="font-normal whitespace-nowrap">
                  {r.id}
                  {adopted !== undefined && (
                    <div className="text-fd-muted-foreground">{adopted}</div>
                  )}
                </th>
                <td>
                  <InlineMd text={r.decision} base={plan} />
                </td>
                <td>
                  <InlineMd text={r.choice.replace(ADOPTED_PREFIX, '')} base={plan} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <p className="text-sm text-fd-muted-foreground">
        Source: <a href={repoFileUrl(`${plan}#234-builder-defaults-2026-10-14`)}>{plan} §23.4</a>
      </p>
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
      {safari.lines.map((line) => (
        <p key={line}>
          <InlineMd text={line} base={safari.file} />
        </p>
      ))}
      <Source path={safari.file} />
    </>
  );
}
