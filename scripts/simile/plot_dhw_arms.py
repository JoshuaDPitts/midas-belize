#!/usr/bin/env python3
"""DHW arms: sixteen ways of turning the same SST record into coral mortality.

/Location/Disease is units=int [0,1], so every arm is a STEP rule:
    Disease(t) = 1 when DHW(t) >= onset, else 0
with the per-species rate set by one of two calibrations (integral / peak).
"""
import csv, json, datetime as dt, os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

HERE  = os.path.dirname(os.path.abspath(__file__))
DIR   = os.path.join(HERE, "output", "dhw-arms")
RUNS, SER, FIGS = (os.path.join(DIR, x) for x in ("runs", "series", "figs"))
SWEEP = os.path.join(HERE, "output", "threshold-sweep", "runs")
os.makedirs(FIGS, exist_ok=True)

BASE, PLANTD, KG = dt.date(2002, 6, 1), dt.date(2006, 5, 17), 90.0
NOMORT = 106549.1
t2d = lambda t: BASE + dt.timedelta(days=int(t) - 1)
d2t = lambda d: (d - BASE).days + 1
SURF, INK, MUT, C_CUR = "#fcfcfb", "#2c3138", "#7a828c", "#c0392b"
ONSET_C = {0: "#2a78d6", 4: "#1baf7a", 8: "#eb6834", 12: "#7b4fbf"}
ONSET_L = {0: "any DHW", 4: "above 4", 8: "above 8", 12: "above 12"}
plt.rcParams.update({"font.family": "DejaVu Sans", "axes.edgecolor": "#c9cdd3",
                     "axes.labelcolor": INK, "text.color": INK, "figure.facecolor": SURF,
                     "xtick.color": MUT, "ytick.color": MUT, "font.size": 9,
                     "axes.titlesize": 10.5, "axes.grid": True, "grid.color": "#e9ebee",
                     "grid.linewidth": 0.6, "axes.axisbelow": True})

ARMS = json.load(open(f"{SER}/arms.json"))
byname = {a["name"]: a for a in ARMS}
load = lambda p: {int(float(r["time"])): r for r in csv.DictReader(open(p))}
reef = lambda r: sum(float(r[f"reef_sp{i}"]) for i in (1, 2, 3))
B = {a["name"]: load(f"{RUNS}/{a['name']}_base.csv")  for a in ARMS}
P = {a["name"]: load(f"{RUNS}/{a['name']}_plant.csv") for a in ARMS}
CB, CP = load(f"{SWEEP}/T30.0_base.csv"), load(f"{SWEEP}/T30.0_plant.csv")
TS = sorted(CB); DATES = [t2d(x) for x in TS]

HOR = [("+6 mo", 182), ("+1 yr", 365), ("+2 yr", 730), ("+3 yr", 1095)]
END = {n: reef(B[n][TS[-1]]) for n in B}
RET = {n: {l: float(P[n][d2t(PLANTD + dt.timedelta(days=dd))]["p5_sp2"]) -
              float(B[n][d2t(PLANTD + dt.timedelta(days=dd))]["p5_sp2"]) for l, dd in HOR} for n in B}
CUR_END = reef(CB[TS[-1]])
CUR_RET = {l: float(CP[d2t(PLANTD + dt.timedelta(days=dd))]["p5_sp2"]) -
              float(CB[d2t(PLANTD + dt.timedelta(days=dd))]["p5_sp2"]) for l, dd in HOR}

sv = [float(r["sst_mean_degC"]) for r in csv.DictReader(open(
    '/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/'
    'MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time/'
    'laughingbird_mur_sst_daily_bboxmean_2002_2026.csv'))]
cur_active = [1 if sv[t - 1] > 30.0 else 0 for t in TS]

def spans(flags):
    out, run = [], None
    for i, f in enumerate(flags):
        if f and run is None: run = i
        elif not f and run is not None: out.append((DATES[run], DATES[i])); run = None
    if run is not None: out.append((DATES[run], DATES[-1]))
    return out
def trig(name):
    return [int(float(r["u"])) for r in csv.DictReader(open(f"{SER}/{name}.csv"))]

