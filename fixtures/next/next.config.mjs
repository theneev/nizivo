// One build per variant, each in its own distDir so all three can be checked side by side:
// NZ_VARIANT=turbopack (next build), webpack (next build --webpack), webpack-opi (webpack with
// optimizePackageImports, the setting docs give webpack users who import from the barrel; §11.1).
const variant = process.env.NZ_VARIANT ?? 'turbopack';

/** @type {import('next').NextConfig} */
const config = {
  distDir: `.next/${variant}`,
  // This folder is the project root; without these Next walks up to the monorepo's lockfile.
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
  // A test fixture: `next dev` must not write AGENTS.md here when it detects a coding agent.
  agentRules: false,
  ...(variant === 'webpack-opi'
    ? { experimental: { optimizePackageImports: ['@nizivo/react'] } }
    : {}),
};

export default config;
