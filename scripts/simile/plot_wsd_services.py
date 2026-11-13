#!/usr/bin/env python3
"""WS-D: does outplanting deliver ecosystem service, and does that depend on reef state?

SP1's 13 polygons planted with 90 kg each (1,170 kg total), run at all five reef states
and both climates. Effect is planted-minus-unplanted at the same polygon and reef state.
"""
import csv, os, datetime as dt
from collections import defaultdict
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

HERE=os.path.dirname(os.path.abspath(__file__))
RUNS=os.path.join(HERE,"output","services","runs")
FIGS=os.path.join(HERE,"output","services","figs"); os.makedirs(FIGS,exist_ok=True)
BASE=dt.date(2002,6,1); t2d=lambda t:BASE+dt.timedelta(days=int(t)-1)
SP1=[12,13,14,15,16,17,18,24,25,26,27,28,29]
NAMES={1:"1  Base Case",2:"2  Degraded",3:"3  Hybrid Restored",4:"4  Worst Case",5:"5  Fully Recovered"}
COL={1:"#2a78d6",2:"#eb6834",3:"#1baf7a",4:"#c0392b",5:"#7b4fbf"}
SURF,INK,MUT="#fcfcfb","#2c3138","#7a828c"
plt.rcParams.update({"font.family":"DejaVu Sans","figure.facecolor":SURF,"text.color":INK,
 "axes.labelcolor":INK,"xtick.color":MUT,"ytick.color":MUT,"font.size":9,"axes.titlesize":10.5,
 "axes.grid":True,"grid.color":"#e9ebee","grid.linewidth":0.6,"axes.axisbelow":True,
 "axes.edgecolor":"#c9cdd3"})
COLS=["height","friction","energy_diss","disp_cap","service_ind","loc_service","loc_edc"]

def baseline(rs,c):
    """unplanted values, keyed (time, polygon, ebin)"""
    out={}
    for r in csv.DictReader(open(f"{RUNS}/wsa_rs{rs}_c{c}.csv")):
        k=(int(float(r["time"])),int(r["polygon"]),int(r["ebin"]))
        out[k]=tuple(float(r[x]) for x in COLS)
    return out
def planted(p,rs,c):
    out={}
    for r in csv.DictReader(open(f"{RUNS}/wsd_p{p:02d}_rs{rs}_c{c}.csv")):
        k=(int(float(r["time"])),int(r["polygon"]),int(r["ebin"]))
        out[k]=tuple(float(r[x]) for x in COLS)
    return out

RES={}
for c in (0,1):
    for rs in range(1,6):
        B=baseline(rs,c)
        agg=defaultdict(lambda:[0.0]*len(COLS))
        for p in SP1:
            P=planted(p,rs,c)
            for k,v in P.items():
                if k in B:
                    for i in range(len(COLS)): agg[k[0]][i]+=v[i]-B[k][i]
        RES[(rs,c)]=dict(agg)
        # note: EBIN-level sums; loc_* repeat per ebin so divide by 7 for those
print(f"{'reef state':20s} {'Δheight (m)':>13} {'Δfriction':>11} {'Δdissipation':>14} {'ΔEDC':>12}")
SUM={}
for c in (0,):
    for rs in range(1,6):
        d=RES[(rs,c)]; ts=sorted(d)
        peak=max(ts,key=lambda t:d[t][0])
        SUM[rs]=(d[peak][0],d[peak][1],d[peak][2],d[peak][6]/7.0)
        print(f"{NAMES[rs]:20s} {SUM[rs][0]:>13.5f} {SUM[rs][1]:>11.5f} {SUM[rs][2]:>14.2f} {SUM[rs][3]:>12.1f}")

fig,ax=plt.subplots(2,2,figsize=(14.4,9.2),gridspec_kw=dict(hspace=0.32,wspace=0.22))
for col,c in enumerate((0,1)):
    clab="observed MUR SST" if c==0 else "RCP-4.5"
    a=ax[0][col]; a.set_facecolor(SURF)
    for rs in range(1,6):
        d=RES[(rs,c)]; ts=sorted(d)
        a.plot([t2d(t) for t in ts],[d[t][0] for t in ts],color=COL[rs],lw=1.9,label=NAMES[rs])
    a.set_ylabel("added coral height, SP1 total (m)")
    a.set_title(f"{'AB'[col]}    Height gained from planting 1,170 kg — {clab}",loc="left",pad=8,fontweight="bold")
    a.xaxis.set_major_locator(mdates.YearLocator(4 if c==0 else 2))
    a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    if col==0: a.legend(frameon=False,fontsize=8.2,title="Choose Reef state",
                        title_fontproperties={"size":8.5})
    b=ax[1][col]; b.set_facecolor(SURF)
    for rs in range(1,6):
        d=RES[(rs,c)]; ts=sorted(d)
        b.plot([t2d(t) for t in ts],[d[t][6]/7.0 for t in ts],color=COL[rs],lw=1.9)
    b.set_ylabel("added erosion damage cost avoided (EDC)")
    b.set_title(f"{'CD'[col]}    Coastal-protection value gained — {clab}",loc="left",pad=8,fontweight="bold")
    b.xaxis.set_major_locator(mdates.YearLocator(4 if c==0 else 2))
    b.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
fig.suptitle("WS-D  Planting × reef state: the same 1,170 kg buys very different amounts of coastal protection",
             fontsize=13.5,fontweight="bold",x=0.010,ha="left",y=0.985)
fig.tight_layout(rect=[0,0.005,1,0.955])
fig.savefig(f"{FIGS}/wsd-planting-by-reef-state.png",dpi=180); plt.close(fig)
print("\nwrote wsd-planting-by-reef-state.png")
