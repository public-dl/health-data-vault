import React from 'react';
import type {Observation} from './model';
import {format,formatValue} from './model';
import './graph-values-table.css';

export type GraphValueRow={code:string;name:string;year:number;records:Observation[];recipients:number|null;unavailable?:boolean};
/** Read the displayed records; never recalculate or normalize percentages. */
export function GraphValuesTable({rows,categories,onSource,active}:{rows:GraphValueRow[];categories:{id:string;label:string}[];onSource:(rows:Observation[])=>void;active?:{code:string;year:number}}){
 return <div className="table-scroll graph-values-scroll" tabIndex={0} role="region" aria-label="グラフの数値表（横スクロール可能）"><table className="graph-values-table"><caption>グラフの数値</caption><thead><tr><th scope="col">地域</th><th scope="col">年度</th>{categories.map(cat=><th scope="col" key={cat.id}>{cat.label}</th>)}<th scope="col">受診者数</th></tr></thead><tbody>{rows.map(row=><tr key={row.code+row.year} className={active?.code===row.code&&active.year===row.year?'active-row':undefined}><th scope="row">{row.name}</th><td>{row.year}年度</td>{row.unavailable?<td colSpan={categories.length+1}>構成表示不可（区分の空欄など）</td>:<>{categories.map(cat=>{const r=row.records.find(r=>r.indicator_id===cat.id);if(!r)return <td key={cat.id}>未収録</td>;const rate=r.derivation??r.derived_rate;const percentage=r.unit==='%'?r.value:rate?.value;const count=rate?.numerator_value??(r.unit==='人'?r.value:null);return <td key={cat.id}><button className="graph-value-source" onClick={()=>onSource([r])} aria-label={`${row.name} ${row.year}年度 ${cat.label}の諸元・出典を確認`}><span>{percentage==null?'—':formatValue(percentage,'%')+'%'}</span><small>{format(count)}人</small></button></td>;})}<td>{format(row.recipients)}人</td></>}</tr>)}</tbody></table></div>;
}
