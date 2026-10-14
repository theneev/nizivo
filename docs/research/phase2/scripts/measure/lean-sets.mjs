// Same method as r3 bench/tools/combos.mjs: esbuild bundle+minify, ESM, production, React external, gzip -9 / brotli.
import * as esbuild from 'esbuild';
import zlib from 'node:zlib'; import path from 'node:path';
const nm = process.argv[2];
const A = (xs) => xs.map(x=>`export * from 'react-aria-components/${x}'`).join(';');
const cases = {
  'C2 RAC dashboard page (repro of r3 69.0)': A(['Modal','Dialog','Popover','Menu','Select','ListBox','Tabs','Tooltip']),
  'L1 RAC Menu + Popover (row-action menu page)': A(['Menu','Popover']),
  'L2 RAC Menu + Popover + Select + ListBox': A(['Menu','Popover','Select','ListBox']),
  'L3 RAC Menu + Popover + Select + ListBox + Tabs (lean engine set)': A(['Menu','Popover','Select','ListBox','Tabs']),
  'L4 RAC Modal + Dialog + Tooltip (what native/own replaces)': A(['Modal','Dialog','Tooltip']),
  'F1 @floating-ui/dom computePosition+offset+flip+shift': `export { computePosition, offset, flip, shift, autoUpdate } from '@floating-ui/dom'`,
};
for (const [name, src] of Object.entries(cases)) {
  try {
    const r = await esbuild.build({ stdin:{contents:src,resolveDir:nm,loader:'js'}, bundle:true, minify:true, format:'esm', write:false, logLevel:'silent', define:{'process.env.NODE_ENV':'"production"'}, conditions:['production','browser','import','module'], nodePaths:[nm], external:['react','react-dom','react/*','react-dom/*'] });
    const b = Buffer.from(r.outputFiles[0].contents);
    console.log(name.padEnd(70), (zlib.gzipSync(b,{level:9}).length/1024).toFixed(1)+' KB gz', (zlib.brotliCompressSync(b).length/1024).toFixed(1)+' KB br');
  } catch (e) { console.log(name.padEnd(70), 'FAILED', e.message.split('\n')[0]); }
}
