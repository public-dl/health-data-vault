import {connect,formatValue,type Observation} from './model';
// Select the previous recorded year before checking permission. Never skip a missing/pending row.
export function previousYearComment(rows:Observation[],year:number):string {
 const current=rows.find(r=>r.observation_fiscal_year===year);
 const previous=rows.filter(r=>r.observation_fiscal_year<year).sort((a,b)=>b.observation_fiscal_year-a.observation_fiscal_year)[0];
 if(!connect(previous,current))return '';
 const delta=current!.value!-previous.value!;
 return `${previous.observation_fiscal_year}年度との差は${delta>=0?'+':''}${formatValue(delta,current!.unit)}${current!.unit==='%'?'ポイント':current!.unit}です。`;
}
export function refreshTemporalComment(text:string,rows:Observation[],year:number):string {
 const withoutDelta=text.replace(/\d{4}年度(?:との差は|からの変化は)[^。]*。/g,'');
 const delta=previousYearComment(rows,year);
 if(!delta)return withoutDelta;
 const notice=withoutDelta.indexOf('受診者の構成割合');
 return notice>=0?withoutDelta.slice(0,notice)+delta+withoutDelta.slice(notice):withoutDelta+delta;
}
