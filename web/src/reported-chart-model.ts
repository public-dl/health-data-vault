import {csv,type Observation,type Indicator} from './model';
import {reportedRate} from './reported-model';

export const chartPending='年度ごとの実績値を参考表示しています。年度間の比較可能性は現在確認中です（comparability: pending）。';
export const chartMax:Record<string,number>={bp_referral:50,bp_guidance:40,lipid_people:80,triglycerides:50,hdl:15,ldl:70,total_cholesterol:60};
/** Display annual facts only. This does not grant temporal comparison permission. */
export function chartRecords(records:Observation[],id:string):Observation[]{
 return records.filter(r=>r.indicator_id===id).map(r=>{
  const rate=reportedRate(r);
  const valid=!!rate&&rate.validation_status==='passed'&&rate.value_state!=='blank'&&Number.isFinite(rate.value)&&rate.denominator_value>0;
  return {...r,value:valid?rate!.value:null,unit:'%',derivation:rate};
 });
}
export function municipalityDistribution(records:Observation[],year:number){
 const rows=records.filter(r=>r.observation_fiscal_year===year&&r.geography_level==='municipality');
 if(new Set(rows.map(r=>r.geography_code)).size!==rows.length)throw new Error('市町村分布に重複地域があります');
 const values=rows.map(r=>r.value).filter((v):v is number=>v!=null&&Number.isFinite(v)).sort((a,b)=>a-b);
 const quantile=(p:number)=>{if(!values.length)return null;const h=(values.length-1)*p,i=Math.floor(h);return values[i]+(values[Math.ceil(h)]-values[i])*(h-i);};
 return {rows,count:values.length,total:rows.length,values:[quantile(0),quantile(.25),quantile(.5),quantile(.75),quantile(1)]};
}
export function chartCsv(rows:Observation[],indicators:Indicator[],release:string){
 return csv(rows,r=>indicators.find(i=>i.indicator_id===r.indicator_id)?.name??r.indicator_id,{headers:['release_id','health_theme','rate_label','display_purpose'],values:r=>[release,indicators.find(i=>i.indicator_id===r.indicator_id)?.theme_id,indicators.find(i=>i.indicator_id===r.indicator_id)?.rate?.label,'annual facts; comparability pending; no trend assessment']});
}
