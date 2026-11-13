# RUSLE factor ETL

One-shot offline pipeline that joins five RUSLE factors (R, K, LS, C, P) onto
each watershed polygon, then emits a `*-rusle-factors.csv` + provenance
sidecar that the existing data-layer pipeline can publish under the
`rusle-factors` schema family.

The `WatershedHeroCard`'s formula card already reads
`mean_r_factor`, `K_factor`, `LS_factor`, `C_factor`, `P_factor` from the
joined polygon properties (via `useWatershedsForSite` + the
`findWatershedFeature` merge). Once this ETL publishes, the "Needs upstream
data" placeholders disappear automatically.

## Why this is offline-only

GloREDa's ESDAC license forbids re-publishing the source raster (only joined
values can be redistributed). That alone forces an offline ETL step rather
than streaming the raster into the prod app. Computing LS in-browser is also
infeasible (flow-accumulation over a 30 m DEM across each watershed is far
too heavy for the client).

So the model is: download the four input rasters once, run this script
once per site (Placencia, Caye Caulker, national), upload the resulting
CSV + sidecar to Drive, and let the existing Drive → GCS → preprocess →
catalog pipeline publish them like any other joined dataset.

## Inputs (download once)

Stage these into `reference/rusle-inputs/` (gitignored). All sources cover
Belize end-to-end including Caye Caulker and Laughing Bird Caye.

