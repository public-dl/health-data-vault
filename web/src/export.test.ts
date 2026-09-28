import {afterEach,describe,expect,it,vi} from 'vitest';
import {copyImage,cardsPng,png,outputPng} from './export';
import {exportSurfaceFor} from './export-surface';
import {groupVisuals,indicatorColorAliases,presentationIndicator} from './visual-metadata';
import type {Indicator} from './model';

afterEach(()=>vi.unstubAllGlobals());
describe('visible export boundary',()=>{
 it('does not fall back to a panel, section or SVG without an explicit boundary',()=>{
  const closest=vi.fn().mockReturnValue(null);
  expect(()=>exportSurfaceFor({closest} as unknown as Element)).toThrow('対象カード');
  expect(closest).toHaveBeenCalledWith('[data-export-surface]');
 });
 it('rejects arbitrary wrappers and even closed source details inside a surface',async()=>{
  vi.stubGlobal('document',{fonts:{ready:Promise.resolve()}});
  await expect(cardsPng([{matches:()=>false} as unknown as Element],'side')).rejects.toThrow('明示されたカード');
  for(const privateNode of ['closed details','source dialog','audit data']){
   const querySelector=vi.fn().mockReturnValue(privateNode);
   await expect(cardsPng([{matches:()=>true,querySelector} as unknown as Element],'side')).rejects.toThrow('カードの外');
   expect(querySelector).toHaveBeenCalledWith('[data-export-private],dialog,details:not([data-export-notes]),.provenance');
  }
 });
 it('ends the PNG at the surface edge without a metadata footer or extra bottom padding',async()=>{
  const drawImage=vi.fn(),fillText=vi.fn(),blob=new Blob(['image'],{type:'image/png'});
  const canvas={width:0,height:0,getContext:()=>({scale:vi.fn(),fillRect:vi.fn(),drawImage,fillText}),toBlob:(callback:(b:Blob)=>void)=>callback(blob)};
  vi.stubGlobal('document',{fonts:{ready:Promise.resolve()},createElement:()=>canvas});
  vi.stubGlobal('XMLSerializer',class{serializeToString(){return '<svg/>';}});
  vi.stubGlobal('Image',class{src='';async decode(){}});
  const svg={cloneNode:()=>({setAttribute:vi.fn()}),viewBox:{baseVal:{width:1200,height:450}},dataset:{}} as unknown as SVGSVGElement;
  expect(await png(svg)).toBe(blob);
  expect(canvas.width).toBe(2400);expect(canvas.height).toBe(900);
  expect(drawImage).toHaveBeenCalledWith(expect.anything(),0,0,1200,450);
  expect(fillText).not.toHaveBeenCalled();
 });
});
describe('image clipboard contract',()=>{
 it('sends the unchanged rendered PNG to clipboard and download',async()=>{
  const image=new Blob(['exact rendered PNG'],{type:'image/png'}),rendered=Promise.resolve(image);
  const write=vi.fn().mockResolvedValue(undefined),createObjectURL=vi.fn().mockReturnValue('blob:test'),click=vi.fn(),dispatchEvent=vi.fn();
  class Item {constructor(public content:Record<string,Blob|Promise<Blob>>) {}}
  vi.stubGlobal('navigator',{clipboard:{write}});vi.stubGlobal('ClipboardItem',Item);
  vi.stubGlobal('URL',{createObjectURL,revokeObjectURL:vi.fn()});
  vi.stubGlobal('document',{createElement:()=>({click})});vi.stubGlobal('window',{dispatchEvent});
  vi.stubGlobal('CustomEvent',class{constructor(public type:string,public options:{detail:unknown}){}});
  await outputPng(rendered,'copy','card.png');
  expect(await write.mock.calls[0][0][0].content['image/png']).toBe(image);
  expect(createObjectURL).not.toHaveBeenCalled();
  await outputPng(rendered,'png','card.png');
  expect(createObjectURL).toHaveBeenCalledWith(image);expect(click).toHaveBeenCalledOnce();
  expect(dispatchEvent.mock.calls.map(([event])=>event.options.detail.blob)).toEqual([image,image]);
 });
 it('writes only image/png and keeps asynchronous rendering inside ClipboardItem',async()=>{
  const write=vi.fn().mockResolvedValue(undefined),writeText=vi.fn();
  class Item {constructor(public content:Record<string,Blob|Promise<Blob>>) {}}
  vi.stubGlobal('navigator',{clipboard:{write,writeText}});vi.stubGlobal('ClipboardItem',Item);
  const image=Promise.resolve(new Blob(['png'],{type:'image/png'}));
  await copyImage(image);
  expect(write.mock.calls[0][0][0].content).toEqual({'image/png':image});
  expect(writeText).not.toHaveBeenCalled();
 });
 it('explicitly rejects unsupported browsers without text fallback',async()=>{
  const writeText=vi.fn();vi.stubGlobal('navigator',{clipboard:{writeText}});vi.stubGlobal('ClipboardItem',undefined);
  await expect(copyImage(new Blob())).rejects.toThrow('画像コピーに対応していません');expect(writeText).not.toHaveBeenCalled();
 });
});
describe('blood pressure reuses metabo color objects',()=>{
 it('aliases the original tokens, including the exact palette reference',()=>{
  expect(indicatorColorAliases.bp_guidance).toBe(groupVisuals.metabo.preliminary);
  expect(indicatorColorAliases.bp_referral).toBe(groupVisuals.metabo.case);
  for(const id of ['bp_guidance','bp_referral']){
   const source={indicator_id:id,color:'original'} as Indicator;
   const view=presentationIndicator(source);
   expect(view.palette).toBe(indicatorColorAliases[id].palette);expect(view.color).toBe(indicatorColorAliases[id].color);
   expect(source.color).toBe('original');
  }
 });
});

