import type {Payload,Observation} from './model';
export const examinationContract='detailed-examination-rates-v1';
export const examinationSpecs=[{id:'anemia',test:'anemia_tests',numerator:'AG',denominator:'AJ',maximum:25},{id:'ecg',test:'ecg_tests',numerator:'AH',denominator:'AK',maximum:60},{id:'fundus',test:'fundus_tests',numerator:'AI',denominator:'AL',maximum:20}];
export const otherExaminationSpecs=[{id:'uric_acid',test:'uric_acid_tests',numerator:'AM',denominator:'AO',maximum:20},{id:'total_protein',test:'total_protein_tests',numerator:'AN',denominator:'AP',maximum:20}];
export const examinationLabel='実施件数に対する保健指導以上の判定人数の割合';
export const examinationNotice='判定区分（保健指導以上を再掲）の人数 ÷ 同年度・同地域・同じ検査の実施件数 ×100。検査対象の選び方・対象者構成は地域により異なります。住民全体の有病率や地域の優劣を示しません。';
export const examinationTemporalNotice='年度間の比較に制限があるため、点のみで表示し、線で結んでいません。各年度の値は独立した実績値で、増減・トレンドの評価は行いません。心電図の2022→2023年度は判定基準変更により比較不可です。';
export function validateExaminationPayload(data:Payload){
 const other=data.schema_version==='other-examination-1',specs=other?otherExaminationSpecs:examinationSpecs,contract=other?'other-examination-rates-v1':examinationContract;
 const fail=()=>{throw new Error('詳細健診の分子・実施件数・割合の対応を確認できません');};
 if(!['detailed-examination-1','other-examination-1'].includes(data.schema_version)||data.indicators.length!==specs.length||specs.some(s=>!data.indicators.some(i=>i.indicator_id===s.id&&i.examination_contract===contract)))fail();
 for(const spec of specs){const i=data.indicators.find(i=>i.indicator_id===spec.id)!;if(i.map_scale?.min!==0||i.map_scale?.max!==spec.maximum||i.capabilities?.recipient_rate||i.capabilities?.composition)fail();}
 const denominators=new Map((data.denominator_records??[]).map(d=>[d.record_id,d]));
 const keys=new Set<string>();
 for(const r of data.records){
  const spec=specs.find(s=>s.id===r.indicator_id),rate=r.examination_rate,d=denominators.get(r.denominator_record_id??'');
  if(!spec||!rate||!d)fail();
  if(!data.years.includes(r.observation_fiscal_year)||!data.geographies.some(g=>g.code===r.geography_code))fail();
  if(r.unit!=='人'||d!.unit!=='件'||d!.indicator_id!==spec!.test||r.comparison_allowed||d!.comparison_allowed||r.derived_rate||r.derivation)fail();
  for(const field of ['geography_code','observation_fiscal_year','publication_fiscal_year','source_sha256','source_sheet','population_scope'] as const)if(r[field]!==d![field])fail();
  const row=r.source_cell.replace(/^[A-Z]+/,'');if(r.source_cell!==spec!.numerator+row||d!.source_cell!==spec!.denominator+row)fail();
  if(rate!.contract!==contract||rate!.denominator_kind!=='examination_count'||rate!.comparison_allowed||rate!.validation_status!=='passed'||rate!.numerator_unit!=='人'||rate!.denominator_unit!=='件'||rate!.unit!=='%'
   ||rate!.numerator_value!==r.value||rate!.denominator_value!==d!.value||rate!.numerator_record_id!==r.record_id||rate!.denominator_record_id!==d!.record_id||rate!.numerator_cell!==r.source_cell||rate!.denominator_cell!==d!.source_cell||rate!.source_sha256!==r.source_sha256)fail();
  for(const v of [r,d!])if(v.value!==null&&(!Number.isInteger(v.value)||v.value<0))fail();
  const state=r.value==null||d!.value==null?'missing':d!.value===0?'zero_denominator':'valid';
  if(rate!.state!==state||r.value!=null&&d!.value!=null&&r.value>d!.value)fail();
  if(state==='valid'){if(rate!.value==null||!Number.isFinite(rate!.value)||rate!.value>spec!.maximum||Math.abs(rate!.value-r.value!/d!.value!*100)>1e-10)fail();}
  else if(rate!.value!==null)fail();
  const key=[r.indicator_id,r.geography_code,r.observation_fiscal_year].join(':');if(keys.has(key))fail();keys.add(key);
 }
 if(data.records.length!==data.geographies.length*data.years.length*specs.length||denominators.size!==data.records.length)fail();
 return true;
}
export function examinationRateText(r:Observation|undefined){
 const rate=r?.examination_rate;
 return !rate||rate.state==='missing'?'欠損（原表空欄）':rate.state==='zero_denominator'?'算出不可（実施件数0）':rate.value!.toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1})+'％';
}
export const examinationCountText=(value:number|null|undefined,unit:string)=>value==null?'欠損（原表空欄）':value.toLocaleString('ja-JP')+unit;
export function examinationCsv(rows:Observation[],release=''){
 const header=['indicator','region','actual_year','publication_year','judgment_people','judgment_unit','examination_count','examination_unit','percentage','percentage_state','numerator_cell','denominator_cell','sheet','source_url','source_sha256','comparability','comparison_allowed','formula','rate_contract','source_definition_version','release_id'];
 const values=rows.map(r=>{const q=r.examination_rate!;return [r.indicator_id,r.geography_name,r.observation_fiscal_year,r.publication_fiscal_year,r.value,'人',q.denominator_value,'件',q.value,q.state,r.source_cell,q.denominator_cell,r.source_sheet,r.source_url,r.source_sha256,r.comparability_status,false,q.formula,q.contract,r.definition_version,release]});
 const escape=(v:unknown)=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';};
 return '\ufeff'+[header,...values].map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
}
