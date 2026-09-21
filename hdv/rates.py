"""Audited composition percentages, separate from reported-count comparability."""
import math

FORMULA = 'numerator / denominator * 100'


def usable(r):
    return (r.get('included') and r.get('selection_status') == 'included'
            and r.get('validation_status') == 'passed' and r.get('unit') == '人'
            and r.get('value_state') in ('numeric', 'zero')
            and isinstance(r.get('value'), (int, float)) and not isinstance(r['value'], bool)
            and math.isfinite(r['value']) and r['value'] >= 0)


def derive(numerator, group, policy):
    """Reject invalid denominators/partitions, never substitute the category sum."""
    required = [policy['denominator_indicator_id'], *policy['components']]
    if len(set(required)) != len(required) or numerator['indicator_id'] not in policy['components']:
        raise ValueError('Invalid percentage partition')
    if policy['comparability_status'] != 'compatible' or numerator['observation_fiscal_year'] not in policy['observation_years']:
        raise ValueError('Unaudited percentage year or comparability')
    if any(k not in group or not usable(group[k]) for k in required):
        raise ValueError('Missing/unvalidated percentage input')
    for k in required:
        other = group[k]
        for field in ('observation_fiscal_year', 'publication_fiscal_year', 'geography_name', 'geography_level',
                      'population_scope', 'source_sha256', 'source_sheet', 'source_row'):
            if other.get(field) != numerator.get(field):
                raise ValueError('Percentage input mismatch: '+field)
        if other['population_scope'] != policy['population_scope']:
            raise ValueError('Unaudited population')
    denominator = group[policy['denominator_indicator_id']]
    n, d = numerator['value'], denominator['value']
    if d <= 0 or sum(group[k]['value'] for k in policy['components']) != d or not 0 <= n <= d:
        raise ValueError('Zero denominator or category total mismatch')
    value = n / d * 100
    return dict(value=value, value_state='zero' if n == 0 else 'numeric', unit='%', statistic='recipient_percentage',
                numerator_record_id=numerator['record_id'], numerator_value=n,
                denominator_record_id=denominator['record_id'], denominator_value=d,
                formula=FORMULA, definition_version=policy['definition_version'],
                definition_reference=policy['audit_reference'], comparability_status=policy['comparability_status'],
                comparability_intervals=dict(policy['intervals']), comparison_allowed=True, validation_status='passed',
                category_sum=d, category_record_ids=[group[k]['record_id'] for k in policy['components']])


def attach_rates(rows, all_records, settings):
    policies = {s['indicator_id']: s['rate'] for s in settings if s.get('rate')}
    groups = {}
    for r in all_records:
        if r.get('included') and r['geography_level'] in ('municipality', 'prefecture_total'):
            key = (r['observation_fiscal_year'], r['geography_level'], r['geography_name'])
            group = groups.setdefault(key, {})
            if r['indicator_id'] in group:
                raise ValueError('Duplicate percentage input')
            group[r['indicator_id']] = dict(r)
    from .publisher import encoded
    from .common import digest
    denominators = {}
    for r in rows:
        policy = policies.get(r['indicator_id'])
        if not policy:
            continue
        key = (r['observation_fiscal_year'], r['geography_level'], r['geography_name'])
        group = groups[key]
        for item in group.values():
            item['record_id'] = digest(encoded([item['source_sha256'], item['source_sheet'], item['source_cell']]))[:24]
        d = group[policy['denominator_indicator_id']]
        d['geography_code'] = r['geography_code']
        r['derived_rate'] = derive(r, group, policy)
        denominators[d['record_id']] = d
    return sorted(denominators.values(), key=lambda r:(r['geography_code'], r['observation_fiscal_year']))
