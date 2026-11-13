# Map Engine sample data

Real datasets used by the `/map` showcase. Each file's `properties` carry
`source` and `license` fields on every feature. Regenerate via:

```bash
pnpm exec tsx scripts/gen-sample-data.ts
```

## Files

### `belize-admin.geojson`

Belize administrative level 1 (6 districts).

- **Source:** geoBoundaries v4 (Open), BLZ ADM1 simplified, release `9469f09`
  (build 2023-12, representation year 2006). Upstream sources cited by
  geoBoundaries: Wikimedia Commons.
- **URL:** https://www.geoboundaries.org/ — file fetched from
  https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BLZ/ADM1/
- **License:** Creative Commons Attribution 2.5 Generic (CC-BY 2.5).
- **Derived attributes:** `area_km2` computed via `@turf/area` on each feature.

### `erosivity-stations.geojson`

Global Rainfall Erosivity Database (GloREDa) — 3,939 monitoring stations
with R-factor values.

- **Source:** Panagos, P., Borrelli, P., Meusburger, K. et al. (2017).
  "Global rainfall erosivity assessment based on high-temporal resolution
  rainfall records." *Scientific Reports* 7, 4175.
  DOI: `10.1038/s41598-017-04282-8`. Distributed via the European Soil Data
  Centre (ESDAC), https://esdac.jrc.ec.europa.eu/
- **Upstream file:** `reference/NSFCOPES_BU/Rfactor-Stations.shp`.
- **CRS:** EPSG:4326 (WGS84 geographic).
- **License:** JRC-ESDAC reuse terms — free use with attribution.
- **Attributes per feature:** `station_id` (original FID), `r_factor`
  (R_FINAL, MJ · mm · ha⁻¹ · hr⁻¹ · yr⁻¹).
- **Regenerate:** `pnpm exec tsx scripts/import-stations.ts`.

### `midas-hexgrid-6km.geojson`

6 km² hexagonal tessellation around Placencia — 34 cells.

- **Source:** MIDAS/MIMES Belize 2026 project (ArcGIS Pro `GenerateTessellation` → `ExportFeatures`, 2026-01-08).
- **Upstream file:** `reference/MIMES_MIDAS/GIS Base Maps/Marine/Placencia/Coast/Hexagons6KM_ExportFeatures/Hexagons6KM_ExportFeatures.shp`.
- **CRS:** EPSG:4326 (WGS84 geographic).
- **License:** shared by project collaborators for internal use; not for public redistribution without provenance check.
- **Derived attributes:** `area_km2` computed via `@turf/area`. Original `GRID_ID` retained.
- **Regenerate:** `pnpm exec tsx scripts/import-hex-grid.ts`.

### `gfw-blz-presence-2024.geojson`

Global Fishing Watch AIS vessel-presence — Belize Exclusive Economic Zone
(EEZ id 8457), calendar-year 2024, monthly temporal resolution, HIGH
spatial resolution (~0.01°), grouped by flag state. 31,438 cell-months.

- **Source:** Global Fishing Watch API v3, dataset
  `public-global-presence:latest` (v4.0). Endpoint `POST /v3/4wings/report`.
- **Citation:** Kroodsma, D.A., Mayorga, J., Hochberg, T., Miller, N.A.,
  Boerder, K., Ferretti, F., Wilson, A., Bergman, B., White, T.D.,
  Block, B.A., Woods, P., Sullivan, B., Costello, C., Worm, B. (2018).
  "Tracking the global footprint of fisheries." *Science* 359, 904–908.
  DOI: `10.1126/science.aao5646`.
- **License:** Creative Commons Attribution 4.0 International (CC-BY-4.0).
- **Attributes per feature:** `date` (`YYYY-MM`), `flag` (ISO-3), `hours`,
  `vesselIDs`, `source` (`gfw-presence-v4.0`), `license` (`CC-BY-4.0`).
- **Coverage note:** Dataset captures AIS-broadcasting vessels only.
  Belize's small-boat and coastal fishing fleet does NOT carry AIS and is
  invisible here. The data surfaces foreign commercial and
  flag-of-convenience traffic through Belize waters (top flags in 2024:
  USA, MHL, LBR, BHS, ATG, PAN).
- **Regenerate:** `pnpm exec tsx scripts/import-gfw-presence.ts` —
  requires `GFW_API_TOKEN` in `.env.local`.

### `gfw-blz-fishing-2020.geojson`

Global Fishing Watch classified fishing-effort — Belize EEZ, 2020 (most
recent year with non-null data; 2023–2024 return null). 21 cells.

