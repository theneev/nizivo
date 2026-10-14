import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
const cssVar = (id) => `--nz-${id.replace(/^color\./, "").replace(/\./g, "-")}`;
/** Minimal custom Tailwind adapter: one runtime variable set; utilities reference the semantic vars. */
const nzTailwind = ({ filename, map }) => ({
  name: "nz-tailwind",
  enforce: "post",
  async build({ getTransforms, outputFile }) {
    const lines = [];
    for (const [twPrefix, glob] of Object.entries(map)) {
      for (const t of getTransforms({ format: "css", id: glob, input: { theme: "light", motion: "default" } })) {
        lines.push(`  --${twPrefix}-${t.token.id.split(".").slice(2).join("-")}: var(${t.localID});`);
      }
    }
    outputFile(filename, `@theme inline {\n${lines.join("\n")}\n}\n`);
  },
});
export default defineConfig({
  tokens: ["./tokens/nizivo.resolver.json"],
  outDir: "./out/",
  plugins: [
    css({ filename: "twcustom-base.css", variableName: (t) => cssVar(t.id), legacyHex: true,
      permutations: [{ input: { theme: "light", motion: "default" }, prepare: (c) => `:root {\n  ${c}\n}` }] }),
    nzTailwind({ filename: "tailwind-theme.custom.css", map: { "color-bg": "color.bg.*", "color-text": "color.text.*" } }),
  ],
});
