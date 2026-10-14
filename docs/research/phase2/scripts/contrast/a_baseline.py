from colorlib import *
print("== A. Reported failures, recomputed (WCAG 2.2 relative luminance) ==")
rows=[
 ("text/tertiary n500 on bg/surface n0 (L)","n500","n0",4.5),
 ("text/tertiary n500 on bg/subtle n25 (L)","n500","n25",4.5),
 ("text/tertiary n500 on bg/canvas n50 = bg/hover (L)","n500","n50",4.5),
 ("text/tertiary n500 on bg/muted n100 (L)","n500","n100",4.5),
 ("text/tertiary n500 on bg/canvas n950 (D)","n500","n950",4.5),
 ("text/tertiary n500 on bg/surface n900 (D)","n500","n900",4.5),
 ("text/tertiary n500 on surface-raised n850 (D)","n500","n850",4.5),
 ("text/tertiary n500 on bg/muted=hover n800 (D)","n500","n800",4.5),
 ("text/critical red500 on n900 (D)","r500","n900",4.5),
 ("text/critical red500 on critical-subtle n850 (D)","r500","n850",4.5),
 ("text/critical red500 on hover n800 (D)","r500","n800",4.5),
 ("text/info blue500 on n900 (D)","b500","n900",4.5),
 ("text/info blue500 on info-subtle n850 (D)","b500","n850",4.5),
 ("text/warning amber500 on n900 (D)","a500","n900",4.5),
 ("text/warning amber500 on n800 (D)","a500","n800",4.5),
 ("white on bg/critical red500 (D)","n0","r500",4.5),
 ("text/inverse n900 on bg/critical red500 (D)","n900","r500",4.5),
 ("n950 on bg/critical red500 (D)","n950","r500",4.5),
 ("white on bg/critical red600 (L)","n0","r600",4.5),
 ("border/default n200 vs n0 (L)","n200","n0",3),
 ("border/strong n300 vs n0 (L)","n300","n0",3),
 ("border/default n800 vs n900 (D)","n800","n900",3),
 ("border/strong n700 vs n900 (D)","n700","n900",3),
 ("icon/warning amber500 vs n0 (L)","a500","n0",3),
 ("icon/warning amber500 vs amber50 (L)","a500","a50",3),
 ("border/focus green500 vs n0 (L)","g500","n0",3),
 ("border/focus green500 vs n50 (L)","g500","n50",3),
 ("border/focus green500 vs n100 (L)","g500","n100",3),
 ("border/focus green500 vs green50 brand-subtle (L)","g500","g50",3),
 ("border/focus green300 vs n950 (D)","g300","n950",3),
 ("border/focus green300 vs n900 (D)","g300","n900",3),
 ("border/focus green300 vs n850 (D)","g300","n850",3),
 ("border/focus green300 vs n800 (D)","g300","n800",3),
 ("border/focus green500 vs n900 (inverse toast in L, no fix)","g500","n900",3),
 ("toast action bg/accent lime400 on white (D, inverse)","l400","n0",4.5),
 ("toast action lime300 on n900 (L)","l300","n900",4.5),
 ("toast success icon green300 on white (D)","g300","n0",3),
]
for n,a,b,t in rows:
    c=cr(a,b); print(f"{c:5.2f} {'PASS' if c>=t else 'FAIL'} (need {t}) {n}")
halo=blend('#2e8258',0x47/255,'n0'); print(f"{cr(halo,'n0'):5.2f} FAIL focus halo {halo} (green/500 @28%) vs white")
halo2=blend('#2e8258',0x47/255,'n50'); print(f"{cr(halo2,'n50'):5.2f} FAIL focus halo {halo2} vs canvas n50")
halod=blend('#2e8258',0x47/255,'n900'); print(f"{cr(halod,'n900'):5.2f}  focus halo (same static colour) vs dark surface n900 -> {halod}")
