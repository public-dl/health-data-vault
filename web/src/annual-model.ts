import type {Payload,IndicatorGroup,Observation} from './model';
import {numerator} from './group-model';
import {tableText} from './model';
export function annualTableText(rows:Observation[],group:IndicatorGroup):string {
 const lines=rows.map(r=>tableText([r],`${group.name}：${group.categories.find(c=>c.indicator_id===r.indicator_id)?.label??r.indicator_id}`).split('\n'));
 return [lines[0]?.[0]+'\t年度間比較',...lines.map(line=>line[1]+'\tpending（各年度を個別表示）')].join('\n');
}
/** Separate capability: never promote pending records to reuse temporal views. */
export function annualComposition(data:Payload,group:IndicatorGroup,code:string,year:number) {
 if(data.schema_version!=='annual-1')return null;
 const proof=data.composition_validation?.find(p=>p.group_id===group.group_id&&p.geography_code===code&&p.observation_fiscal_year===year);
 if(!proof||proof.validation_status!=='passed'||proof.difference!==0||proof.denominator_value<=0||proof.definition_version!==group.definition_version)return null;
 const rows:Observation[]=[];
 for(const cat of group.categories){
  const matches=data.records.filter(r=>r.indicator_id===cat.indicator_id&&r.geography_code===code&&r.observation_fiscal_year===year);
  if(matches.length!==1)return null;
  const r=matches[0],rate=r.derivation??r.derived_rate;
  if(!r.annual_display_allowed||r.comparison_allowed||r.comparability_status!=='pending'||r.validation_status!=='passed'||!rate?.annual_display_allowed||rate.comparison_allowed||rate.comparability_status!=='pending'||rate.validation_status!=='passed'||rate.denominator_record_id!==proof.denominator_record_id||rate.denominator_value!==proof.denominator_value||!proof.category_record_ids.includes(rate.numerator_record_id)||!Number.isFinite(rate.value)||rate.numerator_value<0||Math.abs(rate.value-rate.numerator_value/rate.denominator_value*100)>1e-9)return null;
  rows.push(r);
 }
 if(rows.length!==proof.category_record_ids.length||rows.reduce((s,r)=>s+(numerator(r)??NaN),0)!==proof.denominator_value)return null;
 return {rows,denominator:proof.denominator_value,proof};
}
