import React from 'react';
import {format,formatValue,type Observation} from './model';
import './map-summary.css';
import {examinationRateText,examinationCountText} from './examination-model';

export function mapRecordText(record:Observation|undefined,unit:string){
 return record?.examination_rate?examinationRateText(record):formatValue(record?.value,unit)+(record?.value==null?'':unit);
}

/** Display the selected, validated record; never aggregate map municipalities. */
export function MapSummary({record,measure,color,rateLabel,recipientLabel}:{record?:Observation;measure:'rate'|'count';color?:string;rateLabel?:string;recipientLabel?:string}) {
 if(record?.examination_rate){const q=record.examination_rate;return <div className="map-summary"><div className="map-summary-primary"><span>{q.label}</span><strong style={{color}}>{examinationRateText(record)}</strong></div><div className="map-summary-counts"><span>判定人数（人）／実施件数（件）</span><strong>{examinationCountText(q.numerator_value,'人')} ／ {examinationCountText(q.denominator_value,'件')}</strong></div></div>;}
 const rate=record?.derivation??record?.derived_rate;
 return <div className="map-summary">
  <div className="map-summary-primary"><span>{measure==='rate'?(rateLabel??'受診者に占める割合（%）'):'報告人数（人）'}</span><strong style={{color}}>{formatValue(record?.value,measure==='rate'?'%':'人')}{record?.value==null?'':measure==='rate'?'%':'人'}</strong></div>
  <div className="map-summary-counts"><span>報告人数／{recipientLabel??'受診者数'}（人）</span><strong>{format(rate?.numerator_value??(measure==='count'?record?.value:undefined))} / {format(rate?.denominator_value??record?.denominator?.value)}</strong></div>
 </div>;
}
