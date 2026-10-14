// The static search index, prerendered once into out/api/search.json and searched in the browser
// (components/search-dialog.tsx). Generated pages contribute their props, parts, slots and hooks.
import { createFromSource } from 'fumadocs-core/search/server';
import { plainText } from '../../../lib/markdown';
import { source } from '../../../lib/source';

export const revalidate = false;
export const dynamic = 'force-static';

export const { staticGET: GET } = createFromSource(source, {
  // Static hosts serve `/docs/x/`; a link to `/docs/x` would cost a redirect.
  buildIndex: (page) => ({
    id: page.url,
    title: page.data.title ?? '',
    ...(page.data.description !== undefined && { description: plainText(page.data.description) }),
    url: `${page.url}/`,
    structuredData: page.data.structuredData,
  }),
});
