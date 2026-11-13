#!/usr/bin/env python3
"""WS-C: SP1 / SP2 / SP3 compared at an identical 1,170 kg total programme mass.

SP1 and SP2 are exact superpositions of the 90 kg per-polygon runs (13 polygons each).
SP3 is its own run set at area-proportional masses (5.3-115.5 kg), because the model
is non-linear in mass so its members cannot be rescaled from the 90 kg runs.
"""
import csv, json, datetime as dt, os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,"output","spatial"); FIGS=os.path.join(OUT,"figs"); os.makedirs(FIGS,exist_ok=True)
BASE, PLANTD, TOTAL = dt.date(2002,6,1), dt.date(2006,5,17), 1170.0
d2t=lambda d:(d-BASE).days+1; t2d=lambda t:BASE+dt.timedelta(days=int(t)-1)
SP1=list(range(12,19))+list(range(24,30)); SP2=list(range(6,12))+list(range(30,37)); SP3=list(range(1,44))
HOR=[("+6 mo",182),("+1 yr",365),("+2 yr",730),("+3 yr",1095),("+5 yr",1825)]
C={"SP1":"#2a78d6","SP2":"#eb6834","SP3":"#1baf7a"}
SURF,INK,MUT,C_HEAT="#fcfcfb","#2c3138","#7a828c","#c0392b"
plt.rcParams.update({"font.family":"DejaVu Sans","figure.facecolor":SURF,"text.color":INK,
    "axes.labelcolor":INK,"xtick.color":MUT,"ytick.color":MUT,"font.size":9,"axes.titlesize":10.5,
    "axes.grid":True,"grid.color":"#e9ebee","grid.linewidth":0.6,"axes.axisbelow":True,
    "axes.edgecolor":"#c9cdd3"})

sstd,sstv=[],[]
for r in csv.DictReader(open('/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/'
        'Shared drives/MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time/'
        'laughingbird_mur_sst_daily_bboxmean_2002_2026.csv')):
    sstd.append(dt.datetime.strptime(r["date"],"%m/%d/%Y").date()); sstv.append(float(r["sst_mean_degC"]))
BANDS,run=[],None
for d,v in zip(sstd,sstv):
    if v>30.0 and run is None: run=d
    elif v<=30.0 and run is not None:
        if (d-run).days>=10: BANDS.append((run,d))
        run=None
def shade(ax):
    for a,b in BANDS: ax.axvspan(a,b,color=C_HEAT,alpha=0.13,lw=0,zorder=0)

ser=lambda p:{int(float(r['time'])):float(r['reef_biomass']) for r in csv.DictReader(open(p))}
def gains(c, sub):
    base=ser(f"{OUT}/runs/base_c{c}.csv")
    d=f"{OUT}/{sub}"
    return base,{p:{t:v-base[t] for t,v in ser(f"{d}/poly{p:02d}_c{c}.csv").items() if t in base}
                 for p in range(1,44)}
res={}
for c in (0,1):
    _,g90=gains(c,"runs"); _,gw=gains(c,"runs_sp3")
    ts=sorted(g90[1])
    P={"SP1":{t:sum(g90[p][t] for p in SP1) for t in ts},
       "SP2":{t:sum(g90[p][t] for p in SP2) for t in ts},
       "SP3":{t:sum(gw[p][t]  for p in SP3) for t in ts}}
    res[c]={}
    for nm,g in P.items():
        i0=max(ts,key=lambda t:g[t])
        m={"peak":g[i0],"kg_years":sum(g[t] for t in ts if t>=i0)/365.0,
           "n":len(SP1 if nm=="SP1" else SP2 if nm=="SP2" else SP3)}
        for lab,dd in HOR: m[lab]=g.get(d2t(PLANTD+dt.timedelta(days=dd)))
        res[c][nm]=m
    res[c]["_series"]=P; res[c]["_ts"]=ts

