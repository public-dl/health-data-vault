import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {it,expect} from 'vitest';
import {displayData,type Payload,type Observation} from './model';
import {TablePanel,type Context} from './panels';
import {GroupTable} from './group-views';
import {AnnualTable} from './annual-views';
import {FactCard} from './examination-views';
import {reportedContext} from './reported-views';

const pointer=JSON.parse(readFileSync('public/public-data/current.json','utf8'));
const bytes=readFileSync('public/public-data/releases/'+pointer.release_id+'.json');
assert.equal(createHash('sha256').update(bytes).digest('hex'),pointer.data_sha256);
const release=JSON.parse(bytes.toString());
const cells=new Map<string,any>();
for(const table of release.published_tables)for(const row of table.rows)for(const cell of row.cells)cells.set([table.source.sha256,table.source_sheet,cell.coordinate].join('|'),cell);
const int=(n:number)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
// Independent integer arithmetic for one-decimal half-up display (no app formatter).
const rate=(n:number,d:number)=>{const t=(2n*BigInt(n)*1000n+BigInt(d))/(2n*BigInt(d));return `${t/10n}.${t%10n}`;};
const plain=(s:string)=>s.replace(/<[^>]*>/g,'').replaceAll('&#x27;',"'").replaceAll('&amp;','&').replace(/<!--.*?-->/g,'');
const sourceValue=(r:any)=>{
 const cell=cells.get([r.source_sha256,r.source_sheet,r.source_cell].join('|'));
 assert.ok(cell,'Missing published source '+r.record_id);
 assert.equal(r.original_value,cell.original_value,'Original cell '+r.record_id);
 if(r.zero_derivation){
  assert.equal(cell.original_value,null);let sum=0;
  for(const child of r.zero_derivation.children){const c=cells.get([r.source_sha256,r.source_sheet,child.cell].join('|'));assert.ok(c);assert.equal(c.original_value,child.raw_value);assert.equal(typeof c.original_value,'number');sum+=c.original_value;}
  assert.equal(sum,0);assert.equal(r.zero_derivation.child_sum,0);return 0;
 }
 return typeof cell.original_value==='number'?cell.original_value:typeof cell.cached_value==='number'?cell.cached_value:null;
};
const context=(data:Payload,id:string,code:string,measure:'count'|'rate',year=2023):Context=>({data,indicator:data.indicators.find(i=>i.indicator_id===id)!,regions:[code],year,measure,release:pointer.release_id,review:false,source:()=>{},notify:()=>{}});
const tdByRecord=(html:string)=>[...html.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)].filter(m=>/data-record-id="([^"]+)"/.test(m[1])).map(m=>({id:/data-record-id="([^"]+)"/.exec(m[1])![1],metric:/data-value-metric="([^"]+)"/.exec(m[1])?.[1],text:plain(m[2])}));

