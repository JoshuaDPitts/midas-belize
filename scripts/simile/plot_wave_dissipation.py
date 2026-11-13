#!/usr/bin/env python3
"""Reef structural height (wave-attenuation capacity) by depth band at ~5-year
intervals, one panel per scenario. Coral structural height is the model's
depth-resolved, coral-driven driver of inshore wave attenuation; it peaks at
the shallow crest and collapses under thermal stress, flattening the
attenuation profile. (The raw "Energy Dissipation" variable is depth-flat and
background-driven, so it is not used here.)

Usage: python3 plot_wave_dissipation.py --csv <coral-height-by-ebin.csv>
       [--ylabel "reef structural height (m)"] [--metric "structural height"]
"""
import argparse, csv, os
from collections import defaultdict
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

EBIN_DEPTH = {1: ">20 m", 2: "5-20 m", 3: "2-5 m", 4: "1-2 m", 5: "0-1 m"}
EBINS = [5, 4, 3, 2, 1]  # shallow crest -> deep (inshore attenuation at left)
SCEN = {0: "SSP-2.5 (base)", 1: "RCP-4.5"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--ylabel", default="reef structural height (m)  [wave-attenuation capacity]")
    ap.add_argument("--metric", default="reef structural height")
    ap.add_argument("--out-dir", default=None)
    args = ap.parse_args()
    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.abspath(args.csv)), "plots")
    os.makedirs(out_dir, exist_ok=True)

    data = defaultdict(lambda: defaultdict(dict))  # climate -> year -> ebin -> value
    for r in csv.DictReader(open(args.csv, newline="")):
        data[int(r["climate_scenario"])][int(r["year"])][int(r["ebin"])] = float(r["value"])

    scenarios = sorted(data)
    fig, axes = plt.subplots(1, len(scenarios), figsize=(6.2 * len(scenarios), 4.7), dpi=150, sharey=True)
    if len(scenarios) == 1:
        axes = [axes]
    for ax, clim in zip(axes, scenarios):
        yrs = sorted(data[clim])
        picks = [y for y in yrs if (y - yrs[0]) % 5 == 0] or yrs
        cmap = plt.cm.plasma
        for j, yr in enumerate(picks):
            vals = [data[clim][yr].get(e, 0.0) for e in EBINS]
            ax.plot(range(len(EBINS)), vals, marker="o", lw=2.0,
                    color=cmap(j / max(1, len(picks) - 1)), label=str(yr))
        ax.set_xticks(range(len(EBINS)))
        ax.set_xticklabels([EBIN_DEPTH[e] for e in EBINS], rotation=35, ha="right", fontsize=8)
        ax.set_title(SCEN.get(clim, f"climate {clim}"), fontweight="bold")
        ax.set_xlabel("depth band (shallow crest → deep)")
        ax.set_facecolor("#f4f6f7")
        ax.grid(True, color="white")
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
        ax.legend(title="year", fontsize=8, frameon=False)
    axes[0].set_ylabel(args.ylabel)
    fig.suptitle(f"{args.metric.capitalize()} by depth band, 5-year intervals — Laughing Bird Caye",
                 fontweight="bold")
    fig.tight_layout()
    p = os.path.join(out_dir, "lbc4_reef-structural-height-by-depth_5yr_SSP2.5-vs-RCP4.5.png")
    fig.savefig(p)
    plt.close(fig)
    print(p)


if __name__ == "__main__":
    main()
