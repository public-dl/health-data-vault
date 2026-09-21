import {ExportSurface} from './export-surface';
import {orderByIndicators} from './health-themes';
import {DataNotes} from './data-notes';
import React,{useRef} from 'react';
import {CategoryYearTable,CategoryValue} from './category-year-table';
import {Actions,SourceLink,nameFor,svgText,type Context} from './panels';
import {format,formatValue,csv} from './model';
import {reportedRate} from './reported-model';
import {tableYears} from './group-model';

export function ReportedSetTable({c,code,members}:{c:Context;code:string;members:string[]}) {
 const ref=useRef<SVGSVGElement>(null),years=tableYears(c.data.years,c.year);
 const rows=orderByIndicators(c.data.records.filter(r=>r.geography_code===code&&members.includes(r.indicator_id)&&years.includes(r.observation_fiscal_year)),members);
 const indicators=members.map(id=>c.data.indicators.find(i=>i.indicator_id===id)!);
 const record=(id:string,year:number)=>rows.find(r=>r.indicator_id===id&&r.observation_fiscal_year===year);
 const setLabel=c.indicator.display_set_label??'血圧：全区分';
 const title=`${nameFor(c,code)}_${setLabel}_表`;
 const width=180+years.length*180,height=130+members.length*115;
 return <ExportSurface kind="table-card" className="panel group-table"><div className="panel-heading"><h3>{nameFor(c,code)}</h3><Actions c={{...c,reportedMembers:members}} label={setLabel} svg={ref} rows={rows} title={title} table csvText={csv(rows,r=>c.data.indicators.find(i=>i.indicator_id===r.indicator_id)!.name,{headers:['release_id','health_theme','rate_label','temporal_notice'],values:r=>[c.release,c.indicator.theme_id,reportedRate(r)?.label,'年度間比較pending・実績値の併記のみ']})}/></div>
 <div className="group-table-body"><div className="table-scroll"><CategoryYearTable years={years} selectedYear={c.year} publications={years.map(y=>record(members[0],y)?.publication_fiscal_year)} caption={setLabel+" / 特定健診受診者に占める割合（%）"+(indicators.some(i=>!i.rate)?"・割合未承認項目は人数のみ":"")}>
 {indicators.map(i=><tr key={i.indicator_id}><th scope="row"><span className="category-color-mark" style={{background:i.color}} aria-hidden="true"/>{i.name}</th>{years.map(y=>{const r=record(i.indicator_id,y),rate=reportedRate(r);return <td key={y} className={y===c.year?'selected-year':''}>{r?<CategoryValue value={rate?.value??r.value} unit={rate?"%":"人"} count={rate?.numerator_value} color={i.color} status="年度間比較 確認中" label={`${nameFor(c,code)} ${y}年度 ${i.name}の出典`} onSource={()=>c.source([r])}/>:'未収録'}</td>;})}</tr>)}
 </CategoryYearTable></div><p className="footnote">各割合は報告人数÷同年度・同地域の特定健診受診者数×100。各項目は完全な構成ではありません。年度間比較は確認中です。</p><SourceLink c={c} rows={rows}/>
 <svg ref={ref} className="export-only" aria-hidden="true" viewBox={`0 0 ${width} ${height}`}><rect width={width} height={height} fill="white"/><text x="20" y="30" {...svgText} fontSize="18">{nameFor(c,code)} / {setLabel}</text>{years.map((y,j)=><g key={y}><text x={270+j*180} y="64" {...svgText} textAnchor="middle" fontSize="18">{y}年度</text><text x={270+j*180} y="84" {...svgText} textAnchor="middle" fontSize="11">公表 {record(members[0],y)?.publication_fiscal_year}年度</text></g>)}{indicators.map((i,k)=><g key={i.indicator_id}><text x="20" y={120+k*115} {...svgText} fontSize="15">{i.name}</text>{years.map((y,j)=>{const rate=reportedRate(record(i.indicator_id,y));return <g key={y}><text x={270+j*180} y={120+k*115} {...svgText} textAnchor="middle" fontSize="18">{rate?formatValue(rate.value,'%')+'%':'未収録'}</text><text x={270+j*180} y={146+k*115} {...svgText} textAnchor="middle" fontSize="18">{format(rate?.numerator_value)}人</text><text x={270+j*180} y={168+k*115} {...svgText} textAnchor="middle" fontSize="12">受診者 {format(rate?.denominator_value)}人</text><text x={270+j*180} y={187+k*115} {...svgText} textAnchor="middle" fontSize="11">年度間比較 確認中</text></g>;})}</g>)}</svg>
 <DataNotes group>{indicators.map(i=>{const rate=reportedRate(record(i.indicator_id,c.year));return <p key={i.indicator_id}>{c.year}年度の{nameFor(c,code)}：{i.name} {rate?`${formatValue(rate.value,'%')}%（${format(rate.numerator_value)}人／特定健診受診者 ${format(rate.denominator_value)}人）`:record(i.indicator_id,c.year)?`${format(record(i.indicator_id,c.year)?.value)}人／特定健診受診者 ${format(record(i.indicator_id,c.year)?.denominator?.value)}人（人数のみ）`:'未収録'}。</p>;})}</DataNotes>
 </div></ExportSurface>;
}
