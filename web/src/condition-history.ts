import {useCallback,useEffect,useRef} from 'react';

export type Conditions={theme:string;indicator:string;year:number;regions:string[];measure:'count'|'rate'};
type ChangeKind='discrete'|'slider'|'playback';

/** Retain fragments and unrelated parameters (including local review switches). */
export function conditionURL(current:URL,value:Conditions):URL {
  const url=new URL(current.href);
  for(const [name,text] of Object.entries({theme:value.theme,indicator:value.indicator,year:String(value.year),region:value.regions[0],measure:value.measure}))url.searchParams.set(name,text);
  if(value.regions[1])url.searchParams.set('region2',value.regions[1]);else url.searchParams.delete('region2');
  return url;
}

/** One entry per discrete choice, slider burst, or playback run. */
export class ConditionHistory {
  private lastKind:ChangeKind='discrete';
  private lastGesture:string|undefined;
  private gesture:string|undefined;
  private initial=true;
  private pending:ChangeKind='discrete';
  private restoring=false;
  mark(kind:ChangeKind,gesture?:string){this.pending=kind;this.gesture=gesture;}
  endGroup(){this.pending='discrete';this.lastKind='discrete';}
  restore(){this.endGroup();this.restoring=true;}
  write(current:URL,value:Conditions):'push'|'replace'|null {
    const url=conditionURL(current,value);
    const kind=this.pending;this.pending='discrete';
    const replace=this.initial||this.restoring;
    this.initial=false;this.restoring=false;
    if(url.href===current.href)return null;
    const grouped=kind!=='discrete'&&kind===this.lastKind&&(kind==='playback'||!!this.gesture&&this.gesture===this.lastGesture);
    this.lastKind=kind;this.lastGesture=this.gesture;
    return replace||grouped?'replace':'push';
  }
}

export function useConditionHistory(value:Conditions,onRestore:(url:URL)=>void){
  const historyRef=useRef<ConditionHistory>(null);
  if(!historyRef.current)historyRef.current=new ConditionHistory();
  const controller=historyRef.current;
  const restoreRef=useRef(onRestore);restoreRef.current=onRestore;
  // onRestore supplies a new regions array even for same-condition anchor traversal.
  // This makes the effect consume the restoration flag before another user change.
  const mark=useCallback((kind:ChangeKind,gesture?:string)=>controller.mark(kind,gesture),[controller]);
  const endGroup=useCallback(()=>controller.endGroup(),[controller]);
  useEffect(()=>{
    const restore=()=>{controller.restore();restoreRef.current(new URL(location.href));};
    addEventListener('popstate',restore);
    return()=>removeEventListener('popstate',restore);
  },[controller]);
  useEffect(()=>{
    const current=new URL(location.href),method=controller.write(current,value);
    if(method)history[method==='push'?'pushState':'replaceState'](history.state,'',conditionURL(current,value));
  },[controller,value.theme,value.indicator,value.year,value.regions,value.measure]);
  return {mark,endGroup};
}
