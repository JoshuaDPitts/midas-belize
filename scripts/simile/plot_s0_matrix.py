#!/usr/bin/env python3
"""S0 reference reef: whole-reef coral biomass per species, three climate forcings.

One PNG per (climate, species). All nine share an identical 2002 to 2026 x-axis, and
y-axis is shared per species so the three climates are directly comparable.

Heat-stress bands are derived from the SST series that actually drove each run
(SST above 30 C, the model's Threshold 3, for 10 or more consecutive days), so the
shading is internally consistent with the forcing rather than borrowed from the
observed record.

Naming: S0-OBS, S0-SSP126, S0-SSP245 (see agent_inst.md section 16).
"""
import csv, os, datetime as dt
from collections import defaultdict
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Patch

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = os.path.join(HERE, "output", "s0-matrix", "runs")
FIGS = os.path.join(HERE, "output", "s0-matrix", "figs"); os.makedirs(FIGS, exist_ok=True)
TIME = ("/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/"
        "MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time")
BASE = dt.date(2002, 6, 1)
t2d  = lambda d: BASE + dt.timedelta(days=int(d) - 1)

SPECIES  = {1: "Acropora palmata", 2: "Acropora cervicornis", 3: "Orbicella spp."}
SLUG     = {1: "Acropora-palmata", 2: "Acropora-cervicornis", 3: "Orbicella-spp"}
FAMILIES = [
    ("S0-OBS",    "Observational (MUR satellite SST)",
     f"{TIME}/laughingbird_mur_sst_daily_bboxmean_2002_2026.csv", "sst_mean_degC"),
    ("S0-SSP126", "SSP1-2.6-aligned (+0.10 C/decade on MUR)",
     f"{TIME}/laughingbird_ssp126_2002_2026.csv", "sst_degC"),
    ("S0-SSP245", "SSP2-4.5-aligned (+0.20 C/decade on MUR)",
     f"{TIME}/laughingbird_ssp245_2002_2026.csv", "sst_degC"),
]
C_LINE, C_HEAT, SURF, INK, MUT = "#2a78d6", "#c0392b", "#fcfcfb", "#2c3138", "#7a828c"
plt.rcParams.update({"font.family": "DejaVu Sans", "figure.facecolor": SURF, "text.color": INK,
    "axes.labelcolor": INK, "xtick.color": MUT, "ytick.color": MUT, "font.size": 9,
    "axes.grid": True, "grid.color": "#e9ebee", "grid.linewidth": 0.6, "axes.axisbelow": True,
    "axes.edgecolor": "#c9cdd3"})

def bands(path, col, thr=30.0, minrun=10):
    ds, vs = [], []
    for r in csv.DictReader(open(path)):
        ds.append(dt.datetime.strptime(r["date"], "%m/%d/%Y").date()); vs.append(float(r[col]))
    out, run = [], None
    for d, v in zip(ds, vs):
        if v > thr and run is None: run = d
        elif v <= thr and run is not None:
            if (d - run).days >= minrun: out.append((run, d))
            run = None
    if run is not None and (ds[-1] - run).days >= minrun: out.append((run, ds[-1]))
    return out

def load(tag):
    agg = defaultdict(lambda: defaultdict(float))
    with open(f"{RUNS}/{tag}.csv") as fh:
        for r in csv.DictReader(fh):
            agg[int(r["species_id"])][int(r["sim_day"])] += float(r["biomass"])
    return agg

DATA  = {tag: load(tag) for tag, _, _, _ in FAMILIES}
BANDS = {tag: bands(p, c) for tag, _, p, c in FAMILIES}
XMIN, XMAX = dt.date(2002, 1, 1), dt.date(2027, 1, 1)

# shared y per species across the three climates
YMAX = {}
for sid in SPECIES:
    m = max(max(DATA[t][sid].values()) for t in DATA if DATA[t][sid])
    YMAX[sid] = m / 1000.0 * 1.10

print(f"{'file':44s} {'species':22s} {'start t':>9} {'end t':>9} {'change':>9}")
for tag, caption, _, _ in FAMILIES:
    for sid in sorted(SPECIES):
        days = sorted(DATA[tag][sid])
        xs = [t2d(d) for d in days]
        ys = [DATA[tag][sid][d] / 1000.0 for d in days]
        fig, ax = plt.subplots(figsize=(11.6, 4.9))
        ax.set_facecolor(SURF)
        for a, b in BANDS[tag]:
            ax.axvspan(a, b, color=C_HEAT, alpha=0.16, lw=0, zorder=0)
        ax.plot(xs, ys, color=C_LINE, lw=1.5, zorder=4)
        ax.set_xlim(XMIN, XMAX); ax.set_ylim(0, YMAX[sid])
        ax.xaxis.set_major_locator(mdates.YearLocator(2, month=1, day=1))
        ax.xaxis.set_minor_locator(mdates.YearLocator(1, month=1, day=1))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        ax.tick_params(axis="x", which="minor", length=3, color="#c9cdd3")
        ax.set_xlabel("Year", labelpad=6)
        ax.set_ylabel("Whole-reef biomass (t)")
        ax.text(0, 1.115, f"{tag}   {SPECIES[sid]}", transform=ax.transAxes,
                fontsize=12.5, fontweight="bold", va="bottom")
        ax.text(0, 1.030, f"{caption}. Whole reef: 43 polygons, 7 depth bands. No planting.",
                transform=ax.transAxes, fontsize=8.6, color=MUT, va="bottom")
        ax.legend(handles=[Patch(facecolor=C_HEAT, alpha=0.16,
                  label="modelled heat stress (SST above 30 C for 10+ days)")],
                  frameon=False, fontsize=8.2, loc="lower left")
        fig.tight_layout(rect=[0,0,1,0.93])
        fn = f"{FIGS}/{tag}_{SLUG[sid]}.png"
        fig.savefig(fn, dpi=200); plt.close(fig)
        print(f"{os.path.basename(fn):44s} {SPECIES[sid]:22s} {ys[0]:>9.1f} {ys[-1]:>9.1f} "
              f"{(ys[-1]/ys[0]-1)*100:>8.1f}%")
print(f"\nheat-stress periods: " + ", ".join(f"{t}={len(BANDS[t])}" for t in BANDS))
