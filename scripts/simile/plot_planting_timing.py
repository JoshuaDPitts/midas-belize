#!/usr/bin/env python3
"""Planting-timing experiment: does it matter when you outplant, relative to bleaching?

Baseline = no restoration. Two identical 90 kg Acropora cervicornis outplantings at
polygon 5, EBIN 5 (0-1 m reef crest): one 4 days before the record 2023 heatwave,
one ahead of the calmest two years in the SST record. Bleaching periods are derived
from the model's own forcing (MUR SST > 30 C = Threshold 3 in Mortality Cause.csv).

Usage: python3 plot_planting_timing.py [--dir scripts/simile/output/planting-timing]
"""
import argparse, csv, os, datetime as dt
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

ap = argparse.ArgumentParser()
ap.add_argument("--dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                              "output", "planting-timing"))
DIR = ap.parse_args().dir
RUNS, FIGS = os.path.join(DIR, "runs"), os.path.join(DIR, "figs")
os.makedirs(FIGS, exist_ok=True)

BASE = dt.date(2002, 6, 1)
THR  = 30.0
SST_CSV = ('/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/'
           'MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time/'
           'laughingbird_mur_sst_daily_bboxmean_2002_2026.csv')

C_BASE, C_CALM, C_HOT = "#3d4550", "#1baf7a", "#eb6834"
C_HEAT, C_SST, SURF, INK, MUT = "#c0392b", "#2a78d6", "#fcfcfb", "#2c3138", "#7a828c"
plt.rcParams.update({"font.family": "DejaVu Sans", "axes.edgecolor": "#c9cdd3",
                     "axes.labelcolor": INK, "text.color": INK, "figure.facecolor": SURF,
                     "xtick.color": MUT, "ytick.color": MUT, "axes.titlesize": 10.5,
                     "font.size": 9, "axes.grid": True, "grid.color": "#e9ebee",
                     "grid.linewidth": 0.6, "axes.axisbelow": True})

PLANT = {"CALM90": dt.date(2006, 5, 17), "HOT90": dt.date(2023, 5, 17),
         "CALM5":  dt.date(2006, 5, 17), "HOT5":  dt.date(2023, 5, 17)}
LBL   = {"CALM90": "CALM  ·  planted 2006-05-17", "HOT90": "HOT  ·  planted 2023-05-17"}
t2d = lambda t: BASE + dt.timedelta(days=int(t) - 1)
d2t = lambda d: (d - BASE).days + 1

# ---------------- SST + heat stress ----------------
sst_d, sst_v = [], []
for r in csv.DictReader(open(SST_CSV)):
    sst_d.append(dt.datetime.strptime(r["date"], "%m/%d/%Y").date())
    sst_v.append(float(r["sst_mean_degC"]))
exc  = [max(0.0, v - THR) for v in sst_v]
sidx = {d: i for i, d in enumerate(sst_d)}
cum  = [0.0]
for e in exc: cum.append(cum[-1] + e)
def heat(a, b):
    a, b = max(a, sst_d[0]), min(b, sst_d[-1])
    return cum[sidx[b] + 1] - cum[sidx[a]] if a <= b else 0.0
def first_hot_after(d):
    return next((x for x in sst_d if x > d and exc[sidx[x]] > 0), None)
def smooth(v, w=15):
    return [sum(v[max(0, i-w//2):min(len(v), i+w//2+1)]) /
            (min(len(v), i+w//2+1) - max(0, i-w//2)) for i in range(len(v))]
sst_s = smooth(sst_v)

EV, i, n = [], 0, len(sst_v)
while i < n:
    if exc[i] > 0:
        j = last = i
        while j < n:
            if exc[j] > 0: last = j
            elif j - last > 5: break
            j += 1
        seg = range(i, last + 1)
        EV.append(dict(s=sst_d[i], e=sst_d[last], hot=sum(1 for k in seg if exc[k] > 0),
                       dd=sum(exc[k] for k in seg)))
        i = last + 1
    else: i += 1
MAJOR = [e for e in EV if e["hot"] >= 10]

def shade(ax, alpha=0.20, major_only=True):
    for e in (MAJOR if major_only else EV):
        ax.axvspan(e["s"], e["e"], color=C_HEAT, alpha=alpha, lw=0, zorder=0)
def plantline(ax, keys, lw=2.0):
    for k in keys:
        ax.axvline(PLANT[k], color=(C_CALM if "CALM" in k else C_HOT), lw=lw, zorder=7)

# ---------------- runs ----------------
def load(name):
    return {int(float(r["time"])): dict(sp2=float(r["p5_sp2"]))
            for r in csv.DictReader(open(f"{RUNS}/{name}.csv"))}
R  = {n: load(n) for n in ("BASE", "CALM90", "HOT90", "CALM5", "HOT5")}
TS = sorted(R["BASE"]); DATES = [t2d(t) for t in TS]
W2 = {k: (PLANT[k] + dt.timedelta(days=1), PLANT[k] + dt.timedelta(days=730)) for k in LBL}

# ---------------- planting-season quality ----------------
SEASONS = []
for Y in range(2002, 2025):
    end = dt.date(Y + 1, 5, 17)
    if end + dt.timedelta(days=730) > sst_d[-1] or dt.date(Y, 12, 1) < sst_d[0]: continue
    SEASONS.append(dict(y=Y, label=f"{str(Y)[2:]}/{str(Y+1)[2:]}", start=dt.date(Y, 12, 1), end=end,
                        h730=heat(end + dt.timedelta(days=1), end + dt.timedelta(days=730))))
BEST  = min(SEASONS, key=lambda s: s["h730"])
WORST = max(SEASONS, key=lambda s: s["h730"])

# ================= FIGURE 1 =================
fig, ax = plt.subplots(4, 1, figsize=(14.2, 13.6), sharex=True,
                       gridspec_kw=dict(height_ratios=[1.15, 0.72, 1.15, 1.05], hspace=0.16))
for a in ax: a.set_facecolor(SURF)

a = ax[0]; shade(a); plantline(a, LBL)
a.plot(sst_d, sst_v, color=C_SST, lw=0.4, alpha=0.30, zorder=3)
a.plot(sst_d, sst_s, color=C_SST, lw=1.15, zorder=4)
a.axhline(THR, color=C_HEAT, lw=1.2, ls="--", zorder=5)
a.text(sst_d[25], THR + 0.13,
       "30 °C — the model's heat-stress mortality threshold (Mortality Cause.csv, Threshold 3)",
       color=C_HEAT, fontsize=8.2, va="bottom", zorder=8)
a.set_ylim(24.4, 32.9); a.set_ylabel("Sea surface temperature (°C)")
a.set_title("A    Laughing Bird Caye daily SST (MUR satellite — the model's base-case forcing).  "
            "Every red band is a bleaching period: the model is applying heat-stress mortality.",
            loc="left", pad=8)
top, seen = [], set()
for e in sorted(MAJOR, key=lambda x: -x["dd"]):
    if e["s"].year in seen: continue
    seen.add(e["s"].year); top.append(e)
    if len(top) == 6: break
for i, e in enumerate(sorted(top, key=lambda x: x["s"])):
    mid = e["s"] + (e["e"] - e["s"]) / 2
    a.text(mid, 32.70 if i % 2 == 0 else 32.12, f"{e['s'].year}", ha="center", va="top",
           fontsize=8.4, color=C_HEAT, fontweight="bold", zorder=8)

a = ax[1]; a.grid(axis="x", visible=False)
for s in SEASONS:
    mid = s["start"] + (s["end"] - s["start"]) / 2
    a.bar(mid, s["h730"], width=150, edgecolor="none", zorder=3,
          color=C_CALM if s is BEST else (C_HOT if s is WORST else "#b9c0c8"))
a.set_ylabel("°C-days in the\n2 yr after planting"); a.set_ylim(0, 118)
a.set_title("B    Every Dec–May planting season, scored by the heat stress an outplanting would then "
            "have to survive.  Shorter is better.", loc="left", pad=8)
a.annotate(f"IDEAL PLANTING WINDOW\nDec 2005 – May 2006\n{BEST['h730']:.0f} °C-days over the next 2 yr",
           xy=(BEST["end"], BEST["h730"]), xytext=(dt.date(2008, 6, 1), 74),
           fontsize=8.6, color=C_CALM, fontweight="bold",
           arrowprops=dict(arrowstyle="->", color=C_CALM, lw=1.4))
a.annotate(f"WORST IN THE RECORD\nDec 2022 – May 2023\n{WORST['h730']:.0f} °C-days",
           xy=(WORST["end"], WORST["h730"]), xytext=(dt.date(2015, 1, 1), 96),
           fontsize=8.6, color=C_HOT, fontweight="bold", ha="right",
           arrowprops=dict(arrowstyle="->", color=C_HOT, lw=1.4))

a = ax[2]; shade(a); plantline(a, LBL)
a.plot(DATES, [R["CALM90"][t]["sp2"] for t in TS], color=C_CALM, lw=1.5, zorder=5,
       label="90 kg planted 2006-05-17")
a.plot(DATES, [R["HOT90"][t]["sp2"] for t in TS], color=C_HOT, lw=1.5, zorder=5,
       label="90 kg planted 2023-05-17")
a.plot(DATES, [R["BASE"][t]["sp2"] for t in TS], color=C_BASE, lw=1.1, ls=(0, (5, 2.5)),
       zorder=6, label="no restoration (baseline)")
a.set_ylabel("Acropora cervicornis biomass (kg)")
a.set_title("C    Biomass at the outplanting site — polygon 5, EBIN 5 (0–1 m reef crest)", loc="left", pad=8)
a.legend(loc="lower left", frameon=False, ncol=3, fontsize=8.6)

a = ax[3]; shade(a); plantline(a, LBL)
a.axhline(0, color="#9aa1a9", lw=0.9, zorder=4)
for k, c in (("CALM90", C_CALM), ("HOT90", C_HOT)):
    a.plot(DATES, [R[k][t]["sp2"] - R["BASE"][t]["sp2"] for t in TS], color=c, lw=1.8, zorder=5,
           label=LBL[k])
a.set_ylim(-3, 104); a.set_ylabel("biomass above baseline (kg)")
a.set_title("D    What the 90 kg is still worth — planted run minus baseline.  "
            "Both plantings are identical in species, mass, polygon and depth; only the date differs.",
            loc="left", pad=8)
a.legend(loc="upper left", frameon=False, ncol=2, fontsize=8.6)
for k, c in (("CALM90", C_CALM), ("HOT90", C_HOT)):
    for yrs in (1, 2):
        d = PLANT[k] + dt.timedelta(days=365 * yrs); t = d2t(d)
        if t in R[k]:
            g = R[k][t]["sp2"] - R["BASE"][t]["sp2"]
            a.plot([d], [g], "o", color=c, ms=5.5, zorder=8)
            ha, ox = ("right", -10) if k == "HOT90" else ("left", 8)
            a.annotate(f"+{yrs} yr: {g/90*100:.0f} %", xy=(d, g), ha=ha,
                       xytext=(ox, 24 if yrs == 1 else -8), textcoords="offset points",
                       fontsize=8.3, color=c, fontweight="bold")
a.xaxis.set_major_locator(mdates.YearLocator(2)); a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
a.set_xlim(sst_d[0], t2d(TS[-1]))

fig.legend(handles=[Patch(facecolor=C_HEAT, alpha=0.20, label="bleaching period  (SST > 30 °C for ≥ 10 days)"),
                    Line2D([], [], color=C_CALM, lw=2.4, label="ideal planting date  (2006-05-17)"),
                    Line2D([], [], color=C_HOT, lw=2.4, label="worst-case planting date  (2023-05-17)"),
                    Line2D([], [], color=C_BASE, lw=1.4, ls=(0, (5, 2.5)), label="no-restoration baseline")],
           loc="lower center", ncol=4, frameon=False, bbox_to_anchor=(0.5, 0.004), fontsize=9)
fig.suptitle("When you plant decides what survives:  two identical 90 kg outplantings at Laughing Bird Caye",
             fontsize=14.5, fontweight="bold", x=0.010, ha="left", y=0.988)
fig.tight_layout(rect=[0, 0.028, 1, 0.968])
fig.savefig(f"{FIGS}/planting-timing-1-overview.png", dpi=165)
plt.close(fig)

# ================= FIGURE 2 =================
fig, ax = plt.subplots(2, 2, figsize=(14.2, 8.0),
                       gridspec_kw=dict(height_ratios=[1, 1.35], hspace=0.22, wspace=0.15))
for col, k in enumerate(("CALM90", "HOT90")):
    c = C_CALM if "CALM" in k else C_HOT
    p = PLANT[k]
    t0, t1 = p - dt.timedelta(days=210), p + dt.timedelta(days=1100)
    a0, a1 = ax[0][col], ax[1][col]
    for a in (a0, a1):
        a.set_facecolor(SURF); shade(a, 0.20, major_only=False); plantline(a, (k,)); a.set_xlim(t0, t1)
        a.xaxis.set_major_locator(mdates.MonthLocator(bymonth=[1, 7]))
        a.xaxis.set_major_formatter(mdates.DateFormatter("%b\n%Y"))
    a0.plot(sst_d, sst_v, color=C_SST, lw=0.85, zorder=4)
    a0.axhline(THR, color=C_HEAT, lw=1.1, ls="--", zorder=5)
    a0.set_ylim(25.4, 32.0); a0.set_ylabel("SST (°C)")
    nh = first_hot_after(p)
    a0.set_title(f"{LBL[k]}\nfirst bleaching day {nh}  (+{(nh - p).days} d)   ·   "
                 f"{heat(*W2[k]):.0f} °C-days over the next 2 yr",
                 loc="left", fontweight="bold", pad=7, fontsize=10)
    sel = [t for t in TS if t0 <= t2d(t) <= t1]
    a1.plot([t2d(t) for t in sel], [R[k][t]["sp2"] - R["BASE"][t]["sp2"] for t in sel],
            color=c, lw=2.0, zorder=5)
    a1.axhline(0, color="#9aa1a9", lw=0.9, zorder=4)
    a1.set_ylim(-4, 100); a1.set_ylabel("biomass above baseline (kg)")
    for yrs in (1, 2):
        d = p + dt.timedelta(days=365 * yrs); t = d2t(d)
        if t in R[k]:
            g = R[k][t]["sp2"] - R["BASE"][t]["sp2"]
            a1.plot([d], [g], "o", color=c, ms=6, zorder=7)
            a1.annotate(f"+{yrs} yr\n{g:.1f} kg  ({g/90*100:.0f} %)", xy=(d, g), xytext=(8, 14),
                        textcoords="offset points", fontsize=8.4, color=c, fontweight="bold")
    a1.annotate("90 kg in", xy=(p, 90), xytext=(-58, 4), textcoords="offset points",
                fontsize=8.6, color=c, fontweight="bold")
fig.suptitle("Close-up: the same 90 kg, seventeen years apart",
             fontsize=13.5, fontweight="bold", x=0.010, ha="left", y=0.985)
fig.tight_layout(rect=[0, 0.01, 1, 0.945])
fig.savefig(f"{FIGS}/planting-timing-2-zoom.png", dpi=165)
plt.close(fig)

# ================= FIGURE 3 =================
HOR = [("+6 mo", 182), ("+1 yr", 365), ("+2 yr", 730), ("+3 yr", 1095)]
fig, axs = plt.subplots(1, 2, figsize=(14.2, 4.8), gridspec_kw=dict(wspace=0.2))
for a in axs: a.set_facecolor(SURF); a.grid(axis="x", visible=False)
w = 0.36
a = axs[0]
for i, (k, c) in enumerate((("CALM90", C_CALM), ("HOT90", C_HOT))):
    xs = [j + (i - 0.5) * w for j in range(len(HOR))]
    ys = [R[k][d2t(PLANT[k] + dt.timedelta(days=dd))]["sp2"] -
          R["BASE"][d2t(PLANT[k] + dt.timedelta(days=dd))]["sp2"] for _, dd in HOR]
    b = a.bar(xs, ys, w, color=c, label=LBL[k], zorder=3)
    a.bar_label(b, labels=[f"{y:.1f} kg\n{y/90*100:.0f} %" for y in ys],
                fontsize=8.2, padding=3, color=c, fontweight="bold")
a.set_xticks(range(len(HOR))); a.set_xticklabels([h[0] for h in HOR])
a.set_ylabel("kg still above baseline"); a.set_ylim(0, 100)
a.axhline(90, color=MUT, ls="--", lw=1)
a.text(-0.48, 91.5, "90 kg outplanted", fontsize=8.3, color=MUT)
a.set_title("A    How much of the outplanting survives", loc="left", fontweight="bold", pad=7)
a.legend(frameon=False, fontsize=8.6, loc="upper right", bbox_to_anchor=(1.0, 0.87))
a = axs[1]
for i, (k, c) in enumerate((("CALM90", C_CALM), ("HOT90", C_HOT))):
    xs = [j + (i - 0.5) * w for j in range(len(HOR))]
    ys = [heat(PLANT[k] + dt.timedelta(days=1), PLANT[k] + dt.timedelta(days=dd)) for _, dd in HOR]
    b = a.bar(xs, ys, w, color=c, alpha=0.9, zorder=3)
    a.bar_label(b, fmt="%.0f", fontsize=8.4, padding=3, color=c, fontweight="bold")
a.set_xticks(range(len(HOR))); a.set_xticklabels([h[0] for h in HOR])
a.set_ylabel("°C-days above 30 °C"); a.set_ylim(0, 135)
a.set_title("B    Heat stress it had to survive over the same period", loc="left", fontweight="bold", pad=7)
fig.suptitle("Retention versus accumulated heat stress", fontsize=13.5, fontweight="bold",
             x=0.010, ha="left", y=0.985)
fig.tight_layout(rect=[0, 0.01, 1, 0.92])
fig.savefig(f"{FIGS}/planting-timing-3-retention.png", dpi=165)
plt.close(fig)

# ================= numbers =================
out = ["Planting-season ranking (Dec–May window, scored by heat stress in the following 730 d):"]
for s in sorted(SEASONS, key=lambda x: x["h730"])[:5]:
    out.append(f"   BEST  Dec {s['y']} – May {s['y']+1}   {s['h730']:6.2f} degC-days")
for s in sorted(SEASONS, key=lambda x: -x["h730"])[:3]:
    out.append(f"   WORST Dec {s['y']} – May {s['y']+1}   {s['h730']:6.2f} degC-days")
for k, k5 in (("CALM90", "CALM5"), ("HOT90", "HOT5")):
    p = PLANT[k]; nh = first_hot_after(p)
    out += [f"\n=== {k} — 90 kg Acropora cervicornis, polygon 5, EBIN 5, planted {p} ===",
            f"  first bleaching day after planting : {nh}  (+{(nh-p).days} d)",
            f"  heat stress, next 730 d           : {heat(*W2[k]):6.2f} degC-days"]
    for lab, dd in HOR + [("+5 yr", 1825)]:
        t = d2t(p + dt.timedelta(days=dd))
        if t in R[k]:
            g  = R[k][t]["sp2"] - R["BASE"][t]["sp2"]
            g5 = R[k5][t]["sp2"] - R["BASE"][t]["sp2"]
            out.append(f"  {lab:6s}: {g:7.2f} kg retained ({g/90*100:5.1f} % of 90 kg)   "
                       f"[5 kg run: {g5:5.3f} kg = {g5/5*100:5.1f} %]")
txt = "\n".join(out); print(txt); open(f"{FIGS}/summary.txt", "w").write(txt)
print("\nfigures ->", FIGS)
