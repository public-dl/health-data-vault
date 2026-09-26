import {appUrl} from './app-url';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {PublishedTable,Observation,TableCell} from './model';
import {save} from './export';

import {tableLink,visualizationLink} from './source-links';
export {tableLink,visualizationLink} from './source-links';
const safe=(s:string)=>/^[=+@\-\t\r]/.test(s)?"'"+s:s;
export function sourceTableText(table:PublishedTable,separator='\t') {return table.rows.map(row=>row.cells.map(c=>{const s=safe(c.display_text);return separator===','?'"'+s.replaceAll('"','""')+'"':s.replace(/[\t\r\n]+/g,' ');}).join(separator)).join('\r\n');}
// Display-only grouping of header text and following empty cells. Raw cells remain intact.
export function headerCells(cells:TableCell[],row:number){
 const result:{cell:TableCell;span:number}[]=[];
 for(let i=0;i<cells.length;i++){
  const cell=cells[i];let span=1;
  if(row<5&&cell.display_text)while(i+span<cells.length&&cells[i+span].value_state==='blank')span++;
  result.push({cell,span});i+=span-1;
 }
 return result;
}
export function PublishedTables({tables,review,release}:{tables:PublishedTable[];review:boolean;release:string}) {
 const scrollRef=useRef<HTMLDivElement>(null),headRef=useRef<HTMLTableSectionElement>(null);
 useLayoutEffect(()=>{
  const scroll=scrollRef.current,head=headRef.current;if(!scroll||!head)return;
  const update=()=>scroll.style.setProperty('--source-header-height',`${head.getBoundingClientRect().height}px`);
  update();const observer=new ResizeObserver(update);observer.observe(head);return()=>observer.disconnect();
 },[]);
 const params=new URLSearchParams(location.search),requested=Number(params.get('year'));
 const [year,setYear]=useState(tables.some(t=>t.source.observation_fiscal_year===requested)?requested:Math.max(...tables.map(t=>t.source.observation_fiscal_year)));
 const [cell,setCell]=useState(params.get('cell')??''),[message,setMessage]=useState('');
 const table=tables.find(t=>t.source.observation_fiscal_year===year)!;
 const selected=table.rows.flatMap(r=>r.cells).find(c=>c.coordinate===cell);
 useEffect(()=>{if(!selected)return;document.getElementById('source-'+selected.coordinate)?.scrollIntoView({block:'center',inline:'center'});},[year,cell]);
 const selectYear=(y:number)=>{setYear(y);const p=new URLSearchParams(location.search);p.set('year',String(y));history.replaceState(null,'',appUrl('/tables/')+'?'+p);};
 const choose=(c:TableCell)=>{setCell(c.coordinate);const p=new URLSearchParams(location.search);p.set('year',String(year));p.set('cell',c.coordinate);history.replaceState(null,'',appUrl('/tables/')+'?'+p);};
 return <main className="published-page"><a href={appUrl('/')+(review?'?review=1':'')}>← 地域比較へ</a><h1>公表数表</h1><p>特定健康診査等結果報告【市町村国保】（市町村別集計表）</p>{review&&<p className="review-banner">未承認・ローカル確認用</p>}<nav className="year-tabs" aria-label="公表数表の実績年度">{tables.map(t=><button key={t.source.observation_fiscal_year} aria-pressed={year===t.source.observation_fiscal_year} onClick={()=>selectYear(t.source.observation_fiscal_year)}>{t.source.observation_fiscal_year}年度</button>)}</nav><p>出典：<a href={table.source.annual_page_url}>健康にいがた21</a> ／ 掲載 {table.source.publication_fiscal_year}年度 ／ <a href={table.source.source_url}>原典Excelを開く</a></p><div className="actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(sourceTableText(table));setMessage('原表をコピーしました');}catch{setMessage('コピーできません。CSV保存をご利用ください。');}}}>表をコピー</button><button onClick={()=>save(new Blob(['\uFEFF'+sourceTableText(table,',')],{type:'text/csv;charset=utf-8'}),`公表数表_${year}.csv`)}>CSV保存</button></div><p>表は縦・横にスクロールできます。原表の行順・再掲を保持しています。合計行と内訳を加算しないでください。ハイフン表示には数値0の表示形式も含まれます。セルを選ぶと実値・型・表示形式を確認できます。</p>
 <div className="source-cell-details" aria-live="polite">{selected?<><strong>シート「{table.source_sheet}」 {selected.coordinate}</strong>　原値：{selected.original_value===null?'空欄':String(selected.original_value)} ／ 状態：{selected.value_state} ／ 表示形式：<code>{selected.number_format}</code>{selected.formula&&<> ／ 保存済み値：{String(selected.cached_value)}</>}{visualizationLink(table,selected,review)?<a className="source-link" href={visualizationLink(table,selected,review)!}>このデータを可視化 →</a>:<span>　このセルは可視化対象外です。</span>}</>:<>セルを選択すると原典位置を確認できます。</>}</div>
 <div ref={scrollRef} className="source-table-scroll" tabIndex={0} aria-label="原表。横スクロール可能"><table className="published-table"><thead ref={headRef}>{table.rows.filter(r=>r.index<=table.header_rows).map(row=><tr key={row.index}>{headerCells(row.cells,row.index).map(({cell:c,span})=><th key={c.coordinate} colSpan={span} onClick={()=>choose(c)}>{c.display_text}</th>)}</tr>)}</thead><tbody>{table.rows.filter(r=>r.index>table.header_rows).map(row=><tr key={row.index} data-level={row.level}>{row.cells.map((c,i)=>{const Tag=i===0?'th':'td';return <Tag key={c.coordinate} id={'source-'+c.coordinate} className={cell===c.coordinate?'source-selected':''}><button aria-label={`${row.cells[0].display_text} ${c.coordinate} ${c.display_text||'空欄'} 原値を確認`} onClick={()=>choose(c)}>{c.display_text||'\u00a0'}</button></Tag>;})}</tr>)}</tbody></table></div><p role="status">{message}</p><details><summary>原本版・取得情報</summary><p>{table.source.original_filename} ／ シート「{table.source_sheet}」</p><p>取得 {table.source.retrieved_at}</p><p>SHA-256 <code>{table.source.sha256}</code></p><p>release <code>{release}</code></p><p>原本は変更していません。空欄を埋めず、ブラウザーでExcelを再計算しません。結合のない多段見出しは元の行列位置のまま表示します。Excelの印刷レイアウト・書体の完全再現ではありません。</p></details></main>;
}
