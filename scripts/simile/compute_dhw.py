#!/usr/bin/env python3
"""Compute NOAA Coral Reef Watch Degree Heating Weeks from the Laughing Bird MUR
SST record, and compare it against the driver LBC4 currently uses.

NOAA CRW definition:
  MMM      = maximum of the twelve monthly climatological means
  HotSpot  = max(0, SST - MMM), retained only when >= 1 degC
  DHW(t)   = sum of HotSpot over the trailing 84 days, divided by 7  [degC-weeks]
  DHW >= 4 -> significant bleaching expected;  DHW >= 8 -> mortality expected

LBC4 currently uses:
  T mortality = Rate * max(0, SST - 30)      (instantaneous, no memory)
"""
import csv, datetime as dt, statistics as st, json, os, sys

SST_CSV = ('/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/'
           'MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time/'
           'laughingbird_mur_sst_daily_bboxmean_2002_2026.csv')
CLIM = (2002, 2013)      # climatology window available in this record
MODEL_THR = 30.0

rows = list(csv.DictReader(open(SST_CSV)))
D = [dt.datetime.strptime(r["date"], "%m/%d/%Y").date() for r in rows]
V = [float(r["sst_mean_degC"]) for r in rows]

months = {}
for d, v in zip(D, V):
    if CLIM[0] <= d.year <= CLIM[1]:
        months.setdefault(d.month, []).append(v)
monthly = {k: st.mean(v) for k, v in months.items()}
MMM = max(monthly.values())

hotspot = [max(0.0, v - MMM) for v in V]
hs_counted = [h if h >= 1.0 else 0.0 for h in hotspot]      # CRW 1 degC rule
dhw = []
run = 0.0
for i in range(len(V)):
    run += hs_counted[i]
    if i >= 84: run -= hs_counted[i - 84]
    dhw.append(run / 7.0)

model_drv = [max(0.0, v - MODEL_THR) for v in V]

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "output", "dhw", "laughingbird_dhw_daily.csv")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["date", "sim_time", "sst_mean_degC", "hotspot_degC", "dhw_degC_weeks",
                    "model_driver_degC"])
        for i, d in enumerate(D):
            w.writerow([d.isoformat(), (d - dt.date(2002, 6, 1)).days + 1,
                        f"{V[i]:.3f}", f"{hotspot[i]:.3f}", f"{dhw[i]:.4f}", f"{model_drv[i]:.3f}"])
    print(f"MMM ({CLIM[0]}-{CLIM[1]}) = {MMM:.3f} °C   ->  NOAA HotSpot threshold MMM+1 = {MMM+1:.3f} °C")
    print(f"LBC4 threshold            = {MODEL_THR:.3f} °C   ->  {MMM+1-MODEL_THR:+.3f} °C vs NOAA\n")
    print(f"peak DHW in record        = {max(dhw):.2f} °C-weeks on {D[dhw.index(max(dhw))]}")
    print(f"days DHW >= 4             = {sum(1 for x in dhw if x >= 4)}")
    print(f"days DHW >= 8             = {sum(1 for x in dhw if x >= 8)}")
    print(f"days SST > 30 (model)     = {sum(1 for x in model_drv if x > 0)}")
    print(f"\nwrote {out}")
