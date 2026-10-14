// The docs site is a static export (ARCHITECTURE.md §18.2): plain HTML, CSS and JS in out/, servable
// by any static host. No server, no image optimiser, no runtime fetches.
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  // GitHub Pages serves `/docs/foo/` from `docs/foo/index.html`; without the slash it redirects.
  trailingSlash: true,
  // A static export has no image optimiser, and sharp stays out of the tree (§19.3).
  images: { unoptimized: true },
  reactStrictMode: true,
  // The workspace packages (@nizivo/react, @nizivo/tokens) live above this folder.
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  // `next dev` must not write AGENTS.md here when it detects a coding agent.
  agentRules: false,
};

export default createMDX()(config);
