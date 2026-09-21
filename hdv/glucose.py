"""Audited reported counts. Only three source-supported recipient ratios are authorized."""
from .lipids import audit_formula_evidence as audit_source_formulas

MEMBERS = [('glucose_people', '糖代謝：実人員', 'X', '#124b9b'),
           ('urine_glucose', '尿糖', 'Y', '#54aeb4'),
           ('fasting_glucose', '空腹時血糖', 'Z', '#629fce'),
           ('random_glucose', '随時血糖', 'AA', '#8e9bad'),
           ('hba1c', 'HbA1c', 'AB', '#54b5b1')]
OFFICIAL = {'urine_glucose': (27,28), 'fasting_glucose': (21,22), 'hba1c': (23,24)}
RATE_DOMAINS = {'urine_glucose': (0,25), 'fasting_glucose': (0,40), 'hba1c': (30,90)}
DEFINITION = dict(reference='docs/glucose_v1.md', version='glucose-recipient-rate-v1')
NOTICE = '原資料の「判定区分（保健指導以上を再掲）／糖代謝異常」に掲載された人数です。各項目は排他的な構成ではありません。合計して糖代謝全体の人数や100%として扱うことはできません。実人員の具体的な集計条件は未確認です。実人員・随時血糖は人数のみを表示します。HbA1cの割合は特定健診受診者に占める報告人数の割合であり、HbA1c検査値ではありません。'


def indicator_metadata():
    result = []
    for id, label, col, color in MEMBERS:
        i = dict(indicator_id=id, name=label, group='glucose', theme_id='glucose', theme_label='糖代謝',
                 unit='人', description=NOTICE, visualization_type='single_judgment_rate' if id in OFFICIAL else 'reported_count',
                 overview_label='全項目をひと目で見る', count_label='報告人数', recipient_label='特定健診受診者数',
                 display_set_label='糖代謝：全項目', set_notice=NOTICE, source_notice=NOTICE,
                 color=color, map_breaks=[100,500,2000,10000],
                 intervals={'2021_2022':'pending','2022_2023':'pending'},
                 capabilities=dict(recipient_rate=id in OFFICIAL, composition=False), source_column=col)
        if id in OFFICIAL:
            lo, hi = RATE_DOMAINS[id]
            i.update(rate=dict(label='特定健診受診者に占める割合（%）', map_breaks=[], intervals=dict(i['intervals'])),
                     rate_definition=dict(DEFINITION), map_scale=dict(mode='continuous',min=lo,max=hi),
                     chart_max=hi)
        result.append(i)
    return result


def audit_formula_evidence(root, analysis):
    # No evidence entry, permission or derived ratio is generated for X / AA.
    members = [m for m in MEMBERS if m[0] in OFFICIAL]
    return audit_source_formulas(root, analysis, members, OFFICIAL)
