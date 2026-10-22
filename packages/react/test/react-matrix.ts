// The React matrix (ARCHITECTURE.md §9.6: "React 19.2.x and 19.3.x both run in the matrix from v0.2").
// The workspace develops on 19.3 (the catalog's react and react-dom); `NZ_REACT=19.2` runs a lane on
// the catalog's `react-19.2` and `react-dom-19.2` (npm aliases of 19.2.9) instead. The node, browser
// and overlay vitest configs spread `reactMatrix()` into their Vite config.
//
// Vite resolves every `react` and `react-dom` import, the engine's inside node_modules included, to
// the aliased packages; `dedupe` then resolves those from this package, where they are installed, with
// their own `exports` conditions. pnpm links react-dom 19.2.9's `react` peer to the workspace's
// 19.3.0, and react-dom refuses a React of another version, so the alias has to reach inside
// node_modules: in the browser lanes the dependency optimiser applies it when it bundles react-dom;
// in the node lane, where node_modules load natively, test/react-matrix.setup.ts adds the same
// mapping as a Node resolve hook. The react-matrix specs of the node, browser and overlay lanes fail a
// lane whose React is not the one it names.

declare const process: { env: Record<string, string | undefined> };

export type ReactLine = '19.2' | '19.3';

/** The React line `NZ_REACT` names, or 19.3 (the workspace's). */
export const reactLine: ReactLine = process.env['NZ_REACT'] === '19.2' ? '19.2' : '19.3';

/** `react`, `react-dom` and their subpaths, mapped to the 19.2 aliases. */
export const REACT_19_2: RegExp = /^(react|react-dom)(\/.*)?$/;

export function to19_2(specifier: string): string {
  return specifier.replace(
    REACT_19_2,
    (_, name: string, rest?: string) => `${name}-19.2${rest ?? ''}`,
  );
}

interface MatrixConfig {
  cacheDir?: string;
  define: Record<string, string>;
  resolve: {
    alias?: { find: RegExp; replacement: string }[];
    dedupe: string[];
  };
}

/** The Vite settings of the lane's React line. 19.2 gets its own dependency cache. */
export function reactMatrix(): MatrixConfig {
  const dedupe = ['react', 'react-dom'];
  // The line the lane names, for the version checks in the browser, which has no `process.env`.
  const define = { NZ_REACT_LINE: JSON.stringify(reactLine) };
  if (reactLine === '19.3') return { define, resolve: { dedupe } };
  return {
    define,
    cacheDir: 'node_modules/.vite-react-19.2',
    resolve: {
      alias: [
        { find: /^react$/, replacement: 'react-19.2' },
        { find: /^react\/(.*)$/, replacement: 'react-19.2/$1' },
        { find: /^react-dom$/, replacement: 'react-dom-19.2' },
        { find: /^react-dom\/(.*)$/, replacement: 'react-dom-19.2/$1' },
      ],
      dedupe: [...dedupe, 'react-19.2', 'react-dom-19.2'],
    },
  };
}
