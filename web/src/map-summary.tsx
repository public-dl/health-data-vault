import React from 'react';
import {format,formatValue,type Observation} from './model';
import './map-summary.css';
import {examinationRateText,examinationCountText} from './examination-model';

export function mapRecordText(record:Observation|undefined,unit:string){
 return record?.examination_rate?examinationRateText(record):record?.value==null?(record?.value_state==='blank'?'欠損（原表空欄）':record?'値を確認できません':'未収録'):formatValue(record.value,unit)+unit;
}

function ExaminationValue({text}:{text:string}){const index=text.indexOf('（');return index<0?<>{text}</>:<>{text.slice(0,index)}<wbr/><span className="map-state-detail">{text.slice(index)}</span></>;}

/** Display the selected, validated record; never aggregate map municipalities. */
export function MapSummary({record,measure,color,rateLabel,recipientLabel}:{record?:Observation;measure:'rate'|'count';color?:string;rateLabel?:string;recipientLabel?:string}) {
 if(record?.examination_rate){const q=record.examination_rate;return <div className="map-summary" data-examination-state={q.state}><div className="map-summary-primary"><span>{q.label}</span><strong style={{color}}><ExaminationValue text={examinationRateText(record)}/></strong></div><div className="map-summary-counts"><span>判定人数（人）／実施件数（件）</span><strong>{examinationCountText(q.numerator_value,'人')} ／ {examinationCountText(q.denominator_value,'件')}</strong></div></div>;}
 const rate=record?.derivation??record?.derived_rate;
 const inputText=(value:number|null|undefined,blank:boolean)=>value==null?(blank?'欠損（原表空欄）':'未収録'):format(value);
 return <div className="map-summary" data-value-state={record?.value_state??'unavailable'}>
  <div className="map-summary-primary"><span>{measure==='rate'?(rateLabel??'受診者に占める割合（%）'):'報告人数（人）'}</span><strong style={{color}}>{mapRecordText(record,measure==='rate'?'%':'人')}</strong></div>
  <div className="map-summary-counts"><span>報告人数／{recipientLabel??'受診者数'}（人）</span><strong>{inputText(rate?.numerator_value??(measure==='count'?record?.value:undefined),record?.value_state==='blank')} / {inputText(rate?.denominator_value??record?.denominator?.value,record?.denominator?.value_state==='blank')}</strong></div>
 </div>;
}
