#!/usr/bin/env python3
"""
csv_to_json.py — streaming CSV → JSON converter for large files

Usage:
    python csv_to_json.py input.csv output.json
    python csv_to_json.py input.csv output.json --pretty
    python csv_to_json.py input.csv output.json --lines   # JSONL (one object per line)
    python csv_to_json.py input.csv output.json --chunk 50000

Handles 100MB+ files without loading everything into memory.
"""

import csv
import json
import sys
import time
import argparse
from pathlib import Path


def parse_args():
    p = argparse.ArgumentParser(description="Convert large CSV files to JSON")
    p.add_argument("input", help="Input CSV file path")
    p.add_argument("output", help="Output JSON file path")
    p.add_argument("--delimiter", default=",", help="CSV delimiter (default: ,)")
    p.add_argument("--encoding", default="utf-8", help="File encoding (default: utf-8)")
    p.add_argument("--pretty", action="store_true", help="Pretty-print JSON (larger output)")
    p.add_argument("--lines", action="store_true", help="Output as JSONL (one object per line)")
    p.add_argument("--chunk", type=int, default=10_000, help="Rows per progress report (default: 10000)")
    p.add_argument("--null", default="", help="Value to treat as null (default: empty string)")
    p.add_argument("--auto-type", action="store_true", help="Auto-detect int/float/bool types")
    return p.parse_args()


def auto_cast(value, null_sentinel):
    """Try to cast a string value to int, float, bool, or None."""
    if value == null_sentinel:
        return None
    low = value.lower()
    if low in ("true", "yes"):
        return True
    if low in ("false", "no"):
        return False
    try:
        return int(value)
    except ValueError:
        pass
    try:
        return float(value)
    except ValueError:
        pass
    return value


def convert(args):
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: {input_path} not found", file=sys.stderr)
        sys.exit(1)

    file_size_mb = input_path.stat().st_size / 1_048_576
    print(f"Input : {input_path}  ({file_size_mb:.1f} MB)")
    print(f"Output: {output_path}")
    print(f"Mode  : {'JSONL' if args.lines else 'JSON array'}"
          + (" · pretty" if args.pretty and not args.lines else "")
          + (" · auto-type" if args.auto_type else ""))
    print()

    start = time.time()
    count = 0

    with (
        open(input_path, encoding=args.encoding, newline="") as fin,
        open(output_path, "w", encoding="utf-8") as fout,
    ):
        reader = csv.DictReader(fin, delimiter=args.delimiter)

        if args.lines:
            # JSONL: one JSON object per line — easiest to stream
            for row in reader:
                if args.auto_type:
                    row = {k: auto_cast(v, args.null) for k, v in row.items()}
                fout.write(json.dumps(row, ensure_ascii=False) + "\n")
                count += 1
                if count % args.chunk == 0:
                    elapsed = time.time() - start
                    rate = count / elapsed if elapsed else 0
                    print(f"  {count:>10,} rows  ({rate:,.0f} rows/s)", flush=True)
        else:
            # JSON array — write opening bracket, stream rows, close bracket
            indent = 2 if args.pretty else None
            sep = ",\n" if args.pretty else ","
            fout.write("[\n" if args.pretty else "[")

            first = True
            for row in reader:
                if args.auto_type:
                    row = {k: auto_cast(v, args.null) for k, v in row.items()}
                serialized = json.dumps(row, indent=indent, ensure_ascii=False)
                if args.pretty:
                    # indent each object by 2 spaces inside the array
                    serialized = "  " + serialized.replace("\n", "\n  ")
                if not first:
                    fout.write(sep)
                fout.write(serialized)
                first = False
                count += 1
                if count % args.chunk == 0:
                    elapsed = time.time() - start
                    rate = count / elapsed if elapsed else 0
                    print(f"  {count:>10,} rows  ({rate:,.0f} rows/s)", flush=True)

            fout.write("\n]" if args.pretty else "]")

    elapsed = time.time() - start
    out_mb = output_path.stat().st_size / 1_048_576
    print()
    print(f"Done: {count:,} rows in {elapsed:.1f}s  →  {out_mb:.1f} MB output")


if __name__ == "__main__":
    convert(parse_args())
