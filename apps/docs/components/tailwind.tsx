// The Tailwind CSS page's generated parts: what @nizivo/tokens/tailwind.css maps, read from the built
// file, and a live sample styled only with the `nz` utilities it creates. This site compiles with
// Tailwind CSS v4 and imports that file (app/global.css), so the sample is the compile check.
import type { JSX } from 'react';
import { readRepoText } from '../lib/repo';
import { Table } from './table';

/** Tailwind theme namespace → the utilities it creates (Tailwind CSS v4 theme variables). */
const NAMESPACES: Record<string, string> = {
  color:
    '`bg-*`, `text-*`, `border-*`, `fill-*`, `stroke-*`, `ring-*` and the other colour utilities',
  radius: '`rounded-*`',
  shadow: '`shadow-*`',
  ease: '`ease-*`',
  breakpoint: 'the responsive variants (`nz-sm:`, `nz-lg:`)',
};

interface Mapping {
  variable: string;
  value: string;
}

function mappings(): Map<string, Mapping[]> {
  const css = readRepoText(
    'packages/tokens/dist/tailwind.css',
    'run `pnpm build` so @nizivo/tokens writes its dist',
  );
  const byNamespace = new Map<string, Mapping[]>();
  for (const m of css.matchAll(/^\s*(--([a-z]+)-nz-[\w-]+):\s*([^;]+);/gm)) {
    const [, variable = '', namespace = '', value = ''] = m;
    byNamespace.set(namespace, [...(byNamespace.get(namespace) ?? []), { variable, value }]);
  }
  if (byNamespace.size === 0) throw new Error('docs: no `--*-nz-*` variables in tailwind.css');
  return byNamespace;
}

function Md({ text }: { text: string }): JSX.Element {
  const parts = text.split(/(`[^`]+`)/);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') ? (
          // oxlint-disable-next-line react/no-array-index-key -- fixed text split once
          <code key={i}>{p.slice(1, -1)}</code>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** One row per Tailwind namespace the adapter fills, with a sample class and its CSS. */
export function TailwindMap(): JSX.Element {
  const rows = [...mappings()];
  return (
    <Table label="Tailwind theme variables">
      <thead>
        <tr>
          <th scope="col">Namespace</th>
          <th scope="col">Variables</th>
          <th scope="col">Creates</th>
          <th scope="col">First variable</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([namespace, list]) => (
          <tr key={namespace}>
            <th scope="row" className="font-normal">
              <code>{`--${namespace}-nz-*`}</code>
            </th>
            <td>{list.length}</td>
            <td>
              <Md text={NAMESPACES[namespace] ?? `the \`${namespace}\` utilities`} />
            </td>
            <td>
              <code>{`${list[0]?.variable ?? ''}: ${list[0]?.value ?? ''}`}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function Sample({ scheme }: { scheme: 'light' | 'dark' }): JSX.Element {
  return (
    <div
      data-nz-theme={scheme}
      data-tailwind-sample={scheme}
      className="rounded-nz-lg border border-nz-border-default bg-nz-bg-surface p-(--nz-space-4) text-nz-text-primary shadow-nz-2"
    >
      <p className="m-0 text-sm text-nz-text-secondary">{`data-nz-theme="${scheme}"`}</p>
      <p className="m-0 mt-1 [font:var(--nz-font-label-m-strong)]">Order #1040</p>
      <span className="mt-3 inline-block rounded-nz-full bg-nz-bg-success-subtle px-2 text-sm text-nz-text-success">
        Paid
      </span>
    </div>
  );
}

/** A light and a dark scope styled only with `nz` utilities; the grid splits at `nz-sm`. */
export function TailwindSample(): JSX.Element {
  return (
    <div className="not-prose my-6 grid gap-4 nz-sm:grid-cols-2" data-tailwind-grid="">
      <Sample scheme="light" />
      <Sample scheme="dark" />
    </div>
  );
}
