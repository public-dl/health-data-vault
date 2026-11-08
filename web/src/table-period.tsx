import React from 'react';
export function TablePeriod({years,selected}:{years:number[];selected:number}){
 const sorted=[...new Set(years)].sort((a,b)=>a-b);
 return <p className="table-period" data-table-period>この表の表示範囲：{sorted.join('・')}年度。選択中は{selected}年度です。選択年度の列を色と「選択中」の表示で示しています。</p>;
}