# ================= FIGURE 1 : when each rule fires =================
fig, ax = plt.subplots(figsize=(14.2, 6.6))
ax.set_facecolor(SURF); ax.grid(axis="y", visible=False)
rowlabs = []
rows = [("CURRENT MODEL   SST > 30 °C", cur_active, C_CUR, 936)]
for mmm in ("28.70", "29.83"):
    for onset in (0, 4, 8, 12):
        nm = f"MMM{mmm}_ge{onset}_integral"
        rows.append((f"MMM {mmm}   DHW {ONSET_L[onset]}", trig(nm), ONSET_C[onset],
                     byname[nm]["days_active"]))
for i, (lab, flags, c, n) in enumerate(rows):
    y = len(rows) - 1 - i
    for a, b in spans(flags):
        ax.axvspan(a, b, ymin=(y + 0.14) / len(rows), ymax=(y + 0.86) / len(rows),
                   color=c, alpha=0.85, lw=0)
    rowlabs.append(lab)
    ax.text(DATES[-1] + dt.timedelta(days=90), y + 0.5, f"{n:,} d",
            va="center", fontsize=8.3, color=c, fontweight="bold")
ax.set_yticks([len(rows) - 0.5 - i for i in range(len(rows))])
ax.set_yticklabels(rowlabs, fontsize=8.6)
ax.get_yticklabels()[0].set_color(C_CUR); ax.get_yticklabels()[0].set_fontweight("bold")
ax.set_ylim(0, len(rows)); ax.set_xlim(DATES[0], DATES[-1] + dt.timedelta(days=760))
ax.xaxis.set_major_locator(mdates.YearLocator(2)); ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
ax.set_title("When each rule puts the reef under heat mortality.  Shaded = mortality is being applied; "
             "the count on the right is total days in 24 years.", loc="left", pad=9)
ax.text(DATES[0], -0.62, "The three MMM 29.83 threshold rules never fire at all: peak DHW under that "
        "climatology is 3.48, below every onset.", fontsize=8.6, color=MUT)
fig.suptitle("Sixteen ways to read the same thermometer:  NOAA Degree Heating Weeks in LBC4",
             fontsize=14, fontweight="bold", x=0.010, ha="left", y=0.985)
fig.tight_layout(rect=[0, 0.03, 1, 0.945])
fig.savefig(f"{FIGS}/dhw-arms-triggers.png", dpi=165)
plt.close(fig)

# ================= FIGURE 2 : outcomes =================
fig = plt.figure(figsize=(14.2, 14.6))
gs  = fig.add_gridspec(3, 2, height_ratios=[1.0, 1.0, 1.5], hspace=0.46, wspace=0.34)
for row, calib, ttl in ((0, "integral", "same TOTAL stress as the current model"),
                        (1, "peak", "same PEAK daily rate as the current model")):
    a = fig.add_subplot(gs[row, :]); a.set_facecolor(SURF)
    a.plot(DATES, [reef(CB[k]) for k in TS], color=C_CUR, lw=2.2, zorder=8,
           label="current model  (SST > 30 °C)")
    for arm in ARMS:
        if arm["calib"] != calib or arm["degenerate"]: continue
        nm = arm["name"]
        a.plot(DATES, [reef(B[nm][k]) for k in TS], color=ONSET_C[arm["onset"]], lw=1.35,
               ls="-" if f"{arm['mmm']:.2f}" == "28.70" else ":", zorder=5,
               label=f"MMM {arm['mmm']:.2f}, {ONSET_L[arm['onset']]}")
    a.axhline(NOMORT, color=MUT, lw=1.1, ls="--", zorder=3)
    a.text(DATES[30], NOMORT + 1800, "carrying capacity (no heat mortality)", fontsize=8.2, color=MUT)
    a.set_ylabel("whole-reef biomass (kg)"); a.set_ylim(-4000, 118000)
    a.set_title(f"{'AB'[row]}    Calibrated to the {ttl}", loc="left", pad=8, fontweight="bold")
    a.xaxis.set_major_locator(mdates.YearLocator(2)); a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    a.set_xlim(DATES[0], DATES[-1])
    a.legend(frameon=False, fontsize=8.0, ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.13))

