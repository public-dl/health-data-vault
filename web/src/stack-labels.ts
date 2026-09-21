import {formatValue} from './model';

export type Rect={left:number;top:number;width:number;height:number};
export type StackLabelInput={id:string;barId:string;text:string;color:string;bar:Rect;segmentTop:number;segmentHeight:number;width:number;height:number;side:'left'|'right'};
export type StackLabel=StackLabelInput&Rect&{inside:boolean;anchorX:number;anchorY:number};
export const intersects=(a:Rect,b:Rect,gap=4)=>a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
export function stackValueText(value:number|null,unit:string,state:string) {
  return value==null?`表示不可（${state}）`:formatValue(value,unit)+unit;
}
/** Reserve all bars and labels across years/regions. Never drop a small or zero value.
 * The caller extends the SVG and moves its footer when extra rows are required. */
export function placeStackLabels(inputs:StackLabelInput[],bounds:{left:number;right:number;top:number;bottom:number}):StackLabel[] {
  const placed:StackLabel[]=[],external:StackLabelInput[]=[];
  const bars=[...new Map(inputs.map(i=>[i.barId,i.bar])).values()];
  for(const input of inputs) {
    if(input.segmentHeight>=input.height+8&&input.bar.width>=input.width+12) {
      placed.push({...input,left:input.bar.left+(input.bar.width-input.width)/2,
        top:input.segmentTop+(input.segmentHeight-input.height)/2,inside:true,
        anchorX:input.bar.left+input.bar.width/2,anchorY:input.segmentTop+input.segmentHeight/2});
    }else external.push(input);
  }
  const clear=(r:Rect)=>!placed.some(p=>intersects(r,p))&&!bars.some(b=>intersects(r,b,5));
  for(const input of external) {
    const centerY=input.segmentTop+input.segmentHeight/2;
    const preferred=input.side==='left'?input.bar.left-input.width-10:input.bar.left+input.bar.width+10;
    const candidates:Rect[]=[];
    for(const side of [input.side,input.side==='left'?'right':'left'])for(let lane=0;lane<4;lane++) {
      const left=side==='left'?input.bar.left-input.width-10-lane*(input.width+10):input.bar.left+input.bar.width+10+lane*(input.width+10);
      for(let step=0;step<24;step++)for(const direction of step===0?[0]:[-1,1]) {
        const top=Math.max(bounds.top,Math.min(bounds.bottom-input.height,centerY-input.height/2+direction*step*(input.height+6)));
        if(left>=bounds.left&&left+input.width<=bounds.right)candidates.push({left,top,width:input.width,height:input.height});
      }
    }
    candidates.sort((a,b)=>(Math.abs(a.top+input.height/2-centerY)+1.5*Math.abs(a.left-preferred))-(Math.abs(b.top+input.height/2-centerY)+1.5*Math.abs(b.left-preferred)));
    let rect=candidates.find(clear);
    if(!rect) {
      let top=bounds.bottom+8;
      const left=Math.max(bounds.left,Math.min(bounds.right-input.width,preferred));
      while(!clear({left,top,width:input.width,height:input.height}))top+=input.height+6;
      rect={left,top,width:input.width,height:input.height};
    }
    placed.push({...input,...rect,inside:false,
      anchorX:rect.left+rect.width/2<input.bar.left+input.bar.width/2?input.bar.left:input.bar.left+input.bar.width,
      anchorY:centerY});
  }
  return placed;
}
