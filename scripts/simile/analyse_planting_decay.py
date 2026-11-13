#!/usr/bin/env python3
"""The single 2006-05-17 outplanting (90 kg A. cervicornis, polygon 5, EBIN 5)
followed through every heat-stress rule we have run:

  15 threshold variants   Threshold 3 = 28.0 .. 35.0 degC
  16 DHW variants         2 MMM x 4 onsets x 2 rate calibrations

Retention(t) = planted run - no-planting baseline, at the planting site.
Reports where each curve crosses 75/50/25/10 % and the episodes in which it falls.
"""
import csv, json, datetime as dt, os
HERE  = os.path.dirname(os.path.abspath(__file__))
SWEEP = os.path.join(HERE, "output", "threshold-sweep", "runs")
DHW   = os.path.join(HERE, "output", "dhw-arms")
BASE, PLANTD, KG = dt.date(2002, 6, 1), dt.date(2006, 5, 17), 90.0
t2d = lambda t: BASE + dt.timedelta(days=int(t) - 1)
d2t = lambda d: (d - BASE).days + 1
T0 = d2t(PLANTD)

def retention(base_csv, plant_csv):
    b = {int(float(r["time"])): float(r["p5_sp2"]) for r in csv.DictReader(open(base_csv))}
    p = {int(float(r["time"])): float(r["p5_sp2"]) for r in csv.DictReader(open(plant_csv))}
    ts = sorted(t for t in b if t in p and t >= T0)
    return ts, [p[t] - b[t] for t in ts]

def crossings(ts, v, levels=(75, 50, 25, 10)):
    """Scan forward from the peak: v[0] is zero because the deposit lands two days
    after the nominal planting date."""
    i0 = max(range(len(v)), key=lambda i: v[i]); peak = v[i0]
    out = {}
    for L in levels:
        thr = KG * L / 100.0
        hit = next((ts[i] for i in range(i0, len(v)) if v[i] < thr), None)
        out[L] = t2d(hit) if hit else None
    return out, peak, i0

W = 60
def episodes(ts, v, i0, top=3, min_drop=3.0):
    """Sharpest 60-day losses, non-overlapping, ranked by kg lost. This is what
    'when does it fall off' means: rapid loss, not the slow monotonic tail."""
    cand = []
    for i in range(i0, len(v) - W):
        cand.append((v[i] - v[i + W], i))
    cand.sort(key=lambda c: -c[0])
    picked = []
    for drop, i in cand:
        if drop < min_drop: break
        if any(abs(i - j) < W for _, j in picked): continue
        picked.append((drop, i))
        if len(picked) == top: break
    return [(t2d(ts[i]), t2d(ts[i + W]), d) for d, i in picked]

ARMS = []
for th in [round(28.0 + 0.5 * i, 1) for i in range(15)]:
    ARMS.append(dict(key=f"T{th:.1f}", group="threshold", label=f"Θ = {th:.1f} °C", sort=th,
                     base=f"{SWEEP}/T{th:.1f}_base.csv", plant=f"{SWEEP}/T{th:.1f}_plant.csv"))
for a in json.load(open(f"{DHW}/series/arms.json")):
    n = a["name"]
    ARMS.append(dict(key=n, group=f"dhw-{a['calib']}", mmm=a["mmm"], onset=a["onset"],
                     calib=a["calib"], degenerate=a["degenerate"], sort=a["onset"],
                     label=f"MMM {a['mmm']:.2f}, "
                           + ("any DHW" if a["onset"] == 0 else f"DHW ≥ {a['onset']}"),
                     base=f"{DHW}/runs/{n}_base.csv", plant=f"{DHW}/runs/{n}_plant.csv"))

rows = []
for a in ARMS:
    ts, v = retention(a["base"], a["plant"])
    cr, peak, i0 = crossings(ts, v)
    a.update(ts=ts, v=v, cross=cr, peak=peak, i0=i0, eps=episodes(ts, v, i0))
    rows.append(a)

print(f"{'rule':34s} {'peak kg':>8} {'75%':>11} {'50%':>11} {'25%':>11} {'10%':>11}")
for a in rows:
    c = a["cross"]
    print(f"{a['key']:34s} {a['peak']:>8.1f} " +
          " ".join(f"{(str(c[L]) if c[L] else '—'):>11}" for L in (75, 50, 25, 10)))
print("\n\nPrincipal fall-off episodes (largest sustained declines):")
for a in rows:
    if not a["eps"]: continue
    top = "   ".join(f"{s:%Y-%m} −{d:.0f} kg/60d" for s, e, d in a["eps"][:3])
    print(f"  {a['key']:32s} {top}")
json.dump([{k: v for k, v in a.items() if k not in ("ts", "v", "eps", "cross", "i0")} for a in rows],
          open(f"{DHW}/figs/decay_index.json", "w"), indent=1, default=str)
