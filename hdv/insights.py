"""Deterministic facts and explanatory text. No model inference or medical claims."""


def explain(records, name, unit):
    numeric = [r for r in records if r['value_state'] in ('numeric', 'zero') and r['comparison_allowed']]
    numeric.sort(key=lambda r: r['observation_fiscal_year'])
    if not numeric:
        return dict(text='比較可能な数値がありません。欠損を0として扱いません。', facts=[])
    last = numeric[-1]
    formatted = f"{last['value']:,.1f}" if unit == '%' else f"{last['value']:,}"
    text = f"{last['observation_fiscal_year']}年度の{name}は{formatted}{unit}です。"
    if unit == '%':
        text += f"報告人数{last['numerator_value']:,}人／受診者数{last['denominator_value']:,}人から算出しています。"
    facts = [dict(kind='observed', record_id=last['record_id'], value=last['value'])]
    years = [r['observation_fiscal_year'] for r in numeric]
    # Do not span gaps or prohibited comparison intervals.
    contiguous = len(numeric) == len(records) and all(b == a+1 for a, b in zip(years, years[1:]))
    compatible = all(last['comparability_intervals'].get(f'{a}_{b}') == 'compatible' for a,b in zip(years,years[1:]))
    if len(numeric) > 1 and contiguous and compatible:
        first = numeric[0]
        delta = last['value'] - first['value']
        difference = f'{delta:+,.1f}ポイント' if unit == '%' else f'{delta:+,}{unit}'
        text += f"{first['observation_fiscal_year']}年度との差は{difference}です。"
        facts.append(dict(kind='difference', inputs=[last['record_id'], first['record_id']], operation='subtract', value=delta))
    text += ('受診者の構成割合であり、年齢・性別構成は調整していません。' if unit == '%' else '報告人数の変化です。')
    text += '健康状態の改善・悪化や施策の効果を示すものではありません。'
    return dict(text=text, facts=facts, generator='verified-template-v1')
