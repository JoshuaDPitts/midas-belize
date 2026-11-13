#!/usr/bin/env python3
"""Generic raster mosaic helper. Reads a glob of GeoTIFFs and mosaics them
into a single output GeoTIFF using rasterio.merge.

Usage:
    python _mosaic.py "<input glob>" <output.tif>

Example:
    python _mosaic.py "reference/rusle-inputs/dem-tiles/*.tif" \
        reference/rusle-inputs/copernicus-dem-belize.tif
"""
import glob
import sys
from pathlib import Path

import rasterio
from rasterio.merge import merge


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: _mosaic.py '<input glob>' <output.tif>", file=sys.stderr)
        sys.exit(2)
    input_glob, output_path = sys.argv[1], sys.argv[2]
    paths = sorted(glob.glob(input_glob))
    if not paths:
        print(f"no tiles match {input_glob}", file=sys.stderr)
        sys.exit(3)

    srcs = [rasterio.open(p) for p in paths]
    try:
        mosaic, transform = merge(srcs)
        meta = srcs[0].meta.copy()
        meta.update({
            "height": mosaic.shape[1],
            "width": mosaic.shape[2],
            "transform": transform,
        })
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with rasterio.open(output_path, "w", **meta) as dst:
            dst.write(mosaic)
        print(f"wrote {output_path} ({mosaic.shape}, "
              f"{meta['dtype']}, crs={meta.get('crs')})", file=sys.stderr)
    finally:
        for s in srcs:
            s.close()


if __name__ == "__main__":
    main()
