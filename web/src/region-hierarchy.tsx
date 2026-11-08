import React from 'react';
import type {Geography,Payload,Observation} from './model';

export const healthCenterSelected=(data:Payload,codes:string[])=>codes.some(code=>data.geographies.find(g=>g.code===code)?.level==='health_center_area');
export function regionMap(data:Payload,code:string){
 return data.geographies.find(g=>g.code===code)?.level==='health_center_area'?data.health_center_map??data.map:data.map;
}
export function RegionOptions({geographies,selected,index}:{geographies:Geography[];selected:string[];index:number}){
 const option=(g:Geography)=><option key={g.code} value={g.code} disabled={selected.some((code,i)=>i!==index&&code===g.code)}>{g.name}</option>;
 if(!geographies.some(g=>g.level==='health_center_area'))return <>{geographies.map(option)}</>;
 return <>{[['prefecture_total','新潟県'],['health_center_area','保健所管内'],['municipality','市町村']].map(([level,label])=><optgroup key={level} label={label}>{geographies.filter(g=>g.level===level).map(option)}</optgroup>)}</>;
}
export function RegionSourceNote({data,rows}:{data:Payload;rows:Observation[]}){
 const areas=data.geographies.filter(g=>g.level==='health_center_area'&&rows.some(r=>r.geography_code===g.code));
 return <>{areas.map(g=><section key={g.code}><h4>{g.name}：統計値と管轄の出典</h4><p>{g.value_origin==='municipality_identity_mapping'?'新潟市保健所の管轄は新潟市1市のため、採用済みの新潟市の市町村集計値（50行）を表示しています。独立した原表保健所計ではありません。':'原表に掲載された保健所集計値を使用します。派生0を使用する版では、原表空欄と管内全市町村の数値0を区別して諸元に記録します。'}</p><p>{rows.some(r=>r.geography_code===g.code&&r.temporal_display_scope==='annual_facts_only')?'メタボ判定・保健指導は各年度の公表実績を並べて表示しています。医師の判断は年度間の定義を確認中です。健康状態の変化や因果関係の評価は行いません。':'年度間で同じ定義・範囲として比較できるか確認中のため、増減比較はできません。現在の管轄資料だけでは、過去の全年度も同じ管轄だったとは確認できません。'}</p><ul>{g.mapping_provenance?.map(e=><li key={e.source_url}><a href={e.source_url} target="_blank" rel="noreferrer">{e.title}（{e.as_of??'現行一覧：過去年次の確認とは別'}） ↗</a></li>)}</ul><p>地図の作成方法：{g.identity_municipality?'新潟市の区域を使用':'構成市町村の区域を結合'}。2023-01-01の参考境界。</p></section>)}</>;
}
