"""Validate source contracts and records before enabling any comparison output."""
import copy
import math
from collections import Counter, defaultdict
from pathlib import Path

from .collector import discover
from .common import (CONFIG, checked_path, digest, issue, now, read_json, read_jsonl,
                     write_json, write_jsonl)
from .normalizer import MUNICIPAL_SCOPE, extract

REQUIRED = {"publication_fiscal_year", "observation_fiscal_year", "geography_name", "geography_level",
            "indicator_id", "original_label", "value", "unit", "population_scope", "source_url",
            "source_sheet", "source_cell", "comparability_status", "definition_version", "validation_status",
            "value_state", "included", "source_sha256", "selection_status"}
NUMERIC = {"numeric", "zero"}
INVALID = {"excel_error", "formula_cache_missing", "unexpected_text", "unexpected_boolean", "invalid_number"}


def record_key(record):
    return tuple(record.get(k) for k in ("observation_fiscal_year", "indicator_id", "geography_level",
                                         "geography_name", "population_scope"))


def validate_records(records, initial_issues=(), reference=None):
    records = copy.deepcopy(records)
    issues = list(initial_issues)
    registry = {i["indicator_id"]: i for i in read_json(CONFIG / "indicators.json")}
    reference = reference or read_json(CONFIG / "province_reference.json")
    seen = set()
    groups = defaultdict(dict)
    for r in records:
        if REQUIRED - r.keys():
            issues.append(issue("missing_fields", fields=sorted(REQUIRED-r.keys())))
            continue
        year, indicator = r["observation_fiscal_year"], registry.get(r["indicator_id"])
        context = dict(year=year, sheet=r["source_sheet"], cell=r["source_cell"])
        if year not in (2021, 2022, 2023) or r["publication_fiscal_year"] != year + 1:
            issues.append(issue("unexpected_year", **context))
        if not indicator:
            issues.append(issue("unknown_indicator", **context))
        elif r["unit"] != indicator["unit"]:
            issues.append(issue("unit_changed", **context))
        expected_status = indicator["comparability_status"] if indicator else None
        if r["population_scope"] != MUNICIPAL_SCOPE:
            expected_status = "pending"
        if r["comparability_status"] != expected_status:
            issues.append(issue("comparability_changed", **context))
        if r["definition_version"] != f"niigata-tokutei-{year}-v0.1":
            issues.append(issue("definition_changed", **context))
        state, value = r["value_state"], r["value"]
        if state in INVALID:
            issues.append(issue(state, **context))
        elif state not in NUMERIC:
            issues.append(issue("non_numeric_preserved", "warning", value_state=state, **context))
            if value is not None:
                issues.append(issue("non_numeric_has_value", **context))
        elif isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or value < 0 or int(value) != value:
            issues.append(issue("invalid_count", **context))
        if r["included"]:
            key = record_key(r)
            if key in seen:
                issues.append(issue("duplicate_key", key=key, **context))
            seen.add(key)
            groups[(year, r["geography_level"], r["geography_name"])][r["indicator_id"]] = r
    regression = []
    for year, reference_year in reference["years"].items():
        province = [r for r in records if r.get("observation_fiscal_year") == int(year)
                    and r.get("geography_level") == "prefecture_total" and r.get("included")]
        for cell, expected in reference_year["cells"].items():
            matches = [r for r in province if r["source_cell"] == cell]
            ok = len(matches) == 1 and matches[0]["value"] == expected and matches[0]["value_state"] in NUMERIC
            regression.append(dict(year=int(year), cell=cell, expected=expected,
                                   actual=[r["value"] for r in matches], passed=ok))
            if not ok:
                issues.append(issue("province_regression", year=int(year), cell=cell, expected=expected))
    equations = [(["metabo_noncase", "metabo_preliminary", "metabo_case", "metabo_indeterminate"], "metabo_total"),
                 (["physician_normal", "physician_guidance", "physician_referral"], "physician_total"),
                 (["guidance_active", "guidance_motivational", "guidance_none", "guidance_indeterminate"], "recipients"),
                 (["metabo_total"], "recipients"), (["physician_total"], "recipients")]
    for key, group in groups.items():
        for parts, total in equations:
            relevant = [group.get(id) for id in parts + [total]]
            if all(r and r["value_state"] in NUMERIC for r in relevant):
                if sum(group[id]["value"] for id in parts) != group[total]["value"]:
                    issues.append(issue("category_total_mismatch", geography=key, parts=parts, total=total))
            else:
                issues.append(issue("category_total_not_testable", "warning", geography=key, total=total))
    # Municipalities alone form one partition; never sum municipal + subtotal records.
    for year in (2021, 2022, 2023):
        for id in registry:
            members = [r for r in records if r.get("included") and r.get("observation_fiscal_year") == year
                       and r.get("geography_level") == "municipality" and r.get("indicator_id") == id]
            target = groups.get((year, "prefecture_total", "県計"), {}).get(id)
            if len(members) != 30:
                issues.append(issue("municipality_count", year=year, indicator=id, count=len(members)))
            elif target and target["value_state"] in NUMERIC and all(r["value_state"] in NUMERIC for r in members):
                if sum(r["value"] for r in members) != target["value"]:
                    issues.append(issue("municipal_total_mismatch", year=year, indicator=id))
            else:
                issues.append(issue("municipal_total_not_testable", "warning", year=year, indicator=id))
    errors = sum(i["severity"] == "error" for i in issues)
    for r in records:
        r["validation_status"] = "failed" if errors else ("excluded" if not r.get("included") else
                                                            "passed" if r.get("value_state") in NUMERIC else "warning")
        r["comparison_allowed"] = bool(not errors and r.get("included") and
                                        r.get("comparability_status") == "compatible" and
                                        r.get("validation_status") == "passed")
    report = dict(created_at=now(), status="failed" if errors else "passed_with_warnings" if issues else "passed",
                  errors=errors, warnings=sum(i["severity"] == "warning" for i in issues), issues=issues,
                  province_regression=dict(checked=len(regression), passed=sum(r["passed"] for r in regression), cells=regression),
                  counts=dict(records=len(records), included=sum(r.get("included", False) for r in records),
                              comparison_allowed=sum(r["comparison_allowed"] for r in records),
                              by_comparability=dict(Counter(r.get("comparability_status") for r in records)),
                              included_by_comparability=dict(Counter(r.get("comparability_status") for r in records if r.get("included"))),
                              by_selection=dict(Counter(r.get("selection_status") for r in records)),
                              by_value_state=dict(Counter(r.get("value_state") for r in records))))
    return records, report


