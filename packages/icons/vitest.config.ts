import { configDefaults, defineConfig } from 'vitest/config';

// Two Node projects. `node`: the generator, the rendered markup (react-dom/server) and the bundle
// check. `react-server`: modules resolve with the react-server condition, as a Server Component
// bundler resolves React, so `react` and `react/jsx-runtime` are React's server builds (vitest
// externalises React, so the condition must be given to both resolvers). react-dom/server cannot
// load there, which is why it is a separate project.
const SERVER = 'test/**/*.server.test.ts';
const REACT_SERVER = { conditions: ['react-server'], externalConditions: ['react-server'] };

export default defineConfig({
  test: {
    environment: 'node',
    // Vitest's 5 s default failed a gate run on a loaded machine in week 5 (the tooling tests, now at
    // 120 s). Here the slowest test takes under 0.3 s unloaded, so 30 s is about 100 times that: room
    // for a machine running other lanes beside the gate, while a real hang still fails in half a
    // minute. Tests that build or spawn set their own, longer limit.
    testTimeout: 30_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['test/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, SERVER],
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
