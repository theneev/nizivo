import { chromium, webkit, firefox } from 'playwright-core';
const html = `<!doctype html><html><head><style>
  :root:has(dialog:modal){overflow:hidden}
  dialog{transition:opacity 200ms}
  dialog[data-exiting]{opacity:0}
  #toastIn, #toastOut{position:fixed;inset:auto 0 10px 0;margin:auto;width:200px;height:40px}
  #toastOut{bottom:80px}
</style></head><body style="height:3000px">
<button id="trigger">open</button>
<dialog id="d"><p>Dialog</p><button id="inside">inside</button>
  <div id="toastIn" popover="manual"><button id="tin">toast in dialog</button></div>
</dialog>
<div id="toastOut" popover="manual"><button id="tout">toast on body</button></div>
<script>
  window.log=[]; const d=document.getElementById('d');
  for (const id of ['tin','tout','inside']) document.getElementById(id).addEventListener('click',()=>log.push('click:'+id));
  d.addEventListener('cancel', async (e)=>{
    log.push('cancel:cancelable='+e.cancelable);
    e.preventDefault();
    d.dataset.exiting='';
    await Promise.all(d.getAnimations().map(a=>a.finished));
    log.push('after-anim open='+d.open);
    d.close(); delete d.dataset.exiting; log.push('closed');
  });
  document.getElementById('trigger').addEventListener('click',()=>{ d.showModal(); log.push('opened'); });
</script></body></html>`;
const out = {};
for (const [n, e] of Object.entries({ chromium, webkit, firefox })) {
  let b; try { b = await e.launch(); } catch (err) { out[n] = 'launch failed: ' + err.message.split('\n')[0]; continue; }
  const p = await b.newPage(); await p.setContent(html);
  const r = { version: b.version() };
  await p.click('#trigger');
  r.hasModalMatches = await p.evaluate(() => document.documentElement.matches(':has(dialog:modal)'));
  r.htmlOverflow = await p.evaluate(() => getComputedStyle(document.documentElement).overflow);
  // show both popovers AFTER the modal is open
  await p.evaluate(() => { document.getElementById('toastIn').showPopover(); document.getElementById('toastOut').showPopover(); });
  const hit = async (sel) => p.evaluate((s) => { const el = document.querySelector(s); const rc = el.getBoundingClientRect(); const top = document.elementFromPoint(rc.x + rc.width/2, rc.y + rc.height/2); return { topIsSelf: top === el || el.contains(top), inertish: el.closest('[inert]') !== null }; }, sel);
  r.toastInsideDialog = await hit('#tin');
  r.toastOnBody = await hit('#tout');
  // try real clicks (force=false so Playwright respects hit-testing)
  for (const id of ['#tin', '#tout']) { try { await p.click(id, { timeout: 1500 }); } catch (err) { r['click' + id] = 'blocked'; } }
  r.focusableBodyToast = await p.evaluate(() => { const el = document.getElementById('tout'); el.focus(); return document.activeElement === el; });
  r.focusableDialogToast = await p.evaluate(() => { const el = document.getElementById('tin'); el.focus(); return document.activeElement === el; });
  await p.evaluate(() => { document.getElementById('toastIn').hidePopover(); document.getElementById('toastOut').hidePopover(); document.getElementById('inside').focus(); });
  // Escape: first press (after the clicks above = user activation present)
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  r.afterEscOpen = await p.evaluate(() => document.getElementById('d').open);
  r.focusReturnedToTrigger = await p.evaluate(() => document.activeElement?.id);
  // Second cycle: open then Escape WITHOUT other activation in between (close-watcher anti-abuse check)
  await p.click('#trigger'); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  r.secondCycleOpen = await p.evaluate(() => document.getElementById('d').open);
  r.log = await p.evaluate(() => log);
  out[n] = r; await b.close();
}
console.log(JSON.stringify(out, null, 2));