import matplotlib.colors as mcolors
SHORT = {0: "any DHW", 4: "DHW ≥ 4", 8: "DHW ≥ 8", 12: "DHW ≥ 12"}
INTEG = [a for a in ARMS if a["calib"] == "integral"][::-1]
PEAKA = [a for a in ARMS if a["calib"] == "peak"][::-1]
ORD, ys, labs, cs = [], [], [], []
for j, a in enumerate(INTEG):
    ORD.append(a); ys.append(j + 9.6); labs.append(f"{SHORT[a['onset']]}  ·  MMM {a['mmm']:.2f}")
    cs.append(mcolors.to_rgba(ONSET_C[a["onset"]], 1.0))
for j, a in enumerate(PEAKA):
    ORD.append(a); ys.append(j); labs.append(f"{SHORT[a['onset']]}  ·  MMM {a['mmm']:.2f}")
    cs.append(mcolors.to_rgba(ONSET_C[a["onset"]], 0.45))

for col, (vals, xlab, ttl, ref, xmax) in enumerate((
        ([END[a["name"]] for a in ORD], "reef biomass at end of run (kg)",
         "C    Where the reef ends up", CUR_END, 124000),
        ([min(RET[a["name"]]["+3 yr"] / KG * 100, 100) for a in ORD],
         "% of the 90 kg retained at +3 yr", "D    What survives of the 2006 outplanting",
         CUR_RET["+3 yr"] / KG * 100, 116))):
    a = fig.add_subplot(gs[2, col]); a.set_facecolor(SURF); a.grid(axis="y", visible=False)
    a.barh(ys, vals, 0.80, color=cs, zorder=3)
    a.axvline(ref, color=C_CUR, lw=1.8, ls="--", zorder=6)
    a.text(ref, 17.9, "current model", color=C_CUR, fontsize=8.3, ha="center", fontweight="bold")
    a.set_yticks(ys); a.set_yticklabels(labs, fontsize=7.8)
    a.set_xlabel(xlab); a.set_xlim(0, xmax); a.set_ylim(-1.1, 18.6)
    a.set_title(ttl, loc="left", pad=7, fontweight="bold")
    a.axhline(8.3, color="#d4d8dd", lw=1.0)
    a.text(xmax * 0.985, 16.9, "calibrated to same TOTAL stress", fontsize=8.0, color=MUT,
           ha="right", fontweight="bold")
    a.text(xmax * 0.985, 7.3, "calibrated to same PEAK rate", fontsize=8.0, color=MUT,
           ha="right", fontweight="bold")

fig.text(0.5, 0.012, "Retention is capped at 100 % for display: on a collapsing reef the outplanting "
         "seeds regrowth, so a few arms exceed the 90 kg planted.", ha="center", fontsize=8.4, color=MUT)
fig.suptitle("Adopting DHW changes the answer, but the rate calibration changes it more",
             fontsize=14, fontweight="bold", x=0.010, ha="left", y=0.988)
fig.tight_layout(rect=[0, 0.028, 1, 0.964])
fig.savefig(f"{FIGS}/dhw-arms-outcomes.png", dpi=165, bbox_inches="tight")
plt.close(fig)
print("wrote figures ->", FIGS)

out = [f"{'arm':30s} {'trig d':>7} {'rate sp2':>9} {'reef end':>10} " + " ".join(f"{l:>8}" for l, _ in HOR)]
out.append(f"{'CURRENT (SST>30)':30s} {936:>7} {0.0168:>9.5f} {CUR_END:>10.0f} " +
           " ".join(f"{CUR_RET[l]/KG*100:>7.1f}%" for l, _ in HOR))
for arm in ORD:
    n = arm["name"]
    out.append(f"{n:30s} {arm['days_active']:>7} {arm['rates']['2']:>9.5f} {END[n]:>10.0f} " +
               " ".join(f"{RET[n][l]/KG*100:>7.1f}%" for l, _ in HOR))
txt = "\n".join(out); print(txt); open(f"{FIGS}/summary.txt", "w").write(txt)
