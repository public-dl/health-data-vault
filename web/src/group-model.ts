import type {Payload,IndicatorGroup,Observation} from './model';
import {csv,formatValue} from './model';

export const numerator=(r:Observation)=>r.derivation?.numerator_value??r.value;
export function composition(data:Payload,group:IndicatorGroup,code:string,year:number) {
  const proof=data.composition_validation?.find(e=>e.group_id===group.group_id&&e.geography_code===code&&e.observation_fiscal_year===year);
  if(!proof||proof.validation_status!=='passed'||proof.difference!==0||proof.denominator_value<=0||proof.definition_version!==group.definition_version)return null;
  const rows:Observation[]=[];
  for(const cat of group.categories) {
    const matches=data.records.filter(r=>r.indicator_id===cat.indicator_id&&r.geography_code===code&&r.observation_fiscal_year===year);
    if(matches.length!==1)return null;
    const r=matches[0],rate=r.derivation??r.derived_rate;
    if(r.value==null||!Number.isFinite(r.value)||r.value<0||r.validation_status!=='passed'||!r.comparison_allowed||!rate||rate.validation_status!=='passed'||!rate.comparison_allowed||rate.denominator_record_id!==proof.denominator_record_id||rate.denominator_value!==proof.denominator_value||rate.numerator_value<0||rate.numerator_value>proof.denominator_value||!proof.category_record_ids.includes(rate.numerator_record_id))return null;
    rows.push(r);
  }
  if(rows.length!==proof.category_record_ids.length||rows.reduce((s,r)=>s+numerator(r)!,0)!==proof.denominator_value)return null;
  return {rows,denominator:proof.denominator_value,proof};
}
export function groupRows(data:Payload,group:IndicatorGroup,codes:string[]) {
  return codes.flatMap(code=>data.years.flatMap(year=>composition(data,group,code,year)?.rows??[]));
}
export function groupCsv(data:Payload,group:IndicatorGroup,rows:Observation[]) {
  const category=(r:Observation)=>group.categories.find(c=>c.indicator_id===r.indicator_id)!;
  const exportRows=rows.map(r=>({...r,derivation:r.derivation??r.derived_rate,denominator:r.denominator??data.denominator_records?.find(d=>d.record_id===r.derived_rate?.denominator_record_id)}));
  return csv(exportRows,r=>data.indicators.find(i=>i.indicator_id===r.indicator_id)!.name,{headers:['group_id','category_id','category_order'],values:r=>[group.group_id,category(r).category_id,category(r).order]});
}
export function groupTableText(data:Payload,group:IndicatorGroup,code:string) {
  const name=data.geographies.find(g=>g.code===code)!.name;
  return [`地域\t実績年度\t${group.categories.map(c=>c.label).join('\t')}\t受診者数（人）\t公表年度\t検証・比較`,...data.years.map(year=>{
    const part=composition(data,group,code,year);
    return [name,year,...group.categories.map((_,i)=>part?`${formatValue(part.rows[i].value,part.rows[i].unit)}${part.rows[i].unit}（${numerator(part.rows[i])}人）`:'表示不可'),part?.denominator??'',part?.rows[0].publication_fiscal_year??'',part?'passed / compatible':'保留'].join('\t');}),
    '各割合＝当該区分人数÷同年度・同地域の受診者数×100。表示丸めの補正なし。',
    ...groupRows(data,group,[code]).map(r=>`${r.observation_fiscal_year}\t${r.indicator_id}\t${r.source_url}\t${r.source_sheet}\t${r.source_cell}\t${r.source_sha256}`)].join('\n');
}
// Never normalize by the visible category sum. Values are already audited.
export function stackSegments(rows:Observation[]) {
  let start=0;
  return rows.map(r=>{if(r.value==null||!Number.isFinite(r.value)||r.value<0)throw new Error('Invalid stack value');const segment={row:r,start,end:start+r.value};start=segment.end;return segment;});
}

export function tableYears(years:number[],selectedYear:number):number[] {
 return [...new Set(years)].filter(y=>y<=selectedYear&&y>=selectedYear-4).sort((a,b)=>a-b);
}
export function transposedGroupTableText(data:Payload,group:IndicatorGroup,code:string,years:number[]) {
 const parts=years.map(year=>composition(data,group,code,year));
 const name=data.geographies.find(g=>g.code===code)!.name;
 return [name+' / '+group.name,'区分\t'+years.map(y=>y+'年度').join('\t'),
  '公表年度\t'+parts.map(p=>p?.rows[0].publication_fiscal_year??'未確認').join('\t'),
  ...group.categories.map((cat,i)=>[cat.label,...parts.map(p=>p?`${formatValue(p.rows[i].value,p.rows[i].unit)}${p.rows[i].unit}（報告人数 ${numerator(p.rows[i])}人・検証済・比較可能）`:'表示不可')].join('\t')),
  '受診者数（人）\t'+parts.map(p=>p?.denominator??'未確認').join('\t'),
  '構成検証\t'+parts.map(p=>p?'人数合計一致':'保留').join('\t'),
  '各割合＝区分人数÷同年度・同地域の受診者数×100。表示丸めの補正なし。',
  ...groupRows(data,group,[code]).filter(r=>years.includes(r.observation_fiscal_year)).map(r=>`${r.observation_fiscal_year}\t${r.indicator_id}\t${r.source_url}\t${r.source_sheet}\t${r.source_cell}\t${r.source_sha256}`)
 ].join('\n');
}
