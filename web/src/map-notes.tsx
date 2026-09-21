import React from 'react';
// Presentation-only extraction; the original release text and provenance stay intact.
const sharedSentences=[
 '受診者の構成割合であり、年齢・性別構成は調整していません。',
 '報告人数の変化です。',
 '健康状態の改善・悪化や施策の効果を示すものではありません。',
 '原表の報告区分であり、健康状態の優劣や疾病有病率を示しません。',
 '年度間の比較可能性は確認中です。',
];
export function localMapText(text:string){return sharedSentences.reduce((result,sentence)=>result.split(sentence).join(''),text);}
export function MapNotes({measure,rateLabel,mixed=false}:{measure:'rate'|'count';rateLabel?:string;mixed?:boolean}){return <p className="group-scale-note map-common-note">{mixed?'各地図の凡例に表示した単位を使用します。割合未承認の項目は報告人数（人）です。人数は受診者の規模に左右されます。年齢・性別構成は調整していません。':measure==='rate'?`色は${rateLabel??'受診者に占める割合（%）'}を表します。年齢・性別構成は調整していません。`:'色は報告人数（人）を表します。受診者の規模に左右されます。年齢・性別構成は調整していません。'} 健康状態の優劣や施策の効果、地域住民全体の疾病有病率を示すものではありません。定義・母集団・比較上の制限は各図表の「諸元・出典を確認」から確認できます。</p>;}
