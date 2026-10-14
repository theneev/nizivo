import { gzipSync, brotliCompressSync } from "node:zlib";
const base = "http://localhost:3417";
const markers = { button: "nz-button-marker-7f3a", dialog: "nz-dialog-marker-91bc", sheet: "nz-sheet-marker-c4d2", exportAll: "__exportAll" };
const cache = new Map();
async function get(u) { if (!cache.has(u)) cache.set(u, await (await fetch(u)).text()); return cache.get(u); }
const pages = process.argv.slice(2);
const results = {};
for (const p of pages) {
  const html = await get(base + p);
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  // also chunks referenced in the inline flight payload (client reference chunk lists)
  const flightChunks = [...new Set([...html.matchAll(/static\/chunks\/[A-Za-z0-9_\-.~]+\.js/g)].map((m) => "/_next/" + m[0]))];
  const all = [...new Set([...srcs, ...flightChunks])];
  let raw = 0, gz = 0, br = 0; const hits = {};
  for (const s of all) {
    const js = await get(s.startsWith("http") ? s : base + s);
    raw += Buffer.byteLength(js); gz += gzipSync(js).length; br += brotliCompressSync(js).length;
    for (const [k, v] of Object.entries(markers)) if (js.includes(v)) (hits[k] ??= []).push(s.split("/").pop());
  }
  const htmlMarkers = Object.fromEntries(Object.entries(markers).map(([k, v]) => [k, html.includes(v)]));
  results[p] = { scripts: all.length, rawKB: +(raw / 1024).toFixed(1), gzKB: +(gz / 1024).toFixed(1), brKB: +(br / 1024).toFixed(1), markerHitsInJS: hits, markersInHTML: htmlMarkers };
}
console.log(JSON.stringify(results, null, 2));
