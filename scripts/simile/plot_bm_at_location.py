#!/usr/bin/env python3
"""Reproduce the Simile run-screen "Corel BM at Location" chart from a headless
LBC4 output CSV.

The Simile plot shows coral biomass (var2) for the 3 species at one chosen
location over time. This makes:
  - one combined chart (3 species, matching the run screen), and
  - three per-species charts (one coral each, in that species' colour).

Usage:
  python3 plot_bm_at_location.py --csv <output.csv> --location 40 \
      [--climate 0] [--plan 0] [--out-dir <dir>]

Species colours match the run-screen legend order: [1] blue, [2] orange,
[3] green.
"""
import argparse
import csv
import os
from collections import defaultdict

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Run-screen trace colours: Corel BM at Location[1]/[2]/[3]
SPECIES_COLOR = {1: "#1f6fe0", 2: "#e8871e", 3: "#2ca049"}
SPECIES_NAME = {1: "Acropora palmata", 2: "Acropora cervicornis", 3: "Orbicella spp."}


def load(csv_path, location, climate, plan):
    """Return {species_id: (days[], biomass[])} for one location + scenario."""
    series = defaultdict(lambda: ([], []))
    with open(csv_path, newline="") as fh:
        for r in csv.DictReader(fh):
            if int(r["polygon_id"]) != location:
                continue
            if int(r["climate_scenario"]) != climate or int(r["implement_plan"]) != plan:
                continue
            sid = int(r["species_id"])
            series[sid][0].append(int(r["sim_day"]))
            series[sid][1].append(float(r["biomass"]))
    # sort each series by day
    for sid, (d, b) in series.items():
        order = sorted(range(len(d)), key=lambda i: d[i])
        series[sid] = ([d[i] for i in order], [b[i] for i in order])
    return series


def style(ax):
    ax.set_facecolor("#eef0f2")
    ax.grid(True, color="white", linewidth=0.8, alpha=0.9)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.set_xlabel("Time (sim day)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--location", type=int, default=40)
    ap.add_argument("--climate", type=int, default=0)
    ap.add_argument("--plan", type=int, default=0)
    ap.add_argument("--out-dir", default=None)
    args = ap.parse_args()

    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.abspath(args.csv)), "plots")
    os.makedirs(out_dir, exist_ok=True)

    series = load(args.csv, args.location, args.climate, args.plan)
    if not series:
        raise SystemExit(f"No rows for location {args.location} climate {args.climate} plan {args.plan}")

    scen = f"climate={args.climate} plan={args.plan}"
    loc = args.location

    # Combined chart (matches the run screen: 3 traces, one figure)
    fig, ax = plt.subplots(figsize=(9, 4.2), dpi=140)
    style(ax)
    for sid in sorted(series):
        d, b = series[sid]
        ax.plot(d, b, color=SPECIES_COLOR[sid], linewidth=1.1,
                label=f"Corel BM at Location[{sid}] — {SPECIES_NAME[sid]}")
    ax.set_ylabel("Corel BM at Location")
    ax.set_title(f"Corel BM at Location — location {loc} ({scen})")
    ax.legend(fontsize=8, frameon=False)
    fig.tight_layout()
    combined = os.path.join(out_dir, f"bm_at_location_{loc}_combined.png")
    fig.savefig(combined)
    plt.close(fig)

    # Three per-species charts
    made = [combined]
    for sid in sorted(series):
        d, b = series[sid]
        fig, ax = plt.subplots(figsize=(9, 4.2), dpi=140)
        style(ax)
        ax.plot(d, b, color=SPECIES_COLOR[sid], linewidth=1.2)
        ax.set_ylabel("biomass")
        ax.set_title(f"{SPECIES_NAME[sid]} (species {sid}) — location {loc} ({scen})")
        fig.tight_layout()
        p = os.path.join(out_dir, f"bm_at_location_{loc}_species{sid}.png")
        fig.savefig(p)
        plt.close(fig)
        made.append(p)

    for p in made:
        print(p)


if __name__ == "__main__":
    main()
