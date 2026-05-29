#!/usr/bin/env python3
"""Aggregeert een Visdeurbel NDJSON-eventbestand tot vis-data voor de Mitchell-pagina.

Gebruik:
    python3 build_visdata.py <input.json> <outnaam.json>

Schrijft het resultaat naar zowel json/<outnaam> als public/json/<outnaam>,
zodat de Vite dev-server het kan serveren op /json/<outnaam>.
"""
import json, sys, re, collections, os
from datetime import datetime

NL_MON = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

# Synthetische vissoorten (decoratief, geschaald op het werkelijke uploadtotaal).
SPECIES_BASE = {
    "Blankvoorn": 1450, "Brasem": 2541, "Baars": 2759, "Snoekbaars": 406,
    "Paling": 3265, "Kolblei": 1143, "Alver": 3508, "Ruisvoorn": 945,
    "Snoek": 900, "Winde": 1087, "Meerval": 1839, "Karper": 255,
}
REF_TOTAL = 49739
HOST = "visdeurbel.nl"


def label(dt):
    return f"{dt.day} {NL_MON[dt.month - 1]}"


def build(infile):
    country = collections.Counter(); ev = collections.Counter()
    dev = collections.Counter(); brow = collections.Counter(); osc = collections.Counter()
    lang = collections.Counter(); screens = collections.Counter()
    rings = collections.Counter(); seen = collections.Counter()
    portrait = landscape = square = 0
    pond = [0] * (7 * 24 * 60)
    per_day = collections.Counter()
    per_day_hour = collections.defaultdict(int)
    dates = set()
    res_pat = re.compile(r'^(\d{2,5})x(\d{2,5})$')

    with open(infile, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get("hostname") != HOST:
                continue

            c = d.get("country", "")
            if c:
                country[c] += 1
            ev[d.get("event_name", "")] += 1
            if d.get("device"):
                dev[d["device"]] += 1
            if d.get("browser"):
                brow[d["browser"]] += 1
            if d.get("os"):
                osc[d["os"]] += 1
            L = (d.get("language") or "").split("-")[0].lower()
            if L:
                lang[L] += 1
            s = (d.get("screen") or "").strip()
            m = res_pat.match(s)
            if m:
                w, h = int(m.group(1)), int(m.group(2))
                if 100 <= w <= 10000 and 100 <= h <= 10000:
                    screens[(w, h)] += 1
                    if w < h: portrait += 1
                    elif w > h: landscape += 1
                    else: square += 1
            sid = d.get("session_id") or ""
            if sid:
                seen[sid] += 1
                if d.get("event_name") == "uploadedFish":
                    rings[sid] += 1

            if d.get("event_name") == "uploadedFish":
                ca = d.get("created_at") or ""
                try:
                    dt = datetime.strptime(ca, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    continue
                pond[dt.weekday() * 1440 + dt.hour * 60 + dt.minute] += 1
                ds = dt.strftime("%Y-%m-%d")
                per_day[ds] += 1
                per_day_hour[(ds, dt.hour)] += 1
                dates.add(ds)

    week_days = sorted(dates)
    week_day_labels = [label(datetime.strptime(x, "%Y-%m-%d")) for x in week_days]
    week_hours = []
    for ds in week_days:
        for h in range(24):
            week_hours.append(per_day_hour.get((ds, h), 0))
    daily = {str(i): per_day[ds] for i, ds in enumerate(week_days)}

    total_uploads = ev.get("uploadedFish", 0)
    species = {k: max(1, round(v * total_uploads / REF_TOTAL)) for k, v in SPECIES_BASE.items()}

    start = datetime.strptime(week_days[0], "%Y-%m-%d")
    end = datetime.strptime(week_days[-1], "%Y-%m-%d")
    period = {"start": week_days[0], "end": week_days[-1],
              "label": f"{label(start)} – {label(end)} {end.year}"}

    upl = ev.get("uploadedFish", 0); dis = ev.get("dismissedUploading", 0)

    # sessies -> fanatici
    ring_counts = sorted(rings.get(s, 0) for s in seen)
    n = len(ring_counts); total_rings = sum(ring_counts)
    prefix = [0] * (n + 1)
    for i, r in enumerate(ring_counts):
        prefix[i + 1] = prefix[i] + r
    cap = 12
    buckets = collections.Counter()
    for r in ring_counts:
        if r == 0: continue
        buckets[r if r <= cap else cap + 1] += 1
    hist = [{"r": k, "n": buckets.get(k, 0)} for k in range(1, cap + 1)]
    hist.append({"r": str(cap + 1) + "+", "n": buckets.get(cap + 1, 0)})
    lorenz = [round((prefix[round(k / 100 * n)] / total_rings) if total_rings else 0, 4) for k in range(101)]
    def top_share(pct):
        j = max(1, round(pct / 100 * n))
        return round(sum(ring_counts[n - j:]) / total_rings, 4) if total_rings else 0
    ringers = sum(1 for r in ring_counts if r > 0)

    return {
        "period": period,
        "totalUploads": total_uploads,
        "species": species,
        "daily": daily,
        "weekDays": week_days,
        "weekDayLabels": week_day_labels,
        "weekHours": week_hours,
        "geo": {"total": sum(country.values()), "countries": dict(country.most_common())},
        "funnel": {"uploadedFish": upl, "dismissedUploading": dis, "total": upl + dis},
        "tech": {"device": dict(dev.most_common()), "browser": dict(brow.most_common()), "os": dict(osc.most_common())},
        "sessions": {
            "totalSessions": n, "ringers": ringers, "totalRings": total_rings,
            "maxRings": ring_counts[-1] if n else 0,
            "avgPerRinger": round(total_rings / ringers, 2) if ringers else 0,
            "hist": hist, "lorenz": lorenz,
            "topShare": {"p1": top_share(1), "p5": top_share(5), "p10": top_share(10)},
        },
        "languages": [{"code": c, "n": v} for c, v in lang.most_common(26)],
        "pondWeek": pond,
        "pondTotal": sum(pond),
        "screens": [{"w": w, "h": h, "n": v} for (w, h), v in screens.most_common(18)],
        "orientation": {"portrait": portrait, "landscape": landscape, "square": square,
                        "total": portrait + landscape + square, "unique": len(screens)},
    }


def main():
    if len(sys.argv) != 3:
        print("gebruik: python3 build_visdata.py <input.json> <outnaam.json>"); sys.exit(1)
    infile, outname = sys.argv[1], sys.argv[2]
    data = build(infile)
    out = json.dumps(data, ensure_ascii=False)
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    targets = [os.path.join(here, outname), os.path.join(root, "public", "json", outname)]
    for t in targets:
        with open(t, "w", encoding="utf-8") as f:
            f.write(out)
    print(f"{infile}: dagen={len(data['weekDays'])} ({data['period']['label']}) "
          f"uploads={data['totalUploads']} sessies={data['sessions']['totalSessions']} "
          f"landen={len(data['geo']['countries'])} talen={len(data['languages'])}")
    print("geschreven:", ", ".join(targets), f"({len(out)} bytes)")


if __name__ == "__main__":
    main()
