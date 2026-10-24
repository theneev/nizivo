// Plain GETs against the fixtures' own local servers, through node:http. Not fetch: Node 24's fetch
// (undici) now and then throws `setTypeOfService EINVAL` from a socket event handler, outside the
// fetch promise, while a server starts or stops, so no try/catch can stop it from ending the run (the
// fixture-vite flake in CLAUDE.md). node:http does not touch the socket's type of service.
import { request } from 'node:http';

/** The status a GET of `url` answers with, or undefined when nothing answers within 2 s. */
export function status(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const req = request(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(undefined));
    req.setTimeout(2000, () => req.destroy());
    req.end();
  });
}

/** The body of a GET of `url` as text; throws on a network error or a status outside 2xx. */
export function getText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(url, (res) => {
      const code = res.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        res.resume();
        reject(new Error(`GET ${url}: ${code}`));
        return;
      }
      res.setEncoding('utf8');
      let body = '';
      res.on('data', (chunk: string) => {
        body += chunk;
      });
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30_000, () => req.destroy(new Error(`GET ${url}: timed out`)));
    req.end();
  });
}