describe('PNG clipboard fallback',()=>{
 function setup(supported=true,fail=false) {
  const click=vi.fn(),createObjectURL=vi.fn().mockReturnValue('blob:test');
  const write=vi.fn().mockImplementation(async(items)=>{await items[0].content['image/png'];if(fail)throw new DOMException('Write permission denied','NotAllowedError');});
  class Item {constructor(public content:Record<string,Blob|Promise<Blob>>) {}}
  vi.stubGlobal('navigator',{clipboard:{write}});vi.stubGlobal('ClipboardItem',supported?Item:undefined);
  vi.stubGlobal('URL',{createObjectURL,revokeObjectURL:vi.fn()});
  vi.stubGlobal('document',{createElement:()=>({click})});vi.stubGlobal('window',{dispatchEvent:vi.fn()});
  vi.stubGlobal('CustomEvent',class{constructor(public type:string,public options:unknown){}});
  return {write,click,createObjectURL};
 }
 it('starts write before asynchronous PNG rendering resolves',async()=>{
  const {write,click}=setup();let resolve!:(b:Blob)=>void;
  const pending=new Promise<Blob>(r=>{resolve=r;});
  const result=outputPng(pending,'copy','comparison.png');
  expect(write).toHaveBeenCalledOnce();
  resolve(new Blob(['png'],{type:'image/png'}));
  expect(await result).toBe('copied');expect(click).not.toHaveBeenCalled();
 });
 for(const [label,supported,fail] of [['unsupported ClipboardItem',false,false],['write rejection',true,true]] as const) {
  it(`saves the same generated PNG on ${label}`,async()=>{
   const {click,createObjectURL}=setup(supported,fail);
   const blob=new Blob(['png'],{type:'image/png'});
   expect(await outputPng(Promise.resolve(blob),'copy','comparison.png')).toBe('fallback');
   expect(createObjectURL).toHaveBeenCalledExactlyOnceWith(blob);expect(click).toHaveBeenCalledOnce();
  });
 }
 for(const blob of [new Blob([],{type:'image/png'}),new Blob(['wrong'],{type:'text/plain'})]) {
  it('does not save invalid PNG output or report success',async()=>{
   const {click}=setup();
   await expect(outputPng(Promise.resolve(blob),'copy','bad.png')).rejects.toThrow('PNG生成失敗');
   expect(click).not.toHaveBeenCalled();
  });
 }
 it('preserves render failure and does not download a fake PNG',async()=>{
  const {click}=setup(false);
  await expect(outputPng(Promise.reject(new Error('canvas failed')),'copy','bad.png')).rejects.toThrow('canvas failed');
  expect(click).not.toHaveBeenCalled();
 });
});