- **Source:** GFW API v3, dataset `public-global-fishing-effort:latest`
  (v4.0). Yearly temporal resolution, HIGH spatial resolution, grouped by
  `geartype`.
- **Citation / license:** Same as `gfw-blz-presence-2024.geojson`.
- **Attributes per feature:** `date` (`"2020"`), `geartype`, `hours`,
  `vesselIDs`, `source` (`gfw-fishing-v4.0`), `license` (`CC-BY-4.0`).
- **Coverage note:** All 21 cells are `geartype: "inconclusive"` with
  18.5 total hours — effectively, GFW detects almost no classified
  fishing activity inside Belize's EEZ.
- **Regenerate:** `pnpm exec tsx scripts/import-gfw-fishing.ts`.

## Externally-hosted datasets (no local copy)

### AWS Mapzen Terrain Tiles

Global DEM tiles used by the "Terrain (DEM)" demo. Not copied into this
repo — fetched at runtime from AWS S3 (tiles are frozen from Mapzen's 2017
shutdown and remain publicly accessible).

- **Source:** Mapzen Terrain Tiles, hosted by the Registry of Open Data on
  AWS under the bucket `elevation-tiles-prod`.
- **URL template:**
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
- **Encoding:** Terrarium PNG — `elevation_m = (R*256 + G + B/256) - 32768`.
- **Upstream data sources:** SRTM (NASA), GMTED (USGS), ETOPO1 (NOAA),
  plus NED / Kartverket / EU-DEM / Data.gov.uk / etc. per tile. Full list:
  https://github.com/tilezen/joerd/blob/master/docs/data-sources.md
- **License:** CC-BY 3.0 Mapzen (terrain assembly); underlying sources are
  public-domain or permissively licensed. Attribution: "Terrain CC-BY-3.0
  Mapzen". See https://registry.opendata.aws/terrain-tiles/
- **Draped texture** over the 3D terrain: ArcGIS World Imagery (© Esri,
  Maxar, Earthstar Geographics), same satellite raster used elsewhere in
  the showcase.

### OpenFreeMap vector tiles

OpenMapTiles-schema MVT used by the "Vector (MVT)" sub-tab of the Tiles
demo. Not copied; consumed at runtime via the OpenFreeMap tileJSON.

- **Source:** OpenFreeMap (https://openfreemap.org/) — free tile hosting
  for the OpenStreetMap-derived OpenMapTiles schema.
- **tileJSON:** `https://tiles.openfreemap.org/planet` (resolves to a
  versioned build path, e.g.
  `/planet/20260415_001001_pt/{z}/{x}/{y}.pbf`).
- **Zoom range:** 0–14.
- **Vector layers (16):** `aerodrome_label`, `aeroway`, `boundary`,
  `building`, `housenumber`, `landcover`, `landuse`, `mountain_peak`,
  `park`, `place`, `poi`, `transportation`, `transportation_name`,
  `water`, `water_name`, and the OpenMapTiles global layer.
- **License:** OSM data under ODbL (OpenStreetMap contributors);
  OpenMapTiles schema under CC-BY; OpenFreeMap hosting free for use.
  Attribution: "© OpenStreetMap contributors · OpenMapTiles ·
  OpenFreeMap".

### Cesium ion — Google Photorealistic 3D Tiles

Global 3D photomesh used by the "Google 3D Tiles" sub-tab of the Tiles
demo. Streamed at runtime through Cesium ion's proxy; no local copy.

- **Source:** Cesium ion asset `2275207` (`Google Photorealistic 3D Tiles`).
  Under the hood this is a proxy to
  `https://tile.googleapis.com/v1/3dtiles/root.json` with a session-scoped
  Google Maps API key provisioned by Cesium ion.
- **Auth:** requires `NEXT_PUBLIC_CESIUM_ION_TOKEN` in `.env.local`
  (gitignored). Free token at https://ion.cesium.com/signup — Community
  tier: 15 GB streaming / 1,000 root tiles per month, no CC required.
- **Coverage:** strongest over urban areas; Belize City / Belmopan / San
  Ignacio all have photomesh. Rural Belize (Maya Mountains, reefs, outer
  cayes) drops out to satellite or shows gaps.
- **License / attribution:** "© 2026 Google · Cesium ion streaming proxy".
  Photomesh is free for non-commercial use via the Community tier.
  Commercial use requires upgrading Cesium ion plan.

## Additional datasets

Reef monitoring points, transect lines, and time-series data are **not
included** in ME-005/ME-006a/ME-006b. They are scoped to the data-layer /
MIMES sub-systems where the canonical scientific source must be named and
approved before check-in.
