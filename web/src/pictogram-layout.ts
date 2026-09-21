// SVG units retain the existing person size. Only the grid geometry changes.
export const PICTOGRAM_SCALE=585/620;
export function pictogramLayout(availableWidth:number,singleRegion:boolean) {
 const wide=singleRegion&&availableWidth>=810*PICTOGRAM_SCALE;
 const sideLegend=wide&&availableWidth>=960*PICTOGRAM_SCALE;
 const columns=wide?20:10,rows=100/columns,pitch=29,rowPitch=sideLegend?52:32;
 const narrow=!wide&&availableWidth<620*PICTOGRAM_SCALE;
 const width=sideLegend?960:wide?810:narrow?325:620,height=sideLegend?328:wide?330:narrow?335:410;
 const position=(index:number)=>{const col=index%columns;return {x:15+col*pitch+Math.floor(col/5)*8,y:39+Math.floor(index/columns)*rowPitch};};
 const guides=Array.from({length:columns/5-1},(_,i)=>{const end=(i+1)*5-1;return(position(end).x+position(end+1).x)/2+12*.8;});
 return {wide,sideLegend,columns,rows,narrow,pitch,rowPitch,width,height,position,guides,guideBottom:39+(rows-1)*rowPitch+25,
   legendPosition:(index:number)=>sideLegend?{x:635,y:48+index*66}:wide?{x:15+index*200,y:218}:{x:335,y:64+index*76},
   noteY:sideLegend?292:wide?304:382,
   viewBox:narrow?`0 32 ${width} ${height}`:`0 0 ${width} ${height}`,
   exportViewBox:sideLegend?'0 0 960 328':wide?'0 0 810 330':'0 0 620 410',exportWidth:sideLegend?960:wide?810:620,
   cssWidth:width*PICTOGRAM_SCALE,cssHeight:height*PICTOGRAM_SCALE};
}
