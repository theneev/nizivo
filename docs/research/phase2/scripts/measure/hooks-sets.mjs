import * as esbuild from 'esbuild';
import zlib from 'node:zlib';
const nm = process.argv[2];
const cases = {
  'H1 react-aria hooks: menu trigger/menu/item + popover/overlay + stately': `
    export { useMenuTrigger, useMenu, useMenuItem, useMenuSection, useSeparator, usePopover, Overlay, DismissButton, useFocusRing, mergeProps, useId } from 'react-aria';
    export { useMenuTriggerState, useTreeState, Item, Section } from 'react-stately';`,
  'H2 H1 + select/listbox/option + HiddenSelect': `
    export { useMenuTrigger, useMenu, useMenuItem, useMenuSection, useSeparator, usePopover, Overlay, DismissButton, useFocusRing, mergeProps, useId, useSelect, useListBox, useOption, HiddenSelect, useButton } from 'react-aria';
    export { useMenuTriggerState, useTreeState, useSelectState, Item, Section } from 'react-stately';`,
  'H3 H2 + tabs': `
    export { useMenuTrigger, useMenu, useMenuItem, useMenuSection, useSeparator, usePopover, Overlay, DismissButton, useFocusRing, mergeProps, useId, useSelect, useListBox, useOption, HiddenSelect, useButton, useTabList, useTab, useTabPanel } from 'react-aria';
    export { useMenuTriggerState, useTreeState, useSelectState, useTabListState, Item, Section } from 'react-stately';`,
  'R1 Radix dropdown-menu only': `export * from 'radix-ui/dropdown-menu'`,
};
for (const [name, src] of Object.entries(cases)) {
  try {
    const r = await esbuild.build({ stdin:{contents:src,resolveDir:nm,loader:'js'}, bundle:true, minify:true, format:'esm', write:false, logLevel:'silent', define:{'process.env.NODE_ENV':'"production"'}, conditions:['production','browser','import','module'], nodePaths:[nm], external:['react','react-dom','react/*','react-dom/*'] });
    const b = Buffer.from(r.outputFiles[0].contents);
    console.log(name.padEnd(72), (zlib.gzipSync(b,{level:9}).length/1024).toFixed(1)+' KB gz', (zlib.brotliCompressSync(b).length/1024).toFixed(1)+' KB br');
  } catch (e) { console.log(name.padEnd(72), 'FAILED', (e.errors?.[0]?.text ?? e.message).split('\n')[0]); }
}
