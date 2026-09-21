import React,{useMemo} from 'react';
import {geoMercator,geoPath} from 'd3-geo';
import {PersonShape} from './pictograms';
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
 const silhouette=useMemo(()=>geoPath(geoMercator().fitExtent([[20,8],[200,180]],data.map))(data.map),[data.map]);
 return <><section className="hero"><svg className="hero-wave" viewBox="0 0 600 180" aria-hidden="true"><path d="M0 155 Q150 175 260 95 T600 80 M0 169 Q140 150 270 118 T600 55 M0 143 Q170 178 290 90 T600 100" fill="none" stroke="currentColor" strokeWidth="3"/></svg><div><span className="eyebrow">HEALTH DATA VAULT / PUBLIC HEALTH ARCHIVE</span><h1>特定健診の結果を、<br/><span className="hero-phrase">地域で比べる。</span><span className="hero-phrase">時間で見る。</span></h1><p>新潟県と{m.municipalities}市町村の特定健診結果を、<br className="desktop"/>地図・表・グラフでわかりやすく可視化します。</p></div><div className="hero-art" aria-label="新潟県と公開データの概要"><svg viewBox="0 0 560 245" aria-hidden="true"><defs><linearGradient id="hero-map-fill" x2="1" y2="1"><stop stopColor="#b7e9fb"/><stop offset="1" stopColor="#4cbbe9"/></linearGradient></defs><g transform="translate(155 8) scale(1.23)"><path d={silhouette??''} fill="url(#hero-map-fill)" stroke="#86d4f4"/></g><g stroke="#93cfee" strokeWidth="1" opacity=".8"><path d="M165 75L245 40L315 85L377 130L326 207L230 182L165 75L315 85L230 182L377 130M245 40L230 182L326 207" fill="none"/></g>{[[165,75],[245,40],[315,85],[377,130],[326,207],[230,182]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%2?5:8} fill={['#24aef0','#83cfea','#ff96a7','#5cced4'][i%4]}/>)}{Array.from({length:12},(_,i)=><g key={i} transform={`translate(${395+(i%6)*23} ${12+Math.floor(i/6)*34}) scale(.65)`} color={['#e8909a','#eabc74','#63b5e7','#56b6b1'][i%4]}><PersonShape pose="neutral"/></g>)}<circle cx="445" cy="171" r="42" fill="none" stroke="#d4edfb" strokeWidth="14"/><circle cx="445" cy="171" r="42" fill="none" stroke="#25b4ed" strokeWidth="14" strokeDasharray="65 199" transform="rotate(-90 445 171)"/><text x="445" y="176" textAnchor="middle" fill="#235482" fontSize="13">構成割合</text></svg><div className="hero-stat stat-count"><strong>{m.municipalities}</strong><span>市町村</span></div><div className="hero-stat stat-years"><strong>{m.range}</strong><span>実績年度</span></div><div className="hero-age"><strong>40–74歳</strong><span>市町村国保の特定健診受診者</span></div><span className="hero-art-note">図はデータの見方を表すイメージ</span></div></section>
 <details id="about-data" className="site-about"><summary>ⓘ このサイトとデータについて <small>（できること・できないこと・データの諸元）</small></summary>
 <section className="site-intro" aria-label="このサイトとデータについて"><article><h2>このサイトでできること</h2><p>新潟県と{m.municipalities}市町村の特定健診結果を、地域・年度・判定区分で比較できます。</p><p>県計と市町村、市町村どうしの構成や経年変化を地図・表・グラフで確認できます。医師の判断は各年度の個別表示のみで、年度間比較は確認中です。</p></article>
 <article><h2>このサイトでできないこと</h2><p>{sourceDescription.limitation}</p><p>表示割合は受診者を分母とする判定区分の構成割合です。<strong>特定健診受診率や、地域住民全体の有病率ではありません。</strong></p><details><summary>データの適用範囲</summary><p>原資料に存在しない性別・年齢別データ、受診率等を本サイト独自に推計・補完して表示することはありません。年齢・性別構成を調整した比較ではなく、健康状態の良し悪しや施策の効果を示しません。</p></details></article>
 <article><h2>データの諸元</h2><p>出典：{m.source?<a href={m.source} target="_blank" rel="noreferrer">{sourceDescription.name} ↗</a>:sourceDescription.name}<br/>{sourceDescription.dataset}</p><p>{sourceDescription.target}</p><details><summary>年度・項目・データの成り立ち</summary><dl><dt>地域</dt><dd>新潟県計＋{m.municipalities}市町村</dd><dt>実績年度</dt><dd>{m.years}</dd><dt>現在掲載している項目</dt><dd>{m.groups.join('・')}</dd><dt>表示値</dt><dd>報告人数／受診者に占める割合（%）</dd><dt>割合の算出方法</dt><dd>当該区分の報告人数 ÷ 同年度・同地域の受診者数 × 100</dd><dt>県計</dt><dd>原資料の新潟県計値を使用します。市町村割合の単純平均ではありません。</dd></dl><h3>データについて</h3><p>{sourceDescription.origin}</p><p>各図表の「このデータの諸元・出典を確認」から、原典、シート・セル、分子・分母、計算式、比較可否などを確認できます。</p></details></article></section></details></>;
}
