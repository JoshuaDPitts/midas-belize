#!/usr/bin/env python3
"""Per-polygon size + EBIN (depth band) area distribution for Laughing Bird
Caye, from the model's own Init_Areas.csv (mimes_id x EBIN_ID -> AREA_M2).

Produces:
  1. lbc4_polygon-sizes_map.png       — choropleth map of total polygon area
  2. lbc4_ebin-distribution_table.png — formatted table, area (m2) by polygon x EBIN
  3. lbc4_polygon-size_summary.txt    — reef-wide + per-polygon summary stats

Usage:
  python3 plot_polygon_areas.py --areas <Init_Areas.csv> --geojson <polygons.json> [--out-dir D]
"""
import argparse, csv, json, os
from collections import defaultdict
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPolygon
from matplotlib.collections import PatchCollection
import matplotlib.colors as mcolors

EBIN_DEPTH = {1: ">20 m", 2: "5-20 m", 3: "2-5 m", 4: "1-2 m", 5: "0-1 m", 6: "0-1 m elev (upland)", 7: "1-3 m elev (upland)"}
EBIN_ORDER = [1, 2, 3, 4, 5, 6, 7]


def load_areas(path):
    """{polygon_id: {ebin: area_m2}}"""
    areas = defaultdict(dict)
    for r in csv.DictReader(open(path, newline="")):
        areas[int(r["mimes_id"])][int(r["EBIN_ID"])] = float(r["AREA_M2"])
    return areas


def load_geometries(path):
    """{polygon_id: [(x,y), ...] outer ring (first ring of first/only poly part)}"""
    d = json.load(open(path))
    geoms = {}
    for f in d["features"]:
        pid = int(f["properties"]["mimes_id"])
        coords = f["geometry"]["coordinates"]
        # unwrap to outer ring: Polygon -> [ring][pt]; MultiPolygon -> [part][ring][pt]
        ring = coords[0]
        if isinstance(ring[0][0], (int, float)):
            pass  # already a ring of points
        else:
            ring = ring[0]
        geoms[pid] = ring
    return geoms


