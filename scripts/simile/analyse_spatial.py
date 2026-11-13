#!/usr/bin/env python3
"""WS-B / WS-C: does WHERE you plant matter?

43 single-polygon plantings of an identical 90 kg, under observed MUR SST and RCP-4.5.
Polygons are exactly independent in LBC4 (verified: planting in one changes no other),
so each polygon's gain is recovered as reef_total(planted) - reef_total(baseline), and
any spatial portfolio is the exact sum of its members.
"""
import csv, os, datetime as dt, json
HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = os.path.join(HERE, "output", "spatial", "runs")
OUT  = os.path.join(HERE, "output", "spatial")
LB   = ("/Users/jpitts/Library/CloudStorage/GoogleDrive-joshua.d.pitts@gmail.com/Shared drives/"
        "MIMES_MIDAS/2026MIDASMIMES_COPES/Belize-clean/Belize/Marine Model/Laughing Bird")
BASE, PLANTD, KG = dt.date(2002, 6, 1), dt.date(2006, 5, 17), 90.0
d2t = lambda d: (d - BASE).days + 1
t2d = lambda t: BASE + dt.timedelta(days=int(t) - 1)
HOR = [("+6 mo", 182), ("+1 yr", 365), ("+2 yr", 730), ("+3 yr", 1095), ("+5 yr", 1825)]

AREA = {}
for r in csv.DictReader(open(f"{LB}/input/Init_Areas.csv", encoding="utf-8-sig")):
    k = int(r["mimes_id"]); AREA[k] = AREA.get(k, 0.0) + float(r["AREA_M2"])

def series(path, col="reef_biomass"):
    return {int(float(r["time"])): float(r[col]) for r in csv.DictReader(open(path))}

def load_climate(c):
    base = series(f"{RUNS}/base_c{c}.csv")
    out = {}
    for p in range(1, 44):
        f = f"{RUNS}/poly{p:02d}_c{c}.csv"
        if not os.path.exists(f): continue
        pl = series(f)
        ts = sorted(set(base) & set(pl))
        out[p] = (ts, [pl[t] - base[t] for t in ts])
    return base, out

def metrics(ts, g):
    i0 = max(range(len(g)), key=lambda i: g[i])
    m = dict(peak=g[i0], peak_date=str(t2d(ts[i0])))
    idx = {t: i for i, t in enumerate(ts)}
    for lab, dd in HOR:
        t = d2t(PLANTD + dt.timedelta(days=dd))
        m[lab] = g[idx[t]] if t in idx else None
    m["coral_kg_years"] = sum(g[i] for i in range(i0, len(g))) / 365.0
    return m

if __name__ == "__main__":
    allm = {}
    for c in (0, 1):
        try: base, G = load_climate(c)
        except FileNotFoundError: continue
        if not G: continue
        rows = []
        for p, (ts, g) in sorted(G.items()):
            m = metrics(ts, g); m["polygon"] = p
            m["area_m2"] = AREA.get(p)
            m["kg_yr_per_1000m2"] = (m["coral_kg_years"] / AREA[p] * 1000) if AREA.get(p) else None
            rows.append(m)
        allm[c] = rows
        lab = "observed MUR" if c == 0 else "RCP-4.5"
        print(f"\n=== climate {c} ({lab}) — {len(rows)} polygons, 90 kg each ===")
        print(f"{'poly':>5} {'area m2':>9} {'peak':>7} {'+1yr':>7} {'+2yr':>7} {'+3yr':>7} "
              f"{'kg-yr':>8} {'kg-yr/1000m2':>13}")
        for m in sorted(rows, key=lambda x: -(x["coral_kg_years"] or 0)):
            f = lambda v: f"{v:7.2f}" if v is not None else "      —"
            print(f"{m['polygon']:>5} {m['area_m2'] or 0:>9.0f} {f(m['peak'])} {f(m['+1 yr'])} "
                  f"{f(m['+2 yr'])} {f(m['+3 yr'])} {m['coral_kg_years']:>8.1f} "
                  f"{(m['kg_yr_per_1000m2'] or 0):>13.3f}")
    json.dump(allm, open(f"{OUT}/spatial_metrics.json", "w"), indent=1)
    print(f"\nwrote {OUT}/spatial_metrics.json")
