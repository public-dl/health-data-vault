"""Independent recipient-denominated ratios, never a complete composition.

Publication permission is explicit per indicator; no category sums or residuals.
The temporal public validator and composition validator are not changed.
"""
import math
from .rates import usable

VERSION = 'single-judgment-recipient-rate-v1'
FORMULA = 'numerator / denominator * 100'
LABEL = '特定健診受診者に占める割合（%）'
REFERENCE = 'docs/blood_pressure_recipient_rates.md'
# Historical immutable contracts keep their original definition references.
LEGACY_EVIDENCE_DEFINITION = dict(reference='docs/lipids_v1.md', version='lipid-recipient-rate-v1')


def require(condition, message):
    if not condition:
        raise ValueError('Single judgment rate: '+message)


def derive_single_rate(numerator, denominator, policy):
    """Both inputs must originate from the verified-records pipeline."""
    n, d = numerator, denominator
    if policy.get('contract_version'):
        require(bool(policy.get('rate_contracts')), 'missing common rate contracts')
    require(n['indicator_id'] in policy['numerator_columns'], 'unauthorized indicator')
    require(d['indicator_id'] == policy['denominator_indicator_id'], 'wrong denominator type')
    require(n['observation_fiscal_year'] in policy['years'], 'unaudited year')
    for r in (n,d):
        require(usable(r) and isinstance(r['value'], int), 'unvalidated/non-integer input')
        require(r['population_scope'] == policy['population_scope'], 'wrong population')
        require(r['record_id'] and r['source_sha256'] and r['source_sheet'], 'missing provenance')
    for key in ('observation_fiscal_year','publication_fiscal_year','geography_code','geography_name',
                'geography_level','population_scope','source_sha256','source_sheet','source_row'):
        require(n[key] == d[key], 'input mismatch: '+key)
    require(n['source_cell'] == policy['numerator_columns'][n['indicator_id']]+str(n['source_row']), 'wrong numerator cell')
    require(d['source_cell'] == policy['denominator_column']+str(d['source_row']), 'wrong recipient cell')
    require(d['value'] > 0 and 0 <= n['value'] <= d['value'], 'invalid numerator/denominator')
    require(n['comparability_status'] == 'pending' and n['comparison_allowed'] is False,
            'unexpected temporal permission')
    require(n['comparability_intervals'] == {'2021_2022':'pending','2022_2023':'pending'}, 'unexpected intervals')
    result = dict(value=n['value']/d['value']*100, value_state='zero' if n['value']==0 else 'numeric',
        unit='%', statistic='single_judgment_recipient_percentage', label=LABEL,
        numerator_value=n['value'], denominator_value=d['value'], numerator_record_id=n['record_id'],
        denominator_record_id=d['record_id'], denominator_kind='healthcheck_recipients',
        formula=FORMULA, definition_version=VERSION, definition_reference=REFERENCE,
        comparability_status='pending', comparison_allowed=False,
        comparability_intervals=dict(n['comparability_intervals']), validation_status='passed',
        annual_display_allowed=True, regional_difference_allowed=True)

    if 'rate_contracts' in policy:
        contract=policy['rate_contracts'].get(n['indicator_id'], {})
        require(contract.get('approved') is True and contract.get('composition') is False, 'unapproved rate contract')
        require(contract.get('numerator_column')==policy['numerator_columns'][n['indicator_id']]
                and contract.get('denominator_column')==policy['denominator_column']
                and contract.get('denominator_indicator_id')==policy['denominator_indicator_id'], 'contract source mismatch')
        origin=contract.get('origin')
        require(origin in ('official_formula_confirmed','hdv_derived_from_reported_count'), 'unknown contract origin')
        require(bool(contract.get('reference')) and bool(contract.get('version')), 'missing contract definition')
        result.update(rate_origin=origin, definition_reference=contract['reference'], definition_version=contract['version'])
        if origin=='official_formula_confirmed':
            item=policy.get('rate_evidence',{}).get(n['indicator_id'],{}).get(str(n['observation_fiscal_year']))
            require(bool(item) and item['origin']=='official-formula-confirmed', 'missing official formula evidence')
            require(item['source_sha256']==n['source_sha256'] and item['source_sheet']==n['source_sheet']
                    and item['numerator_column']==contract['numerator_column'] and item['denominator_column']==contract['denominator_column'], 'formula evidence source mismatch')
            result['formula_evidence']=item
        return result

    if n['indicator_id'] in policy.get('required_evidence_ids', []):
        require(n['indicator_id'] in policy.get('rate_evidence', {}), 'missing formula evidence')
    if 'rate_evidence' in policy:
        evidence = policy['rate_evidence'].get(n['indicator_id'])
        if evidence is not None:
            item = evidence[str(n['observation_fiscal_year'])]
            require(item['source_sha256'] == n['source_sha256'] and item['source_sheet'] == n['source_sheet']
                    and item['numerator_column'] == policy['numerator_columns'][n['indicator_id']]
                    and item['denominator_column'] == policy['denominator_column'], 'formula evidence source mismatch')
            require(item['origin'] in ('official-formula-confirmed', 'hdv-derived'), 'unknown rate origin')
            if 'rate_definitions' in policy:
                require(n['indicator_id'] in policy['rate_definitions'], 'missing indicator rate definition')
            definition = policy.get('rate_definitions', {}).get(n['indicator_id'], LEGACY_EVIDENCE_DEFINITION)
            require(bool(definition.get('reference')) and bool(definition.get('version')), 'missing rate definition')
            result.update(rate_origin=item['origin'], formula_evidence=item,
                          definition_reference=definition['reference'], definition_version=definition['version'])
    return result


def validate_single_rate(rate, numerator, denominator, policy):
    expected = derive_single_rate(numerator, denominator, policy)
    require(set(rate) == set(expected), 'unexpected/missing rate fields')
    require(isinstance(rate['value'], (int,float)) and not isinstance(rate['value'],bool)
            and math.isfinite(rate['value']), 'nonfinite rate')
    require(rate == expected, 'rate/permission/provenance mismatch')
    return True
