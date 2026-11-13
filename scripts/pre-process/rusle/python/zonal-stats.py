#!/usr/bin/env python3
"""Zonal-statistics helper for the RUSLE ETL.

Reads a polygon GeoJSON FeatureCollection on argv[1] and a raster path on
argv[2]; emits a JSON list to stdout with one entry per feature giving
{feature_id, mean, min, max, count, nodata_count} sampled inside the
polygon.

Uses rasterio.mask directly rather than the rasterstats library because
the latter triggers a GDAL_RASTERIO_RESAMPLING / GDALRasterIOExtraArg
ABI mismatch on rasterio 1.5 + GDAL 3.12 that causes every cell to come
back as nodata.

Usage:
    python zonal-stats.py polygons.geojson r-factor.tif > out.json

Dependencies: rasterio, numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.mask import mask as rio_mask


def feature_id(props: dict) -> object:
    return (
        props.get("MIMES_ID")
        or props.get("Name")
        or props.get("WATERSHED")
        or props.get("id")
    )


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: zonal-stats.py <polygons.geojson> <raster.tif>",
              file=sys.stderr)
        sys.exit(2)
    polygons_path = Path(sys.argv[1])
    raster_path = Path(sys.argv[2])

    with polygons_path.open("r", encoding="utf-8") as f:
        fc = json.load(f)

    out = []
    with rasterio.open(raster_path) as src:
        nodata = src.nodata
        for feat in fc["features"]:
            props = feat.get("properties") or {}
            fid = feature_id(props)
            try:
                masked, _ = rio_mask(src, [feat["geometry"]],
                                     crop=True, nodata=nodata,
                                     all_touched=True)
            except ValueError:
                # Polygon outside raster extent
                out.append({
                    "feature_id": fid, "mean": None, "min": None,
                    "max": None, "count": 0, "nodata_count": 0,
                })
                continue
            band = masked[0].astype("float64")
            if nodata is not None:
                valid = band[band != nodata]
            else:
                valid = band[np.isfinite(band)]
            n = int(valid.size)
            out.append({
                "feature_id": fid,
                "mean": float(valid.mean()) if n else None,
                "min": float(valid.min()) if n else None,
                "max": float(valid.max()) if n else None,
                "count": n,
                "nodata_count": int(band.size - n),
            })
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
