import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
import { transformCSSValue } from "@terrazzo/token-tools/css";

const PREFIX = "nz";
const cssVar = (id) => `--${PREFIX}-${id.replace(/\./g, "-")}`;
const MODE = process.env.MODE ?? "blocks";

// Companion plugin: capture the resolver so a permutation transform can read the OTHER theme.
let resolverRef;
const captureResolver = { name: "nz-capture-resolver", async transform({ resolver }) { resolverRef = resolver; } };

const lightDarkTransform = (token, options) => {
  if (token.$type !== "color" || !token.id.match(/^color\.(bg|text)\./)) return undefined; // semantic colors only
  const light = resolverRef.apply({ ...options.permutation, theme: "light" });
  const dark = resolverRef.apply({ ...options.permutation, theme: "dark" });
  const v = (set) => transformCSSValue(set[token.id], { ...options, tokensSet: set });
  const l = v(light), d = v(dark);
  return l === d ? l : `light-dark(${l}, ${d})`;
};

const permutationsByMode = {
  // r7-style duplicated blocks, testing partial input WITHOUT `only`
  blocks: [
    { input: { theme: "light", motion: "default" }, prepare: (c) => `:root {\n  color-scheme: light dark;\n${c}\n}` },
    { input: { theme: "dark" }, prepare: (c) => `[data-theme="dark"] {\n  color-scheme: dark;\n${c}\n}` },
    { input: { motion: "reduced" }, prepare: (c) => `@media (prefers-reduced-motion: reduce) {\n  :root {\n${c}\n  }\n}` },
  ],
  // same, but WITH only.modifiers (partial resolver application)
  only: [
    { input: { theme: "light", motion: "default" }, prepare: (c) => `:root {\n  color-scheme: light dark;\n${c}\n}` },
    { input: { theme: "dark" }, only: { modifiers: ["theme"] }, prepare: (c) => `[data-theme="dark"] {\n  color-scheme: dark;\n${c}\n}` },
    { input: { motion: "reduced" }, only: { modifiers: ["motion"] }, prepare: (c) => `@media (prefers-reduced-motion: reduce) {\n  :root:not([data-motion="full"]) {\n${c}\n  }\n}\n[data-motion="reduced"] {\n${c}\n}` },
  ],
  // light-dark(): single :root block, theme scopes only flip color-scheme
  lightdark: [
    { input: { theme: "light", motion: "default" }, transform: lightDarkTransform,
      prepare: (c) => `:root {\n  color-scheme: light dark;\n${c}\n}\n[data-theme="light"] { color-scheme: light; }\n[data-theme="dark"] { color-scheme: dark; }` },
    { input: { motion: "reduced" }, only: { modifiers: ["motion"] }, prepare: (c) => `@media (prefers-reduced-motion: reduce) {\n  :root {\n${c}\n  }\n}` },
  ],
};

export default defineConfig({
  tokens: ["./tokens/nizivo.resolver.json"],
  outDir: "./out/",
  plugins: [
    captureResolver,
    css({
      filename: `tokens.${MODE}.css`,
      variableName: (token) => cssVar(token.id),
      legacyHex: true,
      permutations: permutationsByMode[MODE],
    }),
  ],
});
