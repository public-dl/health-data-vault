"""Versioned publication projection. Historical evidence is not a permission."""
import copy
from .reported_annual import require

VERSION = 'reported-count-publication-v1'
SCHEMA = 'reported-annual-6'
IDS = {'bp_guidance','bp_referral','lipid_people','triglycerides','hdl','ldl',
       'total_cholesterol','liver','glucose_people','urine_glucose','fasting_glucose',
       'random_glucose','hba1c','renal_urinary_people','urine_protein','urine_blood','creatinine'}
NOTE = ('原表の「判定区分（保健指導以上を再掲）」に掲載された報告人数です。'
        '地域比較に用いる割合の分母を再確認しているため、人数のみを公開しています。'
        '各項目は相互排他的な構成ではありません。合計・残差・地域差は生成しません。'
        '「実人員」は原表名称で、具体的な重複処理は未確認です。年度間比較はpendingです。')
CAPABILITIES = dict(recipient_rate=False, composition=False, map_mode='none', temporal_rate=False,
                    distribution=False, annual_reference_lines=False, selected_indicator_charts=True,
                    count_only=True, can_compare_regions=False)


def project(verified):
    """Apply only after the original source/evidence/ratio validators succeeded."""
    require(verified['schema_version']=='reported-annual-5' and 'renal_contract' in verified, 'incomplete count publication input')
    result=copy.deepcopy(verified)
    result['schema_version']=SCHEMA
    result['publication_policy']=VERSION
    result['audit_evidence']=dict(previous_rate_policy=result.pop('rate_policy'),
        previous_renal_contract=result.pop('renal_contract'), indicators=copy.deepcopy(result['indicators']))
    for i in result['indicators']:
        for key in ('rate','rate_contract','rate_origin','value_origin','official_formula_confirmed','rate_definition','map_scale','chart_max'):
            i.pop(key,None)
        i.update(capabilities=dict(CAPABILITIES), visualization_type='reported_count', map_breaks=[],
                 public_capability='rate_disabled_pending_denominator_review',
                 description=NOTE,source_notice=NOTE,set_notice=NOTE,data_notes=NOTE)
    for r in result['records']:
        r.pop('derived_rate',None)
        r['regional_difference_allowed']=False
        r['display_contract']=SCHEMA
    names={i['indicator_id']:i['name'] for i in result['indicators']}
    result['insights']=[dict(indicator_id=r['indicator_id'],geography_code=r['geography_code'],
        observation_fiscal_year=r['observation_fiscal_year'],measure='count',generator=VERSION,
        text=f"{r['observation_fiscal_year']}年度の{r['geography_name']}：{names[r['indicator_id']]}の報告人数は{r['value']:,}人です。") for r in result['records']]
    result['warnings']=[NOTE]
    return result


def validate(payload, verified=None):
    require(payload['schema_version']==SCHEMA and payload['publication_policy']==VERSION, 'unknown publication policy')
    require(len(payload['records'])==1581 and {i['indicator_id'] for i in payload['indicators']}==IDS, 'count publication coverage')
    for r in payload['records']:
        require(not any(k in r for k in ('derived_rate','derivation','rate','percentage','recipient_percentage')), 'forbidden public rate field')
        require(r.get('regional_difference_allowed') is False, 'forbidden regional difference')
    for i in payload['indicators']:
        require(not any(k in i for k in ('rate','rate_contract','rate_origin','map_scale','chart_max')), 'forbidden public rate metadata')
        require(i['capabilities']==CAPABILITIES, 'publication capabilities mismatch')
    # Exact projection also verifies every original count, zero, provenance,
    # comparability field and retained evidence, not merely optional rate fields.
    if verified is not None:
        require(payload==project(verified), 'count publication/source/evidence mismatch')
    return True
