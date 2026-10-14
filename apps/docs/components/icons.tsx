// The Icons page: every @nizivo/icons export, generated at build time (scripts/icons.ts) and
// rendered on the server. Each tile draws its glyph from the /icons.svg sprite, which the same
// package rendered, so the page shows what the package draws without repeating 1,880 SVG trees in
// the HTML and again in the RSC payload. The only client code is the search box (icon-search.tsx),
// which filters the server-rendered tiles in place.
import type { JSX, ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IconEntry } from '../scripts/icons';
import { isRecord } from '../scripts/json';
import { IconSearch } from './icon-search';

function isEntry(value: unknown): value is IconEntry {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.exportName === 'string' &&
    typeof value.importPath === 'string' &&
    typeof value.brand === 'boolean'
  );
}

function entries(): IconEntry[] {
  const parsed: unknown = JSON.parse(
    readFileSync(join(process.cwd(), '.generated', 'icons', 'index.json'), 'utf8'),
  );
  if (!Array.isArray(parsed) || !parsed.every(isEntry)) {
    throw new Error(
      'docs: .generated/icons/index.json is not a list of icons; run scripts/generate.ts',
    );
  }
  return parsed;
}

/** A name that fits a tile line stays one text node; a longer one gets a <wbr> at each camelCase or
 * digit boundary, so it wraps between words (LaptopMinimal·Check), not mid-word. */
function breakable(name: string): ReactNode {
  if (name.length <= 14) return name;
  return (
    name
      .split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Za-z])(?=[0-9])/)
      // A static name's split never reorders, so the index is a stable key.
      // oxlint-disable-next-line react/no-array-index-key
      .flatMap((part, index) => (index === 0 ? [part] : [<wbr key={index} />, part]))
  );
}

function Tile({ icon }: { icon: IconEntry }): JSX.Element {
  return (
    <li data-icon={icon.name}>
      <svg aria-hidden="true">
        <use href={`/icons.svg#${icon.name}`} />
      </svg>
      <code>{breakable(icon.exportName)}</code>
    </li>
  );
}

export function IconGrid(): JSX.Element {
  const all = entries();
  const icons = all.filter((i) => !i.brand);
  return (
    <>
      <IconSearch grid="nz-icon-grid" total={icons.length} />
      <ul id="nz-icon-grid" aria-label="Icons" className="nz-docs-icons not-prose">
        {icons.map((icon) => (
          <Tile key={icon.name} icon={icon} />
        ))}
      </ul>
    </>
  );
}

export function BrandGrid(): JSX.Element {
  const brands = entries().filter((i) => i.brand);
  return (
    <ul aria-label="Brand glyphs" className="nz-docs-icons not-prose">
      {brands.map((icon) => (
        <Tile key={icon.name} icon={icon} />
      ))}
    </ul>
  );
}

/** How many icons the package ships (stroke icons, brand glyphs), for the page's prose. */
export function IconCount({ kind }: { kind: 'icons' | 'brands' }): JSX.Element {
  const all = entries();
  const n = all.filter((i) => i.brand === (kind === 'brands')).length;
  return <>{n.toLocaleString('en-US')}</>;
}
