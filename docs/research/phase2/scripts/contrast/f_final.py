"""Final recommended mapping (Option A text ladder) verified against every background the token can sit on."""
from colorlib import *
P.update(n450='#828a81', n925='#151816', r400='#e47962', b400='#7098e0')
L=['n0','n25','n50','n100']; D=['n950','n925','n900','n850','n800']
rows=[ # token, mode, old, new, bgs, threshold, role
 ('text/secondary','L','n600','n700',L,4.5,'text'),('text/secondary','D','n400','n300',D,4.5,'text'),
 ('text/tertiary','L','n500','n600',L,4.5,'text'),('text/tertiary','D','n500','n400',D,4.5,'text'),
 ('text/critical','D','r500','r400',D,4.5,'text'),('text/info','D','b500','b400',D,4.5,'text'),
 ('text/accent (new)','L','—','g700',['n0','n25','n50'],4.5,'text'),('text/accent (new)','D','—','l300',['n950','n900','n850'],4.5,'text'),
 ('text/on-critical (new) on bg/critical','L+D','—','n0',['r600'],4.5,'text'),('text/on-critical on bg/critical-hover (new)','L+D','—','n0',['r700'],4.5,'text'),
 ('icon/warning','L','a500','a600',L+['a50'],3,'non-text'),('icon/info (new)','L','—','b600',L+['b50'],3,'non-text'),('icon/info (new)','D','—','b400',D,3,'non-text'),
 ('icon/critical','D','r500','r400',D,3,'non-text'),
 ('border/control (new)','L','n200/n300','n450',L,3,'non-text'),('border/control (new)','D','n800/n700','n500',D,3,'non-text'),
 ('border/control-hover (new)','L','n300','n500',L,3,'non-text'),('border/control-hover (new)','D','n700','n400',D,3,'non-text'),
 ('border/warning','L','a500','a600',L,3,'non-text'),('border/critical','L','r500','r500',L,3,'non-text'),('border/critical','D','r500','r500',['n950','n925','n900','n850'],3,'non-text'),
 ('border/focus (2px outline)','L','g500','g500',L+['g50'],3,'focus'),('border/focus (2px outline)','D','g300','g300',D,3,'focus'),
]
print("| token | mode | was | now | contrast vs each background | min | need | result |")
print("|---|---|---|---|---|---|---|---|")
for tok,mode,old,new,bgs,t,role in rows:
    vals=', '.join(f"{b} {cr(new,b):.2f}" for b in bgs); m=min(cr(new,b) for b in bgs)
    oldm=min(cr(old,b) for b in bgs) if old in P else None
    was=f"{old} ({oldm:.2f})" if oldm else old
    print(f"| `{tok}` | {mode} | {was} | {new} `{P[new]}` | {vals} | **{m:.2f}** | {t}:1 | {'pass' if m>=t else 'FAIL'} |")
