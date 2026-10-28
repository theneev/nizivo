// A small static server for apps/docs/out that behaves like GitHub Pages: `/a/` serves a/index.html,
// `/a` redirects to `/a/` when that folder exists, files keep their extension's media type and a
// missing path gets 404.html with status 404. No dependencies. Used by scripts/smoke.ts.
//
//   node scripts/serve.ts [--port 4417] [--dir out]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

function file(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

export function serve(dir: string, port: number): Promise<Server> {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let path = join(root, rel);
    if (!path.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (url.pathname.endsWith('/')) path = join(path, 'index.html');
    else if (!file(path) && file(join(path, 'index.html'))) {
      res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
      return;
    }
    if (!file(path)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] ?? '' });
      createReadStream(join(root, '404.html')).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(res);
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => ok(server));
  });
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

if (import.meta.main) {
  const dir = arg('--dir', join(import.meta.dirname, '..', 'out'));
  const port = Number(arg('--port', '4417'));
  if (!existsSync(join(dir, 'index.html'))) {
    console.error(`serve: ${dir} has no index.html; run the docs build first`);
    process.exit(1);
  }
  await serve(dir, port);
  console.log(`serve: http://127.0.0.1:${port}/ (${dir})`);
}
