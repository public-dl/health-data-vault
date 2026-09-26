import {appUrl} from './app-url';
import type {MapScale} from './map-scale';
import {presentationIndicator} from './visual-metadata';
import type {FeatureCollection, Geometry} from 'geojson';

export type Observation = {
  source_label?:string;public_label?:string;semantic_key?:string;terminology_version?:string;
  annual_display_allowed?:boolean; regional_difference_allowed?:boolean; denominator_record_id?:string;
  derived_rate?: DerivedRate; derivation?: DerivedRate; denominator?: Observation;
  record_id:string; observation_fiscal_year:number; publication_fiscal_year:number;
  geography_code:string; geography_name:string; geography_level:string; indicator_id:string;
  value:number|null; value_state:string; unit:string; population_scope:string; original_label:string;
  comparability_status:string; comparison_allowed:boolean; validation_status:string;
  comparability_intervals:Record<string,string>; definition_version:string;
  source_url:string; annual_page_url:string; source_sheet:string; source_cell:string; source_sha256:string; retrieved_at:string;
};
export type DerivedRate = {value_origin?:string;official_formula_confirmed?:boolean;rate_origin?:string;formula_evidence?:{origin:string;rationale:string;overview_sheet?:string;rate_cell?:string;formula?:string};statistic?:string;label?:string;regional_difference_allowed?:boolean;denominator_kind?:string;annual_display_allowed?:boolean;value:number; value_state:string; unit:string; numerator_value:number; denominator_value:number; numerator_record_id:string; denominator_record_id:string; formula:string; definition_version:string; definition_reference:string; comparability_status:string; comparability_intervals:Record<string,string>; comparison_allowed:boolean; validation_status:string};
export type Indicator = {source_label?:string;source_hierarchy?:string[];public_label?:string;short_label?:string;semantic_key?:string;terminology_version?:string;chart_max?:number;data_notes?:string;capabilities?:{recipient_rate:boolean;composition:boolean;map_mode?:'rate'|'none';temporal_rate?:boolean;distribution?:boolean;annual_reference_lines?:boolean;selected_indicator_charts?:boolean};map_scale?:MapScale;count_label?:string;display_set_label?:string;set_notice?:string;source_notice?:string;theme_id?:string;theme_label?:string;recipient_label?:string;visualization_type?:string;overview_label?:string;color?:string;palette?:string[];indicator_id:string; name:string; group:string; description:string; unit:string; map_breaks:number[]; intervals:Record<string,string>; rate?:{label:string;map_breaks:number[];intervals:Record<string,string>}};
export type Category = {category_id:string;label:string;order:number;indicator_id:string;color:string;rate_map_breaks:number[];count_map_breaks:number[]};
export type IndicatorGroup = {group_id:string;name:string;definition_version:string;audit_reference:string;composition_rule:string;denominator_indicator_id:string;required_category_ids:string[];allowed_views:string[];categories:Category[]};
export type CompositionEvidence = {group_id:string;observation_fiscal_year:number;geography_code:string;category_record_ids:string[];denominator_record_id:string;category_sum:number;denominator_value:number;difference:number;validation_status:string;definition_version:string};
export type Geography = {code:string; name:string; level:string};
export type Payload = {
  indicator_groups?:IndicatorGroup[]; composition_validation?:CompositionEvidence[];
  schema_version:string; input_run_id:string; population_scope:string; years:number[];
  indicators:Indicator[]; geographies:Geography[]; records:Observation[]; denominator_records?:Observation[];
  map:FeatureCollection<Geometry,{code:string;name:string}> & {metadata:{attribution:string;source_url:string;annual_page_url:string;boundary_date:string;notice:string;source_sha256:string;license_url:string}};
  insights:{indicator_id:string;geography_code:string;observation_fiscal_year:number;text:string;generator:string;measure?:string}[];
  source_validation:{status:string;errors:number;warnings:number;regression:number}; warnings:string[];
};
export const format = (value:number|null|undefined) => value == null ? '欠損' : value.toLocaleString('ja-JP');
export const formatValue = (value:number|null|undefined,unit:string) => value == null ? '欠損' : unit === '%' ? value.toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1}) : format(value);
export function displayData(data:Payload, measure:'count'|'rate'):Payload {
 data={...data,indicators:data.indicators.map(presentationIndicator),records:data.records.map(r=>{const i=data.indicators.find(i=>i.indicator_id===r.indicator_id);return i?.semantic_key?{...r,source_label:i.source_label,public_label:i.public_label,semantic_key:i.semantic_key,terminology_version:i.terminology_version}:r;})};
  if(measure==='count')return data;
  const denominators=new Map((data.denominator_records??[]).map(r=>[r.record_id,r]));
  return {...data,indicators:data.indicators.map(i=>i.rate?{...i,unit:'%',map_breaks:i.rate.map_breaks,intervals:i.rate.intervals}:i),
    records:data.records.map(r=>{const d=r.derived_rate;if(!d)return ['reported-annual-4','reported-annual-5'].includes(data.schema_version)&&!data.indicators.find(i=>i.indicator_id===r.indicator_id)?.rate?r:{...r,value:null,comparison_allowed:false};
      return {...r,...d,record_id:r.record_id+':recipient_percentage',derivation:d,denominator:denominators.get(d.denominator_record_id)};})};
}
export function connect(a:Observation|undefined,b:Observation|undefined):boolean {
  return !!a && !!b && a.value != null && b.value != null && a.comparison_allowed && b.comparison_allowed
    && a.comparability_status === 'compatible' && b.comparability_status === 'compatible'
    && a.validation_status === 'passed' && b.validation_status === 'passed'
    && a.indicator_id === b.indicator_id && a.geography_code === b.geography_code && a.unit === b.unit
    && a.population_scope === b.population_scope && b.observation_fiscal_year === a.observation_fiscal_year+1
    && b.comparability_intervals[`${a.observation_fiscal_year}_${b.observation_fiscal_year}`] === 'compatible';
}
export const colors = ['#dbeafe','#a7cffe','#6aa8ed','#337bce','#124b9b'];
export const colorFor = (value:number|null|undefined, breaks:number[]) => value == null ? 'url(#missing)' : colors[breaks.filter(b=>value>=b).length];
function safeCell(v:unknown) {const s=String(v ?? ''); return /^[=+@\-\t\r]/.test(s) ? "'"+s : s;}
export function csv(rows:Observation[],name:string|((r:Observation)=>string),columns?:{headers:string[];values:(r:Observation)=>unknown[]}):string {
  const keys:(keyof Observation)[]=['observation_fiscal_year','publication_fiscal_year','geography_name','geography_code','indicator_id','source_label','public_label','semantic_key','terminology_version','value','value_state','unit','population_scope','comparability_status','validation_status','source_url','source_sheet','source_cell','source_sha256'];
  const quote=(v:unknown)=>'"'+safeCell(v).replaceAll('"','""')+'"';
  const extra=['numerator','denominator','formula','denominator_source_url','denominator_source_sheet','denominator_source_cell','denominator_source_sha256','definition_version','rate_origin','recipient_percentage'];
  return '\uFEFF'+['indicator_name,'+keys.join(',')+','+[...extra,...(columns?.headers??[])].join(','),...rows.map(r=>[typeof name==='function'?name(r):name,...keys.map(k=>r[k]),(r.derivation??r.derived_rate)?.numerator_value??r.value,(r.derivation??r.derived_rate)?.denominator_value??r.denominator?.value,(r.derivation??r.derived_rate)?.formula,r.denominator?.source_url,r.denominator?.source_sheet,r.denominator?.source_cell,r.denominator?.source_sha256,r.definition_version,(r.derivation??r.derived_rate)?.rate_origin,(r.derivation??r.derived_rate)?.value,...(columns?.values(r)??[])].map(quote).join(','))].join('\r\n');
}
export function tableText(rows:Observation[],name:string):string {
  return ['地域\t指標\t実績年度\t値\t単位\t値状態\t出典\t報告人数\t受診者数\t計算式',...rows.map(r=>[r.geography_name,name,r.observation_fiscal_year,r.value ?? '',r.unit,r.value_state,r.source_url,(r.derivation??r.derived_rate)?.numerator_value??r.value,(r.derivation??r.derived_rate)?.denominator_value??r.denominator?.value,(r.derivation??r.derived_rate)?.formula].map(safeCell).join('\t'))].join('\n');
}
export async function loadData():Promise<{payload:Payload;review:boolean;release:string;extensions?:SiteExtension}> {

  const get = async (path:string,cache:RequestCache='no-store')=>{
    const r=await fetch(appUrl(path),{cache});
    if(!r.ok)throw new Error('承認済み公開データがありません。ローカル確認は専用のプレビューURLを使用してください。');
    return r;
  };
  if(new URLSearchParams(location.search).get('review') === '1') {
    const result=await (await get('/review/data.json')).json();
    if(result.mode !== 'review') throw new Error('プレビュー形式が不正です');
    return unpack(result.payload,true,result.release_id);
  }
  const approval=await (await get('/public-data/current.json')).json();
  if(approval.status!=='approved' || !/^[a-f0-9]{64}$/.test(approval.release_id) || approval.release_id!==approval.data_sha256 || !approval.reviewer) throw new Error('公開承認を確認できません');
  const raw=await (await get(`/public-data/releases/${approval.release_id}.json`,'default')).arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==approval.data_sha256)throw new Error('公開データのハッシュが一致しません');
  const payload=JSON.parse(new TextDecoder().decode(raw));
  if(!['public-1','public-2','public-3','site-1'].includes(payload.schema_version))throw new Error('未対応の公開データ形式です');
  return unpack(payload,false,approval.release_id);
}