def fmt_m2(v):
    return f"{v:,.0f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--areas", required=True)
    ap.add_argument("--geojson", required=True)
    ap.add_argument("--out-dir", default=None)
    args = ap.parse_args()
    out_dir = args.out_dir or os.path.join(os.path.dirname(os.path.abspath(args.areas)), "plots")
    os.makedirs(out_dir, exist_ok=True)

    areas = load_areas(args.areas)
    geoms = load_geometries(args.geojson)
    pids = sorted(areas)

    total_by_poly = {p: sum(areas[p].values()) for p in pids}
    total_by_ebin = {e: sum(areas[p].get(e, 0.0) for p in pids) for e in EBIN_ORDER}
    grand_total = sum(total_by_poly.values())

    # ---------- 1. Map: choropleth of total polygon area ----------
    fig, ax = plt.subplots(figsize=(9, 9), dpi=150)
    ax.set_facecolor("#eaf3f7")
    vals = np.array([total_by_poly[p] for p in pids])
    norm = mcolors.Normalize(vmin=vals.min(), vmax=vals.max())
    cmap = plt.cm.YlGn
    patches, colors = [], []
    centroids = {}
    for p in pids:
        ring = geoms[p]
        xs = [pt[0] for pt in ring]; ys = [pt[1] for pt in ring]
        centroids[p] = (sum(xs) / len(xs), sum(ys) / len(ys))
        patches.append(MplPolygon(ring, closed=True))
        colors.append(cmap(norm(total_by_poly[p])))
    pc = PatchCollection(patches, facecolor=colors, edgecolor="#2c3e50", linewidths=0.6)
    ax.add_collection(pc)
    for p in pids:
        cx, cy = centroids[p]
        ax.text(cx, cy, str(p), ha="center", va="center", fontsize=7, color="#1a1a1a")
    ax.autoscale_view()
    ax.set_aspect(1 / np.cos(np.radians(16.44)))
    ax.set_xlabel("longitude"); ax.set_ylabel("latitude")
    ax.set_title("Laughing Bird Caye — polygon size (total reef area, m²)", fontsize=13, fontweight="bold")
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm); sm.set_array([])
    cb = fig.colorbar(sm, ax=ax, fraction=0.04, pad=0.02)
    cb.set_label("total area (m²)")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    p_map = os.path.join(out_dir, "lbc4_polygon-sizes_map.png")
    fig.savefig(p_map)
    plt.close(fig)

    # ---------- 2. Table: area (m2) by polygon x EBIN, formatted ----------
    n = len(pids)
    row_h = 0.235  # inches per row, matches tbl.scale(1, 1.15) below at fontsize 7
    fig_h = row_h * (n + 2) + 0.5  # +2 for header + total row, +0.5 for title
    fig, ax = plt.subplots(figsize=(11, fig_h), dpi=150)
    ax.axis("off")
    ax.set_position([0.01, 0.01, 0.98, 0.90])  # fill the figure; leave room for suptitle
    col_labels = [f"EBIN {e}\n({EBIN_DEPTH[e]})" for e in EBIN_ORDER] + ["Total"]
    cell_text = []
    for p in pids:
        row = [fmt_m2(areas[p].get(e, 0.0)) for e in EBIN_ORDER]
        row.append(fmt_m2(total_by_poly[p]))
        cell_text.append(row)
    # summary row
    summary_row = [fmt_m2(total_by_ebin[e]) for e in EBIN_ORDER] + [fmt_m2(grand_total)]
    cell_text.append(summary_row)
    row_labels = [f"Polygon {p}" for p in pids] + ["REEF TOTAL"]

    tbl = ax.table(cellText=cell_text, rowLabels=row_labels, colLabels=col_labels,
                    cellLoc="right", bbox=[0, 0, 1, 1])
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(7)
    # style header + total row
    for (r, c), cell in tbl.get_celld().items():
        cell.set_edgecolor("#d0d5d8")
        if r == 0:
            cell.set_facecolor("#2c3e50"); cell.set_text_props(color="white", fontweight="bold")
        elif r == len(cell_text):
            cell.set_facecolor("#dfe9e2"); cell.set_text_props(fontweight="bold")
        elif c == -1:
            cell.set_text_props(fontweight="bold")
    fig.suptitle("Laughing Bird Caye — EBIN (depth band) area distribution by polygon (m²)",
                 fontsize=12, fontweight="bold", y=0.985)
    p_tbl = os.path.join(out_dir, "lbc4_ebin-distribution_table.png")
    fig.savefig(p_tbl, bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)

    # ---------- 3. Summary stats, averaged across all polygons ----------
    poly_vals = np.array([total_by_poly[p] for p in pids])
    lines = []
    lines.append("Laughing Bird Caye — polygon size & EBIN distribution summary")
    lines.append("=" * 64)
    lines.append(f"Polygons: {n}")
    lines.append(f"Reef total area: {fmt_m2(grand_total)} m²  ({grand_total/1e4:,.2f} ha)")
    lines.append("")
    lines.append("Per-polygon size (m²), across all 43 polygons:")
    lines.append(f"  mean   = {fmt_m2(poly_vals.mean())} m²")
    lines.append(f"  median = {fmt_m2(np.median(poly_vals))} m²")
    lines.append(f"  min    = {fmt_m2(poly_vals.min())} m²  (polygon {pids[int(np.argmin(poly_vals))]})")
    lines.append(f"  max    = {fmt_m2(poly_vals.max())} m²  (polygon {pids[int(np.argmax(poly_vals))]})")
    lines.append(f"  std    = {fmt_m2(poly_vals.std())} m²")
    lines.append("")
    lines.append("Reef-wide EBIN (depth band) distribution, averaged across all polygons:")
    lines.append(f"{'EBIN':<6}{'depth':<20}{'reef total (m2)':>18}{'% of reef':>12}{'mean per polygon (m2)':>24}")
    for e in EBIN_ORDER:
        pct = 100 * total_by_ebin[e] / grand_total if grand_total else 0
        mean_per_poly = total_by_ebin[e] / n
        lines.append(f"{e:<6}{EBIN_DEPTH[e]:<20}{fmt_m2(total_by_ebin[e]):>18}{pct:>11.1f}%{fmt_m2(mean_per_poly):>24}")
    lines.append("-" * 64)
    lines.append(f"{'TOTAL':<26}{fmt_m2(grand_total):>18}{100.0:>11.1f}%{fmt_m2(grand_total/n):>24}")
    txt = "\n".join(lines)
    p_txt = os.path.join(out_dir, "lbc4_polygon-size_summary.txt")
    open(p_txt, "w").write(txt + "\n")

    print(p_map); print(p_tbl); print(p_txt)
    print()
    print(txt)


if __name__ == "__main__":
    main()
