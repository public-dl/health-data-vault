import React from 'react';
const sources={
 overview:{title:'厚生労働省「特定健診・特定保健指導について」',url:'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000161103.html'},
 results:{title:'標準的な健診・保健指導プログラム（令和6年度版）第2編第2章 p.48–55',url:'https://www.mhlw.go.jp/content/10900000/001153023.pdf'},
 thresholds:{title:'同プログラム 別紙5 p.125・フィードバック文例集',url:'https://www.mhlw.go.jp/content/10900000/001231392.pdf'},
 stratification:{title:'同プログラム 第2編第3章 p.56–59',url:'https://www.mhlw.go.jp/content/10900000/001081570.pdf'},
 roles:{title:'同プログラム 第2編第4章 p.60–62',url:'https://www.mhlw.go.jp/content/10900000/001081574.pdf'},
 niigata:{title:'新潟県 健（検）診ガイドライン：令和3・4・5年度版、冊子p.6–7「医師の判断」等',url:'https://www.nhf.or.jp/concerned/guideline.html'},
};
export const learningSections:[string,string,(keyof typeof sources)[]][]=[
 ['特定健診とは','医療保険者が40～74歳の加入者を対象に実施する、メタボリックシンドロームに着目した健診です。本サイトの集計対象はその全体ではなく、新潟県内の市町村国保の受診者です。',['overview','roles']],
 ['健診結果は検査値だけでは決まりません','検査結果に加え、質問票や既往歴、服薬、生活習慣なども把握して結果を伝えます。個々の検査値と、それらを踏まえた総合的な判断は区別されます。',['results']],
 ['保健指導判定値','生活習慣改善に向けた保健指導等を検討するための、検査項目ごとの目安です。判定値への該当だけで、特定保健指導の対象者と一律に決まるわけではありません。',['thresholds','stratification']],
 ['受診勧奨判定値','医療機関での再検査や生活習慣改善指導などを含む管理を検討する目安です。具体的な対応は値の程度や受診者の状況も踏まえます。本サイトは受診の要否を個別判定するものではありません。',['thresholds','results']],
 ['医師の判断','新潟県の原表は「異常認めず」「保健指導」「受診勧奨」を別々の報告区分として掲載しています。本サイトでは医師の個別判断を検査値から再判定せず、報告された人数と単年度構成を表示します。異常認めずは、将来の疾病がないという保証ではありません。',['niigata','results']],
 ['メタボ判定','腹囲と血圧・脂質・血糖等のリスクの組合せに着目した判定です。新潟県原表の非該当・予備群・基準該当・判定不能を、そのまま区分として使用します。医師の総合判断や特定保健指導の階層化とは別の集計軸です。',['niigata','stratification']],
 ['特定保健指導の階層化','腹囲・BMI、検査結果、喫煙や服薬情報等から対象を選定し、年齢等も考慮して支援レベルを定めます。対象となる疾患の服薬中の人の扱いなど、メタボ判定とは異なる条件があります。原表の「なし」を「健康」と読み替えません。',['stratification']],
 ['同じ「保健指導」でも分類は別です','「医師の判断：保健指導」と「特定保健指導レベル」は同一分類ではありません。特定保健指導の対象外でも、必要に応じて生活習慣改善の支援等を検討することがあります。メタボ判定から医師の判断を経て特定保健指導へ進む、単一の判定経路を表しているわけではありません。',['roles','stratification']],
];
export function Learn({review}:{review:boolean}) {return <main className="learn-page"><a href={'/'+(review?'?review=1':'')}>← 地域比較へ</a><h1>特定健診を知る</h1><p>検査の目安、医師の判断、支援レベルを区別して読むための説明です。</p><p className="annual-notice">制度の一般的な説明は令和6年度版を参照しています。2021～2023年度の値を最新基準で再判定するものではありません。過去の定義は各年度の新潟県ガイドラインと原資料に従います。</p>{learningSections.map(([title,text,refs])=><section key={title}><h2>{title}</h2><p>{text}</p><ul>{refs.map(ref=><li key={ref}><a href={sources[ref].url} target="_blank" rel="noreferrer">{sources[ref].title} ↗</a></li>)}</ul></section>)}<p>医師の判断の年度間比較はP1（服薬・判定と集計の対応）・P7（心電図基準変更の集計への反映）が未確認のためpendingです。単年度の人数合計一致は、年度間の同一定義を証明しません。</p><p>出典確認日：2026-09-20。各値の原典は図表の諸元・出典、または<a href={'/tables'+(review?'?review=1':'')}>公表数表</a>で確認できます。</p></main>;}
