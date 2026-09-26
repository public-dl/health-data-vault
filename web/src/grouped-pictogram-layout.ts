// Positions only: allocation is supplied by the existing allocateHundred contract.
export function groupedPictogramLayout(availableWidth:number,allocation:number[]){
 const width=Math.max(240,Math.floor(availableWidth||600));
 const stacked=width<480,pitch=27,rowPitch=32;
 const gridWidth=stacked?width:width-190;
 const columns=Math.max(1,Math.floor((gridWidth-12)/pitch));
 const points:{x:number;y:number}[]=[],labels:{x:number;y:number}[]=[];
 let top=12;
 allocation.forEach(count=>{
  const gridTop=top+(stacked?88:0);
  labels.push({x:stacked?6:gridWidth+16,y:top+14});
  for(let i=0;i<count;i++)points.push({x:6+(i%columns)*pitch,y:gridTop+Math.floor(i/columns)*rowPitch});
  const gridHeight=Math.ceil(count/columns)*rowPitch;
  top+= (stacked?88+gridHeight:Math.max(88,gridHeight))+24;
 });
 return {width,height:top,columns,stacked,labels,position:(index:number)=>points[index]};
}

export function hundredGridLayout(availableWidth:number,allocation:number[]){
 const width=Math.max(240,Math.floor(availableWidth||600));
 const columns=width>=480?20:10;
 const pitch=Math.min(29,(width-12)/columns),gridWidth=columns*pitch;
 const left=(width-gridWidth)/2;
 const rows=Math.ceil(100/columns),gridHeight=rows*32;
 const labelColumns=width>=680?allocation.length:width>=480?2:1;
 const labels=allocation.map((_,i)=>({x:12+(i%labelColumns)*width/labelColumns,y:gridHeight+36+Math.floor(i/labelColumns)*96}));
 return {width,height:gridHeight+40+Math.ceil(allocation.length/labelColumns)*96,columns,stacked:false,labels,position:(i:number)=>({x:left+(i%columns)*pitch,y:12+Math.floor(i/columns)*32})};
}
