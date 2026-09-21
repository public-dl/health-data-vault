"""Presentation metadata only; does not touch observations or rate validation."""
import json
from pathlib import Path

CONFIG = Path(__file__).with_name('public_config')/'terminology.json'

def configuration():
    return json.loads(CONFIG.read_text(encoding='utf-8'))

def apply_terminology(payload, version, config=None):
    config=configuration() if config is None else config
    terms=config['versions'][version]
    payload['reported_semantics_version']=version
    for i in payload['indicators']:
        spec=config['indicators'].get(i['indicator_id'])
        if spec is None:
            # Blood pressure preserves its concrete category and public name.
            if i['indicator_id'] in ('bp_guidance','bp_referral'):
                i['source_label']=i['name'].split('：')[-1]
                i['source_hierarchy']=[terms['source_parent'],'血圧',i['source_label']]
            continue
        args=dict(spec,indicatorLabel=spec['source_label'])
        real=spec.get('real_people',False)
        full=terms['real_people_template' if real else 'full_template'].format(**args)
        short=terms['real_people_short_template' if real else 'short_template'].format(**args)
        notes=[terms['common_note'],terms['section_note_template'].format(**args),terms['noncomposition_note']]
        notes.append(terms['rate_note'] if i.get('rate') else terms['count_only_note'])
        if spec.get('liver'):notes.append(terms['liver_note'])
        if real:notes.append(terms['real_people_note'])
        if spec.get('hba1c'):notes.append(terms['hba1c_note'])
        note=''.join(notes)
        i.update(source_label=spec['source_label'],source_hierarchy=([terms['source_parent'],spec['source_label']] if spec.get('liver') else [terms['source_parent'],spec['sourceSection'],spec['source_label']]),
                 semantic_key=terms['semantic_key'],terminology_version=version,public_label=full,short_label=short,
                 name=full,description=note,source_notice=note,set_notice=note)
    # Existing generated sentences reference the central public name without touching values.
    names={i['indicator_id']:i for i in payload['indicators'] if i.get('semantic_key')}
    for item in payload['insights']:
        i=names.get(item['indicator_id'])
        if i:
            r=next(r for r in payload['records'] if r['indicator_id']==item['indicator_id'] and r['geography_code']==item['geography_code'] and r['observation_fiscal_year']==item['observation_fiscal_year'])
            geo=next(g['name'] for g in payload['geographies'] if g['code']==item['geography_code'])
            value=f"{r['derived_rate']['value']:.1f}%（{r['value']:,}人）" if item['measure']=='rate' else f"{r['value']:,}人"
            item['text']=f"{item['observation_fiscal_year']}年度の{geo}：{i['public_label']}。"+(i['rate']['label']+' ' if item['measure']=='rate' else '')+value+'。'
    return payload
