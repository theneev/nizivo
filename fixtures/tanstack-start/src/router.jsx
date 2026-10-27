// The router factory Start calls on the server and in the browser.
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  return createRouter({ routeTree });
}
