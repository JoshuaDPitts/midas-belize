# Captures LBC4 per-EBIN wave energy dissipation over time.
# /Location/Marine EBINS/Wave Energy/Energy Dissipation is [7 EBIN x 43 location];
# we sum over locations -> 7 per-EBIN totals per snapshot.
# Usage: Rscript capture_wave_energy.R <climate 0|1> <plan 0|1> <run_id> <out_csv>
suppressMessages(library(Simile)); tcl("set","::use_system_tcltk",1)
SIMILE <- "/Applications/Simile v7.4 64-bit.app/Contents/Resources"
LB <- "/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Marine Model/Laughing Bird"
use.simile.at(SIMILE); tcl("package","require","mime"); setwd(LB)
NDAYS <- as.integer(Sys.getenv("LBD_NDAYS","8760"))
EVERY <- as.integer(Sys.getenv("LBD_SAMPLE_EVERY","365"))
# Which [7 EBIN x 43 location] variable to capture, and how to aggregate over
# locations. Default = Energy Dissipation (sum); Coral Height uses mean.
WAVEVAR <- Sys.getenv("LBD_WAVEVAR","/Location/Marine EBINS/Wave Energy/Energy Dissipation")
AGG <- Sys.getenv("LBD_WAVEAGG","sum")
a <- commandArgs(trailingOnly=TRUE); climate<-as.numeric(a[1]); plan<-as.numeric(a[2]); run_id<-a[3]; out<-a[4]
h <- load.model(file.path(LB,"LBC4.dylib")); inst <- create.model(h)
consult.parameter.metafile(inst,"LBC4-jp-jul31-suchiroel.spf")
set.model.step(inst,1,1); reset.model(inst,-2)
set.model.parameter(create.param.array(inst,"/Climate Scenario"),climate)
set.model.parameter(create.param.array(inst,"/Implement the plan"),plan)
chunks <- list()
for (d in 1:NDAYS) {
  execute.model(inst,d)
  if (d==1 || d%%EVERY==0) {
    ed <- get.value.array(inst, WAVEVAR) # 7 x 43
    yr <- as.numeric(get.value.array(inst,"/Calender/Year"))
    per_ebin <- if (AGG=="mean") rowMeans(ed) else rowSums(ed)  # length 7 (per EBIN)
    chunks[[length(chunks)+1]] <- data.frame(run_id=run_id, climate_scenario=climate,
      implement_plan=plan, sim_day=d, year=yr, ebin=1:length(per_ebin),
      value=per_ebin, stringsAsFactors=FALSE)
  }
}
df <- do.call(rbind,chunks)
write.table(df,out,sep=",",row.names=FALSE,col.names=FALSE,append=TRUE,qmethod="double")
cat(sprintf("wave %-12s -> %d rows, value range [%.3f, %.3f]\n", run_id, nrow(df), min(df$value), max(df$value)))
