// size-limit's config for `pnpm --filter @nizivo/react size` (ARCHITECTURE.md §17). It covers the
// public entries of @nizivo/react, @nizivo/tokens and @nizivo/icons: size-limit loads its plugins
// from this package, the only one that depends on them. Checks and budgets: packages/tooling/size.
import { sizeLimitChecks } from '../tooling/size/checks.ts';

const mode = process.env['NZ_SIZE_MODE'];

export default sizeLimitChecks({ measure: mode === 'measure', brotli: mode === 'brotli' });
