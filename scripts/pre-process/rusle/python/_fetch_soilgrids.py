#!/usr/bin/env python3
"""Fetches a Belize-bbox slice of a SoilGrids 2.0 COG and writes it
locally. Reads the global VRT over HTTP via /vsicurl/ so only the
needed tiles are pulled.

Usage:
    python _fetch_soilgrids.py <property> <depth> <out.tif>

Example:
    python _fetch_soilgrids.py sand 0-5cm reference/rusle-inputs/sg-sand-0-5cm-belize.tif
"""
import sys
from pathlib import Path

import rasterio
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

BELIZE_BBOX = (-89.25, 15.85, -87.5, 18.5)  # lon-min, lat-min, lon-max, lat-max


def main() -> None:
    if len(sys.argv) != 4:
        print("usage: _fetch_soilgrids.py <prop> <depth> <out.tif>", file=sys.stderr)
        sys.exit(2)
    prop, depth, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

    vrt_url = (
        f"/vsicurl/https://files.isric.org/soilgrids/latest/data/"
        f"{prop}/{prop}_{depth}_mean.vrt"
    )
    print(f"opening {vrt_url}", file=sys.stderr)

    with rasterio.open(vrt_url) as src:
        # SoilGrids native CRS is Homolosine; transform our WGS84 bbox.
        west, south, east, north = transform_bounds(
            "EPSG:4326", src.crs, *BELIZE_BBOX, densify_pts=21,
        )
        window = from_bounds(west, south, east, north, src.transform)
        # Newer rasterio: round_offsets / round_lengths take no op arg.
        # Always-floor-then-ceil rounding done via explicit math instead.
        col_off = int(window.col_off)
        row_off = int(window.row_off)
        width = int(window.width + (window.col_off - col_off) + 0.999)
        height = int(window.height + (window.row_off - row_off) + 0.999)
        from rasterio.windows import Window
        window = Window(col_off, row_off, width, height)
        print(
            f"reading window {window} (size "
            f"{int(window.height)}x{int(window.width)})",
            file=sys.stderr,
        )
        data = src.read(1, window=window)
        meta = src.meta.copy()
        meta.update({
            "driver": "GTiff",
            "height": int(window.height),
            "width": int(window.width),
            "transform": src.window_transform(window),
            "compress": "LZW",
        })

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(out_path, "w", **meta) as dst:
        dst.write(data, 1)
    print(f"wrote {out_path} ({data.shape}, dtype={data.dtype})", file=sys.stderr)


if __name__ == "__main__":
    main()
