/** Display-only colors. Preserve data domains, breaks, units and category hues. */
export const mapPaletteVersion='map-luminance-v1';
const linear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
export function luminance(hex:string){return [1,3,5].map(i=>linear(parseInt(hex.slice(i,i+2),16)/255)).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);}
export function accessibleMapPalette(palette:string[]){
 const stops=[.64,.33,.16,.066,.015];
 return palette.map((hex,i)=>{
  const at=i*(stops.length-1)/Math.max(1,palette.length-1),lo=Math.floor(at),hi=Math.ceil(at);
  const target=stops[lo]+(stops[hi]-stops[lo])*(at-lo),old=luminance(hex);
  const rgb=[1,3,5].map(p=>linear(parseInt(hex.slice(p,p+2),16)/255));
  const channels=rgb.map(c=>old>=target?c*target/old:c+(1-c)*(target-old)/(1-old));
  return '#'+channels.map(c=>Math.round(255*(c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055)).toString(16).padStart(2,'0')).join('');
 });
}
