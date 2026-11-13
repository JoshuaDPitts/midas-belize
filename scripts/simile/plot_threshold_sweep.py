#!/usr/bin/env python3
"""Heat-stress threshold sweep: LBC4 reef state and restoration retention as a
function of Threshold 3 (Mortality Cause.csv), 28.0-35.0 degC in 0.5 steps.

Each threshold was run twice over 8760 days on observed MUR SST: once with no
restoration, once with the optimistic 90 kg outplanting of 2006-05-17.
"""
import csv, datetime as dt, os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.lines import Line2D
import matplotlib.cm as cm
import matplotlib.colors as mcolors

HERE = os.path.dirname(os.path.abspath(__file__))
DIR  = os.path.join(HERE, "output", "threshold-sweep")
RUNS, FIGS = os.path.join(DIR, "runs"), os.path.join(DIR, "figs")
os.makedirs(FIGS, exist_ok=True)

BASE   = dt.date(2002, 6, 1)
PLANTD = dt.date(2006, 5, 17)
KG     = 90.0
CUR    = 30.0    # the model's shipped threshold
NOAA   = 29.70   # MMM+1, MMM calibrated to NOAA's published Belize DHW peaks
SATUR  = 31.46   # highest SST in the record: above this, heat mortality is identically zero
TH = [round(28.0 + 0.5 * i, 1) for i in range(15)]
d2t = lambda d: (d - BASE).days + 1
t2d = lambda t: BASE + dt.timedelta(days=int(t) - 1)

SURF, INK, MUT = "#fcfcfb", "#2c3138", "#7a828c"
C_CUR, C_NOAA, C_SAT = "#c0392b", "#7b4fbf", "#1baf7a"
plt.rcParams.update({"font.family": "DejaVu Sans", "axes.edgecolor": "#c9cdd3",
                     "axes.labelcolor": INK, "text.color": INK, "figure.facecolor": SURF,
                     "xtick.color": MUT, "ytick.color": MUT, "font.size": 9,
                     "axes.titlesize": 10.5, "axes.grid": True, "grid.color": "#e9ebee",
                     "grid.linewidth": 0.6, "axes.axisbelow": True})

def load(p):
    return {int(float(r["time"])): r for r in csv.DictReader(open(p))}
reef = lambda r: sum(float(r[f"reef_sp{i}"]) for i in (1, 2, 3))

B, P = {}, {}
for t in TH:
    B[t] = load(f"{RUNS}/T{t:.1f}_base.csv")
    P[t] = load(f"{RUNS}/T{t:.1f}_plant.csv")
TS = sorted(B[TH[0]]); DATES = [t2d(x) for x in TS]

HOR = [("+6 mo", 182), ("+1 yr", 365), ("+2 yr", 730), ("+3 yr", 1095)]
END  = {t: reef(B[t][TS[-1]]) for t in TH}
MEAN = {t: sum(reef(B[t][k]) for k in TS) / len(TS) for t in TH}
RET  = {t: {lab: (float(P[t][d2t(PLANTD + dt.timedelta(days=dd))]["p5_sp2"]) -
                  float(B[t][d2t(PLANTD + dt.timedelta(days=dd))]["p5_sp2"]))
            for lab, dd in HOR} for t in TH}

norm = mcolors.Normalize(vmin=28.0, vmax=32.0)
cmap = cm.get_cmap("viridis_r")
col  = lambda t: cmap(norm(min(t, 32.0)))

fig = plt.figure(figsize=(14.4, 12.6))
gs  = fig.add_gridspec(3, 2, height_ratios=[1.15, 1.0, 1.0], hspace=0.30, wspace=0.18)

# --- A  trajectories
a = fig.add_subplot(gs[0, :]); a.set_facecolor(SURF)
for t in TH:
    if t > 32.0 and t != 35.0: continue
    a.plot(DATES, [reef(B[t][k]) for k in TS], color=col(t), lw=1.5 if t == CUR else 1.0,
           zorder=6 if t == CUR else 4, label=f"{t:.1f}" if t <= 32.0 else None)
a.set_ylabel("whole-reef coral biomass (kg)")
a.set_title("A    Reef trajectory under each heat-stress threshold.  Above 31.5 °C the curves are identical "
            "(the record never exceeds 31.46 °C, so heat mortality is exactly zero).", loc="left", pad=8)
a.xaxis.set_major_locator(mdates.YearLocator(2)); a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
a.set_xlim(DATES[0], DATES[-1])
a.annotate("shipped model\nΘ = 30.0 °C", xy=(dt.date(2020, 1, 1), reef(B[30.0][d2t(dt.date(2020, 1, 1))])),
           xytext=(dt.date(2013, 1, 1), 30000), fontsize=8.6, color=C_CUR, fontweight="bold",
           arrowprops=dict(arrowstyle="->", color=C_CUR, lw=1.3))
