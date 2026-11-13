#!/usr/bin/env python3
"""The single 2006 outplanting followed through every heat-stress rule.

Fig 1  retention trajectories, one panel per rule family
Fig 2  decay milestones and the 60-day windows in which the planting is actually lost
"""
import csv, json, datetime as dt, os, importlib.util
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.colors as mcolors
from matplotlib import colormaps
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("dec", os.path.join(HERE, "analyse_planting_decay.py"))
dec  = importlib.util.module_from_spec(spec)
import sys; sys.stdout = open(os.devnull, "w"); spec.loader.exec_module(dec); sys.stdout = sys.__stdout__
ROWS, KG, PLANTD = dec.rows, dec.KG, dec.PLANTD
FIGS = os.path.join(HERE, "output", "planting-decay"); os.makedirs(FIGS, exist_ok=True)

SURF, INK, MUT, C_HEAT = "#fcfcfb", "#2c3138", "#7a828c", "#c0392b"
ONSET_C = {0: "#2a78d6", 4: "#1baf7a", 8: "#eb6834", 12: "#7b4fbf"}
plt.rcParams.update({"font.family": "DejaVu Sans", "axes.edgecolor": "#c9cdd3",
                     "axes.labelcolor": INK, "text.color": INK, "figure.facecolor": SURF,
                     "xtick.color": MUT, "ytick.color": MUT, "font.size": 9,
                     "axes.titlesize": 10.5, "axes.grid": True, "grid.color": "#e9ebee",
                     "grid.linewidth": 0.6, "axes.axisbelow": True})

# bleaching bands from the model's own forcing, for reference in every panel
sstd, sstv = [], []
for r in csv.DictReader(open('/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/'
        'Shared drives/MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time/'
        'laughingbird_mur_sst_daily_bboxmean_2002_2026.csv')):
    sstd.append(dt.datetime.strptime(r["date"], "%m/%d/%Y").date()); sstv.append(float(r["sst_mean_degC"]))
BANDS, run = [], None
for d, v in zip(sstd, sstv):
    hot = v > 30.0
    if hot and run is None: run = d
    elif not hot and run is not None:
        if (d - run).days >= 10: BANDS.append((run, d))
        run = None
def shade(ax):
    for a, b in BANDS: ax.axvspan(a, b, color=C_HEAT, alpha=0.13, lw=0, zorder=0)

TH  = [a for a in ROWS if a["group"] == "threshold"]
DI  = [a for a in ROWS if a["group"] == "dhw-integral"]
DP  = [a for a in ROWS if a["group"] == "dhw-peak"]
thnorm = mcolors.Normalize(28.0, 31.5)
thcmap = colormaps["viridis_r"]
X0, X1 = dt.date(2006, 1, 1), dt.date(2026, 12, 31)

# ============ FIGURE 1 ============
fig, ax = plt.subplots(3, 1, figsize=(14.6, 12.4), sharex=True, gridspec_kw=dict(hspace=0.24))
def curve(a):
    return [dec.t2d(t) for t in a["ts"]], [x / KG * 100 for x in a["v"]]

a = ax[0]; a.set_facecolor(SURF); shade(a)
for r in TH:
    if r["sort"] > 31.5: continue
    d, y = curve(r)
    a.plot(d, y, color=thcmap(thnorm(r["sort"])), lw=2.2 if r["sort"] == 30.0 else 1.4,
           zorder=6 if r["sort"] == 30.0 else 4, label=f"{r['sort']:.1f}")
a.set_ylabel("% of the 90 kg retained"); a.set_ylim(-3, 108)
A_TITLE = ("A    SST-threshold family.  Θ is the temperature above which heat mortality applies.  "
           "Θ ≥ 31.5 never fires, so the planting is never lost.")
lg = a.legend(title="Θ  (°C)", frameon=False, fontsize=8, ncol=1, loc="upper left",
              bbox_to_anchor=(1.005, 1.03)); lg.get_title().set_fontsize(8.5)
