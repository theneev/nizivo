from colorlib import *
LBG=['n0','n25','n50','n100']           # light text backgrounds incl. hover(n50) & muted(n100)
DBG=['n950','n900','n850','n800']       # dark: canvas, surface, raised/critical-subtle, hover/muted
def row(label,fg,bgs,t):
    vals=' '.join(f"{b}:{cr(fg,b):.2f}" for b in bgs); m=min(cr(fg,b) for b in bgs)
    print(f"  {label:<44} {P.get(fg,fg)}  min {m:5.2f} {'PASS' if m>=t else 'FAIL'}  [{vals}]")
print("== B1. text/tertiary LIGHT ==")
row("n500 (today)",'n500',LBG,4.5); row("n600 (= text/secondary)",'n600',LBG,4.5)
for tgt,bgs,lab in [(4.5,LBG,'>=4.50 incl muted'),(4.6,LBG,'>=4.60 incl muted (margin)'),(4.6,['n0','n25','n50'],'>=4.60 excl muted')]:
    c,t,m=solve_step('n500','n600',bgs,tgt); P['tmp']=c; row(f"new n550 t={t:.3f} {lab}",c,LBG,4.5)
print("   separation tertiary(new) vs secondary n600: see below")
print("== B2. text/tertiary DARK ==")
row("n500 (today)",'n500',DBG,4.5); row("n400 (= text/secondary dark)",'n400',DBG,4.5)
for tgt,bgs,lab in [(4.5,DBG,'>=4.5 incl n800 hover'),(4.6,DBG,'>=4.6 incl n800'),(4.6,['n950','n900','n850'],'>=4.6 excl n800')]:
    c,t,m=solve_step('n500','n400',bgs,tgt); row(f"new n450 t={t:.3f} {lab}",c,DBG,4.5)
print("== B3. border/control (input/checkbox/radio/switch-off boundary, 1.4.11 >=3:1) ==")
row("LIGHT n400",'n400',LBG,3); 
for tgt,bgs,lab in [(3.0,['n0','n25','n50'],'>=3.0 surface/subtle/canvas'),(3.1,['n0','n25','n50'],'>=3.1 margin'),(3.1,LBG,'>=3.1 incl muted')]:
    c,t,m=solve_step('n400','n500',bgs,tgt); row(f"LIGHT new n450 t={t:.3f} {lab}",c,LBG,3)
row("DARK n600",'n600',DBG,3); row("DARK n500",'n500',DBG,3)
for tgt,bgs,lab in [(3.0,['n950','n900','n850'],'>=3.0 canvas/surface/raised'),(3.1,['n950','n900','n850'],'>=3.1 margin'),(3.1,DBG,'>=3.1 incl n800')]:
    c,t,m=solve_step('n600','n500',bgs,tgt); row(f"DARK new n550 t={t:.3f} {lab}",c,DBG,3)
print("== B4. dark text/critical (red/400 new) ==")
for tgt in (4.5,4.6):
    c,t,m=solve_step('r500','r100',DBG,tgt); row(f"new red400 t={t:.3f} >= {tgt}",c,DBG,4.5); print("     oklch",[round(x,3) for x in oklch(c)],"vs red500",[round(x,3) for x in oklch('r500')])
print("== B5. dark text/info (blue/400 new) ==")
for tgt in (4.5,4.6):
    c,t,m=solve_step('b500','b100',DBG,tgt); row(f"new blue400 t={t:.3f} >= {tgt}",c,DBG,4.5); print("     oklch",[round(x,3) for x in oklch(c)],"vs blue500",[round(x,3) for x in oklch('b500')])
print("   also icon/info dark candidate = same blue400 (3:1 needed) ")
print("== B6. icon/warning LIGHT (3:1 on n0,n50,amber50,n100) ==")
row("amber600",'a600',['n0','n50','a50','n100'],3); row("amber700",'a700',['n0','n50','a50','n100'],3)
c,t,m=solve_step('a500','a600',['n0','n50','a50','n100'],3.0); row(f"amber550 t={t:.3f}",c,['n0','n50','a50','n100'],3)
print("   dark icon/warning amber500:"); row("amber500 dark",'a500',DBG,3)
print("== B7. bg/critical + text/on-critical ==")
for bg in ('r600','r700'): row(f"white on {bg}",'n0',[bg],4.5)
row("red600 fill vs dark canvas/surface (non-text, informative)",'r600',['n950','n900','n850'],3)
row("red500 fill vs dark canvas/surface (today)",'r500',['n950','n900','n850'],3)
print("== B8. text/accent (toast action) ==")
row("lime600 on white",'l600',['n0'],4.5)
Ll,Cl,Hl=oklch('l600')
for L in [x/1000 for x in range(600,300,-2)]:
    c=from_oklch(L,min(Cl,0.16),Hl)
    if cr(c,'n0')>=4.6: break
row(f"new lime700 (lime hue {Hl:.0f}, L={L:.3f})",c,['n0','n25','n50'],4.5)
row("green700 (text/brand light) on white",'g700',['n0','n25','n50'],4.5)
row("lime300 on n900 (light-mode toast)",'l300',['n900','n850'],4.5)
print("== B9. other status text sanity (unchanged tokens) ==")
for lab,fg,bgs,t in [("L text/secondary n600",'n600',LBG,4.5),("D text/secondary n400",'n400',DBG,4.5),
  ("L text/critical red600",'r600',LBG+['r50'],4.5),("L text/info blue600",'b600',LBG+['b50'],4.5),
  ("L text/warning amber700",'a700',LBG+['a50'],4.5),("L text/success green600",'g600',LBG+['g50'],4.5),
  ("L text/brand green700",'g700',LBG+['g50'],4.5),("D text/success green300",'g300',DBG+['g950'],4.5),
  ("D text/brand green300",'g300',DBG+['g950'],4.5),("D text/warning amber500",'a500',DBG,4.5),
  ("L icon/success green500 (3:1)",'g500',LBG+['g50'],3),("D icon/success green300",'g300',DBG,3),
  ("L icon/secondary n500 (3:1)",'n500',LBG,3),("D icon/secondary n400 (3:1)",'n400',DBG,3),
  ("L icon/critical red500 (3:1)",'r500',LBG+['r50'],3),("D icon/critical red500 (3:1)",'r500',DBG,3),
  ("L text/on-brand white on green700",'n0',['g700','g800','g900'],4.5),("D text/on-brand g950 on green400/300/200",'g950',['g400','g300','g200'],4.5)]:
    row(lab,fg,bgs,t)
