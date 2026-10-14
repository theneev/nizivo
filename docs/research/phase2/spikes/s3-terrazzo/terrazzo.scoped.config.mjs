import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
const cssVar = (id) => `--nz-${id.replace(/^color\./, "").replace(/\./g, "-")}`;
export default defineConfig({
  tokens: ["./tokens/nizivo.resolver.json"],
  outDir: "./out/",
  plugins: [css({
    filename: "tokens.scoped-include.css",
    variableName: (t) => cssVar(t.id),
    legacyHex: true,
    permutations: [
      { input: { theme: "light", motion: "default" }, prepare: (c) => `:root {\n  color-scheme: light dark;\n  ${c}\n}` },
      { input: { theme: "light" }, only: { modifiers: ["theme"] }, include: ["color.bg.**", "color.text.**"], exclude: ["color.p.**"], prepare: (c) => `[data-theme="light"] {\n  color-scheme: light;\n  ${c}\n}` },
      { input: { theme: "dark" }, only: { modifiers: ["theme"] }, include: ["color.bg.**", "color.text.**", "duration.**"], exclude: ["color.p.**"], prepare: (c) => `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n    ${c}\n  }\n}\n[data-theme="dark"] {\n  color-scheme: dark;\n  ${c}\n}` },
      { input: { motion: "reduced" }, only: { modifiers: ["motion"] }, include: ["color.bg.**", "color.text.**", "duration.**"], exclude: ["color.p.**"], prepare: (c) => `@media (prefers-reduced-motion: reduce) {\n  :root:not([data-motion="full"]) {\n    ${c}\n  }\n}\n[data-motion="reduced"] {\n  ${c}\n}` },
    ],
  })],
});
