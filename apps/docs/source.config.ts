// Fumadocs MDX collections. `docs` is every hand-written page under content/docs. `componentNotes`
// holds optional prose for a generated component page (content/components/<subpath>.mdx): an
// overview, and the keyboard map where the behaviour is known from the code. A component without a
// notes file still gets its full generated page (lib/source.ts).
import { defineCollections, defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';
import { CODE_THEMES } from './lib/code';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // `getText('processed')` feeds llms-full.txt (app/llms-full.txt/route.ts).
    postprocess: { includeProcessedMarkdown: true },
  },
});

export const componentNotes = defineCollections({
  type: 'doc',
  dir: 'content/components',
  postprocess: { includeProcessedMarkdown: true },
  schema: pageSchema.extend({
    /** The WAI-ARIA Authoring Practices pattern the component follows. */
    apg: z.url().optional(),
    /** Keys and what they do; only where the code or the engine defines the behaviour. */
    keyboard: z.array(z.object({ keys: z.string(), action: z.string() })).optional(),
    /** Where the keyboard map comes from (files, versions) and what checks it. */
    keyboardSource: z.string().optional(),
  }),
});

export default defineConfig({
  mdxOptions: { rehypeCodeOptions: { themes: CODE_THEMES } },
});
