#!/usr/bin/env python3
"""Grouped bar charts: coral biomass per EBIN depth band, grouped by species,
at selected time points. One panel per time point.
Usage: python3 plot_ebin_species_bars.py --csv <ebin-profile.csv> --label SSP-2.5 --years 2003 2019 2024
"""
import argparse, csv, os, datetime as dt
from collections import defaultdict
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE_DATE = dt.date(2002, 6, 1)
SPECIES_COLOR = {1: "#1f6fe0", 2: "#e8871e", 3: "#2ca049"}
SPECIES_NAME = {1: "Acropora palmata", 2: "Acropora cervicornis", 3: "Orbicella spp."}
EBIN_DEPTH = {1: ">20 m", 2: "5-20 m", 3: "2-5 m", 4: "1-2 m", 5: "0-1 m"}
EBINS = [5, 4, 3, 2, 1]  # crest -> deep


def d2date(d): return BASE_DATE + dt.timedelta(days=int(d) - 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--label", default="SSP-2.5")
    ap.add_argument("--years", type=int, nargs="+", default=[2003, 2019, 2024])
    ap.add_argument("--out-dir", default=None)
    args = ap.parse_args()
    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.abspath(args.csv)), "plots")
    os.makedirs(out_dir, exist_ok=True)

    # biomass[(ebin,species)][sim_day] summed over locations
    agg = defaultdict(lambda: defaultdict(float)); days=set()
    for r in csv.DictReader(open(args.csv, newline="")):
        agg[(int(r["ebin"]), int(r["species_id"]))][int(r["sim_day"])] += float(r["biomass"])
        days.add(int(r["sim_day"]))
    days = sorted(days)

    def nearest_day(year):
        target = (dt.date(year, 8, 1) - BASE_DATE).days + 1
        return min(days, key=lambda d: abs(d - target))

    years = [y for y in args.years if d2date(days[-1]).year >= y >= d2date(days[0]).year]
    fig, axes = plt.subplots(1, len(years), figsize=(4.4 * len(years), 4.4), dpi=150, sharey=True)
    if len(years) == 1: axes = [axes]
    x = np.arange(len(EBINS)); w = 0.26
    for ax, yr in zip(axes, years):
        day = nearest_day(yr)
        for i, sid in enumerate((1, 2, 3)):
            vals = [agg[(e, sid)].get(day, 0.0) / 1000.0 for e in EBINS]
            ax.bar(x + (i - 1) * w, vals, w, color=SPECIES_COLOR[sid],
                   label=SPECIES_NAME[sid] if ax is axes[0] else None)
        ax.set_title(str(yr), fontweight="bold")
        ax.set_xticks(x); ax.set_xticklabels([EBIN_DEPTH[e] for e in EBINS], rotation=35, ha="right", fontsize=8)
        ax.set_facecolor("#f4f6f7"); ax.grid(True, axis="y", color="white")
        for s in ("top", "right"): ax.spines[s].set_visible(False)
    axes[0].set_ylabel("biomass (t)")
    fig.legend(loc="upper center", ncol=3, frameon=False, fontsize=9, bbox_to_anchor=(0.5, 1.02))
    fig.suptitle(f"Coral biomass by depth band & species — {args.label}, Laughing Bird Caye", y=1.13, fontweight="bold")
    fig.tight_layout()
    slug = args.label.replace(" ", "").replace("/", "-")
    p = os.path.join(out_dir, f"lbc4_{slug}_ebin-species-bars_{'_'.join(map(str,years))}.png")
    fig.savefig(p, bbox_inches="tight"); plt.close(fig)
    print(p)


if __name__ == "__main__":
    main()