| Factor | Source | URL | Resolution | License | Notes |
| --- | --- | --- | --- | --- | --- |
| R | GloREDa annual R-factor (Panagos et al. 2017) | [esdac.jrc.ec.europa.eu/content/global-rainfall-erosivity](https://esdac.jrc.ec.europa.eu/content/global-rainfall-erosivity) | 1 km | ESDAC custom (register) | Clip to Belize bbox. Joined values are redistributable; the raw raster is not. |
| K | SoilGrids 2.0 sand / silt / clay / SOC, 0–30 cm | [soilgrids.org](https://soilgrids.org/) → [download](https://files.isric.org/soilgrids/latest/data/) | 250 m | CC BY 4.0 | Four GeoTIFFs (sand.tif, silt.tif, clay.tif, soc.tif). |
| LS | Copernicus DEM GLO-30 | [registry.opendata.aws/copernicus-dem](https://registry.opendata.aws/copernicus-dem/) | 30 m | Free worldwide | Stitch the Belize tiles into one GeoTIFF. |
| C | ESA WorldCover v200 (2021) | [esa-worldcover.org](https://esa-worldcover.org/en) → [Zenodo v200](https://zenodo.org/records/7254221) | 10 m | CC BY 4.0 | Stitch the N15 / N18 / W90 tiles into one GeoTIFF. |
| P | none | n/a | n/a | n/a | Defaults to 1.0 (methodology assumption, documented in the provenance). |

Convenience commands:

```bash
mkdir -p reference/rusle-inputs

# Clip GloREDa to Belize bbox once you've downloaded it via ESDAC.
rio clip --bounds -90 15 -87 19 gloreda-global.tif \
  reference/rusle-inputs/gloreda-belize.tif

# SoilGrids per-property tiles: use the WCS endpoint via gdal_translate.
# Replace <prop> with sand, silt, clay, soc and <depth> with 0-30cm_mean.
gdal_translate \
  "https://maps.isric.org/mapserv?map=/map/<prop>.map&SERVICE=WMS&\
VERSION=1.3.0&REQUEST=GetMap&LAYERS=<prop>_<depth>&...etc" \
  reference/rusle-inputs/sg-<prop>-0-30cm-belize.tif

# Copernicus DEM mosaic from the AWS open-data bucket.
gdalwarp -of GTiff \
  /vsis3/copernicus-dem-30m/Copernicus_DSM_COG_10_N16_00_W089_00_DEM/* \
  /vsis3/copernicus-dem-30m/Copernicus_DSM_COG_10_N17_00_W089_00_DEM/* \
  /vsis3/copernicus-dem-30m/Copernicus_DSM_COG_10_N18_00_W088_00_DEM/* \
  reference/rusle-inputs/copernicus-dem-belize.tif

# ESA WorldCover from Zenodo v200.
# Download tiles N15W090, N18W090, etc. and mosaic with gdalwarp.
```

The total download is ~3 GB; everything fits on disk comfortably.

## Python dependencies (one-time)

The Python helpers under `python/` shell out via subprocess from the TS
orchestrator. Install once into your local Python:

```bash
pip install rasterio rasterstats numpy shapely
# Optional, for the upgrade path to real flow-accumulation LS:
pip install whitebox-workflows
```

The existing preprocess pipeline already shells out to `rio` (rasterio CLI)
for cogeo conversion, so this is the same toolchain.

## Running the ETL

Per site:

```bash
pnpm tsx scripts/pre-process/rusle/compute.ts \
  --polygons reference/rusle-inputs/placencia-watershed-polygons.geojson \
  --r-raster reference/rusle-inputs/gloreda-belize.tif \
  --soil-sand reference/rusle-inputs/sg-sand-0-30cm-belize.tif \
  --soil-silt reference/rusle-inputs/sg-silt-0-30cm-belize.tif \
  --soil-clay reference/rusle-inputs/sg-clay-0-30cm-belize.tif \
  --soil-soc  reference/rusle-inputs/sg-soc-0-30cm-belize.tif \
  --dem reference/rusle-inputs/copernicus-dem-belize.tif \
  --worldcover reference/rusle-inputs/worldcover-belize.tif \
  --out scripts/pre-process/rusle/out/placencia \
  --dataset-id placencia-watersheds-rusle-factors
```

Repeat with `--polygons cayecaulker-watershed-polygons.geojson` +
`--dataset-id cayecaulker-watersheds-rusle-factors`, etc.

Outputs:

```
scripts/pre-process/rusle/out/placencia/
  placencia-watersheds-rusle-factors.csv
  placencia-watersheds-rusle-factors.provenance.json
```

## Publishing

Copy the CSV + sidecar into the configured Drive watch folder. The existing
drive-watcher → GCS mirror → preprocess pipeline picks them up like any
other joined dataset. The catalog entry will appear under
`rusle-factors` schema family; the watershed map encoder + RUSLE formula
card pick up the new properties automatically because both use
`useWatershedsForSite` + `findWatershedFeature`.

## Algorithm pieces

The pure-TS factor implementations are testable in isolation:

- `factors/k-wischmeier.ts` — Wischmeier & Smith 1978 nomograph, with SI
  conversion (`K_SI = K_US / 7.59`) and texture-derived structure /
  permeability heuristics for when SoilGrids does not publish them.
- `factors/c-borrelli.ts` — Borrelli et al. 2017 C-factor table mapped onto
  ESA WorldCover's 11-class legend, with area-weighted aggregation per
  polygon.
- `factors/ls-mccool.ts` — McCool 1987 closed-form LS, area-weighted across
  per-pixel cell records emitted by `python/ls-from-dem.py`.
- `factors/p-default.ts` — constant P = 1.0 with the methodology note that
  carries through to the published provenance.

Tests at `tests/unit/data-layer/rusle-{k,c,ls}-*.test.ts`.

## Caveats

1. `python/ls-from-dem.py` currently uses a *local-slope* approximation
   (slope length = one DEM pixel). This is a conservative lower-bound LS;
   the documented upgrade path is `whitebox_workflows.D8FlowAccumulation`
   for real upslope length per pixel. The TS pipeline does not change when
   that swap happens.
2. SoilGrids stores texture as g/kg of fines; the Python helper converts to
   percent before emitting JSON. SOC is in dg/kg; convert to OM via
   `OM = SOC × 1.724`.
3. Laughing Bird Caye (~0.05 km²) falls inside a single GloREDa pixel that
   may be ocean-masked. The all-touched zonal-stats mode plus a nearest-land
   fallback (TODO; not yet implemented) covers this; for now expect a
   `null` R for tiny offshore cayes and a corresponding `null` A.
4. The P factor is `1.0` everywhere. Update the scenario engine (Phase 3)
   to vary P per scenario.

## Future work

- Real D8 flow-accumulation in `ls-from-dem.py` via `whitebox-workflows`.
- Nearest-land fallback for offshore cayes (GloREDa + SoilGrids ocean-mask
  edges).
- Replace constant P with a scenario-driven override on the
  `ScenarioImpactPanel`.
- Cross-validate against the Toledo Rio Grande Watershed paper (Boucher et
  al. 2016) for any mainland watersheds where they published numbers.
