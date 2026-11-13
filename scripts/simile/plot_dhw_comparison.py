#!/usr/bin/env python3
"""Compare the heat-stress driver LBC4 uses today against NOAA CRW Degree Heating Weeks,
both computed from the same Laughing Bird MUR SST record."""
import csv, datetime as dt, statistics as st, os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

HERE = os.path.dirname(os.path.abspath(__file__))
FIGS = os.path.join(HERE, "output", "dhw"); os.makedirs(FIGS, exist_ok=True)
SST_CSV = ('/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/'
           'MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time/'
           'laughingbird_mur_sst_daily_bboxmean_2002_2026.csv')
MODEL_THR = 30.0
MMM_FIT   = 28.70   # calibrated to NOAA's published Belize DHW peaks
MMM_LOCAL = 29.83   # this record's own 2002-2013 climatology

C_SST, C_CUR, C_DHW = "#2a78d6", "#c0392b", "#7b4fbf"
SURF, INK, MUT = "#fcfcfb", "#2c3138", "#7a828c"
plt.rcParams.update({"font.family": "DejaVu Sans", "axes.edgecolor": "#c9cdd3",
                     "axes.labelcolor": INK, "text.color": INK, "figure.facecolor": SURF,
                     "xtick.color": MUT, "ytick.color": MUT, "font.size": 9,
                     "axes.titlesize": 10.5, "axes.grid": True, "grid.color": "#e9ebee",
                     "grid.linewidth": 0.6, "axes.axisbelow": True})

rows = list(csv.DictReader(open(SST_CSV)))
D = [dt.datetime.strptime(r["date"], "%m/%d/%Y").date() for r in rows]
V = [float(r["sst_mean_degC"]) for r in rows]

def dhw_of(MMM):
    hs = [max(0.0, v - MMM) for v in V]
    hs = [h if h >= 1.0 else 0.0 for h in hs]
    out, run = [], 0.0
    for i in range(len(V)):
        run += hs[i]
        if i >= 84: run -= hs[i - 84]
        out.append(run / 7.0)
    return out
DHW_F, DHW_L = dhw_of(MMM_FIT), dhw_of(MMM_LOCAL)
CUR = [max(0.0, v - MODEL_THR) for v in V]

fig, ax = plt.subplots(3, 1, figsize=(14.2, 10.4), sharex=True,
                       gridspec_kw=dict(height_ratios=[1.1, 1.0, 0.95], hspace=0.15))
for a in ax: a.set_facecolor(SURF)

a = ax[0]
a.plot(D, V, color=C_SST, lw=0.42, alpha=0.75)
for y, c, ls, lab, ty in ((MMM_FIT + 1, C_DHW, "-",
                           f"NOAA HotSpot, MMM+1 = {MMM_FIT+1:.2f} °C  (MMM calibrated to NOAA's published Belize DHW)", 24.75),
                          (MODEL_THR, C_CUR, "--", f"LBC4 threshold = {MODEL_THR:.2f} °C", 25.45),
                          (MMM_LOCAL + 1, C_DHW, ":",
                           f"MMM+1 from this record's own 2002–2013 climatology = {MMM_LOCAL+1:.2f} °C", 26.15)):
    a.axhline(y, color=c, lw=1.3, ls=ls)
    a.plot([D[18], D[18]], [ty + 0.18, y], color=c, lw=0.8, ls=":")
    a.text(D[30], ty, lab, color=c, fontsize=8.2, va="center")
a.set_ylim(24.5, 32.4); a.set_ylabel("SST (°C)")
a.set_title("A    The same SST record, three candidate stress baselines.  The 1.1 °C spread between them "
            "is the single biggest uncertainty in adopting DHW.", loc="left", pad=8)

