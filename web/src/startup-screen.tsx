import React from 'react';
import {PublicHeader} from './public-shell';
import {healthThemes} from './health-themes';

// Also rendered into initial HTML. No unverified values or enabled data controls.
export function StartupScreen({base='/',route='/',error}:{base?:string;route?:string;error?:string}){
 const title=route==='/learn'?'特定健診を知る':route==='/tables'?'公表数表':route==='/contact'?'お問い合わせ':null;
 return <><PublicHeader base={base}/><main className={title?"startup-screen":"startup-screen analysis-layout"}>
 {title?<h1>{title}</h1>:<><div className="analysis-intro"><section className="hero"><div><span className="eyebrow">HEALTH DATA VAULT / PUBLIC HEALTH ARCHIVE</span><h1>特定健診の結果を、<br/><span className="hero-phrase">地域で比べる。時間で見る。</span></h1><p>新潟県と30市町村の特定健診結果を、<br/>地図・表・グラフでわかりやすく可視化します。</p></div><div className="hero-art startup-art" aria-hidden="true"/></section>
 </div><aside className="analysis-sidebar" aria-label="分析条件"><h2 className="sidebar-title">分析条件</h2><section className="filters" aria-label="表示条件を読み込み中" aria-busy={!error}><div className="health-theme-menu"><div className="theme-heading"><span className="step-heading"><b>1</b> 健康テーマを選ぶ</span></div><nav className="theme-options" aria-label="健康テーマ">{healthThemes.map(theme=><button key={theme.id} disabled><span><strong>{theme.label}{theme.status==='planned'&&<em>準備中</em>}</strong><small>{theme.description}</small></span></button>)}</nav></div><div className="startup-controls">{['指標を選ぶ','表示する値','年度','地域を比較する'].map(label=><label key={label}>{label}<select disabled aria-label={label}><option>読み込み中</option></select></label>)}</div></section></aside></>}
 {error?<div className="load-error" role="alert"><h2>公開データを確認できません</h2><p>{error}</p><p>未検証・未承認のデータを代わりに表示することはありません。</p></div>:<div className="startup-status" role="status">{title?'ページを読み込んでいます':'公開データを読み込んでいます。承認を確認後、表示します。'}</div>}
 {!title&&!error&&<section className="section-placeholder" aria-label="01 データの概要を準備中"><span className="number">01</span><h2>ひと目で見る</h2></section>}
 </main></>;
}
