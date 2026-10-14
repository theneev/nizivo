// The "Tokens in JavaScript" tables, read at build time from the built @nizivo/tokens: the `.` entry
// itself (its named group exports) and dist/tokens.json. Nothing is copied by hand.
import type { JSX } from 'react';
import * as refs from '@nizivo/tokens';
import { isRecord } from '../scripts/json';
import { readRepoJson } from '../lib/repo';
import { Table } from './table';

const BUILD_HINT = 'run `pnpm build` so @nizivo/tokens writes its dist';

function example(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** One row per named export of `@nizivo/tokens`: how many references it holds, and its first one. */
export function JsRefGroups(): JSX.Element {
  const groups = Object.entries(refs as Record<string, unknown>).filter(
    (entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]),
  );
  if (groups.length === 0) throw new Error(`docs: @nizivo/tokens exports no groups; ${BUILD_HINT}`);
  return (
    <Table label="Named exports of @nizivo/tokens">
      <thead>
        <tr>
          <th scope="col">Export</th>
          <th scope="col">Keys</th>
          <th scope="col">First key and value</th>
        </tr>
      </thead>
      <tbody>
        {groups.map(([name, group]) => {
          const [key, value] = Object.entries(group)[0] ?? ['', ''];
          return (
            <tr key={name}>
              <th scope="row" className="font-normal">
                <code>{name}</code>
              </th>
              <td>{Object.keys(group).length}</td>
              <td>
                <code>
                  {/^[A-Za-z_$][\w$]*$/.test(key) ? `${name}.${key}` : `${name}['${key}']`}
                </code>{' '}
                → <code className="[overflow-wrap:anywhere]">{example(value)}</code>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

interface TokensJsonFile {
  format: number;
  prefix: string;
  modifiers: Record<string, { contexts: string[]; default: string }>;
  tokens: Record<string, unknown>;
}

function isTokensJson(value: unknown): value is TokensJsonFile {
  return (
    isRecord(value) &&
    typeof value.format === 'number' &&
    isRecord(value.modifiers) &&
    isRecord(value.tokens)
  );
}

function tokensJson(): TokensJsonFile {
  return readRepoJson('packages/tokens/dist/tokens.json', isTokensJson, BUILD_HINT);
}

/** The file's header facts: format, token count and the modifiers with their contexts. */
export function TokensJsonSummary(): JSX.Element {
  const file = tokensJson();
  return (
    <Table label="tokens.json modifiers">
      <thead>
        <tr>
          <th scope="col">Modifier</th>
          <th scope="col">Contexts</th>
          <th scope="col">Default</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(file.modifiers).map(([name, m]) => (
          <tr key={name}>
            <th scope="row" className="font-normal">
              <code>{name}</code>
            </th>
            <td>{m.contexts.map((c) => c).join(', ')}</td>
            <td>{m.default}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** How many tokens the file holds, for the page's prose. */
export function TokensJsonCount(): JSX.Element {
  return <>{Object.keys(tokensJson().tokens).length}</>;
}

/** One entry, verbatim from the built file. */
export function TokensJsonEntry({ id }: { id: string }): JSX.Element {
  const entry = tokensJson().tokens[id];
  if (entry === undefined) throw new Error(`docs: tokens.json has no token ${id}`);
  return (
    <pre
      className="overflow-auto rounded-lg border p-4 text-sm"
      aria-label={`tokens.json entry ${id}`}
      // A scroller must take keyboard focus to be scrolled from the keyboard (as components/table.tsx).
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <code>{`"${id}": ${JSON.stringify(entry, null, 2)}`}</code>
    </pre>
  );
}
