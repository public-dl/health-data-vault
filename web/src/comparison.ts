import type {Observation} from './model';

export function regionRows(records:Observation[], indicator:string, code:string) {
  return records.filter(r=>r.indicator_id===indicator && r.geography_code===code).sort((a,b)=>a.observation_fiscal_year-b.observation_fiscal_year);
}
export function toggleSeries(visible:string[], code:string) {
  return visible.includes(code) ? (visible.length===1 ? visible : visible.filter(c=>c!==code)) : [...visible,code];
}
export const axisMaximum=(rows:Observation[])=>Math.max(1,...rows.map(r=>r.value??0))*1.14;
export function difference(a:Observation|undefined,b:Observation|undefined):number|null {
  if(!a||!b||a.value==null||b.value==null||!a.comparison_allowed||!b.comparison_allowed||a.comparability_status!=='compatible'||b.comparability_status!=='compatible'||a.validation_status!=='passed'||b.validation_status!=='passed'||a.unit!==b.unit||a.population_scope!==b.population_scope||a.indicator_id!==b.indicator_id||a.observation_fiscal_year!==b.observation_fiscal_year||a.definition_version!==b.definition_version)return null;
  return b.value-a.value;
}
export type LabelPoint={id:string;x:number;y:number;width:number;height:number;text:string;color:string};
export type PlacedLabel=LabelPoint&{left:number;top:number};
export function overlaps(a:PlacedLabel,b:PlacedLabel,gap=4) {
  return a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
}
// Greedy rectangle placement with measured text widths; independent of series count.
export function placeLabels(points:LabelPoint[],bounds:{left:number;top:number;right:number;bottom:number}):PlacedLabel[] {
  const placed:PlacedLabel[]=[];
  for(const p of points) {
    const candidates:PlacedLabel[]=[];
    for(let step=0;step<18;step++)for(const direction of [-1,1]) {
      const top=p.y+(direction<0 ? -p.height-10-step*(p.height+6) : 10+step*(p.height+6));
      candidates.push({...p,left:Math.max(bounds.left,Math.min(bounds.right-p.width,p.x-p.width/2)),top:Math.max(bounds.top,Math.min(bounds.bottom-p.height,top))});
    }
    const candidate=candidates.find(r=>!placed.some(o=>overlaps(r,o)))??candidates.reduce((best,r)=>placed.filter(o=>overlaps(r,o)).length<placed.filter(o=>overlaps(best,o)).length?r:best);
    placed.push(candidate);
  }
  return placed;
}
