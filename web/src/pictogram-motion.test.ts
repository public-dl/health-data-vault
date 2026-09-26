import {expect,it} from 'vitest';
import {matchPeople} from './pictogram-motion';
it('preserves 100 identities and the exact allocation while moving retained categories',()=>{
 const before=Array.from({length:100},(_,id)=>({id,category:id<20?'red':id<30?'orange':'blue'}));
 const categories=Array.from({length:100},(_,i)=>i<18?'red':i<27?'orange':'blue');
 const after=matchPeople(before,categories);
 expect(after.map(p=>p.category)).toEqual(categories);
 expect(new Set(after.map(p=>p.id)).size).toBe(100);
 expect(after[18].id).toBe(20);
 expect(matchPeople(after,categories)).toEqual(after);
});
it('keeps unique identities across a completely different composition',()=>{
 const previous=matchPeople([],Array(100).fill('a'));
 const next=matchPeople(previous,Array(100).fill('b'));
 expect(next).toHaveLength(100);expect(new Set(next.map(p=>p.id)).size).toBe(100);
 expect(next.every(p=>p.category==='b')).toBe(true);
});
