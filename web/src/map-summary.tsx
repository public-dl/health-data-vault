import React from 'react';
import {format,formatValue,type Observation} from './model';
import './map-summary.css';

/** Display the selected, validated record; never aggregate map municipalities. */
export function MapSummary({record,measure,color,rateLabel,recipientLabel}:{record?:Observation;measure:'rate'|'count';color?:string;rateLabel?:string;recipientLabel?:string}) {
 const rate=record?.derivation??record?.derived_rate;
 return <div className="map-summary">
  <div className="map-summary-primary"><span>{measure==='rate'?(rateLabel??'受診者に占める割合（%）'):'報告人数（人）'}</span><strong style={{color}}>{formatValue(record?.value,measure==='rate'?'%':'人')}{record?.value==null?'':measure==='rate'?'%':'人'}</strong></div>
  <div className="map-summary-counts"><span>報告人数／{recipientLabel??'受診者数'}（人）</span><strong>{format(rate?.numerator_value??(measure==='count'?record?.value:undefined))} / {format(rate?.denominator_value??record?.denominator?.value)}</strong></div>
 </div>;
}
