// The server entry (`vite build --ssr`): a page as HTML. React, react-dom and @nizivo/* stay external,
// so Node imports them from node_modules at run time.
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App, PAGES } from './app.jsx';

export function render(path) {
  return {
    found: path in PAGES,
    html: renderToString(
      <StrictMode>
        <App path={path} />
      </StrictMode>,
    ),
  };
}
