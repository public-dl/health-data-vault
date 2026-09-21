# 脂質・糖代謝の公開用語

## 中央定義

`hdv/public_config/terminology.json` が公開用語の唯一の定義元。版は `2026-09-v1`、semantic keyは `reported_guidance_or_higher`。原表上の掲載意味を表し、医学的異常・患者・有病者を意味しない。

| 用途 | テンプレート |
| --- | --- |
| 通常のfull label | `{indicatorLabel}：保健指導以上として再掲された人数` |
| 通常のshort label | `{shortLabel}：保健指導以上` |
| 実人員full label | `{themeLabel}：保健指導以上として再掲された実人員` |
| 実人員short label | `{themeLabel}：保健指導以上の実人員` |

対象: lipid_people / triglycerides / hdl / ldl / total_cholesterol / glucose_people / urine_glucose / fasting_glucose / random_glucose / hba1c。

source_labelは実人員、中性脂肪、HDLコレステロール、LDLコレステロール、総コレステロール、尿糖、空腹時血糖、随時血糖、HbA1cという原表名称を保持。source_hierarchyには親見出し・テーマ欄・原表項目を保持する。原典レコードのoriginal_label・セル・値は変更しない。

血圧は共通公開用語の対象外。公開名「血圧：保健指導」「血圧：受診勧奨」はそのままで、source_hierarchyのみ原表階層を付与。

## 説明文

同じJSONから共通説明、脂質代謝／糖代謝異常欄の補足、割合分母の説明、非構成の注意、人数のみの注意、実人員の未確認事項、HbA1cの誤読防止を取得する。

共通文は「本データは、原表の『判定区分（保健指導以上を再掲）』に掲載された人数です。」。実人員には「『実人員』の具体的な重複排除・集計条件までは原資料から確定していません。」を追加する。

## 生成と履歴

`hdv/terminology.py`がbuild時に公開用語を生成し、indicatorのpublic_label / short_label / source_label / semantic_key / terminology_versionに保存する。共通UIが使うnameにも同じfull labelを設定する。reported_semantics_versionを候補payloadに保存し、release hashで当時の生成結果を追跡する。

正式な将来変更では既存versionを編集せず、新versionを追加しcurrent_versionを更新する。旧versionと既存indicatorのsource設定を保持する。旧用語未導入候補は用語適用なしの経路で再検証できる。

01カード、02地図、03単独／全項目表、04年度／分布グラフは同じindicator.nameを参照する。選択欄と独立棒グラフ軸はshort_labelを使い、title / aria-labelにはfull labelを持つ。棒グラフ下には正式名称も併記し、PNGにも保持する。地図とグラフのtooltipにも正式名称を使用する。

共通CSVにsource_label / public_label / semantic_key / terminology_versionを追加した。indicator_id、人数、割合、分母、原典情報は維持。出典モーダルでも原表名と公開名、意味キー、用語版、原表階層を確認できる。Copy/PNGは既存ExportSurfaceをそのまま使う。

## 検証

- 中央テンプレートと説明をテスト上で変更し、脂質5＋糖代謝5のfull / short / notesへ一括反映。血圧公開名は変わらない。
- 共通UIの一括変更テストで01～04、ExportSurface、CSVの参照を確認。
- 原典レコード、分母レコード、rate_policy、mapデータ、数値、割合、intervals、map_scale、chart_max、capabilitiesは用語適用前後で一致。
- Python 80件、UI 125件成功。TypeScript・Vite build成功。
- PCでHbA1cカード・比較地図・年度グラフ、脂質全項目表、指標間比較の名称を確認。
- 指標間比較をCopy/PNGで実生成し、正式名称の併記と画像一致を確認（SHA-256 `686af49fa0a7bdebfc22fa2c1edb6802aa427ff7a449a11c31a0d989a9959ffb`）。外部アプリへの貼付は未確認。

## ファイルと確認先

追加: `hdv/public_config/terminology.json`、`hdv/terminology.py`、`tests/test_terminology.py`。

変更: `hdv/site_release.py`、`web/src/model.ts`、`visual-metadata.ts`、`main.tsx`、`reported-charts.tsx`、`panels.tsx`、`glucose.test.tsx`。Validatorは変更していない。

候補: `c655393dc4982f381e4133f1247e680477aceb6aff69dcf22e70e6f5159472cf`

http://127.0.0.1:4199/?review=1&theme=glucose&indicator=hba1c&year=2023

commit・push・公開ポインター切替は実施していない。
