import React from 'react';
import {format,formatValue} from './model';

export function CategoryValue({value,unit,count,color,status,onSource,label}:{value:number|null;unit:string;count?:number|null;color?:string;status:string;onSource:()=>void;label:string}) {
 return <>{unit==='%'&&color&&value!=null&&<span className="cell-data-bar" aria-hidden="true"><span style={{width:`${value}%`,background:color}}/></span>}<button className="value-source" aria-label={label} onClick={onSource}>{formatValue(value,unit)}{unit}{count!=null&&<small className="supporting-count">{format(count)}人</small>}<small>{status}</small></button></>;
}

/** Shared table presentation only. Publication/composition checks belong to callers. */
export function CategoryYearTable({years,selectedYear,publications,caption,children}:{years:number[];selectedYear:number;publications:(number|undefined)[];caption:React.ReactNode;children:React.ReactNode}) {
 return <table className="data-table category-year-table" style={{minWidth:130+years.length*140}}>
 <caption>{caption}<small>選択年度までの最大5年（収録済み年度のみ）</small></caption>
 <thead><tr><th scope="col">区分</th>{years.map((year,j)=><th scope="col" key={year} className={year===selectedYear?'selected-year':''}>{year}年度<small>公表 {publications[j]??'未確認'}年度</small></th>)}</tr></thead>
 <tbody>{children}</tbody></table>;
}
