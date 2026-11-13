# Laughing Bird coral-biomass scenario runner

Runs the Laughing Bird Caye coral model (`lbd.sml`, Simile v7.4) headless from R
across all 4 scenario combinations and exports yearly coral biomass per species x
polygon as a tidy CSV for the MIDAS data-upload pipeline.

## Run it

```bash
bash scripts/simile/build-dataset.sh
# -> scripts/simile/output/coral-biomass-by-species-yearly.csv  (+ .provenance.json)
```

## Prerequisites (macOS)

- R (`brew install --cask r`) with the CRAN `Simile` package (`install.packages("Simile")`).
- XQuartz (`brew install --cask xquartz`) — R's `tcltk` needs X11.
- Simile v7.4 installed at `/Applications/Simile v7.4 64-bit.app`.
- `lbd.dylib` at the repo root — a **compiled binary** exported from the model
  (Simile GUI: File -> Export -> Compiled binary). The `.sml` itself is not loadable.

## How it works (the non-obvious bits)

- **v7.4 workaround:** `tcl("set","::use_system_tcltk",1)` before `use.simile.at`, or
  the package (written for v6) throws `use_system_tcltk: no such variable`.
- **Scenario parameters are set live, in GUI order:** `reset(-2)` (loads coral IC from
  files) -> `set.model.parameter` for `/Climate Scenario` and `/Implement the plan`
  -> `execute` loop. Do NOT reset after setting (reverts to baked defaults) and read
  values only after stepping. This mirrors Simile's stop -> set -> play.
- **One fresh R process per combo:** multiple model instances in one R session corrupt
  the SST file-input, so `build-dataset.sh` spawns `run-combo.R` four times.
- **SST / climate:** `Climate Scenario` 0 -> `SST BC` (column "Placencia Mod"),
  1 -> `SST CC` (column "Placencia Mod 4.5", RCP 4.5), both wired in
  `Laughing Bird Corals 1.spf`.
- **Sampling:** rows are captured only when `/Calender/JDAY == 1` (Jan 1), giving one
  snapshot per simulated year (~12 over the 4547-day run). `var2` is `[species x polygon]`.

## Files

- `run-combo.R` — runs one (climate, plan) combo, appends long rows to the output CSV.
- `build-dataset.sh` — runs all 4 combos, writes the header + assembles the CSV.
- `output/coral-biomass-by-species-yearly.csv` — the dataset (+ provenance sidecar).

---

# LBC4 model — depth-resolved analysis + presentation figures (2026-08)

`LBC4.sml` is the newer Laughing Bird model (superseding `lbd.sml`). It adds a
**Marine EBINS** depth structure and a real satellite SST base case. All the
runner scripts above take env overrides so they drive LBC4 without touching the
`lbd` defaults.

## Model + env overrides

- Compiled binary: **`LBC4.dylib`** (next to `LBC4.sml` on the model Drive;
  export via Simile GUI File -> Export -> Compiled binary). Point at it with
  `LBD_DYLIB=LBC4.dylib` (relative paths resolve under the model dir).
- Params: `LBD_SPF=LBC4-jp-jul31-suchiroel.spf`, `LBD_NDAYS`, `LBD_SAMPLE_EVERY`
  (0=yearly JDAY==1, N=every N days), `LBD_EBIN` (pin `Choose EBIN`),
  `LBD_WAVEVAR` / `LBD_WAVEAGG` (for `capture_wave_energy.R`).
- **SST base case is now real MUR satellite SST**: `SST BC` ->
  `laughingbird_mur_sst_daily_bboxmean_2002_2026.csv` (`sst_mean_degC`, 2002-06-01..2026);
  `SST CC` -> RCP-4.5 `Placencia Mod 4.5` (ends 2015, so climate runs cap at ~4547 days).
  Heat-stress mortality triggers at SST > **30 C** (Threshold 3, Rate 3).

## EBIN depth mapping (from `Corals Species By EBIN.csv`) — note the direction

`var2` / "Corel BM at Location" is biomass **at the selected EBIN** (depth band),
sliced by `Choose EBIN`. Bands: **1 = >20 m (deep), 2 = 5-20 m, 3 = 2-5 m,
4 = 1-2 m, 5 = 0-1 m (crest), 6-7 = upland (no coral)**. So the shallow reef is
4-5, NOT 1-3. Coral is concentrated in bands 3-5. Because `Choose EBIN` only
selects the observed slice (not the dynamics), running once per EBIN
reconstructs the full `[species x EBIN x location]` field.

## Regenerate the captures

```bash
# whole-reef per-EBIN biomass, SSP-2.5 base (weekly, all 7 bands, 2002-2026)
OUT=scripts/simile/output/lbc4-ebin-profile-base.csv
echo "run_id,climate_scenario,implement_plan,sim_day,year,polygon_id,species_id,species,biomass,ebin" > "$OUT"
for e in 1 2 3 4 5 6 7; do LBD_DYLIB=LBC4.dylib LBD_SPF=LBC4-jp-jul31-suchiroel.spf \
  LBD_NDAYS=8760 LBD_SAMPLE_EVERY=7 LBD_EBIN=$e Rscript scripts/simile/run-combo.R 0 0 bc_norestore "$OUT"; done
# ...same with climate=1, NDAYS=4547 -> lbc4-ebin-profile-rcp45.csv
# per-EBIN coral height (wave-attenuation structure), both scenarios:
#   LBD_WAVEVAR="/Location/Marine EBINS/Coral Height" LBD_WAVEAGG=mean Rscript capture_wave_energy.R 0 0 ...
```

## Plotting scripts (matplotlib, -> output/plots/)

- `plot_species_trajectory.py` — whole-reef biomass per species over time
  (sum over 43 polygons x 7 EBINs), dated x-axis (day 1 = 2002-06-01), red
  bleaching bands. `--label SSP-2.5|RCP-4.5`.
- `plot_reef_profile.py` — depth-band x time heatmap (absolute + % of baseline).
- `plot_ebin_species_bars.py` — grouped bars, biomass by depth band x species at `--years`.
- `plot_wave_dissipation.py` — reef structural height (Coral Height = the
  coral-driven wave-attenuation metric) by depth band at 5-yr intervals per
  scenario. NB: the raw `Energy Dissipation` var is depth-flat/background-driven
  and is NOT used.
- `plot_bm_at_location.py` — single-location "Corel BM at Location" reproduction.

## Bleaching-event bands

Sourced from **NOAA Coral Reef Watch** Belize DHW + literature (see project memory
`project_coral_scenario_data_reality` / session notes). Major Belize years
(Alert Level 2): 2015, 2016, 2017, 2019, 2020, 2021, 2023, 2024 — with 2019 > 2017
in DHW, and 2023-24 the record. 2005 and 2008-2011 were sub-lethal for Belize;
do NOT attach a "40% die-off" to 2008-2010 (that figure is 2024; the historic
Laughing Bird die-off was Hurricane Iris, 2001). NOAA's Belize gauge is central
Belize (~17 N); the model's MUR SST is site-specific to Laughing Bird (~16.4 N).