def validate(root, output=None):
    root = Path(root)
    output = Path(output) if output else checked_path(root, "processed/" + read_json(root / "processed/latest.json")["run_id"])
    # A failed revalidation must never leave a previously approved comparison export.
    write_jsonl(output / "comparable_records.jsonl", [])
    write_json(output / "validation_report.json", {"status": "incomplete", "errors": 1,
                                                "reason": "Validation started; see CLI error if not completed"})
    manifest = read_json(output / "collection.json")
    contracts, indicators = read_json(CONFIG / "contracts.json"), read_json(CONFIG / "indicators.json")
    expected, issues = [], []
    years = [s["observation_fiscal_year"] for s in manifest["sources"]]
    if sorted(years) != [2021, 2022, 2023]:
        issues.append(issue("collection_years_changed", years=years))
    run = read_json(output / "run.json")
    if run["configuration_sha256"] != {p.name: digest(p.read_bytes()) for p in CONFIG.glob("*.json")}:
        issues.append(issue("configuration_changed_since_normalization"))
    for source in manifest["sources"]:
        year = str(source["observation_fiscal_year"])
        if year not in contracts:
            issues.append(issue("unexpected_year", year=year)); continue
        contract = contracts[year]
        path = checked_path(root, source["raw_path"])
        if digest(path.read_bytes()) != source["sha256"]:
            issues.append(issue("raw_checksum_mismatch", year=year)); continue
        page = root / "raw/objects" / (source["page_sha256"] + ".html")
        if (digest(page.read_bytes()) != source["page_sha256"] or source["annual_page_url"] != contract["page_url"]
            or discover(page.read_text(encoding="utf-8-sig"), contract["page_url"], contract["filename"]) != source["source_url"]):
            issues.append(issue("source_page_provenance_changed", year=year))
        result = extract(path, source, contract, indicators)
        expected.extend(result[0]); issues.extend(result[2])
        if source["content_changed"]:
            issues.append(issue("source_content_changed", "warning", year=year, previous=source["previous_sha256"], current=source["sha256"]))
    records = read_jsonl(output / "records.jsonl")
    if records != expected:
        issues.append(issue("normalized_records_differ_from_raw"))
    records, report = validate_records(records, issues)
    write_jsonl(output / "validated_records.jsonl", records)
    write_jsonl(output / "annual_records.jsonl", [r for r in records if r.get("included")])
    write_jsonl(output / "comparable_records.jsonl", [r for r in records if r["comparison_allowed"]])
    write_json(output / "validation_report.json", report)
    return report


def comparable_series(records):
    """Public consumption guard: reject pending/incompatible, mixed geography/indicator, or unvalidated inputs."""
    if not records:
        return []
    registry = {i["indicator_id"]: i for i in read_json(CONFIG / "indicators.json")}
    dimensions = {(r["indicator_id"], r["geography_level"], r["geography_name"], r["population_scope"],
                   r["unit"], r["comparison_group"]) for r in records}
    years = [r["observation_fiscal_year"] for r in records]
    if len(dimensions) != 1 or len(years) != len(set(years)) or not set(years) <= {2021, 2022, 2023}:
        raise ValueError("Mixed dimensions, duplicate years or unsupported comparison period")
    for r in records:
        indicator = registry.get(r["indicator_id"])
        if (not indicator or indicator["comparability_status"] != "compatible" or
            r["comparability_status"] != "compatible" or not r["comparison_allowed"] or
            r["validation_status"] != "passed" or not r["included"] or r["value_state"] not in NUMERIC or
            r["population_scope"] != MUNICIPAL_SCOPE):
            raise ValueError("Comparison prohibited: pending, incompatible, excluded or unvalidated data")
    return sorted(records, key=lambda r: r["observation_fiscal_year"])
