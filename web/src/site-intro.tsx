import React from 'react';
import type {Payload} from './model';
// Source-specific editorial metadata, audited against docs/data_inventory.md §2 (T).
export const sourceDescription={
 name:'健康にいがた21',dataset:'特定健康診査等結果報告',
 target:'新潟県内の市町村国保・40～74歳の特定健診受診者',
 origin:'新潟県内の市町村国保が実施した特定健康診査のうち、新潟県国保連合会における特定健診費用決済データをもとに、新潟県健診保健指導支援協議会が把握する結果を取りまとめたデータです。',
 limitation:'現在公開しているデータには性別・年齢階級別の内訳がないため、性別・年齢別の分析はできません。',
};
export function introMetadata(data:Payload){
 const years=[...new Set(data.years)].sort((a,b)=>a-b);
 const source=data.records.map(r=>r.annual_page_url).find(url=>{try{return new URL(url).protocol==='https:';}catch{return false;}});
 return {years:years.map(y=>y+'年度').join('・'),range:years.length>1?years[0]+'–'+years.at(-1):String(years[0]??''),municipalities:data.geographies.filter(g=>g.level==='municipality').length,groups:data.indicator_groups?.map(g=>g.name)??[...new Set(data.indicators.map(i=>i.group))],source};
}
export function SiteIntro({data}:{data:Payload}){
 const m=introMetadata(data);
 return <><section className="hero photo-hero"><img className="hero-photo" src={import.meta.env.BASE_URL+'images/hero-professional-800.webp'} srcSet={`${import.meta.env.BASE_URL}images/hero-professional-480.webp 480w, ${import.meta.env.BASE_URL}images/hero-professional-800.webp 668w`} sizes="(max-width:700px) 45vw, 480px" width="668" height="765" alt="" fetchPriority="high"/><div className="hero-copy"><span className="eyebrow">HEALTH DATA VAULT / PUBLIC HEALTH ARCHIVE</span><h1>特定健診の結果を、<br/><span className="hero-phrase">地域で比べる。時間で見る。</span></h1><p>新潟県と{m.municipalities}市町村の特定健診結果を、<br/>地図・表・グラフでわかりやすく可視化します。</p></div></section>
 <details id="about-data" className="site-about"><summary>ⓘ このサイトとデータについて <small>（できること・できないこと・データの諸元）</small></summary>
 <section className="site-intro" aria-label="このサイトとデータについて"><article><h2>このサイトでできること</h2><p>新潟県と{m.municipalities}市町村の特定健診結果を、地域・年度・判定区分で比較できます。</p><p>県計と市町村、市町村どうしの構成や経年変化を地図・表・グラフで確認できます。医師の判断は各年度の個別表示のみで、年度間比較は確認中です。</p></article>
 <article><h2>このサイトでできないこと</h2><p>{sourceDescription.limitation}</p><p>表示割合は受診者を分母とする判定区分の構成割合です。<strong>特定健診受診率や、地域住民全体の有病率ではありません。</strong></p><details><summary>データの適用範囲</summary><p>原資料に存在しない性別・年齢別データ、受診率等を本サイト独自に推計・補完して表示することはありません。年齢・性別構成を調整した比較ではなく、健康状態の良し悪しや施策の効果を示しません。</p></details></article>
 <article><h2>データの諸元</h2><p>出典：{m.source?<a href={m.source} target="_blank" rel="noreferrer">{sourceDescription.name} ↗</a>:sourceDescription.name}<br/>{sourceDescription.dataset}</p><p>{sourceDescription.target}</p><details><summary>年度・項目・データの成り立ち</summary><dl><dt>地域</dt><dd>新潟県計＋{m.municipalities}市町村</dd><dt>実績年度</dt><dd>{m.years}</dd><dt>現在掲載している項目</dt><dd>{m.groups.join('・')}</dd><dt>表示値</dt><dd>報告人数／受診者に占める割合（%）</dd><dt>割合の算出方法</dt><dd>当該区分の報告人数 ÷ 同年度・同地域の受診者数 × 100</dd><dt>県計</dt><dd>原資料の新潟県計値を使用します。市町村割合の単純平均ではありません。</dd></dl><h3>データについて</h3><p>{sourceDescription.origin}</p><p>各図表の「このデータの諸元・出典を確認」から、原典、シート・セル、分子・分母、計算式、比較可否などを確認できます。</p></details></article></section></details></>;
}
