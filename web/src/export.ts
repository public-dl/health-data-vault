export function save(blob:Blob,filename:string) {
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function png(svg:SVGSVGElement):Promise<Blob> {
  await document.fonts.ready;
  const copy=svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const original=svg.viewBox.baseVal;
  const exportBox=svg.dataset.exportViewbox?.split(' ').map(Number);
  const box=exportBox?{width:exportBox[2],height:exportBox[3]}:original;
  if(exportBox)copy.setAttribute('viewBox',exportBox.join(' '));
  copy.setAttribute('width',String(box.width));copy.setAttribute('height',String(box.height));
  // All SVG marks have explicit paints and text attributes for standalone export.
  // A data URL also keeps an inline HTML foreignObject canvas origin-clean.
  const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));
  try {
    const img=new Image();img.src=url;await img.decode();
    const width=Math.max(960,box.width),scale=2,canvas=document.createElement('canvas');
    const height=Math.ceil(box.height*width/box.width);
    canvas.width=width*scale;canvas.height=height*scale;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('画像生成に対応していません');
    ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
    ctx.drawImage(img,0,0,width,box.height*width/box.width);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG生成失敗')),'image/png'));
  } finally {URL.revokeObjectURL(url);}
}
export async function copyImage(blob:Blob|Promise<Blob>) {
  if(!navigator.clipboard?.write || !globalThis.ClipboardItem)throw new Error('このブラウザでは画像コピーに対応していません。「PNG保存」を使用してください。');
  // Start write during the click, before asynchronous font/image rendering consumes activation.
  await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
}

/** Copy and download consume the exact same renderer, without any metadata append step. */
export async function outputPng(rendered:Promise<Blob>,action:'copy'|'png',filename:string) {
 if(action==='copy')await copyImage(rendered);
 const blob=await rendered;
 if(action==='png')save(blob,filename);
 window.dispatchEvent(new CustomEvent('hdv-export-result',{detail:{blob,action,filename}}));
}

/** Capture the actual shared card DOM, including computed table/map/KPI styles. */
export async function cardsPng(elements:Element[],layout:'side'|'stack'|'grid'):Promise<Blob> {
 await document.fonts.ready;
 if(!elements.length)throw new Error('コピーするカードが見つかりません');
 for(const element of elements){
  if(!element.matches('[data-export-surface]'))throw new Error('明示されたカード以外は画像出力できません');
  if(element.querySelector('[data-export-private],dialog,details,.provenance'))throw new Error('詳細情報は画像出力カードの外に配置してください');
 }
 const overflows=elements.map(el=>Math.max(0,...Array.from(el.querySelectorAll('.table-scroll')).map(area=>area.scrollWidth-area.clientWidth)));
 const boxes=elements.map((el,i)=>({width:Math.ceil(Math.max(el.getBoundingClientRect().width,el.scrollWidth)+overflows[i]),height:Math.ceil(Math.max(el.getBoundingClientRect().height,el.scrollHeight))}));
 const gap=24,columns=layout==='stack'?1:layout==='grid'?Math.min(2,boxes.length):boxes.length;
 const columnWidths=Array.from({length:columns},(_,col)=>Math.max(...boxes.filter((_,i)=>i%columns===col).map(b=>b.width)));
 const rowHeights=Array.from({length:Math.ceil(boxes.length/columns)},(_,row)=>Math.max(...boxes.slice(row*columns,(row+1)*columns).map(b=>b.height)));
 const width=columnWidths.reduce((a,b)=>a+b,0)+gap*(columns-1),height=rowHeights.reduce((a,b)=>a+b,0)+gap*(rowHeights.length-1);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 elements.forEach((element,index)=>{
  const x=columnWidths.slice(0,index%columns).reduce((a,b)=>a+b+gap,0),y=rowHeights.slice(0,Math.floor(index/columns)).reduce((a,b)=>a+b+gap,0);
  const clone=element.cloneNode(true) as HTMLElement;
  const source=[element,...element.querySelectorAll('*')],target=[clone,...clone.querySelectorAll('*')];
  source.forEach((original,j)=>{
   if(original.closest('.actions,.comparison-export,.export-only'))return;
   const style=getComputedStyle(original),out=target[j] as HTMLElement|SVGElement;
   // SVG geometry already lives in attributes. Copy its paints/typography without
   // thousands of irrelevant HTML properties per person in a 100-person diagram.
   const properties=original.namespaceURI==='http://www.w3.org/2000/svg'
    ? ['display','visibility','opacity','width','height','max-width','max-height','margin','position','top','left','overflow','color','fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','paint-order','font-family','font-size','font-weight','font-style','letter-spacing','text-anchor','dominant-baseline','transform','transform-origin','clip-path','mask','filter']
    : Array.from(style);
   for(const property of properties)out.style.setProperty(property,style.getPropertyValue(property));
   // Grid auto margins can compute to 0px although they center the visible block.
   for(const property of ['margin-inline','margin-left','margin-right']){
    if((original as HTMLElement).style.getPropertyValue(property)==='auto')out.style.setProperty(property,'auto');
   }
   // A horizontally scrollable table exports all fiscal-year columns, not a crop.
   if(overflows[index]&&original.querySelector('.table-scroll')&&Number.isFinite(parseFloat(style.width)))out.style.width=(parseFloat(style.width)+overflows[index])+'px';
   out.style.setProperty('animation','none');out.style.setProperty('transition','none');
   if(style.position==='sticky'){out.style.position='static';out.style.removeProperty('left');out.style.removeProperty('top');}
  });
  clone.querySelectorAll('.actions,.comparison-export,.export-only').forEach(el=>el.remove());
  clone.style.margin='0';clone.style.width=boxes[index].width+'px';clone.style.height='auto';clone.style.maxWidth='none';
  // Computed table heights include caption/border sizing differently when serialized.
  // Let the cloned table retain its content-driven height instead of fixing every row.
  clone.querySelectorAll('table,.table-scroll').forEach(el=>{(el as HTMLElement).style.height='auto';});
  clone.querySelectorAll('.table-scroll,.chart-scroll').forEach(el=>{(el as HTMLElement).style.overflow='visible';});
  const foreign=document.createElementNS(ns,'foreignObject');foreign.setAttribute('x',String(x));foreign.setAttribute('y',String(y));foreign.setAttribute('width',String(boxes[index].width));foreign.setAttribute('height',String(boxes[index].height));foreign.append(clone);svg.append(foreign);
 });
 return png(svg);
}
