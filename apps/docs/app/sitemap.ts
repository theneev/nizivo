// sitemap.xml: the home page and every docs page, at the URLs the static host serves (with the
// trailing slash). No lastmod: the export holds no reliable per-page date, and a wrong one is worse
// than none.
import type { MetadataRoute } from 'next';
import { canonicalPath, SITE_URL } from '../lib/seo';
import { source } from '../lib/source';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => canonicalPath(page.url));
  return ['/', ...pages].map((path) => ({ url: `${SITE_URL}${path}` }));
}
