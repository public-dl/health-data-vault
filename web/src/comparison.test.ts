import {describe,it,expect} from 'vitest';
import type {Observation} from './model';
import {regionRows,toggleSeries,axisMaximum,difference,placeLabels,overlaps} from './comparison';

const row=(code:string,value:number,year=2023)=>({record_id:code+year,geography_code:code,indicator_id:'metabo_case',value,observation_fiscal_year:year,unit:'%',population_scope:'same audited recipients',definition_version:'audit-v1',comparison_allowed:true,validation_status:'passed',comparability_status:'compatible',source_cell:code==='A'?'C9':'C12',source_sha256:code,denominator:{source_cell:code==='A'?'B9':'B12'}} as Observation);
describe('region comparison',()=>{
  it('selects records and provenance by geography when order is reversed',()=>{
    const records=[row('A',19),row('B',20)];const before=JSON.stringify(records);
    const selected=['B','A'].map(code=>regionRows(records,'metabo_case',code));
    expect(selected.map(rs=>[rs[0].source_cell,rs[0].denominator?.source_cell])).toEqual([['C12','B12'],['C9','B9']]);
    expect(JSON.stringify(records)).toBe(before);
  });
  it('never removes the final visible series and supports more than two',()=>{
    expect(toggleSeries(['A'],'A')).toEqual(['A']);
    expect(toggleSeries(['A','B','C'],'B')).toEqual(['A','C']);
    expect(toggleSeries(['B'],'A')).toEqual(['B','A']);
  });
  it('keeps the selected-data axis separate from visibility',()=>{
    const selected=[row('A',100),row('B',2)],visible=toggleSeries(['A','B'],'A');
    expect(visible).toEqual(['B']);expect(axisMaximum(selected)).toBeCloseTo(114);
    expect(selected.length).toBe(2);
  });
  it('uses unrounded values for signed differences',()=>{
    expect(difference(row('A',19.14),row('B',19.76))).toBeCloseTo(.62);
    expect(difference(row('B',19.76),row('A',19.14))).toBeCloseTo(-.62);
  });
  it.each(['population_scope','unit','definition_version','indicator_id'])('refuses a mismatched %s',(key)=>{
    expect(difference(row('A',19),{...row('B',20),[key]:'other'})).toBeNull();
  });
  it('refuses missing, unvalidated or unmatched years',()=>{
    for(const b of [{...row('B',20),value:null},{...row('B',20),validation_status:'failed'},row('B',20,2022)])expect(difference(row('A',19),b)).toBeNull();
  });
});
describe('label rectangles',()=>{
  const bounds={left:75,top:50,right:910,bottom:306};
  const point=(id:string,x:number,y:number)=>({id,x,y,width:46,height:18,text:'19.2',color:'blue'});
  it('keeps an isolated label at its normal position',()=>{
    expect(placeLabels([point('A',200,180)],bounds)[0].top).toBe(152);
  });
  it('separates close and identical values without losing labels',()=>{
    const placed=placeLabels([point('A',200,180),point('B',200,181),point('C',200,180)],bounds);
    expect(placed.length).toBe(3);for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)expect(overlaps(placed[i],placed[j])).toBe(false);
  });
  it('handles five regions, adjacent years and plot edges',()=>{
    const points=[80,475,870].flatMap(x=>Array.from({length:5},(_,i)=>point(`${x}-${i}`,x,x===80?50:x===870?300:180)));
    const placed=placeLabels(points,bounds);
    for(const r of placed){expect(r.left).toBeGreaterThanOrEqual(bounds.left);expect(r.left+r.width).toBeLessThanOrEqual(bounds.right);expect(r.top).toBeGreaterThanOrEqual(bounds.top);expect(r.top+r.height).toBeLessThanOrEqual(bounds.bottom);}
    for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)expect(overlaps(placed[i],placed[j])).toBe(false);
  });
});
