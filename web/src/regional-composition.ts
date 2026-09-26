import type {Payload,IndicatorGroup,Observation} from './model';
/** Separate single-year spatial contract. Never sets comparison_allowed. */
export function regionalComposition(data:Payload,group:IndicatorGroup,code:string,year:number){
 if(data.health_center_version!=='health-center-areas-v1'||data.geographies.find(g=>g.code===code)?.level!=='health_center_area')return null;
 const proof=data.composition_validation?.find(p=>p.group_id===group.group_id&&p.geography_code===code&&p.observation_fiscal_year===year);
 if(!proof||proof.regional_contract!==data.health_center_version||proof.validation_status!=='passed'||proof.difference!==0||proof.denominator_value<=0||proof.definition_version!==group.definition_version)return null;
 const rows:Observation[]=[];
 for(const cat of group.categories){
  const matches=data.records.filter(r=>r.indicator_id===cat.indicator_id&&r.geography_code===code&&r.observation_fiscal_year===year);
  if(matches.length!==1)return null;
  const r=matches[0],rate=r.derivation??r.derived_rate;
  if(!r.regional_composition_allowed||r.comparison_allowed||r.comparability_status!=='pending'||r.value==null||!rate||rate.regional_contract!==data.health_center_version||!rate.regional_composition_allowed||rate.comparison_allowed||rate.comparability_status!=='pending'||r.validation_status!=='passed'||rate.validation_status!=='passed'||rate.denominator_record_id!==proof.denominator_record_id||rate.denominator_value!==proof.denominator_value||!proof.category_record_ids.includes(rate.numerator_record_id)||!Number.isFinite(rate.value)||rate.numerator_value<0||Math.abs(rate.value-rate.numerator_value/rate.denominator_value*100)>1e-9)return null;
  rows.push(r);
 }
 if(rows.length!==proof.category_record_ids.length||rows.reduce((s,r)=>s+(r.derivation??r.derived_rate)!.numerator_value,0)!==proof.denominator_value)return null;
 return {rows,denominator:proof.denominator_value,proof};
}
