// The head of every docs page (M90): the page's group as an eyebrow in text/brand, the title and
// the description as a lede, in the home page's type (components/home.tsx). Fumadocs' DocsTitle and
// DocsDescription are not used, so the eyebrow sits above the <h1> inside one <header>.
import type { JSX } from 'react';
import { groupOf, sectionTree } from '../lib/sections';
import { source } from '../lib/source';
import { InlineMd } from './inline-md';

const tree = sectionTree(source.pageTree);

export function PageHead({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string | undefined;
}): JSX.Element {
  const group = groupOf(tree, url);
  return (
    <header className="nz-docs-head">
      {group === undefined || group === title ? null : <p className="nz-docs-eyebrow">{group}</p>}
      <h1 className="nz-docs-title">{title}</h1>
      {description === undefined || description === '' ? null : (
        <p className="nz-docs-lede">
          <InlineMd text={description} />
        </p>
      )}
    </header>
  );
}