fig,ax=plt.subplots(2,2,figsize=(14.4,9.6),gridspec_kw=dict(hspace=0.34,wspace=0.20))
for col,c in enumerate((0,1)):
    lab="observed MUR SST" if c==0 else "RCP-4.5"
    a=ax[0][col]; a.set_facecolor(SURF); shade(a)
    ts=res[c]["_ts"]
    for nm in ("SP1","SP2","SP3"):
        a.plot([t2d(t) for t in ts],[res[c]["_series"][nm][t] for t in ts],color=C[nm],lw=1.9,
               zorder=5,label=f"{nm}  ({res[c][nm]['n']} polygons)")
    a.axvline(PLANTD,color="#1baf7a",lw=1.4,ls=":",zorder=4)
    a.set_ylabel("coral above baseline (kg)"); a.set_ylim(-40,1250)
    a.set_xlim(PLANTD-dt.timedelta(days=200), t2d(ts[-1]))
    a.xaxis.set_major_locator(mdates.YearLocator(2 if c==0 else 1))
    a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    a.set_title(f"{'AB'[col]}    {lab} — 1,170 kg planted in every portfolio",loc="left",pad=8)
    a.legend(frameon=False,fontsize=8.6)
    b=ax[1][col]; b.set_facecolor(SURF); b.grid(axis="x",visible=False)
    w=0.26
    for i,nm in enumerate(("SP1","SP2","SP3")):
        xs=[j+(i-1)*w for j in range(len(HOR))]
        ys=[res[c][nm][l]/TOTAL*100 if res[c][nm][l] is not None else 0 for l,_ in HOR]
        bb=b.bar(xs,ys,w,color=C[nm],zorder=3,label=nm)
        b.bar_label(bb,fmt="%.0f",fontsize=7.6,padding=2,color=C[nm])
    b.set_xticks(range(len(HOR))); b.set_xticklabels([l for l,_ in HOR])
    b.set_ylabel("% of the 1,170 kg retained"); b.set_ylim(0,100)
    b.set_title(f"{'CD'[col]}    Retention, {lab}",loc="left",pad=7,fontweight="bold")
    b.legend(frameon=False,fontsize=8.4,ncol=3)
fig.legend(handles=[Patch(facecolor=C_HEAT,alpha=0.13,label="bleaching period (SST > 30 °C, ≥ 10 d)")],
           loc="lower left",frameon=False,bbox_to_anchor=(0.07,0.005),fontsize=8.6)
fig.suptitle("Spatial planting portfolios: SP1 coastal protection, SP2 tourism & fishery, SP3 area-weighted across all 43",
             fontsize=13.5,fontweight="bold",x=0.010,ha="left",y=0.985)
fig.tight_layout(rect=[0,0.03,1,0.955])
fig.savefig(f"{FIGS}/portfolio-comparison.png",dpi=180); plt.close(fig)
print("wrote portfolio-comparison.png\n")
for c in (0,1):
    print(f"=== climate {c} ({'observed MUR' if c==0 else 'RCP-4.5'}) — 1,170 kg each ===")
    print(f"{'':6} {'polys':>6} {'peak':>8} " + " ".join(f"{l:>8}" for l,_ in HOR) + f" {'kg-years':>9}")
    for nm in ("SP1","SP2","SP3"):
        m=res[c][nm]; f=lambda v: f"{v:8.1f}" if v is not None else "       —"
        print(f"{nm:6} {m['n']:>6} {f(m['peak'])} " + " ".join(f(m[l]) for l,_ in HOR) + f" {m['kg_years']:>9.1f}")
    best=max(("SP1","SP2","SP3"),key=lambda n:res[c][n]["kg_years"])
    print(f"   best: {best}   SP1/SP2 {res[c]['SP1']['kg_years']/res[c]['SP2']['kg_years']:.2f}x   "
          f"SP1/SP3 {res[c]['SP1']['kg_years']/res[c]['SP3']['kg_years']:.2f}x\n")
json.dump({str(c):{k:v for k,v in res[c].items() if not k.startswith("_")} for c in res},
          open(f"{OUT}/portfolio_metrics.json","w"),indent=1)
