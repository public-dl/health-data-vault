import {describe,it,expect} from 'vitest';
import {pictogramLayout,PICTOGRAM_SCALE} from './pictogram-layout';
describe('100-person grid geometry',()=>{
 it('single region uses 20 by 5; comparison stays 10 by 10 even in wide stacked cards',()=>{
  expect(pictogramLayout(1200,true).columns).toBe(20);
  for(const width of [590,1200])expect(pictogramLayout(width,false).columns).toBe(10);
  expect(pictogramLayout(1200,true).rows).toBe(5);
  expect(pictogramLayout(320,true).columns).toBe(10);
 });
 it('all layouts preserve 100 row-major positions, constant person scale and left alignment',()=>{
  for(const layout of [pictogramLayout(1200,true),pictogramLayout(590,false),pictogramLayout(1200,false),pictogramLayout(320,true)]){
   const positions=Array.from({length:100},(_,i)=>layout.position(i));
   expect(new Set(positions.map(p=>p.x)).size).toBe(layout.columns);
   expect(new Set(positions.map(p=>p.y)).size).toBe(layout.rows);
   expect(new Set(positions.map(p=>`${p.x},${p.y}`)).size).toBe(100);
   expect(positions[0].x).toBe(15);
   expect(positions[layout.columns].x).toBe(15);
   expect(positions[layout.columns].y-positions[0].y).toBe(layout.rowPitch);
   expect(layout.cssWidth/layout.width).toBeCloseTo(PICTOGRAM_SCALE);
   layout.guides.forEach((x,i)=>{expect(x).toBeGreaterThan(positions[i*5+4].x+24*.8);expect(x).toBeLessThan(positions[i*5+5].x);});
   expect(layout.guides).toHaveLength(layout.columns/5-1);
  }
 });
 it('exports use the same grid geometry, keeping mobile legends in the export',()=>{
  const wide=pictogramLayout(1200,true),mobile=pictogramLayout(320,true);
  expect(wide.exportViewBox).toBe(wide.viewBox);
  expect(wide.sideLegend).toBe(true);
  expect(wide.pitch).toBe(29);
  expect(wide.legendPosition(0).x/wide.width).toBeCloseTo(.66,1);
  expect(wide.noteY-wide.guideBottom).toBeLessThan(25);
  expect(wide.height).toBeLessThan(350);
  expect(wide.legendPosition(0).x).toBeGreaterThan(wide.position(19).x+24);
  expect(wide.legendPosition(3).x).toBe(wide.legendPosition(0).x);
  expect(wide.exportViewBox).toBe('0 0 960 328');
  expect(pictogramLayout(800,true).columns).toBe(20);
  expect(pictogramLayout(800,true).sideLegend).toBe(false);
  expect(mobile.exportViewBox).toBe('0 0 620 410');
  expect(mobile.columns).toBe(10);
 });
 it('comparison removal restores wide grid; resizing does not affect category allocation',()=>{
  expect([true,false,true].map(single=>pictogramLayout(1200,single).columns)).toEqual([20,10,20]);
  expect(pictogramLayout(810*PICTOGRAM_SCALE-1,true).columns).toBe(10);
  expect(pictogramLayout(810*PICTOGRAM_SCALE,true).columns).toBe(20);
 });
});
