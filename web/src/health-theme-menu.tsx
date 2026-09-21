import React from 'react';
import {healthThemes,themeChoices,type HealthTheme} from './health-themes';
import type {Indicator,IndicatorGroup} from './model';
import './health-themes.css';
const paths:Record<HealthTheme['icon'],string>={people:'M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2 21v-5a7 7 0 0 1 14 0v5M17 4a3 3 0 0 1 0 6M19 13a5 5 0 0 1 3 5v3',heart:'M12 21 3 12C-3 4 7-2 12 6 17-2 27 4 21 12Z',drop:'M12 2S4 11 4 16a8 8 0 0 0 16 0C20 11 12 2 12 2Z',cube:'m12 2 10 5v10l-10 5-10-5V7Zm0 10 10-5M12 12 2 7m10 5v10',liver:'M2 7c4-4 12-4 20-2-2 5-5 7-10 7-3 0-3 7-6 9C2 21 1 13 2 7Z',more:'M4 12h2m5 0h2m5 0h2'};
export function HealthThemeMenu({selected,groups,catalog,onSelect}:{selected:string;groups:IndicatorGroup[];catalog:Indicator[];onSelect:(themeId:string,indicatorId:string)=>void}){
 return <div className="health-theme-menu"><div className="theme-heading"><span className="step-heading"><b>1</b> 健康テーマを選ぶ</span><small>テーマから指標を絞り込みます</small></div><nav aria-label="健康テーマ" className="theme-options">{healthThemes.map(theme=>{const choices=themeChoices(theme,groups,catalog);const disabled=!choices.ids.length;return <button type="button" key={theme.id} disabled={disabled} aria-pressed={selected===theme.id} onClick={()=>onSelect(theme.id,choices.ids[0])}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[theme.icon]}/></svg><span><strong>{theme.label}{disabled&&<em>準備中</em>}</strong><small>{disabled?'予定：':''}{theme.description}</small></span></button>;})}</nav></div>;
}
