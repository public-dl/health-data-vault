import type {Indicator,IndicatorGroup} from './model';
import {recipientMapScales} from './map-scale';
export type Pose='lean'|'head'|'wave'|'neutral'|'support'|'step'|'open';
export type CategoryVisual={pose:Pose;color:string;palette:string[]};
// Soft UI, clear data: muted category hues with stronger data contrast; UI surfaces stay unchanged.
// Presentation-only metadata. Order/labels/definitions remain those of the validated release.
export const groupVisuals:Record<string,Record<string,CategoryVisual>>={
 doctor_judgment:{
 normal:{pose:'neutral',color:'#54aeb4',palette:['#d3ecee','#a7d8db','#78bec4','#479ba3','#296d77']},
 guidance:{pose:'support',color:'#d9a052',palette:['#f7e5c5','#edca94','#dda95f','#bb8435','#906024']},
 referral:{pose:'step',color:'#df806b',palette:['#f5d8cf','#ecb7a7','#df927c','#c97057','#9f4d38']},
 },
 guidance:{
  active:{pose:'support',color:'#df806b',palette:['#f5d8cf','#ecb7a7','#df927c','#c97057','#9f4d38']},
  motivational:{pose:'step',color:'#d9a052',palette:['#f7e5c5','#edca94','#dda95f','#bb8435','#906024']},
  none:{pose:'open',color:'#54b5b1',palette:['#d0ece8','#a0d8d2','#70c1ba','#399b94','#246f6b']},
  indeterminate:{pose:'neutral',color:'#969da6',palette:['#e1e4e8','#c9ced4','#adb5bf','#89939f','#626e7d']},
 },
 metabo:{
  case:{pose:'lean',color:'#d97883',palette:['#f4d4d9','#e9adb7','#da8595','#c66076','#9f425c']},
  preliminary:{pose:'head',color:'#d9a34f',palette:['#f8e7bd','#ebcd8c','#dcb25f','#bd8b38','#956523']},
  noncase:{pose:'wave',color:'#629fce',palette:['#d0e5f4','#a9cde8','#7fb3da','#518fbe','#356b96']},
  indeterminate:{pose:'neutral',color:'#8e9bad',palette:['#dde3eb','#c2ccd9','#a2afc0','#7e8da3','#586b84']},
 }
};
// References, not copied hex values: changes to the source tokens propagate together.
export const indicatorColorAliases:Record<string,CategoryVisual>={
 lipid_people:{pose:'neutral',color:'#124b9b',palette:['#dbeafe','#a7cffe','#6aa8ed','#337bce','#124b9b']},
 triglycerides:groupVisuals.doctor_judgment.normal,
 hdl:groupVisuals.metabo.noncase,
 ldl:groupVisuals.guidance.none,
 total_cholesterol:groupVisuals.metabo.indeterminate,
 bp_guidance:groupVisuals.metabo.preliminary,
 bp_referral:groupVisuals.metabo.case,
};
Object.assign(indicatorColorAliases,{
 glucose_people:indicatorColorAliases.lipid_people,
 urine_glucose:groupVisuals.doctor_judgment.normal,
 fasting_glucose:groupVisuals.metabo.noncase,
 random_glucose:groupVisuals.metabo.indeterminate,
 hba1c:groupVisuals.guidance.none,
});
export function presentationIndicator(indicator:Indicator):Indicator {
 if(!indicator.map_scale&&recipientMapScales[indicator.indicator_id])indicator={...indicator,map_scale:recipientMapScales[indicator.indicator_id]};
 if(!indicator.public_label&&indicator.indicator_id==='lipid_people')indicator={...indicator,name:'脂質代謝：実人員'};
 const visual=indicatorColorAliases[indicator.indicator_id];
 return visual?{...indicator,color:visual.color,palette:visual.palette}:indicator;
}
export function visualGroup(group:IndicatorGroup):IndicatorGroup {
 const config=groupVisuals[group.group_id];
 if(!config||!group.categories.every(c=>config[c.category_id]))return group;
 return {...group,categories:group.categories.map(c=>({...c,color:config[c.category_id].color}))};
}
/** Hamilton allocation for an explicitly approximate 100-symbol illustration only.
 * Never feed these integers back into records, percentages, charts or exports of data. */
export function allocateHundred(values:(number|null)[]):number[]|null {
 if(!values.length||values.some(v=>v==null||!Number.isFinite(v)||v<0||v>100))return null;
 const rates=values as number[];
 if(Math.abs(rates.reduce((a,b)=>a+b,0)-100)>1e-6)return null;
 const counts=rates.map(Math.floor),remaining=100-counts.reduce((a,b)=>a+b,0);
 const order=rates.map((v,i)=>({i,fraction:v-counts[i]})).sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
 for(let i=0;i<remaining;i++)counts[order[i].i]++;
 return counts;
}

/** Resolve single-category and grouped views from the same validated category ids. */
export function indicatorVisual(groups:IndicatorGroup[]|undefined,indicatorId:string) {
 for(const group of groups??[]){
  const category=group.categories.find(c=>c.indicator_id===indicatorId);
  const visual=category&&groupVisuals[group.group_id]?.[category.category_id];
  if(category&&visual)return {group,category,visual};
 }
 return undefined;
}
export function categorySeries(visual:CategoryVisual) {
 return [{color:visual.palette[4],dash:undefined},{color:visual.palette[3],dash:'8 5'}];
}
export function dataBarMaximum(measure:'count'|'rate',values:(number|null)[]) {
 return measure==='rate'?100:Math.max(1,...values.filter((v):v is number=>v!=null&&Number.isFinite(v)&&v>=0));
}