a = ax[1]
a.fill_between(D, CUR, color=C_CUR, alpha=0.5, lw=0, label="LBC4 today:  max(0, SST − 30)   [°C]")
a.set_ylabel("current driver (°C)", color=C_CUR); a.tick_params(axis="y", colors=C_CUR)
a.set_ylim(0, 1.8)
a2 = a.twinx(); a2.grid(False)
a2.plot(D, DHW_F, color=C_DHW, lw=1.3, label="NOAA DHW (MMM 28.70)")
a2.plot(D, DHW_L, color=C_DHW, lw=1.0, ls=":", label="NOAA DHW (MMM 29.83)")
a2.axhline(4, color="#d19a00", lw=1.1, ls="--"); a2.axhline(8, color="#b3402a", lw=1.1, ls="--")
a2.text(D[-40], 4.2, "DHW 4 — bleaching expected", fontsize=8, color="#d19a00", ha="right")
a2.text(D[-40], 8.2, "DHW 8 — mortality expected", fontsize=8, color="#b3402a", ha="right")
a2.set_ylabel("DHW (°C-weeks)", color=C_DHW); a2.tick_params(axis="y", colors=C_DHW)
a2.set_ylim(0, 21)
a.set_title("B    Two very different signals.  The current driver is a memoryless spike; DHW carries "
            "12 weeks of memory\n       and stays elevated long after the water has cooled.", loc="left", pad=6)
a.legend(loc="upper left", frameon=False, fontsize=8.4, bbox_to_anchor=(0, 0.92))
a2.legend(loc="upper center", frameon=False, fontsize=8.4, ncol=2, bbox_to_anchor=(0.55, 0.99))

a = ax[2]
yrs = sorted({d.year for d in D})
cur_y = {y: sum(c for d, c in zip(D, CUR) if d.year == y) for y in yrs}
dhw_y = {y: max([x for d, x in zip(D, DHW_F) if d.year == y] or [0]) for y in yrs}
w = 150
for y in yrs:
    mid = dt.date(y, 7, 1)
    a.bar(mid, cur_y[y], width=w, color=C_CUR, alpha=0.85, zorder=3)
a.set_ylabel("current driver\n(°C-days per year)", color=C_CUR); a.tick_params(axis="y", colors=C_CUR)
a.set_ylim(0, 60)
a3 = a.twinx(); a3.grid(False)
a3.plot([dt.date(y, 7, 1) for y in yrs], [dhw_y[y] for y in yrs], "o-", color=C_DHW, lw=1.6, ms=5)
a3.axhline(4, color="#d19a00", lw=1.0, ls="--"); a3.axhline(8, color="#b3402a", lw=1.0, ls="--")
a3.set_ylabel("peak DHW\n(°C-weeks per year)", color=C_DHW); a3.tick_params(axis="y", colors=C_DHW)
a3.set_ylim(0, 22)
a.set_title("C    Annual totals.  The two schemes rank the years differently — 2005 and 2010–11 are "
            "major DHW years the current driver barely registers.", loc="left", pad=8)
a.xaxis.set_major_locator(mdates.YearLocator(2)); a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
a.set_xlim(D[0], D[-1])

fig.suptitle("Would adopting NOAA Degree Heating Weeks change what the model does?",
             fontsize=14.5, fontweight="bold", x=0.010, ha="left", y=0.985)
fig.tight_layout(rect=[0, 0.005, 1, 0.962])
fig.savefig(f"{FIGS}/dhw-vs-current-driver.png", dpi=165)
plt.close(fig)
print("wrote", f"{FIGS}/dhw-vs-current-driver.png")

# ---- calibration numbers ----
tot_cur = sum(CUR)
for name, S, thr in (("DHW linear (MMM 28.70)", DHW_F, 0.0),
                     ("DHW above 4  (MMM 28.70)", DHW_F, 4.0),
                     ("DHW above 8  (MMM 28.70)", DHW_F, 8.0)):
    tot = sum(max(0.0, x - thr) for x in S)
    print(f"{name:26s}: integral {tot:9.1f}   rate scale to match current = {tot_cur/tot:8.5f}")
print(f"{'current max(0,SST-30)':26s}: integral {tot_cur:9.1f}")
print("\nfraction of days the driver is active:")
print(f"  current      {sum(1 for x in CUR if x>0)/len(CUR)*100:5.1f} %")
print(f"  DHW > 0      {sum(1 for x in DHW_F if x>0)/len(DHW_F)*100:5.1f} %")
print(f"  DHW >= 4     {sum(1 for x in DHW_F if x>=4)/len(DHW_F)*100:5.1f} %")
print(f"  DHW >= 8     {sum(1 for x in DHW_F if x>=8)/len(DHW_F)*100:5.1f} %")
