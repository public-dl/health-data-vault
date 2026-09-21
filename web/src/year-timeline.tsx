import React from 'react';
/** Controlled UI only. Year, playback state and the single timer belong to App. */
export function YearTimeline({years,year,playing,onYear,onToggle,label='地図'}:{years:number[];year:number;playing:boolean;onYear:(year:number)=>void;onToggle?:()=>void;label?:string}) {
 return <div className="timeline" role="group" aria-label={label+'の年度操作'}>{onToggle&&<button onClick={onToggle} aria-label={label+(playing?'の年度再生を停止':'の年度を再生')}>{playing?'Ⅱ 停止':'▶ 年度を再生'}</button>}<input aria-label={label+'の実績年度'} aria-valuetext={year+'年度'} type="range" min="0" max={years.length-1} value={years.indexOf(year)} onChange={e=>onYear(years[Number(e.target.value)])}/><span>{year}年度</span><small>全地図で同期</small></div>;
}
