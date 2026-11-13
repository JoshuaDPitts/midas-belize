#!/usr/bin/env python3
"""WorldCover class-fraction helper for the RUSLE C-factor.

Reads a polygon GeoJSON FeatureCollection on argv[1] and a WorldCover
raster path on argv[2]; emits a JSON list to stdout with one entry per
feature giving {feature_id, total_pixels, fractions: {class_code: fraction}}.

Uses rasterio.mask directly + numpy histogram (see zonal-stats.py for
why rasterstats is avoided).

Usage:
    python class-fractions.py polygons.geojson worldcover-belize.tif > out.json

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
        print("usage: class-fractions.py <polygons.geojson> <worldcover.tif>",
              file=sys.stderr)
        sys.exit(2)
    polygons_path = Path(sys.argv[1])
    raster_path = Path(sys.argv[2])

    with polygons_path.open("r", encoding="utf-8") as f:
        fc = json.load(f)

    out = []
    with rasterio.open(raster_path) as src:
        nodata = src.nodata if src.nodata is not None else 0
        for feat in fc["features"]:
            props = feat.get("properties") or {}
            fid = feature_id(props)
            try:
                masked, _ = rio_mask(src, [feat["geometry"]],
                                     crop=True, nodata=nodata,
                                     all_touched=True)
            except ValueError:
                out.append({"feature_id": fid, "total_pixels": 0,
                            "fractions": {}})
                continue
            band = masked[0]
            valid = band[band != nodata]
            total = int(valid.size)
            if total == 0:
                out.append({"feature_id": fid, "total_pixels": 0,
                            "fractions": {}})
                continue
            codes, counts = np.unique(valid, return_counts=True)
            fractions = {str(int(c)): float(n) / total
                         for c, n in zip(codes, counts)}
            out.append({"feature_id": fid, "total_pixels": total,
                        "fractions": fractions})
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
