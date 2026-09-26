import {it,expect} from 'vitest';
import {groupedPictogramLayout,hundredGridLayout} from './grouped-pictogram-layout';
import {allocateHundred} from './visual-metadata';
it('only changes positions, preserving category allocation at every width',()=>{
 const allocation=allocateHundred([19.3,9.1,71.1,.5])!;
 for(const width of [280,390,600,1000]){
  const original=[...allocation],g=groupedPictogramLayout(width,allocation);
  expect(allocation).toEqual(original);expect(allocation.reduce((a,b)=>a+b,0)).toBe(100);
  const p=Array.from({length:100},(_,i)=>g.position(i));
  expect(new Set(p.map(v=>`${v.x},${v.y}`)).size).toBe(100);
  expect(p.every(v=>v.x+20<=width&&v.y+25<=g.height)).toBe(true);
  let offset=0;allocation.forEach((n,i)=>{if(n)expect(g.position(offset).y).toBeLessThan(g.labels[i+1]?.y??g.height);offset+=n;});
 }
});
it('keeps a label for zero allocations without inventing people',()=>{
 const g=groupedPictogramLayout(600,[0,100,0]);expect(g.labels).toHaveLength(3);
 expect(g.position(99)).toBeDefined();expect(g.position(100)).toBeUndefined();
});

it('grid/grouped round trips preserve the exact 100 category assignments',()=>{
 const allocation=allocateHundred([19.3,9.1,71.1,.5])!;
 const categories=allocation.flatMap((n,i)=>Array(n).fill(i));
 for(const width of [345,500,1000])for(const layout of [hundredGridLayout,groupedPictogramLayout,hundredGridLayout]){
  const g=layout(width,allocation);expect(categories).toHaveLength(100);
  expect(new Set(categories.map((_,i)=>JSON.stringify(g.position(i)))).size).toBe(100);
  expect(allocation).toEqual([19,9,71,1]);
 }
 expect(hundredGridLayout(1000,allocation).columns).toBe(20);
 expect(hundredGridLayout(345,allocation).columns).toBe(10);
});
