import {it,expect} from 'vitest';
import releaseText from '../public/public-data/releases/620f9e0441f735a5ef4dabe0a2800649e49d6851efde85a6e03b9c55b5ef94ad.json?raw';
import {displayData,type Payload} from './model';
import {reportedContext} from './reported-views';
import type {Context} from './panels';
const raw=JSON.parse(releaseText).reported as Payload;
const make=(id:string)=>({data:displayData(raw,'count'),indicator:raw.indicators.find(i=>i.indicator_id===id)!,measure:'count',year:2023,regions:['15'],release:'test',review:true,source:()=>{},notify:()=>{}} as Context);
it('prepares each existing theme without validating unrelated examination count series',()=>{
 for(const id of ['bp_guidance','lipid_people','liver','glucose_people','renal_urinary_people']){
  const c=reportedContext(make(id),true,[id]);expect(c.data.records.length).toBeGreaterThan(0);expect(c.data.records.every(r=>r.indicator_id===id)).toBe(true);expect(c.data.years).toEqual([2021,2022,2023]);
 }
});
it('prepares all members of a display set and retains unit and source checks on selected records',()=>{
 const ids=['bp_guidance','bp_referral'];const c=reportedContext(make(ids[0]),true,ids);expect(new Set(c.data.records.map(r=>r.indicator_id))).toEqual(new Set(ids));
 const bad=make(ids[0]);bad.data=structuredClone(bad.data);bad.data.records.find(r=>r.indicator_id===ids[0])!.unit='件';expect(()=>reportedContext(bad,true,ids)).toThrow('人数公開契約');
});
it('reproduces the old all-record validation error on the current release',()=>{expect(()=>reportedContext(make('bp_guidance'),true)).toThrow('人数公開契約');});
