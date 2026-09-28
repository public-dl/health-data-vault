import type {MapScale} from './map-scale';
/** Display policy only; statistical release records and legacy breaks remain immutable. */
export type MetaboMapScale=MapScale & {
 indicator_id:string;category_id:string;unit:'%';domain_version:string;
 display_only:true;medical_threshold:false;palette_version:string;
 interpolation_method:'piecewise-srgb';clamp_method:'endpoints-with-label';
 effective_from_release:string;reviewed_at:string;review_reason:string;ticks:number[];
};
const policy={mode:'continuous',unit:'%',domain_version:'metabo-continuous-v1',
 display_only:true,medical_threshold:false,palette_version:'metabo-existing-five-stops-v1',
 interpolation_method:'piecewise-srgb',clamp_method:'endpoints-with-label',
 effective_from_release:'1e0b2f10ab797f8f635573d522c212f8f223d6d195851bddbd7fdb13cf3c9b17',
 reviewed_at:'2026-09-29',review_reason:'User-approved display domains after the 2021–2023 / 44-region audit; 528/528 values covered. Not medical thresholds.'} as const;
export const metaboMapScales:Record<string,MetaboMapScale>=Object.fromEntries([
 ['case',10,40,[10,20,30,40]],['preliminary',5,20,[5,10,15,20]],
 ['noncase',40,85,[40,55,70,85]],['indeterminate',0,4,[0,1,2,3,4]],
].map(([category,min,max,ticks])=>{const id='metabo_'+category;return [id,{...policy,indicator_id:id,category_id:category,min,max,ticks} as MetaboMapScale];}));
