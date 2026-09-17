import argparse
import json
from pathlib import Path

from .collector import collect
from .normalizer import normalize
from .validator import validate


def main():
    parser = argparse.ArgumentParser(description="Health Data Vault v0.1 (R3/R4/R5 actual years)")
    parser.add_argument("command", choices=["collect", "normalize", "validate", "run"])
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--transport", choices=["urllib", "powershell"], default="urllib")
    args = parser.parse_args()
    try:
        if args.command in ("collect", "run"):
            manifest = collect(args.data_dir, args.transport)
            print(json.dumps({"collected_files": len(manifest["sources"]), "collection_id": manifest["collection_id"]}))
        if args.command in ("normalize", "run"):
            output = normalize(args.data_dir)
            print(json.dumps({"normalized_output": str(output)}, ensure_ascii=False))
        if args.command in ("validate", "run"):
            report = validate(args.data_dir)
            print(json.dumps({k: v for k, v in report.items() if k not in ("issues", "province_regression")}, ensure_ascii=False))
            return 1 if report["errors"] else 0
    except (ValueError, OSError, KeyError) as exc:
        parser.exit(1, f"Failed: {exc}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
