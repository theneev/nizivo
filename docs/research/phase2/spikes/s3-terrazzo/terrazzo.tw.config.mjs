import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
import tailwind from "@terrazzo/plugin-tailwind";
import { transformCSSValue } from "@terrazzo/token-tools/css";
const MODE = process.env.MODE ?? "blocks";
const cssVar = (id) => `--nz-${id.replace(/^color\./, "").replace(/\./g, "-")}`;
let resolverRef;
const capture = { name: "nz-capture-resolver", async transform({ resolver }) { resolverRef = resolver; } };
const lightDark = (token, options) => {
  if (token.$type !== "color" || !/^color\.(bg|text)\./.test(token.id)) return undefined;
  const v = (theme) => { const set = resolverRef.apply({ ...options.permutation, theme }); return transformCSSValue(set[token.id], { ...options, tokensSet: set }); };
  const l = v("light"), d = v("dark");
  return l === d ? l : `light-dark(${l}, ${d})`;
};
const perms = MODE === "lightdark"
  ? [{ input: { theme: "light", motion: "default" }, transform: lightDark, prepare: (c) => `:root {\n  color-scheme: light dark;\n  ${c}\n}` }]
  : [
      { input: { theme: "light", motion: "default" }, prepare: (c) => `:root {\n  ${c}\n}` },
      { input: { theme: "dark" }, only: { modifiers: ["theme"] }, include: ["color.bg.**", "color.text.**"], prepare: (c) => `[data-theme="dark"] {\n  ${c}\n}` },
    ];
export default defineConfig({
  tokens: ["./tokens/nizivo.resolver.json"],
  outDir: "./out/",
  plugins: [
    capture,
    css({ filename: `tw-base.${MODE}.css`, variableName: (t) => cssVar(t.id), legacyHex: true, permutations: perms }),
    tailwind({
      filename: `tailwind-theme.${MODE}.css`,
      template: "../tailwind.template.css",
      theme: { color: { bg: ["color.bg.*"], text: ["color.text.*"] } },
    }),
  ],
});
