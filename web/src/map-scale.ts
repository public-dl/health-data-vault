export type MapScale={mode:'continuous';min:number;max:number;ticks?:number[];interpolation_method?:'piecewise-srgb';clamp_method?:'endpoints-with-label'};
export function mapRangeLabel(value:number|null|undefined,scale?:MapScale):string {
 if(value==null||!Number.isFinite(value)||scale?.clamp_method!=='endpoints-with-label')return '';
 return value<scale.min?'表示範囲より低い':value>scale.max?'表示範囲より高い':'';
}
export function mapGradient(palette:string[],scale:MapScale):string {
 return `linear-gradient(to right, ${(scale.interpolation_method==='piecewise-srgb'?palette:[palette[0],palette.at(-1)!]).join(', ')})`;
}
// Presentation ranges cover the audited 2021–2023 records. Never derive from filters.
export const recipientMapScales:Record<string,MapScale>={
 bp_guidance:{mode:'continuous',min:15,max:35},
 bp_referral:{mode:'continuous',min:15,max:45},
 lipid_people:{mode:'continuous',min:50,max:80},
 triglycerides:{mode:'continuous',min:20,max:42},
 hdl:{mode:'continuous',min:2,max:13},
 ldl:{mode:'continuous',min:30,max:65},
 total_cholesterol:{mode:'continuous',min:0,max:55},
};
/** Linear sRGB interpolation of the existing light/dark color-family endpoints. */
export function mapFill(value:number|null|undefined,palette:string[],breaks:number[],scale?:MapScale):string|null {
 if(value==null||!Number.isFinite(value))return null;
 if(!scale)return palette[breaks.filter(b=>value>=b).length];
 const t=Math.max(0,Math.min(1,(value-scale.min)/(scale.max-scale.min)));
 const channels=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const stops=scale.interpolation_method==='piecewise-srgb'?palette:[palette[0],palette.at(-1)!];
 const position=t*(stops.length-1),index=Math.min(stops.length-2,Math.floor(position));
 const fraction=position-index;
 const low=channels(stops[index]),high=channels(stops[index+1]);
 return '#'+low.map((v,i)=>Math.round(v+(high[i]-v)*fraction).toString(16).padStart(2,'0')).join('');
}
