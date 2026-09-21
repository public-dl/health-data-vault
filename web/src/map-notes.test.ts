import {expect,it} from 'vitest';
import {localMapText} from './map-notes';
it('removes only known shared notes and preserves regional facts and unknown cautions',()=>{
 const fact='2023年度の佐渡市は71.5%です。報告人数3,018人／受診者数4,220人から算出しています。';
 expect(localMapText(fact+'受診者の構成割合であり、年齢・性別構成は調整していません。健康状態の改善・悪化や施策の効果を示すものではありません。')).toBe(fact);
 expect(localMapText(fact+'原表の報告区分であり、健康状態の優劣や疾病有病率を示しません。年度間の比較可能性は確認中です。')).toBe(fact);
 expect(localMapText('表示不可。個別の未確認事項。')).toBe('表示不可。個別の未確認事項。');
});
