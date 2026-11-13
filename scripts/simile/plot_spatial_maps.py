#!/usr/bin/env python3
"""Choropleth maps of restoration outcome by polygon, on LaughingBirdBaseMap.shp (43 polygons,
mimes_id 1-43, WGS84), plus the SP1/SP2/SP3 portfolio membership map."""
import csv, json, os, math
import shapefile
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPoly
from matplotlib.collections import PatchCollection
from matplotlib import colormaps
import matplotlib.colors as mcolors

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "output", "spatial")
FIGS = os.path.join(OUT, "figs"); os.makedirs(FIGS, exist_ok=True)
GIS  = ("/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/"
        "MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Marine Model/Laughing Bird/GIS")
SURF, INK, MUT = "#fcfcfb", "#2c3138", "#7a828c"
plt.rcParams.update({"font.family": "DejaVu Sans", "figure.facecolor": SURF, "text.color": INK,
                     "axes.labelcolor": INK, "font.size": 9})

SP1 = list(range(12, 19)) + list(range(24, 30))
SP2 = list(range(6, 12))  + list(range(30, 37))

def load_polys():
    sf = shapefile.Reader(os.path.join(GIS, "LaughingBirdBaseMap"))
    flds = [f[0] for f in sf.fields[1:]]
    key = "mimes_id" if "mimes_id" in flds else "MIMES_ID"
    ki = flds.index(key)
    out = {}
    for sh, rec in zip(sf.shapes(), sf.records()):
        mid = rec[ki]
        if mid is None: continue
        parts = list(sh.parts) + [len(sh.points)]
        rings = [sh.points[parts[i]:parts[i+1]] for i in range(len(parts)-1)]
        out.setdefault(int(mid), []).extend(rings)
    return out

POLYS = load_polys()

def draw(ax, values, cmap="viridis", vmin=None, vmax=None, label="", title="", fmt="{:.0f}",
         highlight=None, annotate=True):
    vals = [v for v in values.values() if v is not None]
    vmin = min(vals) if vmin is None else vmin
    vmax = max(vals) if vmax is None else vmax
    norm = mcolors.Normalize(vmin, vmax); cm = colormaps[cmap]
    patches, colors = [], []
    for mid, rings in sorted(POLYS.items()):
        v = values.get(mid)
        for ring in rings:
            patches.append(MplPoly(ring, closed=True))
            colors.append(cm(norm(v)) if v is not None else "#e4e6e9")
    pc = PatchCollection(patches, facecolors=colors, edgecolors="#ffffff", linewidths=0.6, zorder=3)
    ax.add_collection(pc)
    if highlight:
        for mid in highlight:
            for ring in POLYS.get(mid, []):
                ax.add_patch(MplPoly(ring, closed=True, fill=False, edgecolor="#c0392b",
                                     linewidth=2.0, zorder=5))
    if annotate:
        for mid, rings in POLYS.items():
            pts = max(rings, key=len)
            cx = sum(p[0] for p in pts)/len(pts); cy = sum(p[1] for p in pts)/len(pts)
            ax.text(cx, cy, str(mid), fontsize=5.6, ha="center", va="center", color="#ffffff",
                    zorder=6, fontweight="bold")
    xs=[p[0] for rs in POLYS.values() for r in rs for p in r]
    ys=[p[1] for rs in POLYS.values() for r in rs for p in r]
    ax.set_xlim(min(xs)-0.0006, max(xs)+0.0006); ax.set_ylim(min(ys)-0.0006, max(ys)+0.0006)
    ax.set_aspect(1/math.cos(math.radians(16.44)))
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)
    ax.set_facecolor("#eef2f5")
    ax.set_title(title, loc="left", fontsize=10.5, pad=7)
    if label:
        sm = plt.cm.ScalarMappable(norm=norm, cmap=cm); sm.set_array([])
        cb = plt.colorbar(sm, ax=ax, fraction=0.045, pad=0.02)
        cb.set_label(label, fontsize=8.5); cb.ax.tick_params(labelsize=8)
    return ax

if __name__ == "__main__":
    M = json.load(open(f"{OUT}/spatial_metrics.json"))
    for c, rows in M.items():
        lab = "observed MUR SST" if c == "0" else "RCP-4.5"
        by = {r["polygon"]: r for r in rows}
        fig, axes = plt.subplots(1, 3, figsize=(16.5, 6.0))
        draw(axes[0], {k: v["coral_kg_years"] for k, v in by.items()}, "viridis",
             label="coral kg-years", title="A    Total benefit  (integrated gain)")
        draw(axes[1], {k: v["+3 yr"] for k, v in by.items()}, "magma",
             label="kg still present at +3 yr", title="B    Durability  (+3 years)")
        draw(axes[2], {k: v["kg_yr_per_1000m2"] for k, v in by.items()}, "cividis",
             label="coral kg-years per 1000 m²", title="C    Efficiency  (per unit reef area)")
        fig.suptitle(f"Where to plant: identical 90 kg outplanting in each of 43 polygons — {lab}",
                     fontsize=14, fontweight="bold", x=0.011, ha="left", y=0.97)
        fig.tight_layout(rect=[0, 0, 1, 0.93])
        fig.savefig(f"{FIGS}/spatial-maps-c{c}.png", dpi=200); plt.close(fig)
        print("wrote", f"{FIGS}/spatial-maps-c{c}.png")

    fig, axes = plt.subplots(1, 3, figsize=(16.5, 6.0))
    for ax, (nm, mem, ttl) in zip(axes, (
            ("SP1", SP1, "SP1  coastal protection\npolygons 12–18, 24–29"),
            ("SP2", SP2, "SP2  tourism & fishery\npolygons 6–11, 30–36"),
            ("SP3", list(range(1, 44)), "SP3  integrated portfolio\nall 43, service-weighted"))):
        draw(ax, {k: (1.0 if k in mem else 0.0) for k in POLYS}, "Blues", vmin=-0.35, vmax=1.15,
             title=ttl)
    fig.suptitle("Spatial planting portfolios — same 1,170 kg total in every scenario",
                 fontsize=14, fontweight="bold", x=0.011, ha="left", y=0.97)
    fig.tight_layout(rect=[0, 0, 1, 0.90])
    fig.savefig(f"{FIGS}/portfolio-membership.png", dpi=200); plt.close(fig)
    print("wrote", f"{FIGS}/portfolio-membership.png")
