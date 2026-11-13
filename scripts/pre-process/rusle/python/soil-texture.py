#!/usr/bin/env python3
"""Soil-texture helper for the RUSLE K-factor.

Reads polygons.geojson on argv[1] and SoilGrids 250 m sand/silt/clay/SOC
rasters (4 paths, in order) on argv[2..5]; emits a JSON list with one
entry per feature giving zonal-mean {sand_pct, silt_pct, clay_pct, soc_pct,
om_pct}.

Uses rasterio.mask directly (see zonal-stats.py for the rationale).

Usage:
    python soil-texture.py polygons.geojson \
        sand.tif silt.tif clay.tif soc.tif > out.json

Dependencies: rasterio, numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.mask import mask as rio_mask
from rasterio.warp import transform_geom


def feature_id(props: dict) -> object:
    return (
        props.get("MIMES_ID")
        or props.get("Name")
        or props.get("WATERSHED")
        or props.get("id")
    )


def zonal_mean(src: rasterio.io.DatasetReader, geom: dict) -> float | None:
    # SoilGrids 2.0 native CRS is Homolosine; reproject polygon if needed.
    if src.crs and src.crs.to_string() != "EPSG:4326":
        geom = transform_geom("EPSG:4326", src.crs, geom)
    try:
        masked, _ = rio_mask(src, [geom], crop=True,
                             nodata=src.nodata, all_touched=True)
    except ValueError:
        return None
    band = masked[0].astype("float64")
    if src.nodata is not None:
        valid = band[band != src.nodata]
    else:
        valid = band[np.isfinite(band)]
    if valid.size == 0:
        return None
    return float(valid.mean())


def main() -> None:
    if len(sys.argv) != 6:
        print("usage: soil-texture.py <polygons.geojson> "
              "<sand.tif> <silt.tif> <clay.tif> <soc.tif>",
              file=sys.stderr)
        sys.exit(2)
    polygons_path = Path(sys.argv[1])
    paths = sys.argv[2:6]

    with polygons_path.open("r", encoding="utf-8") as f:
        fc = json.load(f)

    srcs = [rasterio.open(p) for p in paths]
    try:
        out = []
        for feat in fc["features"]:
            props = feat.get("properties") or {}
            fid = feature_id(props)
            geom = feat["geometry"]
            sand_raw = zonal_mean(srcs[0], geom)
            silt_raw = zonal_mean(srcs[1], geom)
            clay_raw = zonal_mean(srcs[2], geom)
            soc_raw = zonal_mean(srcs[3], geom)
            # SoilGrids texture is g/kg of fines; /10 = percent.
            # SoilGrids SOC is dg/kg; /100 = percent; *1.724 = OM%.
            out.append({
                "feature_id": fid,
                "sand_pct": (sand_raw / 10.0) if sand_raw is not None else None,
                "silt_pct": (silt_raw / 10.0) if silt_raw is not None else None,
                "clay_pct": (clay_raw / 10.0) if clay_raw is not None else None,
                "soc_pct": (soc_raw / 100.0) if soc_raw is not None else None,
                "om_pct": (soc_raw / 100.0 * 1.724)
                if soc_raw is not None else None,
            })
        json.dump(out, sys.stdout)
    finally:
        for s in srcs:
            s.close()


if __name__ == "__main__":
    main()
