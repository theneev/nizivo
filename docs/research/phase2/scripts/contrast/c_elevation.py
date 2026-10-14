from colorlib import *
print("== C1. Grove neutrals: CIELAB L* (= Material 'tone') and OKLCH L ==")
for k in ['n0','n25','n50','n100','n200','n300','n400','n500','n600','n700','n800','n850','n900','n950']:
    L,C,H=oklch(k); print(f"  {k:<5}{P[k]}  L*={lab_L(k):5.1f}  OKLCH L={L:.3f} C={C:.4f} h={H:5.1f}")
print("  Material 3 dark tones (color_spec_2021, default contrast): surface 6, cLowest 4, cLow 10, container 12, cHigh 17, cHighest 22, bright 24")
print("== C2. Today's dark surface ladder: adjacent contrast & dL* ==")
def pair(a,b,lab=''):
    print(f"  {lab:<40} {a}->{b}: CR {cr(a,b):.2f}  dL* {lab_L(P.get(b,b))-lab_L(P.get(a,a)):+.1f}")
pair('n950','n900','canvas -> surface'); pair('n900','n900','surface -> subtle (bug)'); pair('n900','n850','surface -> surface-raised'); pair('n850','n800','raised -> muted/hover'); pair('n800','n700','hover -> pressed')
print("  Light reference:"); pair('n50','n0','canvas -> surface (L)'); pair('n0','n25','surface -> subtle (L)'); pair('n0','n50','surface -> hover (L)'); pair('n0','n100','surface -> muted (L)')
print("== C3. dark bg/subtle: new neutral/925 matching light |dL*| of surface->subtle ==")
target=abs(lab_L('n25')-lab_L('n0')); print(f"  light |dL*| surface->subtle = {target:.2f}")
best=None
for i in range(1001):
    c=lerp_oklch(P['n900'],P['n950'],i/1000); d=lab_L(P['n900'])-lab_L(c)
    if d>=target: best=(c,i/1000,d); break
print(f"  n925 = {best[0]} (t={best[1]:.3f} n900->n950), dL*={best[2]:.2f}; CR vs n900 {cr(best[0],'n900'):.3f}, vs n950 {cr(best[0],'n950'):.3f}")
P['n925']=best[0]
print("== C4. Proposed dark elevation (tonal step + hairline ring + black shadow) ==")
ring=lambda bg,a: blend('#ffffff',a,bg)
for lvl,bg,under in [('L1 card','n900','n950'),('L2 raised/hover-lift','n850','n950'),('L3 popover/menu','n850','n900'),('L4 modal/drawer','n800','n950')]:
    for a in (0.06,0.08,0.10):
        rc=ring(bg,a); print(f"  {lvl:<22} fill {bg} on {under}: fill CR {cr(bg,under):.2f} dL* {lab_L(P[bg])-lab_L(P[under]):+.1f}; ring white@{a:.2f} -> {rc} CR vs outside {cr(rc,under):.2f}")
print("  L4 alternative modal fill n850 over scrimmed canvas: see C5")
print("== C5. Scrim ==")
for lab,ink,a,bg in [('L designer evidence: n900 @0.32 over canvas n50','n900',0.32,'n50'),('L n900 @0.32 over surface n0','n900',0.32,'n0'),
                     ('D bug: bg/inverse(white) @0.32 over n950','n0',0.32,'n950'),
                     ('D proposal: black @0.60 over n950','black',0.60,'n950'),('D proposal: black @0.60 over n900','black',0.60,'n900'),('D proposal: black @0.48 over n900','black',0.48,'n900')]:
    s=blend(ink,a,bg); print(f"  {lab:<50} -> {s}  L*={lab_L(s):5.1f}")
sl=blend('n900',0.32,'n50'); print(f"  L modal white vs scrimmed canvas {sl}: CR {cr('n0',sl):.2f}")
for fill in ('n850','n800'):
    sd=blend('black',0.60,'n950'); print(f"  D modal {fill} vs scrimmed canvas {sd}: CR {cr(fill,sd):.2f}, dL* {lab_L(P[fill])-lab_L(sd):+.1f}")
    sd=blend('black',0.60,'n900'); print(f"  D modal {fill} vs scrimmed surface {sd}: CR {cr(fill,sd):.2f}, dL* {lab_L(P[fill])-lab_L(sd):+.1f}")
print("== C6. Hover/pressed must stay distinct on each elevated fill ==")
for fill in ('n900','n850','n800'):
    for st in ('n800','n700'):
        print(f"  {fill} vs {st}: CR {cr(fill,st):.2f} dL* {lab_L(P[st])-lab_L(P[fill]):+.1f}")
print("== C7. Hierarchy check for text options ==")
for lab,a,b in [('L secondary n600 vs tertiary n550(#666d65)','n600','#666d65'),('L primary n900 vs secondary n600','n900','n600'),
                ('D primary n50 vs secondary n400','n50','n400'),('D secondary n400 vs tertiary n450(#90988e)','n400','#90988e'),
                ('D primary n50 vs secondary n300','n50','n300'),('D secondary n300 vs tertiary n400','n300','n400')]:
    La=oklch(P.get(a,a))[0]; Lb=oklch(P.get(b,b))[0]; print(f"  {lab:<46} dOKLCH-L {abs(La-Lb):.3f}  CR between {cr(a,b):.2f}")
for k in ('n300','n400'):
    print(f"  D {k} on bg: " + ' '.join(f"{b}:{cr(k,b):.2f}" for b in ['n950','n900','n850','n800']))
print("== C8. Segment thumb/track & Empty state (dark) ==")
pair('n900','n925','surface -> subtle(new n925)'); pair('n850','n925','modal(raised) -> footer subtle n925'); pair('n850','n900','modal(raised) -> footer subtle n900 (old)')
