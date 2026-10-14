from colorlib import *
P.update(n450='#90988e', n550='#666d65', r400='#e47962', b400='#7098e0', n925='#151816')
LBG=['n0','n25','n50','n100']; DBG=['n950','n900','n850','n800']
def chk(tok,mode,fg,bgs,t):
    vals=' '.join(f"{b}={cr(fg,b):.2f}" for b in bgs); m=min(cr(fg,b) for b in bgs)
    print(f"| `{tok}` | {mode} | {fg} ({P[fg]}) | {vals} | **{m:.2f}** | {'pass' if m>=t else 'FAIL'} ({t}:1) |")
print("| token | mode | value | contrast per background | min | verdict |\n|---|---|---|---|---|---|")
chk('text/tertiary','L','n550',LBG,4.5); chk('text/tertiary','D','n450',DBG,4.5)
chk('text/secondary','L','n600',LBG,4.5); chk('text/secondary','D','n400',DBG,4.5)
chk('text/critical','D','r400',DBG+['n925'],4.5); chk('text/info','D','b400',DBG+['n925'],4.5)
chk('icon/info','L','b600',LBG+['b50'],3); chk('icon/info','D','b400',DBG,3)
chk('icon/warning','L','a600',LBG+['a50'],3)
chk('text/on-critical on bg/critical','L+D','n0',['r600'],4.5); chk('text/on-critical on bg/critical-hover','L+D','n0',['r700'],4.5)
chk('border/control','L','n500',LBG,3); chk('border/control','D','n500',DBG,3)
chk('border/control-hover','L','n600',LBG,3); chk('border/control-hover','D','n400',DBG,3)
chk('border/focus (outline)','L','g500',LBG+['g50'],3); chk('border/focus (outline)','D','g300',DBG+['n925'],3)
chk('text/accent','L','g700',['n0','n25','n50'],4.5); chk('text/accent','D','l300',['n950','n900','n850'],4.5)
print("\nBorder ladder (decorative, no WCAG minimum) vs surface / raised:")
for lab,seq,bgs in [('L',['n100','n200','n300','n450','n500'],['n0','n50']),('D (proposed)',['n800','n700','n600','n500','n400'],['n900','n850'])]:
    for k in seq: print(f"  {lab} {k}: "+' '.join(f"vs {b} {cr(k,b):.2f}" for b in bgs))
print("\ncritical button fill red600 vs dark canvas/surface (not required by 1.4.11 when label identifies):", ' '.join(f"{b}={cr('r600',b):.2f}" for b in ['n950','n900','n850']))
# disabled ordering sanity
print("disabled (exempt) L n400 on n100:",round(cr('n400','n100'),2)," D n600 on n800:",round(cr('n600','n800'),2))
# red400 / blue400 also as dark icon/critical? 
print("D icon/critical red400 on n800:",round(cr('r400','n800'),2), " red500 on n800:", round(cr('r500','n800'),2))
print("OKLCH new prims:"); [print(" ",k,P[k],[round(x,3) for x in oklch(k)]) for k in ('n450','n550','n925','r400','b400')]
print("\nSwitch off-track n500 vs surfaces & white knob:", ' '.join(f"{b}={cr('n500',b):.2f}" for b in ['n0','n50']), " knob n0 on n500:", round(cr('n0','n500'),2))
print("Dark switch off-track n500 vs n900/n850:", round(cr('n500','n900'),2), round(cr('n500','n850'),2), " knob n50 on n500:", round(cr('n50','n500'),2))
print("Tooltip/Toast inverse (opposite scheme): light-mode toast = dark tokens on n900: text/primary n50", round(cr('n50','n900'),2), "tertiary n450", round(cr('n450','n900'),2), "focus g300", round(cr('g300','n900'),2), "icon/success g300", round(cr('g300','n900'),2))
print("  dark-mode toast = light tokens on white: text/primary n900", round(cr('n900','n0'),2), "tertiary n550", round(cr('n550','n0'),2), "focus g500", round(cr('g500','n0'),2), "icon/success g500", round(cr('g500','n0'),2), "text/accent g700", round(cr('g700','n0'),2))
