// The server entry, written out so `react-router build` does not install isbot (its default entry
// needs it to tell bots from browsers). Every request waits for the whole page (onAllReady): the
// fixture checks the complete server HTML, as a crawler would get it.
import { PassThrough } from 'node:stream';
import { createReadableStreamFromReadable } from '@react-router/node';
import { renderToPipeableStream } from 'react-dom/server';
import { ServerRouter } from 'react-router';

export default function handleRequest(request, status, headers, routerContext) {
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onAllReady() {
          const body = new PassThrough();
          headers.set('Content-Type', 'text/html');
          resolve(new Response(createReadableStreamFromReadable(body), { headers, status }));
          pipe(body);
        },
        onShellError: reject,
        onError(error) {
          status = 500;
          console.error(error);
        },
      },
    );
    setTimeout(() => abort(), 10_000);
  });
}
