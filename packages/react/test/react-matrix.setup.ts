// The node lane's half of the React matrix (test/react-matrix.ts). Vitest runs node_modules natively,
// so the Vite alias does not reach react-dom's own `require('react')`; under `NZ_REACT=19.2` this
// resolve hook maps every `react` and `react-dom` request, from anywhere, to the 19.2 aliases,
// resolved from this package.
import { registerHooks } from 'node:module';
import { REACT_19_2, reactLine, to19_2 } from './react-matrix.ts';

const FROM = new URL('../package.json', import.meta.url).href;

if (reactLine === '19.2') {
  registerHooks({
    resolve: (specifier, context, next) =>
      REACT_19_2.test(specifier)
        ? next(to19_2(specifier), { ...context, parentURL: FROM })
        : next(specifier, context),
  });
}
