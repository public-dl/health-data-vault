export type MapScale={mode:'continuous';min:number;max:number};
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
 const low=channels(palette[0]),high=channels(palette.at(-1)!);
 return '#'+low.map((v,i)=>Math.round(v+(high[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