a.annotate("shipped model, Θ = 30.0", xy=(dt.date(2007, 2, 1), 22), xytext=(dt.date(2010, 6, 1), 46),
           fontsize=8.6, color=thcmap(thnorm(30.0)), fontweight="bold",
           arrowprops=dict(arrowstyle="->", color=thcmap(thnorm(30.0)), lw=1.3))

for k, (grp, ttl, ymax) in enumerate(((DI, "B    DHW family, calibrated to the same TOTAL stress as the shipped model", 108),
                                      (DP, "C    DHW family, calibrated to the same PEAK daily rate", 250))):
    a = ax[k + 1]; a.set_facecolor(SURF); shade(a)
    for r in grp:
        d, y = curve(r)
        a.plot(d, y, color=ONSET_C[r["onset"]], lw=1.7,
               ls="-" if f"{r['mmm']:.2f}" == "28.70" else ":", zorder=5,
               label=(f"{r['mmm']:.2f} · " + ("any DHW" if r["onset"] == 0 else f"DHW ≥ {r['onset']}")
                      + ("  (never fires)" if r["degenerate"] else "")))
    a.set_ylabel("% of the 90 kg retained"); a.set_ylim(-6, ymax)
    a.set_title(ttl, loc="left", pad=8)
    a.legend(title="MMM · trigger", frameon=False, fontsize=7.9, ncol=1, loc="upper left",
             bbox_to_anchor=(1.005, 1.03)).get_title().set_fontsize(8.5)
    if ymax > 120:
        a.axhline(100, color=MUT, lw=1.0, ls="--")
        a.text(dt.date(2016, 1, 1), 128, "above 100 %: the outplanting seeds regrowth on a collapsing reef",
               fontsize=8.2, color=MUT, ha="center")
for _a in ax:
    _a.xaxis.set_major_locator(mdates.YearLocator(2, month=1, day=1))
    _a.xaxis.set_minor_locator(mdates.YearLocator(1, month=1, day=1))
    _a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    _a.set_xlim(X0, X1)
    _a.tick_params(axis="x", which="minor", length=3, color="#c9cdd3")
ax[2].set_xlabel("Year", fontsize=10, labelpad=6)
ax[2].tick_params(axis="x", which="major", labelsize=9)

# second scale on the top of panel A: years elapsed since the planting
top = ax[0].secondary_xaxis("top")
top.set_xticks([PLANTD.replace(year=PLANTD.year + k) for k in range(0, 21, 2)])
top.set_xticklabels([str(k) for k in range(0, 21, 2)], fontsize=8.5)
top.set_xlabel("years since planting", fontsize=9, labelpad=5, color=MUT)
top.tick_params(colors=MUT, length=3)
ax[0].text(0.0, 1.19, A_TITLE, transform=ax[0].transAxes, fontsize=10.5,
           va="bottom", ha="left", color=INK)
fig.legend(handles=[Patch(facecolor=C_HEAT, alpha=0.13, label="bleaching period (SST > 30 °C for ≥ 10 d)")],
           loc="lower left", frameon=False, bbox_to_anchor=(0.065, 0.005), fontsize=8.6)
fig.suptitle("One 90 kg outplanting, 17 May 2006, under every heat-stress rule we have run",
             fontsize=14.5, fontweight="bold", x=0.010, ha="left", y=0.988)
fig.tight_layout(rect=[0, 0.025, 0.788, 0.945])
fig.savefig(f"{FIGS}/planting-decay-trajectories.png", dpi=165)
plt.close(fig)