it('joins every released count and denominator to its published source cell, independently checks rates and renders all public numeric tables',async()=>{
 const before=createHash('sha256').update(JSON.stringify(release)).digest('hex');
 let sourceRecords=0,derivedRates=0,renderedCells=0,contexts=0;
 const covered=new Set<string>();
 for(const key of ['analysis','annual','reported','detailed_rates','other_rates']){
  const raw=release[key] as Payload,all=[...raw.records,...(raw.denominator_records??[])];
  for(const r of all){assert.equal(r.value,sourceValue(r),'Source value '+r.record_id);sourceRecords++;}
  const denominators=new Map((raw.denominator_records??[]).map(r=>[r.record_id,r]));
  for(const r of raw.records){const q=r.examination_rate??r.derivation??r.derived_rate;if(!q)continue;
   const denominator=denominators.get((q as any).denominator_record_id??r.denominator_record_id!);assert.ok(denominator,'Denominator '+r.record_id);
   const n=sourceValue(r),d=sourceValue(denominator);assert.equal(q.numerator_value,n);assert.equal(q.denominator_value,d);
   if(r.examination_rate){assert.equal(r.examination_rate.state,n==null||d==null?'missing':d===0?'zero_denominator':'valid');}
   if(n!=null&&d!=null&&d>0){assert.ok(Math.abs(q.value!-n/d*100)<1e-10,r.record_id);derivedRates++;}else assert.equal(q.value,null);
  }
  if(key==='detailed_rates'||key==='other_rates'){
   for(const meta of raw.indicators)for(const geo of raw.geographies){
    const rows=raw.records.filter(r=>r.indicator_id===meta.indicator_id&&r.geography_code===geo.code),html=renderToStaticMarkup(<FactCard c={context(raw,meta.indicator_id,geo.code,'count')} code={geo.code} rows={rows} open={()=>{}} table/>);
    const trs=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].slice(1,4).map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(c=>plain(c[1])));
    assert.equal(trs.length,3);
    rows.forEach((r,i)=>{const q=r.examination_rate!,n=sourceValue(r),d=sourceValue(denominators.get(q.denominator_record_id)!);
     assert.equal(trs[0][i],n==null?'欠損（原表空欄）':int(n)+'人',r.record_id);
     assert.equal(trs[1][i],d==null?'欠損（原表空欄）':int(d)+'件',r.record_id);
     assert.equal(trs[2][i],n==null||d==null?'欠損（原表空欄）':d===0?'算出不可（実施件数0）':rate(n,d)+'％'+(n===0?'（真の0）':''),r.record_id);
     covered.add(key+'|'+r.record_id);renderedCells+=3;
    });contexts++;if(contexts%25===0)await new Promise<void>(resolve=>setImmediate(resolve));
   }continue;
  }
  const metas=raw.indicators.filter(i=>key!=='reported'||!i.source_count_contract?.startsWith('detailed-')&&!i.source_count_contract?.startsWith('other-'));
  for(const measure of ['count','rate'] as const){
   if(key==='reported'&&measure==='rate')continue;
   const data=displayData(raw,measure);
   for(const meta of metas)for(const geo of raw.geographies){
    let c=context(data,meta.indicator_id,geo.code,measure);if(key==='reported')c=reportedContext(c,true,[meta.indicator_id]);
    if(key==='annual'){
     const group=data.indicator_groups![0];
     for(const year of data.years){const r=raw.records.find(r=>r.indicator_id===meta.indicator_id&&r.geography_code===geo.code&&r.observation_fiscal_year===year)!;
      const html=renderToStaticMarkup(<AnnualTable c={{...c,year}} group={group} code={geo.code}/>),row=/<tbody>([\s\S]*?)<\/tbody>/.exec(html)![1];
      const values=[...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map(m=>plain(m[1]));
      const d=sourceValue(denominators.get(r.denominator_record_id??r.derivation?.denominator_record_id??r.derived_rate?.denominator_record_id!)!),n=sourceValue(r)!;
      assert.equal(values[0],measure==='count'?int(n)+'人':rate(n,d!)+'%',r.record_id);assert.equal(values[1],int(n)+' / '+int(d!));
      covered.add(key+'|'+r.record_id);renderedCells+=2;contexts++;if(contexts%25===0)await new Promise<void>(resolve=>setImmediate(resolve));
     }continue;
    }
    const html=renderToStaticMarkup(<TablePanel c={c} code={geo.code}/>);
    const values=tdByRecord(html).filter(v=>['count','value','rate','reference','population'].includes(v.metric!));
    assert.ok(values.length>0);
    for(const v of values){const r=raw.records.find(r=>r.record_id===v.id.replace(/:recipient_percentage$/,''))!;assert.ok(r,"Rendered id: "+v.id);const n=sourceValue(r),d=denominators.get(r.denominator_record_id??r.derivation?.denominator_record_id??r.derived_rate?.denominator_record_id!);const dv=d?sourceValue(d):null;
     let expected:string;
     if(v.metric==='reference')expected=(dv==null?'欠損':int(dv))+'人';
     else if(v.metric==='population')expected=(n==null?'欠損':int(n))+'／'+(dv==null?'欠損':int(dv));
     else if(measure==='rate')expected=n==null||dv==null?'欠損':rate(n,dv);
     else expected=n==null?'欠損（原表空欄）':int(n)+(v.metric==='count'||key==='reported'?r.unit:'');
     assert.equal(v.text,expected,v.id+' '+v.metric);covered.add(key+'|'+r.record_id);renderedCells++;
    }contexts++;if(contexts%25===0)await new Promise<void>(resolve=>setImmediate(resolve));
   }
   if(key==='analysis')for(const group of data.indicator_groups!)for(const geo of data.geographies){
    const c=context(data,group.categories[0].indicator_id,geo.code,measure),html=renderToStaticMarkup(<GroupTable c={c} group={group} code={geo.code}/>);
    const values=tdByRecord(html);assert.equal(values.length,group.categories.length*data.years.length);
    for(const v of values){const r=raw.records.find(r=>r.record_id===v.id.replace(/:recipient_percentage$/,''))!,n=sourceValue(r)!,d=sourceValue(denominators.get(r.denominator_record_id??r.derivation?.denominator_record_id??r.derived_rate?.denominator_record_id!)!)!;
     assert.ok(v.text.startsWith(measure==='count'?int(n)+'人':rate(n,d)+'%'),r.record_id);renderedCells++;
    }contexts++;if(contexts%25===0)await new Promise<void>(resolve=>setImmediate(resolve));
   }
  }
 }
 expect(covered.size).toBe(4356);expect(sourceRecords).toBe(6732);
 expect(createHash('sha256').update(JSON.stringify(release)).digest('hex')).toBe(before);
 const report={sourceRelease:pointer.release_id,sourceRecords,derivedRates,publicObservations:covered.size,renderedCells,contexts,scope:'Every public indicator/year/region in numeric table components; not every browser chart pixel or raw Excel re-extraction',sourceAndReleaseUnchanged:true};
 if(process.env.HDV_AUDIT_REPORT)writeFileSync(process.env.HDV_AUDIT_REPORT,JSON.stringify(report,null,2));console.log('FULL VALUE AUDIT',JSON.stringify(report));
},120000);
