export function comparisonText(status:string){return ({pending:'確認中（年度をまたいだ比較はできません）',compatible:'同じ定義で比較可能',incompatible:'定義の違いにより比較不可'} as Record<string,string>)[status]??'比較可否は未確認';}
/** Display-only wording. Never modifies source records or comparison permissions. */
export function publicText(text:string){return text
 .replaceAll('年度間比較はpendingです。','年度間の定義を確認中のため、年度をまたいだ増減比較はできません。')
 .replaceAll('年度間確認中（pending）','年度間の比較可否は確認中')
 .replaceAll('（comparability: pending）','。年度をまたいだ増減比較はできません。')
 .replaceAll('年度間comparability','年度間の比較可否')
 .replaceAll('統計comparability','統計の比較可能性')
 .replaceAll('comparability','比較可否')
 .replaceAll('pending','確認中')
 .replaceAll('承認済みrelease','公開データ')
 .replaceAll('承認済み公開データ','公開データ')
 .replaceAll('割合の公開契約が未承認のため','割合による地域比較の条件を確認できていないため');}
export const populationSummary='対象は新潟県内の市町村国保・40～74歳の特定健診受診者です。';
export const populationLimit='国保連の費用決済データから把握した集計で、法定報告とは対象範囲が異なります。県民全体・全保険者のデータではありません。';