# ============ STANDALONE PANELS (one file per figure, for the paper) ============
def standalone(fname, title, series, ymax, note=None, thresh_legend=False):
    f, a = plt.subplots(figsize=(11.4, 5.9))
    a.set_facecolor(SURF); shade(a)
    for kw in series:
        a.plot(kw["x"], kw["y"], color=kw["c"], lw=kw["lw"], ls=kw["ls"],
               zorder=kw["z"], label=kw["label"])
    a.set_ylabel("% of the 90 kg outplanting retained")
    a.set_ylim(-ymax * 0.03, ymax)
    a.set_xlim(X0, X1)
    a.xaxis.set_major_locator(mdates.YearLocator(2, month=1, day=1))
    a.xaxis.set_minor_locator(mdates.YearLocator(1, month=1, day=1))
    a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    a.tick_params(axis="x", which="minor", length=3, color="#c9cdd3")
    a.set_xlabel("Year", fontsize=10, labelpad=6)
    top = a.secondary_xaxis("top")
    top.set_xticks([PLANTD.replace(year=PLANTD.year + k) for k in range(0, 21, 2)])
    top.set_xticklabels([str(k) for k in range(0, 21, 2)], fontsize=8.5)
    top.set_xlabel("years since planting", fontsize=9, labelpad=5, color=MUT)
    top.tick_params(colors=MUT, length=3)
    if ymax > 120:
        a.axhline(100, color=MUT, lw=1.0, ls="--")
    if note:
        a.text(dt.date(2016, 6, 1), ymax * 0.52, note, fontsize=8.4, color=MUT, ha="center")
    h, l = a.get_legend_handles_labels()
    h.append(Patch(facecolor=C_HEAT, alpha=0.13)); l.append("bleaching period (SST > 30 °C, ≥ 10 d)")
    lg = a.legend(h, l, title=("Θ  (°C)" if thresh_legend else "MMM · trigger"), frameon=False,
                  fontsize=8.4, loc="upper left", bbox_to_anchor=(1.012, 1.02),
                  alignment="left", labelspacing=0.55)
    lg.get_title().set_fontsize(8.6)
    f.suptitle(title, fontsize=12.5, fontweight="bold", x=0.012, ha="left", y=0.985)
    f.tight_layout(rect=[0, 0, 0.815, 0.925])
    f.savefig(f"{FIGS}/{fname}", dpi=300)
    plt.close(f)
    print("  ", fname)

print("standalone panels:")
sA = [dict(x=curve(r)[0], y=curve(r)[1], c=thcmap(thnorm(r["sort"])),
           lw=2.4 if r["sort"] == 30.0 else 1.5, ls="-",
           z=6 if r["sort"] == 30.0 else 4, label=f"{r['sort']:.1f}")
      for r in TH if r["sort"] <= 31.5]
standalone("panel-A-sst-threshold.png",
           "Retention of a 90 kg outplanting under different heat-mortality temperatures",
           sA, 108, thresh_legend=True)

for fn, grp, ttl, ymax, note in (
        ("panel-B-dhw-same-total-stress.png", DI,
         "Retention under NOAA heat build-up rules, matched on total stress", 108, None),
        ("panel-C-dhw-same-peak-rate.png", DP,
         "Retention under NOAA heat build-up rules, matched on peak daily rate", 250,
         "above 100 %: the outplanting seeds regrowth on a collapsing reef")):
    ser = [dict(x=curve(r)[0], y=curve(r)[1], c=ONSET_C[r["onset"]], lw=1.9,
                ls="-" if f"{r['mmm']:.2f}" == "28.70" else ":", z=5,
                label=(f"{r['mmm']:.2f} · " + ("any DHW" if r["onset"] == 0 else f"DHW ≥ {r['onset']}")
                       + ("  (never fires)" if r["degenerate"] else "")))
           for r in grp]
    standalone(fn, ttl, ser, ymax, note=note)

# ============ FIGURE 2 : milestones + fall-off windows ============
ORDER = [r for r in TH if r["sort"] <= 31.5] + [None] + DI + [None] + DP
ORDER = [r for r in ORDER if r is None or not (r and r.get("degenerate") and r["group"] != "threshold")]
rowsY, labels, colors = [], [], []
y = 0
for r in ORDER:
    if r is None:
        rowsY.append(None); labels.append(""); colors.append(None); y += 1; continue
    rowsY.append(y); labels.append(r["label"] if r["group"] != "threshold" else f"Θ = {r['sort']:.1f} °C")
    colors.append(thcmap(thnorm(r["sort"])) if r["group"] == "threshold" else ONSET_C[r["onset"]])
    y += 1
