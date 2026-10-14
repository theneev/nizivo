import { transform } from "lightningcss";
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("tokens.src.css");
const safari = (maj, min) => (maj << 16) | (min << 8);
const runs = {
  "native": undefined,
  "safari-16.4": { safari: safari(16, 4) },
  "safari-17.5": { safari: safari(17, 5) },
  "chrome-111+safari-16.4+ff-115": { chrome: 111 << 16, firefox: 115 << 16, safari: safari(16, 4) },
};
for (const [name, targets] of Object.entries(runs)) {
  const { code, warnings } = transform({ filename: "tokens.src.css", code: src, minify: false, targets });
  writeFileSync(`out.${name}.css`, code);
  console.log(`/* ===== ${name} targets=${JSON.stringify(targets)} warnings=${JSON.stringify(warnings)} ===== */`);
  console.log(code.toString());
}
