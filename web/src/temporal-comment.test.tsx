import releaseText from '../public/public-data/releases/8e1fe8695fc86b4358bb695ce0a1c3ccfccdb9f5c0f5ecc45098a6d5fb915827.json?raw';
import {displayData} from './model';
import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {previousYearComment,refreshTemporalComment} from './temporal-comment';
import {Learn} from './learn';
import type {Observation} from './model';
const rows=[2021,2022,2023].map((year,i)=>({observation_fiscal_year:year,value:10+i,unit:'%',indicator_id:'x',geography_code:'15',population_scope:'p',comparison_allowed:true,comparability_status:'compatible',validation_status:'passed',comparability_intervals:{'2021_2022':'compatible','2022_2023':'compatible'}} as unknown as Observation));
it('compares only the immediately preceding recorded year',()=>{
 expect(previousYearComment(rows,2021)).toBe('');
 expect(previousYearComment(rows,2022)).toBe('2021年度との差は+1.0ポイントです。');
 expect(previousYearComment(rows,2023)).toBe('2022年度との差は+1.0ポイントです。');
});
it('does not bypass pending, missing, denied intervals or gaps',()=>{
 for(const patch of [{comparability_status:'pending'},{comparison_allowed:false},{value:null},{comparability_intervals:{'2022_2023':'pending'}},{validation_status:'failed'}])expect(previousYearComment([rows[0],rows[1],{...rows[2],...patch}],2023)).toBe('');
 expect(previousYearComment([rows[0],{...rows[1],value:null},rows[2]],2023)).toBe('');
 expect(previousYearComment([rows[0],rows[2]],2023)).toBe('');
});
it('replaces old release commentary without mutating data',()=>{
 const text='2023年度は12.0%です。2021年度との差は+2.0ポイントです。受診者の構成割合';
 expect(refreshTemporalComment(text,rows,2023)).toContain('2022年度との差は+1.0');
 expect(refreshTemporalComment(text,rows,2021)).not.toContain('との差');
 expect(text).toContain('2021年度との差');
});
it('uses the ministry program in both learning contexts',()=>{
 const html=renderToStaticMarkup(<Learn review={false}/>);
 expect(html).not.toContain('nhf.or.jp');
 expect(html.match(/0000194155_00004.html/g)).toHaveLength(2);
});



it('uses approved prefecture reserve values with previous-year commentary',()=>{
 const release=JSON.parse(releaseText);
 const data=displayData(release.analysis,'rate');
 const sample=data.records.filter(r=>r.indicator_id==='metabo_preliminary'&&r.geography_level==='prefecture_total');
 expect(sample).toHaveLength(3);
 expect(previousYearComment(sample,2021)).toBe('');
 expect(previousYearComment(sample,2022)).toMatch(/^2021年度との差は/);
 expect(previousYearComment(sample,2023)).toMatch(/^2022年度との差は/);
});