N = y
fig, a = plt.subplots(figsize=(14.2, 10.4))
a.set_facecolor(SURF); a.grid(axis="y", visible=False); shade(a)
MK = {75: ("o", 5.5), 50: ("D", 6.0), 25: ("s", 5.5), 10: ("v", 6.5)}
for r, yy, c in zip(ORDER, rowsY, colors):
    if r is None: continue
    Y = N - 1 - yy
    a.plot([PLANTD, X1], [Y, Y], color="#e2e5e8", lw=1.0, zorder=1)
    for s, e, drop in r["eps"]:
        a.plot([s, e], [Y, Y], color=c, lw=6.5, alpha=0.55, solid_capstyle="butt", zorder=3)
    for L, (m, ms) in MK.items():
        d = r["cross"][L]
        if d: a.plot([d], [Y], m, color=c, ms=ms, mec="white", mew=0.8, zorder=6)
    last = r["cross"][10]
    if last is None:
        a.text(X1 - dt.timedelta(days=40), Y, "never drops below 10 %", fontsize=7.8,
               color=c, ha="right", va="center", fontweight="bold", zorder=7)
# group headers
GH = [("SST-THRESHOLD FAMILY", 0), ("DHW  ·  same total stress", None), ("DHW  ·  same peak rate", None)]
gi, seen = 0, []
for r, yy in zip(ORDER, rowsY):
    if r is None: seen.append(yy); continue
gstarts = [rowsY[0]]
for k, yy in enumerate(rowsY):
    if yy is None and k + 1 < len(rowsY): gstarts.append(rowsY[k + 1])
for (title, _), gs_ in zip(GH, gstarts):
    Y = N - 1 - gs_
    a.text(PLANTD - dt.timedelta(days=100), Y + 0.85, title, fontsize=8.8, color=INK,
           fontweight="bold", va="bottom", ha="left", zorder=8)
a.set_yticks([N - 1 - v for v in rowsY if v is not None])
a.set_yticklabels([l for l, v in zip(labels, rowsY) if v is not None], fontsize=8.2)
a.set_ylim(-1.2, N + 0.4); a.set_xlim(PLANTD - dt.timedelta(days=340), X1 + dt.timedelta(days=120))
a.xaxis.set_major_locator(mdates.YearLocator(2)); a.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
a.axvline(PLANTD, color="#1baf7a", lw=2.0, zorder=5)
a.text(PLANTD + dt.timedelta(days=60), -0.9, "planted 2006-05-17", color="#1baf7a",
       fontsize=8.6, fontweight="bold", va="center")
a.set_title("When the planting is lost.  Markers are the dates retention falls through each level; "
            "thick bars are the 60-day windows in which the loss actually happens.", loc="left", pad=9)
a.legend(handles=[Line2D([], [], ls="", marker=MK[L][0], color=MUT, ms=MK[L][1],
                         label=f"falls below {L} %") for L in (75, 50, 25, 10)]
                 + [Line2D([], [], color=MUT, lw=6.5, alpha=0.55, label="sharpest 60-day losses"),
                    Patch(facecolor=C_HEAT, alpha=0.13, label="bleaching period")],
         frameon=False, fontsize=8.4, ncol=6, loc="lower center", bbox_to_anchor=(0.5, -0.115))
fig.suptitle("The rule does not just change how fast the planting goes — it changes which year takes it",
             fontsize=14.5, fontweight="bold", x=0.010, ha="left", y=0.985)
fig.tight_layout(rect=[0, 0.055, 1, 0.955])
fig.savefig(f"{FIGS}/planting-decay-timeline.png", dpi=165)
plt.close(fig)
print("wrote", FIGS)
