#!/usr/bin/env python3
"""WS-A, reworked for ecosystem services.

Reef state does not touch biomass (confirmed by Roel as intended). What it drives is
reef STRUCTURE, and structure is what delivers the service:
    coral area -> coral height -> bottom friction -> wave energy dissipation -> erosion prevention
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
NAMES={1:"1  Base Case",2:"2  Degraded",3:"3  Hybrid Restored",4:"4  Worst Case",5:"5  Fully Recovered"}
COL={1:"#2a78d6",2:"#eb6834",3:"#1baf7a",4:"#c0392b",5:"#7b4fbf"}
EBIN={1:">20 m",2:"5–20 m",3:"2–5 m",4:"1–2 m",5:"0–1 m crest",6:"upland",7:"upland"}
SURF,INK,MUT="#fcfcfb","#2c3138","#7a828c"
plt.rcParams.update({"font.family":"DejaVu Sans","figure.facecolor":SURF,"text.color":INK,
 "axes.labelcolor":INK,"xtick.color":MUT,"ytick.color":MUT,"font.size":9,"axes.titlesize":10.5,
 "axes.grid":True,"grid.color":"#e9ebee","grid.linewidth":0.6,"axes.axisbelow":True,
 "axes.edgecolor":"#c9cdd3"})

def load(rs,c):
    """-> {time: {var: area-weighted or mean value across polygons at each EBIN}}"""
    t_e=defaultdict(lambda: defaultdict(list))
    for r in csv.DictReader(open(f"{RUNS}/wsa_rs{rs}_c{c}.csv")):
        t=int(float(r["time"])); e=int(r["ebin"])
        t_e[t][e].append((float(r["height"]),float(r["friction"]),float(r["energy_diss"]),
                          float(r["disp_cap"]),float(r["service_ind"]),float(r["loc_service"]),
                          float(r["loc_edc"])))
    out={}
    for t,es in t_e.items():
        agg={}
        for e,v in es.items():
            n=len(v); agg[e]=tuple(sum(x[i] for x in v)/n for i in range(7))
        out[t]=agg
    return out

def reef_mean(d, idx, ebins=(3,4,5)):
    ts=sorted(d)
    return ts,[sum(d[t][e][idx] for e in ebins if e in d[t])/len(ebins) for t in ts]

VARS=[(0,"mean coral height (m)","A    Coral height"),
      (1,"bottom friction (Manning's n)","B    Bottom friction"),
      (2,"energy dissipation (W)","C    Wave energy dissipation"),
      (3,"energy dissipation capacity","D    Dissipation capacity"),
      (4,"erosion prevention indicator","E    Erosion prevention (saturated)"),
      (6,"Location EDC","F    Erosion damage cost at location")]

for c,clab in ((0,"observed MUR SST"),(1,"RCP-4.5")):
    D={rs:load(rs,c) for rs in range(1,6)}
    fig,ax=plt.subplots(2,3,figsize=(16.0,8.6),gridspec_kw=dict(hspace=0.34,wspace=0.27))
    for k,(idx,ylab,title) in enumerate(VARS):
        a=ax[k//3][k%3]; a.set_facecolor(SURF)
        for rs in range(1,6):
            ts,v=reef_mean(D[rs],idx)
            a.plot([t2d(t) for t in ts],v,color=COL[rs],lw=1.8,label=NAMES[rs])
        a.set_ylabel(ylab); a.set_title(title,loc="left",pad=7,fontweight="bold")
        a.xaxis.set_major_locator(mdates.YearLocator(4 if c==0 else 2))
        a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        if idx in (0,3,6): a.set_yscale("log")
        if k==0: a.legend(frameon=False,fontsize=8.0,title="Choose Reef state",
                          title_fontproperties={"size":8.4})
    fig.suptitle(f"Reef state drives ecosystem services, not biomass — {clab}\n"
                 "coral area → coral height → bottom friction → wave energy dissipation → erosion prevention",
                 fontsize=13,fontweight="bold",x=0.010,ha="left",y=0.99)
    fig.tight_layout(rect=[0,0.005,1,0.925])
    fig.savefig(f"{FIGS}/services-by-reef-state-c{c}.png",dpi=180); plt.close(fig)
    print("wrote",f"services-by-reef-state-c{c}.png")

# depth profile at end of run, observed climate
D={rs:load(rs,0) for rs in range(1,6)}
fig,ax=plt.subplots(1,3,figsize=(15.2,4.8),gridspec_kw=dict(wspace=0.26))
tend=max(D[1])
for k,(idx,ylab,title) in enumerate([(0,"coral height (m)","A    Coral height by depth band"),
                                     (1,"bottom friction","B    Bottom friction by depth band"),
                                     (2,"energy dissipation (W)","C    Dissipation by depth band")]):
    a=ax[k]; a.set_facecolor(SURF); a.grid(axis="y",visible=False)
    w=0.15
    for i,rs in enumerate(range(1,6)):
        es=sorted(D[rs][tend]); xs=[j+(i-2)*w for j in range(len(es))]
        a.bar(xs,[D[rs][tend][e][idx] for e in es],w,color=COL[rs],zorder=3,label=NAMES[rs])
    a.set_xticks(range(len(es))); a.set_xticklabels([f"{e}\n{EBIN[e]}" for e in es],fontsize=7.6)
    a.set_ylabel(ylab); a.set_xlabel("EBIN depth band")
    a.set_title(title,loc="left",pad=7,fontweight="bold")
    if idx==0: a.set_yscale("log"); a.legend(frameon=False,fontsize=7.6,ncol=2)
fig.suptitle("Where in the water column the service is generated — end of run, observed SST",
             fontsize=13,fontweight="bold",x=0.010,ha="left",y=0.985)
fig.tight_layout(rect=[0,0.005,1,0.93])
fig.savefig(f"{FIGS}/services-depth-profile.png",dpi=180); plt.close(fig)
print("wrote services-depth-profile.png")
