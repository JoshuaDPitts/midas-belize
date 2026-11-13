# Runs ONE Laughing Bird coral scenario (climate x plan) headless and appends
# yearly (Jan-1, JDAY==1) coral biomass per species x polygon to a CSV.
#
# Usage: Rscript run-combo.R <climate 0|1> <plan 0|1> <run_id> <out_csv>
# One fresh R process per combo (multiple model instances in one session
# corrupt the SST file-input). Parameters are set AFTER reset(-2) and read only
# after stepping, mirroring Simile's GUI stop -> set -> play order.

suppressMessages(library(Simile))
tcl("set", "::use_system_tcltk", 1)                 # v7.4 package-scope workaround
SIMILE <- "/Applications/Simile v7.4 64-bit.app/Contents/Resources"
LB     <- "/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Marine Model/Laughing Bird"
# DYLIB / SPF / NDAYS / LB overridable via env for model variants (e.g. LBC4).
# Defaults preserve the original lbd run. LBD_DYLIB may be relative to LB.
LB     <- Sys.getenv("LBD_LB", LB)
DYLIB  <- Sys.getenv("LBD_DYLIB", "/Users/jpitts/Library/Mobile Documents/com~apple~CloudDocs/Documents/DocumentsNEW/Projects/midas_belize/lbd.dylib")
if (!startsWith(DYLIB, "/")) DYLIB <- file.path(LB, DYLIB)
SPF    <- Sys.getenv("LBD_SPF", "Laughing Bird Corals 1.spf")  # relative to LB; override via LBD_SPF for scenario variants
NDAYS  <- as.integer(Sys.getenv("LBD_NDAYS", "4547"))
# LBD_SAMPLE_EVERY > 0 captures every N days (fine time series for reproducing
# the Simile run-screen daily plots). 0 = original yearly (JDAY==1) sampling.
SAMPLE_EVERY <- as.integer(Sys.getenv("LBD_SAMPLE_EVERY", "0"))
# Species ids 1..3 per the model inputs (Corals Species attributes.csv,
# Mortality Cause.csv, Planting scenarios.csv legend). An earlier version
# mislabelled ids 2/3 as "Porites lobata"/"Montastraea cavernosa".
SPECIES <- c("Acropora palmata", "Acropora cervicornis", "Orbicella spp.")

use.simile.at(SIMILE)
tcl("package", "require", "mime")
setwd(LB)

a <- commandArgs(trailingOnly = TRUE)
climate <- as.numeric(a[1]); plan <- as.numeric(a[2]); run_id <- a[3]; out <- a[4]

h <- load.model(DYLIB)
inst <- create.model(h)
consult.parameter.metafile(inst, SPF)               # file inputs + coral IC
set.model.step(inst, 1, 1)
reset.model(inst, -2)                               # STOP: init + load IC
set.model.parameter(create.param.array(inst, "/Climate Scenario"), climate)
set.model.parameter(create.param.array(inst, "/Implement the plan"), plan)
# LBD_EBIN pins the Choose EBIN slider so var2 (= biomass at the chosen depth
# band) is captured for that EBIN. Choose EBIN only selects the observed slice,
# not the dynamics, so running once per EBIN reconstructs the full field.
ebin_env <- Sys.getenv("LBD_EBIN", "")
if (nzchar(ebin_env)) set.model.parameter(create.param.array(inst, "/Choose EBIN"), as.numeric(ebin_env))

chunks <- list()
for (d in 1:NDAYS) {
  execute.model(inst, d)                            # PLAY: variable params read live
  capture <- if (SAMPLE_EVERY > 0) (d == 1 || d %% SAMPLE_EVERY == 0) else (as.numeric(get.value.array(inst, "/Calender/JDAY")) == 1)
  if (capture) {
    v  <- get.value.array(inst, "/Location/var2")   # [species(3) x polygon(43)]
    yr <- as.numeric(get.value.array(inst, "/Calender/Year"))
    np <- ncol(v); ns <- nrow(v)
    chunk <- data.frame(
      run_id = run_id, climate_scenario = climate, implement_plan = plan,
      sim_day = d, year = yr,
      polygon_id = rep(1:np, each = ns),
      species_id = rep(1:ns, times = np),
      species = rep(SPECIES[1:ns], times = np),
      biomass = as.vector(v),
      stringsAsFactors = FALSE)
    if (nzchar(ebin_env)) chunk$ebin <- as.integer(ebin_env)
    chunks[[length(chunks) + 1]] <- chunk
  }
}
df <- do.call(rbind, chunks)
if (anyNA(df$biomass)) stop(sprintf("NA biomass in run %s (%d rows NA)", run_id, sum(is.na(df$biomass))))
write.table(df, out, sep = ",", row.names = FALSE, col.names = FALSE, append = TRUE, qmethod = "double")
cat(sprintf("run %-14s -> %d rows, %d yearly snapshots, biomass range [%.1f, %.1f]\n",
    run_id, nrow(df), length(chunks), min(df$biomass), max(df$biomass)))
