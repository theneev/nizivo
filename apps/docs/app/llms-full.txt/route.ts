// llms-full.txt: every page as Markdown. MDX pages give their processed Markdown; generated pages
// give the same sections they render (lib/outline.ts), with their notes file's processed Markdown
// (content/components/<name>.mdx: the overview and sections such as "Static or interactive") where
// the page renders it, after Import.
import { notesFor } from '../../lib/notes';
import { outline } from '../../lib/outline';
import { source, type DocsPage } from '../../lib/source';

export const revalidate = false;
export const dynamic = 'force-static';

async function markdown(page: DocsPage): Promise<string> {
  if (page.type === 'generated') {
    const { head, tail } = outline(page.data.entry).markdownParts;
    const notes = notesFor(page.data.entry.name);
    const prose = notes === undefined ? '' : (await notes.getText('processed')).trim();
    const body = prose === '' ? `${head}\n${tail}` : `${head}\n${prose}\n\n${tail}`;
    return `${body}\n\nURL: ${page.url}/`;
  }
  const text = await page.data.getText('processed');
  return `# ${page.data.title}\n\n${page.data.description ?? ''}\n\n${text}\n\nURL: ${page.url}/`;
}

export async function GET(): Promise<Response> {
  const parts = await Promise.all(source.getPages().map(markdown));
  return new Response(parts.join('\n\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
