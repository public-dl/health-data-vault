import {it,expect} from 'vitest';
import releaseText from '../public/public-data/releases/1e0b2f10ab797f8f635573d522c212f8f223d6d195851bddbd7fdb13cf3c9b17.json?raw';
import {presentationGroup,presentationAllocation} from './presentation-order';
import {allocateHundred} from './visual-metadata';
import {annualComposition} from './annual-model';
import {displayData,type Payload,type IndicatorGroup} from './model';

const raw=JSON.parse(releaseText).annual as Payload;
const source=raw.indicator_groups![0];

it('orders physician display without mutating category metadata or other groups',()=>{
  const before=JSON.stringify(source),result=presentationGroup(source);
  expect(result.categories.map(c=>c.category_id)).toEqual(['referral','guidance','normal']);
  expect(JSON.stringify(source)).toBe(before);
  for(const c of result.categories)expect(c).toBe(source.categories.find(x=>x.category_id===c.category_id));
  const other={...source,group_id:'metabo'};expect(presentationGroup(other)).toBe(other);
});
it('preserves original allocation tie-breaking while rearranging the people',()=>{
  const group=presentationGroup(source);
  // Original normal/guidance/referral rates: first two share the largest remainder.
  const original=[33.5,33.5,33];
  expect(allocateHundred(original)).toEqual([34,33,33]);
  expect(presentationAllocation(group,source,[33,33.5,33.5])).toEqual([33,33,34]);
});
it('preserves every physician count, percentage, proof and rounded person count in all 44 regions / 3 years',()=>{
  const data=displayData(raw,'rate'),group=presentationGroup(source),before=JSON.stringify(raw);
  let checked=0;
  for(const region of data.geographies)for(const year of data.years){
    const original=annualComposition(data,source,region.code,year)!;
    const shown=annualComposition(data,group,region.code,year)!;
    expect(original).not.toBeNull();expect(shown).not.toBeNull();
    expect(shown.proof).toBe(original.proof);expect(shown.denominator).toBe(original.denominator);
    for(const row of shown.rows)expect(row).toBe(original.rows.find(r=>r.indicator_id===row.indicator_id));
    const old=allocateHundred(original.rows.map(r=>r.value))!;
    const next=presentationAllocation(group,source,shown.rows.map(r=>r.value))!;
    for(const [i,c] of group.categories.entries())expect(next[i]).toBe(old[source.categories.findIndex(x=>x.category_id===c.category_id)]);
    checked++;
  }
  expect(checked).toBe(132);expect(JSON.stringify(raw)).toBe(before);
});
