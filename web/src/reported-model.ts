import type {Observation} from './model';

export const isReportedSchema=(schema:string)=>schema==='reported-annual-1'||(schema==='reported-annual-2'||schema==='reported-annual-3'||schema==='reported-annual-4'||schema==='reported-annual-5'||schema==='reported-annual-6');
export const reportedRate=(r:Observation|undefined)=>r?.derivation??r?.derived_rate;

/** Explicit same-year capability; never grants temporal comparison permission. */
export function regionalRateDifference(a:Observation|undefined,b:Observation|undefined):number|null {
 const ar=reportedRate(a),br=reportedRate(b);
 if(!a||!b||!ar||!br||!a.regional_difference_allowed||!b.regional_difference_allowed
   ||!ar.regional_difference_allowed||!br.regional_difference_allowed
   ||ar.statistic!=='single_judgment_recipient_percentage'||br.statistic!==ar.statistic
   ||a.comparison_allowed||b.comparison_allowed||ar.comparison_allowed||br.comparison_allowed
   ||a.comparability_status!=='pending'||b.comparability_status!=='pending'
   ||ar.validation_status!=='passed'||br.validation_status!=='passed'
   ||a.indicator_id!==b.indicator_id||a.observation_fiscal_year!==b.observation_fiscal_year
   ||a.population_scope!==b.population_scope||ar.definition_version!==br.definition_version
   ||a.geography_code===b.geography_code||!Number.isFinite(ar.value)||!Number.isFinite(br.value))return null;
 return br.value-ar.value;
}

export const rateDifferenceText=(difference:number)=>`${difference>0?'+':''}${difference.toFixed(1)}pt`;
export function reportedExportLines(rows:Observation[],label:string){
 return rows.flatMap(r=>{const rate=reportedRate(r);return [
  `${r.geography_name} / ${r.observation_fiscal_year}年度 / indicator ${r.indicator_id} / comparability ${r.comparability_status}`,
  `判定人数 ${rate?.numerator_value??r.value}人 / 特定健診受診者 ${rate?.denominator_value??r.denominator?.value}人${rate?` / ${label} ${rate.value.toFixed(1)}%`:''}`,
  `原典 ${r.source_sheet} ${r.source_cell} / 受診者 ${r.denominator?.source_sheet} ${r.denominator?.source_cell} / SHA-256 ${r.source_sha256}`,
 ];});
}
