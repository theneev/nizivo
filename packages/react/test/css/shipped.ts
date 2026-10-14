import { readdirSync, readFileSync } from 'node:fs';

const PACKAGE = new URL('../../', import.meta.url);

/** src/<name>/<name>.css and src/unstable/<name>/<name>.css: one stylesheet per component folder. */
const COMPONENT_CSS = /^(?:unstable\/)?([^/]+)\/\1\.css$/;

/** Every stylesheet the package ships, as `[path in the package, source]`. */
export const SHIPPED: readonly (readonly [string, string])[] = [
  ...readdirSync(new URL('src/', PACKAGE), { recursive: true })
    .map((file) => file.split('\\').join('/'))
    .filter((file) => COMPONENT_CSS.test(file))
    .map((file) => `src/${file}`),
  ...readdirSync(new URL('styles/', PACKAGE))
    .filter((file) => file.endsWith('.css'))
    .map((file) => `styles/${file}`),
]
  .toSorted()
  .map((path) => [path, readFileSync(new URL(path, PACKAGE), 'utf8')] as const);
