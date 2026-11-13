#!/bin/bash
# Runs the 4 Laughing Bird coral scenarios (Climate {0,1} x Implement-the-plan {0,1})
# each in a fresh R process, and assembles one tidy long-format CSV of yearly
# (Jan-1) coral biomass per species x polygon.
set -euo pipefail

RSCRIPT="/Library/Frameworks/R.framework/Resources/bin/Rscript"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUTDIR="$HERE/output"
# OUT + the SPF (via LBD_SPF, read by run-combo.R) can be overridden to build
# scenario variants without clobbering the default dataset. e.g.:
#   LBD_SPF="Laughing Bird Corals 1 SSP25.spf" \
#   LBD_OUT="$OUTDIR/coral-biomass-by-species-yearly-ssp25.csv" bash build-dataset.sh
OUT="${LBD_OUT:-$OUTDIR/coral-biomass-by-species-yearly.csv}"
mkdir -p "$OUTDIR"

echo "run_id,climate_scenario,implement_plan,sim_day,year,polygon_id,species_id,species,biomass" > "$OUT"

# run_id            climate plan
run() { echo ">>> $1"; "$RSCRIPT" "$HERE/run-combo.R" "$2" "$3" "$1" "$OUT"; }
run bc_norestore 0 0
run bc_restore   0 1
run cc_norestore 1 0
run cc_restore   1 1

echo "=== done: $OUT ==="
echo "rows: $(($(wc -l < "$OUT") - 1))"
