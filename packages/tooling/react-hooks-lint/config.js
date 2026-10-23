// The non-blocking React Compiler lane (ARCHITECTURE.md §19 "Compiler rules", D14-hooks, M47): only
// eslint-plugin-react-hooks 7's recommended-latest rules (the React Compiler's rules plus
// rules-of-hooks and exhaustive-deps), on the client leaves and engine adapters of @nizivo/react and
// @nizivo/charts. oxlint stays the one linter of `pnpm lint`; this lane is release lane
// `react-hooks`, reported but not blocking (plan.ts `blocking: false`).
//
//   pnpm --filter @nizivo/react-hooks-lint lint:hooks      (lint.ts, from the repo root)
//
// typescript-eslint's parser only parses here (no type information), with this package's
// `typescript`, the typescript6 catalog's TypeScript 6 (pnpm-workspace.yaml).
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: [
      'packages/react/src/**/*.client.{ts,tsx}',
      'packages/react/src/_engines/**/*.{ts,tsx}',
      'packages/charts/src/**/*.client.{ts,tsx}',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { 'react-hooks': { meta: reactHooks.meta, rules: reactHooks.rules } },
    rules: reactHooks.configs.flat['recommended-latest'].rules,
  },
]);
