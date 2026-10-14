// Renders the inline Markdown that generated sources carry (JSDoc descriptions in contracts/api, the
// plan's table cells, override reasons, page descriptions): `code`, **bold**, *emphasis* and
// [links](…). Paragraph breaks (`\n\n`) become paragraphs. Relative links resolve against the source
// file on GitHub, and a plan citation such as `§12.2` links to that section of the plan.
import type { JSX, ReactNode } from 'react';
import { planSectionUrl } from '../lib/plan';
import { REPO_URL } from '../lib/repo';

const TOKEN = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)]+\))/g;

function resolveHref(href: string, base: string | undefined): string {
  if (/^[a-z]+:/i.test(href)) return href;
  if (!base) return href;
  if (href.startsWith('#')) return `${REPO_URL}/blob/main/${base}${href}`;
  const dir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
  const parts = `${dir}${href}`.split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.') out.push(p);
  }
  return `${REPO_URL}/blob/main/${out.join('/')}`;
}

const SECTION = /§(\d+(?:\.\d+)*)/g;

/** Plain text, with each `§N.N` citation linked to the plan, unless it is inside a link already. */
function cite(text: string, key: string, linked: boolean): ReactNode[] {
  if (linked) return [text];
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(SECTION)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <a key={`${key}-s${m.index}`} href={planSectionUrl(m[1] ?? '')}>
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function inline(text: string, base: string | undefined, key: string, linked = false): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) nodes.push(...cite(text.slice(last, m.index), `${key}-t${last}`, linked));
    const s = m[0];
    const k = `${key}-${i++}`;
    if (m[1]) nodes.push(<code key={k}>{s.slice(1, -1)}</code>);
    else if (m[2]) nodes.push(<strong key={k}>{inline(s.slice(2, -2), base, k, linked)}</strong>);
    else if (m[3]) nodes.push(<em key={k}>{inline(s.slice(1, -1), base, k, linked)}</em>);
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(s);
      const label = inline(link?.[1] ?? '', base, k, true);
      nodes.push(
        linked ? (
          <span key={k}>{label}</span>
        ) : (
          <a key={k} href={resolveHref(link?.[2] ?? '', base)}>
            {label}
          </a>
        ),
      );
    }
    last = m.index + s.length;
  }
  if (last < text.length) nodes.push(...cite(text.slice(last), `${key}-t${last}`, linked));
  return nodes;
}

/**
 * Inline Markdown in a table cell or a sentence: no block elements. `plainLinks` renders links and
 * plan citations as text, for text that sits inside a link already (a card).
 */
export function InlineMd({
  text,
  base,
  plainLinks = false,
}: {
  text: string;
  base?: string;
  plainLinks?: boolean;
}): JSX.Element {
  return <>{inline(text, base, 'm', plainLinks)}</>;
}

/** Markdown with paragraph breaks, as JSDoc descriptions are written (API-JSON.md "Text"). */
export function BlockMd({ text, base }: { text: string; base?: string }): JSX.Element {
  const paras = text.split(/\n{2,}/);
  return (
    <>
      {paras.map((p, i) => (
        // oxlint-disable-next-line react/no-array-index-key -- paragraphs of a fixed text
        <p key={i}>{inline(p, base, `p${i}`)}</p>
      ))}
    </>
  );
}
