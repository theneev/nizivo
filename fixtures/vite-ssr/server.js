// A production server for the built fixture, on node:http: static files from dist/client, every
// other path rendered by dist/server/entry-server.js into dist/client/index.html.
//
//   node server.js 3420
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { render } from './dist/server/entry-server.js';

const ROOT = join(import.meta.dirname, 'dist', 'client');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const template = await readFile(join(ROOT, 'index.html'), 'utf8');
const port = Number(process.argv[2] ?? 3420);

/** A static asset from dist/client/assets, or a 404. */
async function asset(pathname, response) {
  const file = normalize(join(ROOT, pathname));
  const body = file.startsWith(ROOT) ? await readFile(file).catch(() => undefined) : undefined;
  if (body === undefined) {
    response.writeHead(404).end();
  } else {
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  }
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/assets/')) {
    void asset(url.pathname, response);
  } else {
    const { found, html } = render(url.pathname);
    response.writeHead(found ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    response.end(template.replace('<!--app-html-->', html));
  }
}).listen(port, () => console.log(`vite-ssr fixture on http://localhost:${port}`));
