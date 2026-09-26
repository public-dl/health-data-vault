// Visual identity matching only. The supplied allocation/order is never changed.
export type PersonIdentity={id:number;category:string};
export function matchPeople(previous:PersonIdentity[],categories:string[]):PersonIdentity[]{
 const used=new Set<number>();const result:(PersonIdentity|undefined)[]=categories.map(category=>{
  const person=previous.find(p=>p.category===category&&!used.has(p.id));
  if(person){used.add(person.id);return {id:person.id,category};}return undefined;
 });
 const spare=Array.from({length:categories.length},(_,id)=>id).filter(id=>!used.has(id));
 return result.map((person,i)=>person??{id:spare.shift()!,category:categories[i]});
}
export const personMotion={duration:550,easing:'cubic-bezier(0.22, 1, 0.36, 1)'};
