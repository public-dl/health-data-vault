import type {Indicator,IndicatorGroup} from './model';

// Navigation metadata only: never grants publication or comparison permission.
export type HealthTheme={id:string;order:number;accentColor:string;label:string;description:string;icon:'people'|'heart'|'drop'|'cube'|'liver'|'more';groupIds:string[];indicatorIds:string[];status:'available'|'planned';independentComparison?:boolean};
// Visualization order only. Source-table columns and record IDs remain untouched.
export const glucoseDisplayOrder=['glucose_people','urine_glucose','fasting_glucose','random_glucose','hba1c'];
export const lipidDisplayOrder=['lipid_people','triglycerides','hdl','ldl','total_cholesterol'];
export const bloodPressureDisplayOrder=['bp_referral','bp_guidance'];
export function orderByIndicators<T extends {indicator_id:string}>(records:T[],ids:string[]):T[]{
 return [...records].sort((a,b)=>ids.indexOf(a.indicator_id)-ids.indexOf(b.indicator_id));
}
export const healthThemes:HealthTheme[]=[
 {id:'overall',accentColor:'#626FD1',order:1,label:'総合判定',description:'メタボ・医師の判断・保健指導',icon:'people',groupIds:['metabo','doctor_judgment','guidance'],indicatorIds:[],status:'available'},
 {id:'blood-pressure',accentColor:'#D9576B',order:2,label:'血圧',description:'保健指導・受診勧奨',icon:'heart',groupIds:[],indicatorIds:bloodPressureDisplayOrder,status:'available',independentComparison:true},
 {id:'lipids',accentColor:'#A87516',order:3,label:'脂質代謝',description:'中性脂肪・HDL・LDL・総コレステロール',icon:'drop',groupIds:[],indicatorIds:lipidDisplayOrder,status:'available',independentComparison:true},
 {id:'glucose',accentColor:'#258E84',order:5,label:'糖代謝',description:'尿糖・血糖・HbA1c',icon:'cube',groupIds:[],indicatorIds:glucoseDisplayOrder,status:'available',independentComparison:true},
 {id:'liver',accentColor:'#A8674B',order:4,label:'肝機能',description:'肝機能',icon:'liver',groupIds:[],indicatorIds:['liver'],status:'available'},
 {id:'renal-urinary',accentColor:'#287FC3',order:6,label:'腎・尿路系',description:'尿蛋白・尿潜血・クレアチニン',icon:'drop',groupIds:[],indicatorIds:['renal_urinary_people','urine_protein','urine_blood','creatinine'],status:'available'},
 {id:'detailed',accentColor:'#7B64C8',order:7,label:'詳細な健診項目',description:'貧血検査・心電図検査・眼底検査',icon:'heart',groupIds:[],indicatorIds:[],status:'planned'},
 {id:'other',accentColor:'#667788',order:8,label:'その他の健診項目',description:'血清尿酸・血清総蛋白',icon:'more',groupIds:[],indicatorIds:[],status:'planned'},
].sort((a,b)=>a.order-b.order) as HealthTheme[];
export type VisualizationType='composition'|'category_distribution'|'continuous';
export const groupPresentation:Record<string,{visualizationType:VisualizationType;overviewLabel:string}>={
 metabo:{visualizationType:'composition',overviewLabel:'構成をひと目で見る'},
 doctor_judgment:{visualizationType:'composition',overviewLabel:'構成をひと目で見る'},
 guidance:{visualizationType:'composition',overviewLabel:'構成をひと目で見る'},
};
// Display collections are NOT composition groups and never grant data permissions.
export const reportedSets=[{id:'set:glucose',themeId:'glucose',label:'糖代謝：全項目',members:glucoseDisplayOrder},{id:'set:blood-pressure',themeId:'blood-pressure',label:'血圧：全区分',members:bloodPressureDisplayOrder},{id:'set:lipids',themeId:'lipids',label:'脂質：全項目',members:lipidDisplayOrder}];
export function themeChoices(theme:HealthTheme,groups:IndicatorGroup[],catalog:Indicator[]){
 if(theme.status!=='available')return {groups:[],indicators:[],sets:[],ids:[] as string[]};
 const present=new Set(catalog.map(i=>i.indicator_id));
 const selectedGroups=groups.filter(g=>theme.groupIds.includes(g.group_id)&&g.categories.length>0&&g.categories.every(c=>present.has(c.indicator_id)));
 const members=new Set(selectedGroups.flatMap(g=>g.categories.map(c=>c.indicator_id)));
 const indicators=orderByIndicators(catalog.filter(i=>theme.indicatorIds.includes(i.indicator_id)&&!members.has(i.indicator_id)),theme.indicatorIds);
 const sets=reportedSets.filter(s=>s.themeId===theme.id&&s.members.every(id=>catalog.some(i=>i.indicator_id===id&&(i.visualization_type==='single_judgment_rate'||i.visualization_type==='reported_count'&&i.capabilities?.recipient_rate===false))));
 return {groups:selectedGroups,indicators,sets,ids:[...sets.map(s=>s.id),...selectedGroups.flatMap(g=>['group:'+g.group_id,...g.categories.map(c=>c.indicator_id)]),...indicators.map(i=>i.indicator_id)]};
}
export function resolveThemeSelection(requestedTheme:string|null,requestedIndicator:string|null,fallback:string,groups:IndicatorGroup[],catalog:Indicator[],themes=healthThemes){
 const available=themes.map(theme=>({theme,choices:themeChoices(theme,groups,catalog)})).filter(x=>x.choices.ids.length);
 // A valid legacy indicator link takes precedence over a missing/stale theme.
 const match=available.find(x=>x.choices.ids.includes(requestedIndicator??''));
 if(match)return {themeId:match.theme.id,indicatorId:requestedIndicator!};
 const selected=available.find(x=>x.theme.id===requestedTheme)??available.find(x=>x.choices.ids.includes(fallback))??available[0];
 return {themeId:selected?.theme.id??'overall',indicatorId:selected?.choices.ids.includes(fallback)?fallback:selected?.choices.ids[0]??fallback};
}
