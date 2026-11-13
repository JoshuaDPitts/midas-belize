#!/usr/bin/env python3
"""Reef-profile depth heatmap: coral biomass by EBIN depth band over time.
Two panels' worth of output:
  (a) absolute whole-reef biomass per depth band (t)
  (b) biomass normalised to each band's 2003-2010 pre-bleaching baseline (%),
      which shows how bleaching progressively strips the shallow crest bands
      while the deeper bands retain biomass.

Rows are ordered as a depth profile (shallow crest at top, deep at bottom).
Usage: python3 plot_reef_profile.py --csv <ebin-profile.csv> [--out-dir D]
"""
import argparse, csv, os, datetime as dt
from collections import defaultdict
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

BASE_DATE = dt.date(2002, 6, 1)
EBIN_DEPTH = {1: ">20 m", 2: "5-20 m", 3: "2-5 m", 4: "1-2 m", 5: "0-1 m (crest)"}
ROW_ORDER = [5, 4, 3, 2, 1]  # shallow crest at top -> deep at bottom
BANDS = [(2015, 1), (2016, 1), (2017, 2), (2019, 2), (2020, 2), (2021, 1), (2023, 3), (2024, 3)]


def d2date(d):
    return BASE_DATE + dt.timedelta(days=int(d) - 1)


def load(csv_path):
    agg = defaultdict(lambda: defaultdict(float))  # ebin -> day -> biomass (all species+loc)
    for r in csv.DictReader(open(csv_path, newline="")):
        agg[int(r["ebin"])][int(r["sim_day"])] += float(r["biomass"])
    return agg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out-dir", default=None)
    ap.add_argument("--label", default="SSP-2.5")
    args = ap.parse_args()
    LAB = args.label
    SLUG = LAB.replace(" ", "").replace("/", "-")
    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.abspath(args.csv)), "plots")
    os.makedirs(out_dir, exist_ok=True)

    agg = load(args.csv)
    days = sorted({d for e in ROW_ORDER for d in agg[e]})
    dates = [d2date(d) for d in days]
    x_edges = mdates.date2num(dates + [dates[-1] + (dates[-1] - dates[-2])])

    M = np.array([[agg[e].get(d, 0.0) / 1000.0 for d in days] for e in ROW_ORDER])  # tonnes
    y_edges = np.arange(len(ROW_ORDER) + 1)
    ylabels = [f"{EBIN_DEPTH[e]}" for e in ROW_ORDER]

    def finish(ax, title):
        ax.set_yticks(np.arange(len(ROW_ORDER)) + 0.5)
        ax.set_yticklabels(ylabels)
        ax.set_ylabel("depth band (EBIN)")
        ax.xaxis_date()
        ax.xaxis.set_major_locator(mdates.YearLocator(2))
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        for yr, tier in BANDS:
            ax.axvline(mdates.date2num(dt.date(yr, 9, 1)), color="#7b241c",
                       alpha=0.25 + 0.2 * tier, lw=0.8 + tier * 0.4)
        ax.set_title(title, fontsize=11, fontweight="bold")

    # (a) absolute
    fig, ax = plt.subplots(figsize=(12, 3.6), dpi=150)
    pc = ax.pcolormesh(x_edges, y_edges, M, cmap="YlGn", shading="flat")
    finish(ax, f"Reef profile — coral biomass by depth band, {LAB}, Laughing Bird Caye")
    cb = fig.colorbar(pc, ax=ax, pad=0.01); cb.set_label("biomass (t)")
    fig.tight_layout()
    p1 = os.path.join(out_dir, f"lbc4_{SLUG}_reef-profile_biomass-by-depth.png")
    fig.savefig(p1); plt.close(fig)

    # (b) normalised to 2003-2010 baseline per band
    base_mask = [i for i, d in enumerate(days) if 2003 <= d2date(d).year <= 2010]
    baseline = M[:, base_mask].mean(axis=1, keepdims=True)
    baseline[baseline == 0] = np.nan
    Mn = 100.0 * M / baseline
    fig, ax = plt.subplots(figsize=(12, 3.6), dpi=150)
    pc = ax.pcolormesh(x_edges, y_edges, Mn, cmap="RdYlGn", vmin=0, vmax=120, shading="flat")
    finish(ax, f"Reef profile — biomass vs 2003-2010 baseline (%), {LAB}  (red = bleaching strips shallow bands)")
    cb = fig.colorbar(pc, ax=ax, pad=0.01); cb.set_label("% of baseline")
    fig.tight_layout()
    p2 = os.path.join(out_dir, f"lbc4_{SLUG}_reef-profile_biomass-pct-baseline.png")
    fig.savefig(p2); plt.close(fig)

    print(p1); print(p2)


if __name__ == "__main__":
    main()
