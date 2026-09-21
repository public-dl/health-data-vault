import React from 'react';
import {format,formatValue,type Observation} from './model';
export function temporalTable(records:Observation[],selectedYear:number,measure:'count'|'rate') {
 const columns=[...new Set(records.map(r=>r.observation_fiscal_year))].filter(y=>y<=selectedYear).sort((a,b)=>a-b).slice(-5);
 const visible=columns.map(year=>records.find(r=>r.observation_fiscal_year===year)!);
 const singleRate=visible.some(r=>(r.derivation??r.derived_rate)?.statistic==='single_judgment_recipient_percentage');
 const metrics=singleRate?[
  {id:'rate',label:'特定健診受診者に占める割合（%）',text:(r:Observation)=>formatValue((r.derivation??r.derived_rate)?.value,'%')+'%'},
  {id:'population',label:'報告人数／受診者数（人）',text:(r:Observation)=>`${format((r.derivation??r.derived_rate)?.numerator_value)} / ${format((r.derivation??r.derived_rate)?.denominator_value)}`},
  {id:'publication',label:'掲載年度',text:(r:Observation)=>`${r.publication_fiscal_year}年度`},
  {id:'comparison',label:'比較可否',text:()=> '確認中（pending）'}, ]:[
  {id:'value',label:measure==='rate'?'受診者に占める割合（%）':'報告人数（人）',text:(r:Observation)=>formatValue(r.value,r.unit)+(r.value==null?`（${r.value_state}）`:'')},
  {id:'population',label:'報告人数／受診者数（人）',text:(r:Observation)=>`${format(r.derivation?.numerator_value??r.value)} / ${format(r.derivation?.denominator_value??r.derived_rate?.denominator_value??r.denominator?.value)}`},
  {id:'publication',label:'掲載年度',text:(r:Observation)=>`${r.publication_fiscal_year}年度`},
  {id:'comparison',label:'比較可否',text:(r:Observation)=>r.comparison_allowed?'比較可能':r.denominator_record_id?'年度間確認中（pending）':'保留'},
 ];
 return {columns,records:visible,rows:metrics.map(m=>({id:m.id,label:m.label,cells:visible.map(r=>({year:r.observation_fiscal_year,text:m.text(r),record:r}))}))};
}
export type TemporalModel=ReturnType<typeof temporalTable>;
export function temporalText(model:TemporalModel) {
 return ['項目\t'+model.columns.map(y=>y+'年度').join('\t'),...model.rows.map(row=>[row.label,...row.cells.map(c=>c.text)].join('\t')),
  ...model.records.map(r=>`${r.observation_fiscal_year}\t${r.source_url}\t${r.source_sheet}\t${r.source_cell}\t${r.source_sha256}`)].join('\n');
}
export function TemporalTable({model,year,caption,bar,notes={}}:{model:TemporalModel;year:number;caption:React.ReactNode;bar?:{color:string;max:number};notes?:Record<number,string>}) {
 return <table className="data-table temporal-table" style={{minWidth:`max(var(--temporal-min-width, 720px), ${180+model.columns.length*120}px)`}}><caption>{caption}</caption><colgroup><col style={{width:"24%"}}/>{model.columns.map(y=><col key={y} style={{width:`${76/model.columns.length}%`}}/>)}</colgroup><thead><tr><th scope="col">区分</th>{model.columns.map(y=><th scope="col" key={y} className={y===year?'selected-year':''}>{y}年度<small>公表 {model.records.find(r=>r.observation_fiscal_year===y)?.publication_fiscal_year??'未確認'}年度</small></th>)}</tr></thead><tbody>{model.rows.map(row=><tr key={row.id} data-metric={row.id}><th scope="row">{row.id==='rate'?<><span className="metric-heading-line">特定健診受診者数に</span><span className="metric-heading-line">占める割合（％）</span></>:row.label==='特定健診受診者数（人）'?<><span className="metric-heading-line">特定健診</span><span className="metric-heading-line">受診者数（人）</span></>:row.label==='年度間comparability'?<><span className="metric-heading-line">年度間</span><span className="metric-heading-line">comparability</span></>:row.label==='受診者に占める割合（%）'?<><span className="metric-heading-line">受診者に占める</span><span className="metric-heading-line">割合（%）</span></>:row.id==='population'?<><span className="metric-heading-line">{row.label.startsWith('判定')?'判定人数':'報告人数'}</span><span className="metric-heading-line">／受診者数（人）</span></>:row.label}</th>{row.cells.map(cell=><td key={cell.year} data-year={cell.year} className={cell.year===year?'selected-year':''}>{singleRateRow(row.id,model)&&bar&&cell.record.value!=null&&<span className="cell-data-bar" aria-hidden="true"><span style={{width:`${(row.id==='rate'?(cell.record.derivation??cell.record.derived_rate)!.value:cell.record.value)/bar.max*100}%`,background:bar.color}}/></span>}{row.id==='population'?<>{cell.text.split(' / ')[0]}<span className="metric-heading-line">／{cell.text.split(' / ')[1]}</span></>:cell.text}{(singleRateRow(row.id,model))&&notes[cell.year]&&<small className="region-difference">{notes[cell.year]}</small>}</td>)}</tr>)}</tbody></table>;
}

function singleRateRow(id:string,model:TemporalModel){return id===(model.rows.some(r=>r.id==='rate')?'rate':'value');}
