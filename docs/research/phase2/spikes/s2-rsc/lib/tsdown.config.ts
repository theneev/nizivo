import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts", "src/b.ts"],
  format: ["esm"],
  platform: "neutral",
  unbundle: true,
  dts: false,
  sourcemap: false,
  clean: true,
  external: [/^react/],
});
