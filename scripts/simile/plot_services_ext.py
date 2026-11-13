#!/usr/bin/env python3
"""Reef-state service panels, any climate forcing, on a matched 24-year axis.

Corrections applied vs the first version:
  * "Location EDC" is Energy Dissipation Capacity (fn108, area-weighted per polygon),
    NOT a damage cost. Relabelled.
  * "(saturated)" moved out of the panel title into the caption.
  * Scope stated on the figure: no planting, mean of 43 polygons, depth bands 3-5.
Usage: plot_services_ext.py <climate_key> <caption>
"""
import csv, os, sys, datetime as dt
from collections import defaultdict
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

HERE=os.path.dirname(os.path.abspath(__file__))
RUNS=os.path.join(HERE,"output","services","runs")
FIGS=os.path.join(HERE,"output","services","figs"); os.makedirs(FIGS,exist_ok=True)
BASE=dt.date(2002,6,1); t2d=lambda t:BASE+dt.timedelta(days=int(t)-1)
NAMES={1:"1  Base Case",2:"2  Degraded",3:"3  Hybrid Restored",4:"4  Worst Case",5:"5  Fully Recovered"}
COL={1:"#2a78d6",2:"#eb6834",3:"#1baf7a",4:"#c0392b",5:"#7b4fbf"}
SURF,INK,MUT="#fcfcfb","#2c3138","#7a828c"
plt.rcParams.update({"font.family":"DejaVu Sans","figure.facecolor":SURF,"text.color":INK,
 "axes.labelcolor":INK,"xtick.color":MUT,"ytick.color":MUT,"font.size":9,"axes.titlesize":10.5,
 "axes.grid":True,"grid.color":"#e9ebee","grid.linewidth":0.6,"axes.axisbelow":True,
 "axes.edgecolor":"#c9cdd3"})
COLS=["height","friction","energy_diss","disp_cap","service_ind","loc_service","loc_edc"]

def load(rs,key):
    t_e=defaultdict(lambda: defaultdict(list))
    for r in csv.DictReader(open(f"{RUNS}/wsa_rs{rs}_{key}.csv")):
        t_e[int(float(r["time"]))][int(r["ebin"])].append(tuple(float(r[c]) for c in COLS))
    out={}
    for t,es in t_e.items():
        out[t]={e:tuple(sum(x[i] for x in v)/len(v) for i in range(len(COLS))) for e,v in es.items()}
    return out
def reef_mean(d,idx,ebins=(3,4,5)):
    ts=sorted(d); return ts,[sum(d[t][e][idx] for e in ebins if e in d[t])/len(ebins) for t in ts]

VARS=[(0,"mean coral height (m)","A    Coral height",True),
      (1,"bottom friction (Manning's n)","B    Bottom friction",False),
      (2,"wave energy dissipated (W)","C    Wave energy dissipation",False),
      (3,"energy dissipation capacity","D    Dissipation capacity",True),
      (4,"fraction of wave energy removed","E    Erosion prevention indicator",False),
      (6,"Energy Dissipation Capacity\n(area-weighted per polygon)","F    Location EDC",True)]

key, caption = sys.argv[1], sys.argv[2]
D={rs:load(rs,key) for rs in range(1,6)}
XMIN,XMAX=dt.date(2002,1,1),dt.date(2027,1,1)
fig,ax=plt.subplots(2,3,figsize=(16.2,8.8),gridspec_kw=dict(hspace=0.36,wspace=0.28))
for k,(idx,ylab,title,logy) in enumerate(VARS):
    a=ax[k//3][k%3]; a.set_facecolor(SURF)
    for rs in range(1,6):
        ts,v=reef_mean(D[rs],idx)
        a.plot([t2d(t) for t in ts],v,color=COL[rs],lw=1.8,label=NAMES[rs])
    a.set_ylabel(ylab); a.set_title(title,loc="left",pad=7,fontweight="bold")
    a.set_xlim(XMIN,XMAX)
    a.xaxis.set_major_locator(mdates.YearLocator(4))
    a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    if logy: a.set_yscale("log")
    if k==0: a.legend(frameon=False,fontsize=8.0,title="Choose Reef state",
                      title_fontproperties={"size":8.4})
fig.suptitle(f"Reef state and ecosystem services: {caption}",
             fontsize=13.5,fontweight="bold",x=0.010,ha="left",y=0.985)
fig.text(0.010,0.935,"No planting. Mean of all 43 polygons, depth bands 3 to 5 (2 to 5 m, 1 to 2 m, "
         "0 to 1 m crest). Panel E is near its ceiling in every case: the reef already removes "
         "about 99.5 percent of wave energy at Base Case.",
         fontsize=8.6,color=MUT,ha="left")
fig.tight_layout(rect=[0,0.005,1,0.915])
out=f"{FIGS}/services-{key}.png"
fig.savefig(out,dpi=180); plt.close(fig)
print("wrote",out)
for rs in (5,3,1,2,4):
    ts,h=reef_mean(D[rs],0); _,e=reef_mean(D[rs],4)
    print(f"   rs{rs} {NAMES[rs]:20s} height {h[0]:8.5f} -> {h[-1]:8.5f}   erosion prev {e[0]:.5f} -> {e[-1]:.5f}")
