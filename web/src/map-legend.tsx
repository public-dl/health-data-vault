import React from 'react';
import {format} from './model';
import type {MapScale} from './map-scale';

/** Shared HTML legend: typography is independent of the SVG map's scale. */
export function MapLegend({title,breaks,palette,scale}:{title:string;breaks:number[];palette:string[];scale?:MapScale}) {
 return <aside className="map-legend" data-legend-mode={scale?'continuous':'categorical'} aria-label="地図凡例"><strong className="map-legend-title">{title}</strong>
 {scale&&<div className="map-continuous-legend"><div className="map-gradient-bar" style={{background:`linear-gradient(to right, ${palette[0]}, ${palette.at(-1)})`}}/><div className="map-gradient-ticks">{[scale.min,(scale.min+scale.max)/2,scale.max].map(v=><span key={v}>{format(v)}%</span>)}</div></div>}
 <ul>
  {!scale&&palette.map((color,i)=><li key={i}><i className="map-legend-chip" style={{background:color}}/><span>{i===0?'0':format(breaks[i-1])}{i===breaks.length?'以上':'〜'+format(breaks[i])+'未満'}</span></li>)}
  <li><i className="map-legend-chip map-legend-missing"/><span>欠損・数値なし</span></li>
 </ul></aside>;
}
