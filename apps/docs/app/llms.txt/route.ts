// llms.txt: the index of every page, as Markdown links (https://llmstxt.org).
import { llms } from 'fumadocs-core/source';
import { source } from '../../lib/source';

export const revalidate = false;
export const dynamic = 'force-static';

export function GET(): Response {
  const header = [
    '# Nizivo UI',
    '',
    '> An accessible, server-first React design system by Neev Technologies: design tokens (@nizivo/tokens) and React components (@nizivo/react). Pre-alpha; nothing is published to npm yet.',
    '',
    'Full text of every page: /llms-full.txt',
    '',
  ].join('\n');
  // Static hosts serve `/docs/x/`; link there directly.
  const index = llms(source)
    .index()
    .replace(/\]\((\/docs[^)#]*)\)/g, (_m, url: string) => `](${url}/)`);
  return new Response(`${header}\n${index}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
