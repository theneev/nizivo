// A production server for `react-router build`, on node:http: static files from build/client, every
// other request handled by the server build through @react-router/node's request listener.
//
//   node server.js 3421
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createRequestListener } from '@react-router/node';

const ROOT = join(import.meta.dirname, 'build', 'client');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const port = Number(process.argv[2] ?? 3421);
const handle = createRequestListener({ build: () => import('./build/server/index.js') });

/** A static asset from build/client/assets, or a 404. */
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
    handle(request, response);
  }
}).listen(port, () => console.log(`react-router fixture on http://localhost:${port}`));
