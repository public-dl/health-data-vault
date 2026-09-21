"""One audited W-column count; no individual AST/ALT/GGT counts or composition."""
from .lipids import audit_formula_evidence as audit_source_formulas

MEMBERS = [('liver', '肝機能', 'W', '#629fce')]
OFFICIAL = {'liver': (25, 26)}
DEFINITION = dict(reference='docs/liver_v1.md', version='liver-recipient-rate-v1')
RATE_LABEL = '特定健診受診者数に占める割合（％）'


def indicator_metadata():
    return [dict(indicator_id='liver', name='肝機能', group='liver', theme_id='liver',
        theme_label='肝機能', unit='人', visualization_type='single_judgment_rate',
        overview_label='判定状況をひと目で見る', count_label='報告人数',
        recipient_label='特定健診受診者数', color=MEMBERS[0][3], map_breaks=[100,500,2000,10000],
        intervals={'2021_2022':'pending','2022_2023':'pending'},
        capabilities=dict(recipient_rate=True, composition=False), source_column='W',
        rate=dict(label=RATE_LABEL, map_breaks=[], intervals={'2021_2022':'pending','2022_2023':'pending'}),
        rate_definition=dict(DEFINITION), map_scale=dict(mode='continuous',min=18,max=32),chart_max=40)]


def audit_formula_evidence(root, analysis):
    return audit_source_formulas(root, analysis, MEMBERS, OFFICIAL)
