#!/usr/bin/env node
// The `nz` CLI. Runs directly on Node 24 (type stripping): keep this package to erasable TypeScript syntax.
import { gen } from '../gen/index.ts';

const commands: Record<string, (args: string[]) => number> = { gen };

const [name, ...args] = process.argv.slice(2);
const command = name === undefined ? undefined : commands[name];

if (command === undefined) {
  console.error(
    'Usage: nz <command>\n\nCommands:\n  gen [--check] [--root <dir>]   regenerate (or with --check, verify) the files derived from component.json',
  );
  process.exitCode = 1;
} else {
  process.exitCode = command(args);
}
