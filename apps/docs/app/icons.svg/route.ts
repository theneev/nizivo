// /icons.svg: the @nizivo/icons sprite the Icons page draws from, written by scripts/generate.ts from
// the built package (scripts/icons.ts). One static file, fetched once by the page and cached.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const revalidate = false;
export const dynamic = 'force-static';

export function GET(): Response {
  const sprite = readFileSync(join(process.cwd(), '.generated', 'icons', 'sprite.svg'), 'utf8');
  return new Response(sprite, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
}
