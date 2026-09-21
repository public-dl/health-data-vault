import {describe,it,expect} from 'vitest';
import {placeStackLabels,intersects,stackValueText,type StackLabelInput} from './stack-labels';
const bounds={left:0,right:960,top:20,bottom:320};
const input=(id:string,x=150,h=4,width=48):StackLabelInput=>({id,barId:String(x),text:'0.3%',color:'#123456',bar:{left:x,top:80,width:72,height:240},segmentTop:80,segmentHeight:h,width,height:22,side:'left'});
describe('stacked value labels',()=>{
 it('uses inside only when height and measured width fit',()=>{
  expect(placeStackLabels([input('a',150,80)],bounds)[0].inside).toBe(true);
  expect(placeStackLabels([input('a',150,80,90)],bounds)[0].inside).toBe(false);
  expect(placeStackLabels([input('a')],bounds)[0].inside).toBe(false);
 });
 it('keeps every zero and adjacent small label across regions and years without collisions',()=>{
  const values=[150,234,430,514,710,794].flatMap(x=>[0,1,2,3].map(i=>({...input(`${x}-${i}`,x,i===0?0:2),segmentTop:80+i*2})));
  const before=JSON.stringify(values),labels=placeStackLabels(values,bounds);
  expect(labels).toHaveLength(24);expect(JSON.stringify(values)).toBe(before);
  labels.forEach((l,i)=>{expect(l.inside).toBe(false);labels.slice(i+1).forEach(other=>expect(intersects(l,other)).toBe(false));values.forEach(v=>expect(intersects(l,v.bar,5)).toBe(false));});
 });
 it('extends below the plot instead of dropping crowded labels',()=>{
  const labels=placeStackLabels(Array.from({length:30},(_,i)=>input(String(i),100,0,70)),{left:0,right:240,top:80,bottom:100});
  expect(labels).toHaveLength(30);expect(labels.some(l=>l.top>100)).toBe(true);
  labels.forEach((l,i)=>labels.slice(i+1).forEach(other=>expect(intersects(l,other)).toBe(false)));
 });
 it('formats actual zero separately from missing/error states without changing values',()=>{
  expect(stackValueText(0,'%','numeric')).toBe('0.0%');expect(stackValueText(0,'人','numeric')).toBe('0人');
  expect(stackValueText(null,'%','excel_error')).toBe('表示不可（excel_error）');
  expect(stackValueText(null,'人','blank')).toBe('表示不可（blank）');
  expect(stackValueText(0.256,'%','numeric')).toBe('0.3%');
 });
});

// Verified prefectural values from public-3 candidate f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17.
// Original cells: E6 (case), D6 (preliminary), C6 (noncase), F6 (indeterminate).
const prefecturalMetabo=[
 {year:2021,denominator:117144,counts:[22401,11143,83091,509]},
 {year:2022,denominator:116311,counts:[22419,10783,82632,477]},
 {year:2023,denominator:113771,counts:[21934,10400,80906,531]},
];
describe('actual 2021–2023 prefectural metabolic composition regression',()=>{
 for(const unit of ['%','人'])it(`always places all 12 actual values in ${unit} without clipping`,()=>{
  const max=unit==='%'?100:117144*1.1;
  const values=prefecturalMetabo.flatMap((f,yearIndex)=>{
   let cumulative=0;
   return f.counts.map((count,i)=>{
    const value=unit==='%'?count/f.denominator*100:count;
    const height=value/max*240;cumulative+=value;
    const text=stackValueText(value,unit,'numeric');
    return {...input(`${f.year}-${i}`,184+yearIndex*280,height,Math.ceil(text.length*8)+8),text,
      segmentTop:320-cumulative/max*240,
      bar:{left:184+yearIndex*280,top:320-(unit==='%'?100:f.denominator)/max*240,width:72,height:(unit==='%'?100:f.denominator)/max*240}};
   });
  });
  const labels=placeStackLabels(values,{left:75,right:940,top:55,bottom:332});
  expect(labels.map(l=>l.id).sort()).toEqual(values.map(l=>l.id).sort());
  expect(labels).toHaveLength(12);
  for(const f of prefecturalMetabo){
   const tiny=labels.find(l=>l.id===`${f.year}-3`)!;
   expect(tiny.inside).toBe(false);expect(tiny.text).toBe(unit==='%'?(f.year===2023?'0.5%':'0.4%'):f.counts[3]+'人');
  }
  const footerShift=Math.max(0,...labels.map(l=>l.top+l.height-332));
  labels.forEach((l,i)=>{
   expect(l.left).toBeGreaterThanOrEqual(75);expect(l.left+l.width).toBeLessThanOrEqual(940);
   expect(l.top).toBeGreaterThanOrEqual(55);expect(l.top+l.height).toBeLessThanOrEqual(332+footerShift);
   expect(l.top+l.height).toBeLessThan(345+footerShift);
   expect(l.text).toBe(values.find(v=>v.id===l.id)!.text);
   labels.slice(i+1).forEach(other=>expect(intersects(l,other)).toBe(false));
  });
 });
});
