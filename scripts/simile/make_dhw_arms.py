#!/usr/bin/env python3
"""Build the daily DHW trigger series and calibrated mortality rates for each arm.

IMPORTANT: /Location/Disease is declared units=int with min 0 / max 1 in LBC4, so it
is a BINARY switch. It can express "DHW has crossed the threshold, apply heat
mortality" but not "apply mortality in proportion to DHW". Every arm is therefore a
step rule:  Disease(t) = 1 when DHW(t) >= onset, else 0.

Two calibrations of the per-species rate, because the choice turns out to matter
more than the DHW rule itself:
  integral : total stress over the 24 years equals the current model's
  peak     : the daily mortality rate while triggered equals the current model's peak
"""
import csv, datetime as dt, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "output", "dhw-arms", "series"); os.makedirs(OUT, exist_ok=True)
SST_CSV = ('/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/'
           'MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Input time/'
           'laughingbird_mur_sst_daily_bboxmean_2002_2026.csv')
HEAT_RATE = {"1": 0.0118, "2": 0.0168, "3": 0.006}
MODEL_THR, NDAYS = 30.0, 8760

rows = list(csv.DictReader(open(SST_CSV)))
V = [float(r["sst_mean_degC"]) for r in rows]
D = [dt.datetime.strptime(r["date"], "%m/%d/%Y").date() for r in rows]
SST = [V[t - 1] for t in range(2, NDAYS + 2)]
DTE = [D[t - 1] for t in range(2, NDAYS + 2)]
CUR_INTEGRAL = sum(max(0.0, v - MODEL_THR) for v in SST)     # degC-days
CUR_PEAK     = max(max(0.0, v - MODEL_THR) for v in SST)     # degC

def dhw(MMM):
    hs = [max(0.0, v - MMM) for v in V]
    hs = [h if h >= 1.0 else 0.0 for h in hs]
    out, run = [], 0.0
    for i in range(len(V)):
        run += hs[i]
        if i >= 84: run -= hs[i - 84]
        out.append(run / 7.0)
    return [out[t - 1] for t in range(2, NDAYS + 2)]

arms = []
for MMM in (28.70, 29.83):
    full = dhw(MMM)
    for onset in (0, 4, 8, 12):
        trig = [1 if (x > 0 if onset == 0 else x >= onset) else 0 for x in full]
        n = sum(trig)
        for calib in ("integral", "peak"):
            name = f"MMM{MMM:.2f}_ge{onset}_{calib}"
            if n == 0:
                scale, degenerate = 0.0, True
            else:
                scale = (CUR_INTEGRAL / n) if calib == "integral" else CUR_PEAK
                degenerate = False
            rates = {k: round(v * scale, 8) for k, v in HEAT_RATE.items()}
            with open(f"{OUT}/{name}.csv", "w", newline="") as fh:
                w = csv.writer(fh); w.writerow(["time", "date", "dhw", "u"])
                for i in range(len(trig)):
                    w.writerow([i + 2, DTE[i].isoformat(), f"{full[i]:.4f}", trig[i]])
            arms.append(dict(name=name, mmm=MMM, onset=onset, calib=calib,
                             peak_dhw=round(max(full), 2), days_active=n,
                             scale=round(scale, 6), rates=rates, degenerate=degenerate))
            if calib == "integral":
                print(f"MMM {MMM:.2f} onset {onset:>2}: triggered {n:5d}/{NDAYS} d"
                      + (f"   integral rate(sp2) {rates['2']:.5f}" if n else "   << never triggers"))
json.dump(arms, open(f"{OUT}/arms.json", "w"), indent=1)
print(f"\ncurrent model: integral {CUR_INTEGRAL:.1f} °C-days over 936 d, "
      f"peak daily rate(sp2) {HEAT_RATE['2']*CUR_PEAK:.5f}/day")
print(f"peak-matched rate(sp2) for every arm = {HEAT_RATE['2']*CUR_PEAK:.5f}/day")
print("reference: coral growth ~0.0219/day (sp1), 0.0022/day (sp2)")