export type TableCell={row:number;column:number;coordinate:string;value:number|null;value_state:string;original_value:unknown;cached_value:unknown;source_data_type:string;number_format:string;formula:string|null;display_text:string;visualization:{indicator_id:string;region:string}|null};
export type PublishedTable={source:{observation_fiscal_year:number;publication_fiscal_year:number;source_url:string;annual_page_url:string;sha256:string;retrieved_at:string;original_filename:string};source_sheet:string;header_rows:number;row_count:number;column_count:number;rows:{index:number;level:string;cells:TableCell[]}[]};
export type SiteExtension={reported?:Payload;annual:Payload;published_tables:PublishedTable[]};
function unpack(value:Payload & SiteExtension & {analysis?:Payload},review:boolean,release:string){
 if(value.schema_version==='site-1'){
  if(value.analysis?.schema_version!=='public-3'||value.annual?.schema_version!=='annual-1'||!Array.isArray(value.published_tables))throw new Error('未対応の単年度表示契約');
  if(value.reported && !['reported-annual-1','reported-annual-2','reported-annual-3','reported-annual-4','reported-annual-5'].includes(value.reported.schema_version))throw new Error('未対応の報告人数契約');
  return {payload:value.analysis,extensions:{annual:value.annual,reported:value.reported,published_tables:value.published_tables},review,release};
 }
 return {payload:value,review,release};
}