lg = a.legend(title="Threshold 3 (°C)", frameon=False, fontsize=8, ncol=2, loc="upper left",
              bbox_to_anchor=(1.01, 1.02))
lg.get_title().set_fontsize(8.5)

# --- B  dose-response
a = fig.add_subplot(gs[1, :]); a.set_facecolor(SURF)
a.axvspan(SATUR, 35.3, color=C_SAT, alpha=0.10, lw=0)
a.plot(TH, [END[t] for t in TH], "o-", color="#2a78d6", lw=1.9, ms=6, label="reef biomass at end of run (2026)")
a.plot(TH, [MEAN[t] for t in TH], "s--", color="#8aa4bf", lw=1.4, ms=5, label="mean over the 24-year run")
for x, c, lab, ha, ox, ty in ((NOAA, C_NOAA, f"NOAA HotSpot\nMMM+1 = {NOAA:.2f} °C", "right", -0.07, 124000),
                              (CUR,  C_CUR,  f"shipped model\nΘ = {CUR:.1f} °C",       "left",   0.07, 104000)):
    a.axvline(x, color=c, lw=1.6, ls="--", zorder=3)
    a.text(x + ox, ty, lab, color=c, fontsize=8.5, fontweight="bold", ha=ha, va="top")
a.text(SATUR + 0.08, 8000, "no heat mortality:\nthe record never gets this hot", color=C_SAT,
       fontsize=8.4, fontweight="bold", va="bottom")
a.set_xlabel("Threshold 3 — the SST above which heat-stress mortality applies (°C)")
a.set_ylabel("whole-reef biomass (kg)"); a.set_ylim(-4000, 128000); a.set_xlim(27.8, 35.3)
a.set_title("B    Dose-response.  The shipped threshold sits on the steepest part of the curve: ±0.5 °C "
            "swings final reef biomass by −46 % / +19 %.", loc="left", pad=8)
a.legend(frameon=False, fontsize=8.6, loc="center right")

# --- C  retention vs threshold
a = fig.add_subplot(gs[2, 0]); a.set_facecolor(SURF)
a.axvspan(SATUR, 35.3, color=C_SAT, alpha=0.10, lw=0)
for (lab, _), c in zip(HOR, ("#2a78d6", "#1baf7a", "#eb6834", "#b3402a")):
    a.plot(TH, [RET[t][lab] / KG * 100 for t in TH], "o-", color=c, lw=1.6, ms=4.5, label=lab)
a.axvline(CUR, color=C_CUR, lw=1.4, ls="--"); a.axvline(NOAA, color=C_NOAA, lw=1.4, ls="--")
a.set_xlabel("Threshold 3 (°C)"); a.set_ylabel("% of the 90 kg still above baseline")
a.set_xlim(27.8, 35.3); a.set_ylim(-4, 108)
a.set_title("C    Restoration retention is U-shaped in reef health", loc="left", pad=7)
a.legend(frameon=False, fontsize=8.4, ncol=2, loc="center right")

a = fig.add_subplot(gs[2, 1]); a.set_facecolor(SURF)
a.plot([END[t] for t in TH], [RET[t]["+3 yr"] / KG * 100 for t in TH], "o", ms=8, color="#7b4fbf", zorder=5)
for t in TH:
    if t in (28.0, 28.5, 29.0, 29.5, 30.0, 30.5, 31.0, 31.5):
        a.annotate(f"{t:.1f}", xy=(END[t], RET[t]["+3 yr"] / KG * 100), xytext=(7, -3),
                   textcoords="offset points", fontsize=8.2, color=MUT)
a.set_xlabel("reef biomass at end of run (kg)  →  healthier reef")
a.set_ylabel("% of the 90 kg retained at +3 yr")
a.set_title("D    The same points, against reef state", loc="left", pad=7)
a.set_ylim(-4, 108)

fig.suptitle("Heat-stress threshold sweep:  how one hand-set parameter governs both reef fate and restoration value",
             fontsize=14.5, fontweight="bold", x=0.010, ha="left", y=0.988)
fig.tight_layout(rect=[0, 0.005, 0.885, 0.966])
fig.savefig(f"{FIGS}/threshold-sweep.png", dpi=165)
plt.close(fig)
print("wrote", f"{FIGS}/threshold-sweep.png")

out = [f"{'Theta':>6} {'reef end':>10} {'reef mean':>10} " + " ".join(f"{l:>8}" for l, _ in HOR)]
for t in TH:
    out.append(f"{t:>6.1f} {END[t]:>10.1f} {MEAN[t]:>10.1f} " +
               " ".join(f"{RET[t][l]/KG*100:>7.1f}%" for l, _ in HOR))
txt = "\n".join(out); print(txt); open(f"{FIGS}/summary.txt", "w").write(txt)
