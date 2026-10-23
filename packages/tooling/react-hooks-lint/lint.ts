// Runs config.js from the repo root: ESLint 10 ignores files outside a config file's own folder,
// and this package's folder holds none of the files it lints. Exit 1 on any error or warning.
import { join } from 'node:path';
import { ESLint } from 'eslint';
import config from './config.js';

const root = join(import.meta.dirname, '..', '..', '..');
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });
const results = await eslint.lintFiles(['packages/react/src', 'packages/charts/src']);
const formatter = await eslint.loadFormatter('stylish');
const output = await formatter.format(results);
if (output !== '') console.log(output);
const problems = results.reduce((n, r) => n + r.errorCount + r.warningCount, 0);
console.log(`react-hooks: ${results.length} files, ${problems} problem(s)`);
process.exitCode = problems === 0 ? 0 : 1;
