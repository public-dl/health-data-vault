import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import sourceText from '../public/public-data/releases/620f9e0441f735a5ef4dabe0a2800649e49d6851efde85a6e03b9c55b5ef94ad.json?raw';
import {examinationStateCounts,examinationStateLabels,examinationRateText,examinationCsv} from './examination-model';
import {mapRecordText} from './map-summary';
import {GraphValuesTable} from './graph-values-table';
import {MapLegend} from './map-legend';
import type {Observation,Payload} from './model';
const site=JSON.parse(sourceText),data=site.other_rates as Payload;
it('separates the eight zero-denominator municipalities from missing in 2023 uric acid without changing any record',()=>{
 const rows=data.records.filter(r=>r.indicator_id==='uric_acid'),before=JSON.stringify(rows);expect(examinationStateCounts(rows,2023)).toEqual({valid:22,zeroDenominator:8,missing:0,trueZero:1,total:30});expect(JSON.stringify(rows)).toBe(before);
 expect(()=>examinationStateCounts([...rows,...rows.filter(r=>r.observation_fiscal_year===2023&&r.geography_level==='municipality').slice(0,1)],2023)).toThrow('重複');
});
it('uses authoritative source states for every examined record and never labels a zero denominator as a real zero',()=>{
 for(const payload of [site.detailed_rates,site.other_rates] as Payload[])for(const r of payload.records){const q=r.examination_rate!,text=examinationRateText(r);if(q.state==='missing')expect(text).toBe(examinationStateLabels.missing);else if(q.state==='zero_denominator'){expect(text).toBe(examinationStateLabels.zero_denominator);expect(text).not.toContain('真の0');}else if(q.value===0){expect(text).toBe('0.0％（真の0）');expect(q.denominator_value).toBeGreaterThan(0);}expect(mapRecordText(r,'%')).toBe(text);}
 const partial=data.records.find(r=>r.value===null&&(r.examination_rate!.denominator_value??0)>0)!;expect(partial).toBeDefined();expect(examinationRateText(partial)).toBe('欠損（原表空欄）');
});
it('keeps valid zero inside the distribution and distinguishes values merely rounded to 0.0%',()=>{
 const zero=data.records.find(r=>r.examination_rate!.state==='valid'&&r.examination_rate!.value===0)!;expect(examinationRateText(zero)).toContain('真の0');const tiny={...zero,value:1,value_state:'numeric',examination_rate:{...zero.examination_rate!,value:.01,numerator_value:1,denominator_value:10000}};expect(examinationRateText(tiny)).toBe('0.0％');expect(examinationRateText(tiny)).not.toContain('真の0');
 const rows=data.records.filter(r=>r.indicator_id==='total_protein');expect(examinationStateCounts(rows,2023)).toEqual({valid:8,zeroDenominator:22,missing:0,trueZero:3,total:30});const csv=examinationCsv([zero]);expect(csv).toContain('"valid"');expect(csv).not.toContain('真の0');
});
it('gives graph table cells explicit labels instead of ambiguous dashes',()=>{
 const selected=['missing','zero_denominator','valid'].map(state=>data.records.find(r=>r.examination_rate!.state===state&&(state!=='valid'||r.examination_rate!.value===0))!);const records=selected.map((r,i)=>({...r,indicator_id:String(i)}));const before=JSON.stringify(records);const html=renderToStaticMarkup(<GraphValuesTable rows={[{code:'15',name:'県計',year:2023,records,recipients:100}]} categories={records.map(r=>({id:r.indicator_id,label:r.indicator_id}))} onSource={()=>{}}/>);for(const label of ['欠損（原表空欄）','算出不可（実施件数0）','真の0'])expect(html).toContain(label);expect(html).not.toContain('—');expect(JSON.stringify(records)).toBe(before);
});
it('describes both hatched map states and keeps zero in the numerical scale',()=>{const html=renderToStaticMarkup(<MapLegend examination title="割合" palette={['#eee','#333']} breaks={[]} scale={{mode:'continuous',min:0,max:20}}/>);for(const text of ['欠損（原表空欄）','算出不可（実施件数0）','真の0'])expect(html).toContain(text);expect(html).not.toContain('欠損・数値なし');});
