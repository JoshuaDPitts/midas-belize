# Structural / ecosystem-service capture for LBC4.
# Records per-species Coral area plus coral height, friction, dissipation and the
# service variables, per polygon and per depth band.
# Usage: Rscript run-services.R <plan 0|1> <poly 0=all> <out_csv> <ndays> <climate 0|1> <reef_state 1-5> <every_n_days>
# Env:   LBD_SPF  overrides the parameter metafile (used for alternative SST forcings)
suppressMessages(library(tcltk)); suppressMessages(library(Simile))
tcl("set","::use_system_tcltk",1)
SIMILE <- "/Applications/Simile v7.4 64-bit.app/Contents/Resources"
LB <- "/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Marine Model/Laughing Bird"
use.simile.at(SIMILE); tcl("package","require","mime"); setwd(LB)
a <- commandArgs(trailingOnly=TRUE)
plan<-as.numeric(a[1]); poly<-as.numeric(a[2]); out<-a[3]; N<-as.integer(a[4])
climate<-as.numeric(a[5]); rs<-as.numeric(a[6]); EVERY<-as.integer(a[7])
SPF <- Sys.getenv("LBD_SPF","LBC4-jp-jul31-suchiroel.spf")
h <- load.model(file.path(LB,"LBC4.dylib")); inst <- create.model(h)
consult.parameter.metafile(inst, SPF)
set.model.step(inst,1,1); reset.model(inst,-2)
set.model.parameter(create.param.array(inst,"/Climate Scenario"), climate)
set.model.parameter(create.param.array(inst,"/Implement the plan"), plan)
set.model.parameter(create.param.array(inst,"/Choose EBIN"), 5)
set.model.parameter(create.param.array(inst,"/Choose Reef state"), rs)
NP<-43; NE<-7; NS<-3
rows <- list()
for (d in 1:N) {
  execute.model(inst,d)
  if (d %% EVERY == 0 || d == N) {
    ar <- as.numeric(get.value.array(inst,"/Location/Marine EBINS/Corals/Coral area"))
    ht <- as.numeric(get.value.array(inst,"/Location/Marine EBINS/Coral Height"))
    fr <- as.numeric(get.value.array(inst,"/Location/Marine EBINS/Bottom Friction"))
    ed <- as.numeric(get.value.array(inst,"/Location/Marine EBINS/Wave Energy/Energy Dissipation"))
    dc <- as.numeric(get.value.array(inst,"/Location/Marine EBINS/Wave Energy/Energy Disp Cap"))
    si <- as.numeric(get.value.array(inst,"/Location/Marine EBINS/Wave Energy/Erosion Prevention Service Indicator"))
    ls <- as.numeric(get.value.array(inst,"/Location/Location Service Level"))
    ec <- as.numeric(get.value.array(inst,"/Location/Location EDC"))
    P <- if (poly>0) poly else 1:NP
    for (p in P) {
      base_e <- (p-1)*NE
      for (e in 1:NE) {
        k <- base_e + e
        rows[[length(rows)+1]] <- data.frame(
          time=d+1, polygon=p, ebin=e,
          area_sp1=ar[(k-1)*NS+1], area_sp2=ar[(k-1)*NS+2], area_sp3=ar[(k-1)*NS+3],
          height=ht[k], friction=fr[k], energy_diss=ed[k], disp_cap=dc[k], service_ind=si[k],
          loc_service=ls[p], loc_edc=ec[p])
      }
    }
  }
}
df <- do.call(rbind, rows)
df$plan<-plan; df$climate<-climate; df$reef_state<-rs; df$target_poly<-poly; df$spf<-SPF
write.csv(df, out, row.names=FALSE)
cat(sprintf("SVC plan=%d poly=%d c=%d rs=%d spf=%s -> %d rows, height %.5f..%.5f\n",
    plan, poly, climate, rs, SPF, nrow(df), min(df$height), max(df$height)))
