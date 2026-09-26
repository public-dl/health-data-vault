import {orderByIndicators} from './health-themes';
import {isReportedSchema,regionalRateDifference,rateDifferenceText} from './reported-model';
import type {Payload,IndicatorGroup,Observation} from './model';
import {csv,format,formatValue,isCountPublication} from './model';
import {temporalTable} from './temporal-table';
import {composition,tableYears} from './group-model';
export type ComparisonInput={annualValues?:boolean;reportedMembers?:string[];data:Payload;regions:string[];indicatorId:string;group?:IndicatorGroup;year:number;measure:'rate'|'count';release:string;review?:boolean};
export const safeExportCell=(value:unknown)=>{const s=String(value??'').replace(/[\t\r\n]/g,' ');return /^[=+@\-]/.test(s)?"'"+s:s;};
const escapeHtml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function comparisonTable(input:ComparisonInput) {
 const {data,regions,indicatorId,group,year,measure}=input;
 if(regions.length!==2||regions[0]===regions[1])throw new Error('異なる2地域を選択してください');
 const years=isReportedSchema(data.schema_version)&&!input.annualValues?[year]:group?tableYears(data.years,year):[...new Set(data.records.filter(r=>r.indicator_id===indicatorId&&regions.includes(r.geography_code)&&r.observation_fiscal_year<=year).map(r=>r.observation_fiscal_year))].sort((a,b)=>a-b).slice(-5);
 const names=regions.map(code=>data.geographies.find(g=>g.code===code)?.name??code);
 const records:Observation[]=[];
 const metrics=input.reportedMembers?input.reportedMembers.map(id=>({id,label:data.indicators.find(i=>i.indicator_id===id)!.name})):group?[...group.categories.map(c=>({id:c.category_id,label:c.label})),{id:'denominator',label:'受診者数（人）'},{id:'publication',label:'公表年度'},{id:'comparison',label:'構成検証・比較可否'}]:temporalTable(data.records.filter(r=>r.indicator_id===indicatorId&&r.geography_code===regions[0]&&r.observation_fiscal_year===year),year,measure).rows.map(r=>({id:r.id,label:r.label}));
 const grid=[['項目','地域',...years.map(y=>y+'年度')],...metrics.flatMap(metric=>regions.map((code,index)=>[metric.label,names[index],...years.map(y=>{
  if(input.reportedMembers){
   const r=data.records.find(r=>r.geography_code===code&&r.indicator_id===metric.id&&r.observation_fiscal_year===y),rate=r?.derivation??r?.derived_rate;
   return r?`${rate?formatValue(rate.value,'%')+'% / ':''}${format(rate?.numerator_value??r.value)}人 / 参考：受診者数 ${format(rate?.denominator_value??r.denominator?.value)}人 / 掲載${r.publication_fiscal_year}年度 / 年度間確認中（pending）`:'未収録';
  }
  if(group){
   const part=composition(data,group,code,y);if(!part)return '表示不可';
   if(metric.id==='denominator')return format(part.denominator);
   if(metric.id==='publication')return part.rows[0].publication_fiscal_year+'年度';
   if(metric.id==='comparison')return '人数合計一致・検証済・比較可能';
   const r=part.rows[group.categories.findIndex(c=>c.category_id===metric.id)];
   return formatValue(r.value,r.unit)+r.unit+(measure==='rate'?`（${format(r.derivation?.numerator_value)}人）`:'');
  }
  const r=data.records.find(r=>r.geography_code===code&&r.indicator_id===indicatorId&&r.observation_fiscal_year===y);
  if(!r)return '欠損（未収録）';
  return temporalTable([r],y,measure).rows.find(row=>row.id===metric.id)!.cells[0].text;
 })]))];
 for(const code of regions)for(const y of years){
  if(group)records.push(...(composition(data,group,code,y)?.rows??[]));
  else records.push(...data.records.filter(r=>r.geography_code===code&&(input.reportedMembers?input.reportedMembers.includes(r.indicator_id):r.indicator_id===indicatorId)&&r.observation_fiscal_year===y));
 }
 if(input.reportedMembers)records.splice(0,records.length,...orderByIndicators(records,input.reportedMembers));
 const safeGrid=grid.map(row=>row.map(safeExportCell));
 const indicator=data.indicators.find(i=>i.indicator_id===indicatorId);
 const delta=!input.reportedMembers&&isReportedSchema(data.schema_version)?regionalRateDifference(records.find(r=>r.geography_code===regions[0]&&r.observation_fiscal_year===year),records.find(r=>r.geography_code===regions[1]&&r.observation_fiscal_year===year)):null;
 const notes=[...(delta==null?[]:[`${year}年度 ${names[1]} − ${names[0]}：${rateDifferenceText(delta)}（同年度・地域間の算術差）`]),`健康テーマ：${indicator?.theme_label??''}`, `指標：${input.reportedMembers?(indicator?.display_set_label??'血圧：全区分'):group?group.name+'：全区分':data.indicators.find(i=>i.indicator_id===indicatorId)?.name??indicatorId}`,`${input.review?'未承認・ローカル確認用':'承認済みrelease'}`,`単位：${measure==='rate'?(indicator?.rate?.label??'受診者に占める割合（%）'):'報告人数（人）'}`,data.population_scope,isCountPublication(records)?'原表の報告人数です。地域差・年度差は生成しません。':'割合は表示丸めのみ。年齢・性別構成未調整。',`release ${input.release}`,...records.map(r=>`${r.geography_name} / ${r.observation_fiscal_year} / ${r.indicator_id} / ${r.source_url} / ${r.source_sheet} / ${r.source_cell} / comparability ${r.comparability_status}`)];
 return {years,names,grid,records,tsv:[...safeGrid.map(row=>row.join('\t')),...notes.map(safeExportCell)].join('\n'),html:'<table><thead><tr>'+safeGrid[0].map(s=>'<th>'+escapeHtml(s)+'</th>').join('')+'</tr></thead><tbody>'+safeGrid.slice(1).map(row=>'<tr>'+row.map(s=>'<td>'+escapeHtml(s)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+notes.map(s=>'<p>'+escapeHtml(s)+'</p>').join('')};
}
export function comparisonCsv(input:ComparisonInput) {
 const model=comparisonTable(input);
 const records=model.records.map(r=>({...r,derivation:r.derivation??r.derived_rate,denominator:r.denominator??input.data.denominator_records?.find(d=>d.record_id===(r.derivation??r.derived_rate)?.denominator_record_id)}));
 return csv(records,r=>input.data.indicators.find(i=>i.indicator_id===r.indicator_id)?.name??r.indicator_id,{
  headers:['region_role','region_id','region_name','indicator_group','category_id','actual_year','publication_year','rate','comparability','rate_comparability','release_id','health_theme','rate_label','same_year_difference_pt'],
  values:r=>{const group=input.data.indicator_groups?.find(g=>g.categories.some(c=>c.indicator_id===r.indicator_id));return [input.regions.indexOf(r.geography_code)===0?'A':'B',r.geography_code,r.geography_name,group?.group_id,group?.categories.find(c=>c.indicator_id===r.indicator_id)?.category_id,r.observation_fiscal_year,r.publication_fiscal_year,r.derivation?.value,r.comparability_status,r.derivation?.comparability_status,input.release,input.data.indicators.find(i=>i.indicator_id===r.indicator_id)?.theme_label,r.derivation?.label,r.geography_code===input.regions[1]?regionalRateDifference(model.records.find(a=>a.geography_code===input.regions[0]&&a.indicator_id===r.indicator_id&&a.observation_fiscal_year===r.observation_fiscal_year),r):null];}
 });
}
export function comparisonFrames(sizes:{width:number;height:number}[],layout:'side'|'stack') {
 if(sizes.length!==2)throw new Error('比較画像には2地域が必要です');
 const gap=24,top=130,pad=20;
 return {width:layout==='side'?sizes[0].width+sizes[1].width+gap+pad*2:Math.max(...sizes.map(s=>s.width))+pad*2,
  height:top+(layout==='side'?Math.max(...sizes.map(s=>s.height)):sizes[0].height+sizes[1].height+gap)+pad,
  positions:[{x:pad,y:top},{x:layout==='side'?pad+sizes[0].width+gap:pad,y:layout==='side'?top:top+sizes[0].height+gap}]};
}
