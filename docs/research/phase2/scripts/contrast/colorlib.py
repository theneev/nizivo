"""WCAG 2.x contrast + OKLCH/CIELAB helpers for the Grove palette (stdlib only)."""
import math
P = dict(
 n0='#ffffff',n25='#fbfbf9',n50='#f6f7f4',n100='#eef0ec',n200='#e2e5df',n300='#cbd0c8',n400='#9ea59c',n500='#747c73',
 n600='#596058',n700='#414741',n800='#2b302c',n850='#202421',n900='#181b19',n950='#101311',
 g25='#f4f8f5',g50='#e9f3ec',g100='#d3e8da',g200='#aad3b9',g300='#79b993',g400='#4c9e71',g500='#2e8358',g600='#216c47',
 g700='#1a573a',g800='#15452f',g900='#103324',g950='#0a211a',
 l50='#f6fae8',l100='#ecf5cb',l200='#dcec9c',l300='#c6e06a',l400='#afd146',l500='#8db22b',l600='#6b8a1e',
 r50='#fdf1ee',r100='#faddd6',r500='#d6492f',r600='#b93a23',r700='#8f2c1a',
 a50='#fdf6e6',a100='#fae8bf',a500='#d99a1b',a600='#b07b0e',a700='#7c560a',
 b50='#eef3fc',b100='#d8e4f8',b500='#3d6fd1',b600='#2e58b0',b700='#22427f',
 black='#000000')
def rgb(h):
    h=h.lstrip('#'); return [int(h[i:i+2],16)/255 for i in (0,2,4)]
def hexof(c): return '#'+''.join('%02x'%max(0,min(255,round(x*255))) for x in c)
def lin(x): return x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4
def delin(x): return 12.92*x if x<=0.0031308 else 1.055*x**(1/2.4)-0.055
def lum(h):
    r,g,b=[lin(x) for x in rgb(h)]; return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    a=P.get(a,a); b=P.get(b,b); la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
def blend(fg,alpha,bg):
    fg=P.get(fg,fg); bg=P.get(bg,bg)
    f=rgb(fg); b=rgb(bg); return hexof([alpha*x+(1-alpha)*y for x,y in zip(f,b)])
# OKLab / OKLCH
def to_oklab(h):
    r,g,b=[lin(x) for x in rgb(P.get(h,h))]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=[math.copysign(abs(v)**(1/3),v) for v in (l,m,s)]
    return (0.2104542553*l+0.7936177850*m-0.0040720468*s,
            1.9779984951*l-2.4285922050*m+0.4505937099*s,
            0.0259040371*l+0.7827717662*m-0.8086757660*s)
def from_oklab(L,a,b):
    l=L+0.3963377774*a+0.2158037573*b; m=L-0.1055613458*a-0.0638541728*b; s=L-0.0894841775*a-1.2914855480*b
    l,m,s=l**3,m**3,s**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return hexof([delin(max(0,min(1,x))) for x in (r,g,bb)])
def oklch(h):
    L,a,b=to_oklab(h); C=math.hypot(a,b); H=math.degrees(math.atan2(b,a))%360; return L,C,H
def from_oklch(L,C,H):
    return from_oklab(L,C*math.cos(math.radians(H)),C*math.sin(math.radians(H)))
def lerp_oklch(h1,h2,t):
    L1,C1,H1=oklch(h1); L2,C2,H2=oklch(h2)
    dh=((H2-H1+180)%360)-180
    if C1<0.02: H1=H2
    if C2<0.02: H2=H1; dh=0
    return from_oklch(L1+(L2-L1)*t, C1+(C2-C1)*t, (H1+dh*t)%360)
def lab_L(h):
    # CIELAB L* (D65) == Material "tone"
    Y=lum(P.get(h,h)); return 116*(Y**(1/3))-16 if Y>216/24389 else Y*24389/27
def solve_step(h1,h2,bgs,target,mode='min'):
    """Smallest t in [0,1] along OKLCH h1->h2 such that min contrast over bgs >= target. Returns (hex,t,mincr)."""
    best=None
    for i in range(0,1001):
        t=i/1000; c=lerp_oklch(P.get(h1,h1),P.get(h2,h2),t); m=min(cr(c,b) for b in bgs)
        if m>=target: return c,t,m
    return None
