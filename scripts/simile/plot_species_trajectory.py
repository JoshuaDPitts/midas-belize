#!/usr/bin/env python3
"""Whole-reef coral biomass trajectory per species, over the SSP-2.5 run, from
the per-EBIN LBC4 capture. One PNG per species, dated x-axis, verified
bleaching-event bands.

Biomass is summed over all 43 locations and all 7 EBIN depth bands per species
per timestep (whole-reef total). Dates map sim_day -> real MUR SST date
(record begins 2002-06-01), so bands line up with the heat stress that drove
the run.

Usage: python3 plot_species_trajectory.py --csv <ebin-profile.csv> [--out-dir D]
"""
import argparse, csv, os, datetime as dt
from collections import defaultdict
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

BASE_DATE = dt.date(2002, 6, 1)  # MUR SST record start = model sim_day 1
SPECIES_COLOR = {1: "#1f6fe0", 2: "#e8871e", 3: "#2ca049"}
SPECIES_NAME = {1: "Acropora palmata", 2: "Acropora cervicornis", 3: "Orbicella spp."}
SPECIES_SLUG = {1: "Acropora-palmata", 2: "Acropora-cervicornis", 3: "Orbicella-spp"}

# Verified bleaching events (NOAA CRW Belize DHW + literature). tier: shading weight.
# (year, label, tier)  tier 3=record, 2=severe, 1=moderate/sub-lethal
BANDS = [
    (2005, "", 1), (2010, "", 1), (2011, "", 1),
    (2015, "2015-16", 2), (2016, "", 2),
    (2017, "2017  (DHW 14.8)", 2),
    (2019, "2019  (DHW 16.4 > 2017)", 2),
    (2020, "2020  (DHW 16.2)", 2),
    (2021, "2021", 1),
    (2023, "2023-24  record (DHW 20.9)", 3), (2024, "", 3),
]
TIER_ALPHA = {1: 0.06, 2: 0.13, 3: 0.20}


def sim_day_to_date(d):
    return BASE_DATE + dt.timedelta(days=int(d) - 1)


def load(csv_path):
    """{species_id: {sim_day: summed biomass over all EBIN+location}}"""
    agg = defaultdict(lambda: defaultdict(float))
    with open(csv_path, newline="") as fh:
        for r in csv.DictReader(fh):
            agg[int(r["species_id"])][int(r["sim_day"])] += float(r["biomass"])
    return agg


def draw_bands(ax, y0, y1):
    for year, label, tier in BANDS:
        s = dt.date(year, 6, 1)
        e = dt.date(year, 12, 31)
        ax.axvspan(s, e, color="#c0392b", alpha=TIER_ALPHA[tier], lw=0, zorder=0)
        if label:
            ax.text(dt.date(year, 9, 1), y1 * 0.98, label, rotation=90,
                    va="top", ha="center", fontsize=7, color="#7b241c", zorder=5)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out-dir", default=None)
    ap.add_argument("--label", default="SSP-2.5")
    args = ap.parse_args()
    LAB = args.label; SLUG = LAB.replace(" ", "").replace("/", "-")
    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.abspath(args.csv)), "plots")
    os.makedirs(out_dir, exist_ok=True)

    agg = load(args.csv)
    made = []
    for sid in sorted(agg):
        days = sorted(agg[sid])
        dates = [sim_day_to_date(d) for d in days]
        vals = [agg[sid][d] / 1000.0 for d in days]  # tonnes (kg/1000)
        ymax = max(vals) * 1.08 if vals else 1

        fig, ax = plt.subplots(figsize=(11, 4.6), dpi=150)
        ax.set_facecolor("#f4f6f7")
        ax.grid(True, color="white", linewidth=0.8, zorder=0)
        for sp in ("top", "right"):
            ax.spines[sp].set_visible(False)
        draw_bands(ax, 0, ymax)
        ax.plot(dates, vals, color=SPECIES_COLOR[sid], linewidth=1.4, zorder=4)
        ax.set_ylim(0, ymax)
        ax.set_xlim(dates[0], dates[-1])
        ax.xaxis.set_major_locator(mdates.YearLocator(2))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        ax.set_ylabel("Whole-reef biomass (t)")
        ax.set_title(f"{SPECIES_NAME[sid]}  —  whole-reef coral biomass, {LAB}, Laughing Bird Caye",
                     fontsize=11, fontweight="bold")
        ax.text(0.008, 0.03, "Red bands = verified Belize bleaching years (NOAA Coral Reef Watch DHW)",
                transform=ax.transAxes, fontsize=7.5, color="#7b241c")
        fig.tight_layout()
        fn = f"lbc4_{SLUG}_whole-reef-biomass_species{sid}_{SPECIES_SLUG[sid]}.png"
        p = os.path.join(out_dir, fn)
        fig.savefig(p)
        plt.close(fig)
        made.append(p)
    for p in made:
        print(p)


if __name__ == "__main__":
    main()
