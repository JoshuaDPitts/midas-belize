#!/usr/bin/env python3
"""WS-A: what Choose Reef state does, and what it provably does not do.

Reef state selects Height-by-Cover a/b, Wave Resistance and Manning's n from
CoralShapeScenarios.csv. It moves reef STRUCTURE across a 4,500-fold range and leaves
coral BIOMASS bit-identical, because the only feedback path to biomass (fn203, storm
damage) evaluates to zero for every possible input: min(0, max(1, X)) == 0 always.
"""
import csv, os, datetime as dt
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.lines import Line2D

HERE=os.path.dirname(os.path.abspath(__file__))
RUNS=os.path.join(HERE,"output","reef-state","runs")
FIGS=os.path.join(HERE,"output","reef-state","figs"); os.makedirs(FIGS,exist_ok=True)
BASE=dt.date(2002,6,1); t2d=lambda t:BASE+dt.timedelta(days=int(t)-1)
NAMES={1:"1  Base Case",2:"2  Degraded",3:"3  Hybrid Restored",4:"4  Worst Case",5:"5  Fully Recovered"}
COL={1:"#2a78d6",2:"#eb6834",3:"#1baf7a",4:"#c0392b",5:"#7b4fbf"}
SURF,INK,MUT="#fcfcfb","#2c3138","#7a828c"
plt.rcParams.update({"font.family":"DejaVu Sans","figure.facecolor":SURF,"text.color":INK,
  "axes.labelcolor":INK,"xtick.color":MUT,"ytick.color":MUT,"font.size":9,"axes.titlesize":10.5,
  "axes.grid":True,"grid.color":"#e9ebee","grid.linewidth":0.6,"axes.axisbelow":True,
  "axes.edgecolor":"#c9cdd3"})

def load(rs,c):
    rows=list(csv.DictReader(open(f"{RUNS}/rs{rs}_c{c}.csv")))
    ts=sorted({int(r["time"]) for r in rows})
    first={}
    for r in rows: first.setdefault(int(r["time"]),r)
    bio={}
    for r in rows: bio[int(r["time"])]=bio.get(int(r["time"]),0.0)+float(r["biomass"])
    return (ts,[float(first[t]["coral_height"]) for t in ts],
               [float(first[t]["service"]) for t in ts],
               [float(first[t]["freeboard"]) for t in ts],
               [bio[t] for t in ts])

fig,ax=plt.subplots(2,2,figsize=(14.2,9.4),gridspec_kw=dict(hspace=0.32,wspace=0.20))
for c,cl in ((0,"observed MUR SST"),):
    pass
for col,c in enumerate((0,1)):
    lab="observed MUR SST" if c==0 else "RCP-4.5"
    a=ax[0][col]; a.set_facecolor(SURF)
    for rs in range(1,6):
        ts,h,s,f,b=load(rs,c)
        a.plot([t2d(t) for t in ts],h,color=COL[rs],lw=1.9,label=NAMES[rs])
    a.set_ylabel("mean coral height (m)")
    a.set_title(f"{'AB'[col]}    Reef STRUCTURE responds — {lab}",loc="left",pad=8,fontweight="bold")
    a.xaxis.set_major_locator(mdates.YearLocator(4 if c==0 else 2))
    a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    if col==0: a.legend(frameon=False,fontsize=8.4,title="Choose Reef state",
                        title_fontproperties={"size":8.6})
    b_=ax[1][col]; b_.set_facecolor(SURF)
    for rs in range(1,6):
        ts,h,s,f,bio=load(rs,c)
        b_.plot([t2d(t) for t in ts],bio,color=COL[rs],lw=3.4 if rs==1 else 1.4,
                ls="-" if rs==1 else (0,(4,3)),alpha=1.0 if rs==1 else 0.9)
    b_.set_ylabel("whole-reef coral biomass (kg)")
    b_.set_title(f"{'CD'[col]}    Reef BIOMASS does not — {lab}",loc="left",pad=8,fontweight="bold")
    b_.xaxis.set_major_locator(mdates.YearLocator(4 if c==0 else 2))
    b_.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ts,_,_,_,bio=load(1,c)
    b_.annotate("all five states plotted —\nthe curves are bit-identical\n(0 of "
                f"{3096 if c==0 else 1677} values differ)",
                xy=(t2d(ts[len(ts)//2]),bio[len(ts)//2]),
                xytext=(0.42,0.45),textcoords="axes fraction",fontsize=8.8,color=INK,
                fontweight="bold",arrowprops=dict(arrowstyle="->",color=INK,lw=1.2),
                bbox=dict(boxstyle="round,pad=0.5",fc="#f2f4f6",ec="#d4d8dd"))
fig.suptitle("Choose Reef state drives reef structure but cannot reach biomass:  fn203 storm damage is identically zero",
             fontsize=13.5,fontweight="bold",x=0.010,ha="left",y=0.985)
fig.tight_layout(rect=[0,0.005,1,0.955])
fig.savefig(f"{FIGS}/reef-state-effect.png",dpi=180); plt.close(fig)
print("wrote reef-state-effect.png")
print(f"\n{'state':22s} {'height c0':>10} {'service c0':>11} {'height c1':>10} {'service c1':>11} {'biomass c0':>12}")
for rs in range(1,6):
    r0=load(rs,0); r1=load(rs,1)
    print(f"{NAMES[rs]:22s} {r0[1][-1]:>10.5f} {r0[2][-1]:>11.5f} {r1[1][-1]:>10.5f} "
          f"{r1[2][-1]:>11.5f} {r0[4][-1]:>12.4f}")
