#!/usr/bin/env python3
"""LS-factor helper for the RUSLE ETL.

For each polygon, derives per-cell slope (percent rise) from a metric-CRS
DEM (use UTM 16N for Belize), applies the McCool 1987 LS formulation cell
by cell, and emits the area-weighted polygon mean. Emitting a single
scalar per polygon (instead of per-cell JSON) keeps the stdout payload
tiny even for upstream-mainland watersheds with millions of DEM cells.

Reads polygons.geojson on argv[1] and dem.tif on argv[2]; writes JSON list
to stdout with shape:
  [
    {"feature_id": "...",
     "ls_factor": float,
     "slope_pct_mean": float,
     "cell_count": int},
    ...
  ]

Dependencies: rasterio, numpy.

Note: v1 uses slope-length = one DEM pixel side (local-slope
approximation). Upgrade path: whitebox-workflows D8 flow accumulation
gives real upslope contributing length per cell. The TS pipeline does
not change when that swap happens because the helper still emits
{feature_id, ls_factor}.
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.mask import mask as rio_mask
from rasterio.warp import transform_geom


def horn_slope_pct(elev: np.ndarray, dx: float, dy: float) -> np.ndarray:
    """Horn 1981 8-neighbour finite-difference slope in percent rise.

    Assumes dx, dy are in meters (same units as elev). Use a metric-CRS DEM
    (UTM, equal-area) so the kernel is unit-correct.
    """
    z = np.pad(elev, 1, mode="edge")
    # z is padded; index [i, j] in z corresponds to [i-1, j-1] in elev.
    # Horn 1981 kernel:
    #   dz/dx = ((z[-1,1] + 2*z[0,1] + z[1,1])
    #          - (z[-1,-1] + 2*z[0,-1] + z[1,-1])) / (8 * dx)
    #   dz/dy = ((z[1,-1] + 2*z[1,0] + z[1,1])
    #          - (z[-1,-1] + 2*z[-1,0] + z[-1,1])) / (8 * dy)
    dzdx = (
        (z[:-2, 2:] + 2 * z[1:-1, 2:] + z[2:, 2:])
        - (z[:-2, :-2] + 2 * z[1:-1, :-2] + z[2:, :-2])
    ) / (8 * dx)
    dzdy = (
        (z[2:, :-2] + 2 * z[2:, 1:-1] + z[2:, 2:])
        - (z[:-2, :-2] + 2 * z[:-2, 1:-1] + z[:-2, 2:])
    ) / (8 * dy)
    slope_rad = np.arctan(np.hypot(dzdx, dzdy))
    return np.tan(slope_rad) * 100.0


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: ls-from-dem.py <polygons.geojson> <dem.tif>",
              file=sys.stderr)
        sys.exit(2)

    polygons_path = Path(sys.argv[1])
    dem_path = Path(sys.argv[2])

    with polygons_path.open("r", encoding="utf-8") as f:
        fc = json.load(f)

    # Single approximation pass for v1: per-cell slope from the DEM,
    # then a placeholder slope-length of one DEM-pixel side (the most
    # local approximation). This is the conservative lower-bound estimate
    # of LS. Upgrade path: use whitebox-workflows D8 flow-length here for
    # the real upslope contributing length.
    with rasterio.open(dem_path) as src:
        px = abs(src.transform.a)
        py = abs(src.transform.e)
        cell_area = px * py
        dem_crs = src.crs

        out = []
        for feat in fc["features"]:
            props = feat.get("properties") or {}
            feature_id = (
                props.get("MIMES_ID")
                or props.get("Name")
                or props.get("WATERSHED")
                or props.get("id")
            )
            geom = feat["geometry"]
            # Polygons are EPSG:4326; reproject to DEM CRS (UTM 16N) before
            # masking so the slope kernel can be unit-correct in meters.
            if dem_crs and dem_crs.to_string() != "EPSG:4326":
                geom = transform_geom("EPSG:4326", dem_crs, geom)
            try:
                masked, _ = rio_mask(src, [geom], crop=True, nodata=np.nan)
            except ValueError:
                # Polygon outside the DEM extent (e.g., offshore caye for an
                # ocean-masked DEM). LS = 0 is the physically-correct answer.
                out.append({"feature_id": feature_id, "ls_factor": 0.0,
                            "slope_pct_mean": 0.0, "cell_count": 0})
                continue

            elev = masked[0].astype("float64")
            valid = np.isfinite(elev)
            if not np.any(valid):
                out.append({"feature_id": feature_id, "ls_factor": 0.0,
                            "slope_pct_mean": 0.0, "cell_count": 0})
                continue

            slope_pct = horn_slope_pct(np.nan_to_num(elev, nan=0.0), px, py)
            slope_pct[~valid] = 0.0
            slope_pct = slope_pct[valid]
            slope_pct = slope_pct[slope_pct > 0]
            cell_count = int(slope_pct.size)
            if cell_count == 0:
                out.append({"feature_id": feature_id, "ls_factor": 0.0,
                            "slope_pct_mean": 0.0, "cell_count": 0})
                continue

            # Vectorised McCool 1987 LS per cell.
            slope_rise = slope_pct / 100.0
            theta = np.arctan(slope_rise)
            sin_t = np.sin(theta)
            denom = 3.0 * np.power(sin_t, 0.8) + 0.56
            beta = (sin_t / 0.0896) / denom
            m = beta / (beta + 1)
            slope_len = float(px)  # local-slope approximation; ~= DEM cell
            L = np.power(slope_len / 22.13, m)
            S = np.where(slope_pct < 9,
                         10.8 * sin_t + 0.03,
                         16.8 * sin_t - 0.50)
            S = np.maximum(S, 0)
            ls_cells = L * S
            ls_mean = float(ls_cells.mean())

            out.append({
                "feature_id": feature_id,
                "ls_factor": ls_mean,
                "slope_pct_mean": float(slope_pct.mean()),
                "cell_count": cell_count,
            })

    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
