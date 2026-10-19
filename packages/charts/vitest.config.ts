import { configDefaults, defineConfig } from 'vitest/config';

// Two Node projects, as in @nizivo/icons. `node`: core maths, the rendered markup
// (react-dom/server), the module graph and the dependency rule. `react-server`: modules resolve
// with the react-server condition, as a Server Component bundler resolves React, so `react` and
// `react/jsx-runtime` are React's server builds and a server part that reached a client-only hook
// would throw (vitest externalises React, so the condition goes to both resolvers). react-dom/server
// cannot load there, which is why it is a separate project. The browser lane is
// test/browser/vitest.config.ts (`pnpm --filter @nizivo/charts test:browser`).
const SERVER = 'test/**/*.server.test.{ts,tsx}';
const REACT_SERVER = { conditions: ['react-server'], externalConditions: ['react-server'] };

export default defineConfig({
  test: {
    environment: 'node',
    // The repo's node-lane limit (packages/react/vitest.config.ts explains the 30 s).
    testTimeout: 30_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['test/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, SERVER, 'test/browser/**'],
        },
      },
      {
        extends: true,
        resolve: REACT_SERVER,
        ssr: { resolve: REACT_SERVER },
        test: { name: 'react-server', include: [SERVER] },
      },
    ],
  },
});
