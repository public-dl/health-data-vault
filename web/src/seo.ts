export const pages={
 '/':{title:'Health Data Vault｜新潟県の特定健診データを市町村別に可視化',description:'新潟県30市町村の特定健康診査データを、市町村別・年度別に地図、表、グラフで可視化。公表された人数や割合を、対象年度・定義・出典とともに確認できます。年度間の比較可能性など、データを読む際の制約も示しています。'},
 '/learn':{title:'特定健診を知る｜Health Data Vault',description:'特定健診、医師の判断、メタボ判定、特定保健指導の違いを公式資料に基づいて説明します。健診データの読み方と比較上の注意点を確認できます。'},
 '/tables':{title:'公表数表｜新潟県の特定健診データ｜Health Data Vault',description:'新潟県の特定健康診査等結果報告を、年度別の公表数表で確認できます。原表の行列順、再掲、セルの原値と出典を保持しています。'},
 '/contact':{title:'お問い合わせ｜Health Data Vault',description:'Health Data Vaultのデータ、表示、掲載内容に関するご意見・お問い合わせを受け付けています。'}
};
export function productionOrigin(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!/^(localhost|127\.|\[::1\])/.test(u.hostname)&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:'';}catch{return '';}}
export function indexable(origin:string,context:string,hostOrigin:string,search:string){return !!origin&&context==='production'&&hostOrigin===origin&&!new URLSearchParams(search).has('review')&&!new URLSearchParams(search).has('exportReview');}
export function websiteSchema(origin:string){return {'@context':'https://schema.org','@type':'WebSite',name:'Health Data Vault',url:origin+'/',inLanguage:'ja',description:pages['/'].description};}
