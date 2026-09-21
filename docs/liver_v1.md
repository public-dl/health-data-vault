# 肝機能 第1版（ローカル候補）

2026-09-21。原表のW列 `liver` のみ。AST・ALT・γ-GT別人数、実人員、正常・判定不能・残差、完全構成を作らない。

## 原典と割合

- 実績2021/2022/2023、掲載2022/2023/2024。原本は `data/raw/latest.json` の3 Excel。SHA-256を照合する。
- 原表sheetは `市町村別` / `保険者別` / `保険者別 `（末尾空白）。W3「判定区分（保健指導以上を再掲）」、W4「肝機能」。分母は同一原本・sheet・行・地域・年度のB列特定健診受診者数。
- 概要J25人数、J4受診者数、J26割合。2021/2022は `=J25/J$4*100`、2023は `=J25/J4*100`。数式・保存済み計算値・W6/B6との一致を検証する。県計公式式の確認と、市町村値を同じ算式でHDVが派生することを区別する。
- 2023県計28783/113771×100＝25.299065666997738%、表示25.3%。県計を市町村割合の平均で作らない。
- `rate_origin=official_formula_confirmed`、`composition=false`。両年度間comparabilityはpending、comparison_allowedはfalse。

## 契約・表示

`reported-recipient-rate-v3` はv2の明示的な肝機能拡張。旧候補はv2のまま再構築可能。共通 `derive_single_rate` / `validate_single_rate` の条件は変更しない。W/B各93件、母集団・原典一致、正の分母、人数範囲、式証拠、各年市町村計一致を検証する。

中央terminology `reported_guidance_or_higher` の通常人数テンプレートを使用。公開ラベルは「肝機能：保健指導以上として再掲された人数」。原表階層は2段で、実人員テンプレートは使用しない。

健康テーマliverの選択肢は既存ID liverだけ。共通ReportedOverview / MapPanel / MapLegend / TemporalTable / ReportedCharts / ExportSurfaceを使用。地図と箱ひげの固定domainは18–32%。箱ひげは各年度30市町村・非加重、県計を統計から除外。年度点の参照線は変化の評価ではなく、前年差・増減率・改善悪化評価は生成しない。1指標なので指標間比較・全項目セットは作らない。

公開数表は原表順を保持し、正式なW列セル31件×3年度のみ可視化リンクを追加。W/B双方のprovenanceを維持。

## 未確認の意味

W列のOR条件、医師判断との優先関係、服薬・欠測・複数受診・再判定の詳細は未確認。検査の判定閾値からW列人数を再計算しない。受診者数を測定者数へ読み替えない。

## 検証

`tests/test_liver.py`：W/B93件原典照合、県計公式率3件、改ざん拒否、固定domain、旧レコード不変、公表数表の原順とWセルリンク。
`web/src/liver.test.tsx`：単一選択、共通01–04、非構成、30市町村統計、CSV semantic/provenance。

候補生成は `python -B -m hdv.site_release build --analysis-release <既存分析release>`。公開版切替は行わない。

### 実行結果（2026-09-21）

- 候補 `8e1fe8695fc86b4358bb695ce0a1c3ccfccdb9f5c0f5ecc45098a6d5fb915827`：Validatorエラー0。既存入力警告72件は維持。W/B93組と県概要公式割合3件一致。
- Python全84テスト、UI全129テスト、TypeScript、Vite build成功。既存v2候補の再検証も成功。
- 1366×768と390×844で確認。ページ全体の横スクロールなし。PC経年表の年度3列は等幅、モバイルは既存の表内スクロールを維持。
- 2021/2023の年度変更後も地図・分布のdomainは18～32%。県計＋長岡市の比較、県計を除く30市町村分布を確認。
- 01、02、03、年度別グラフ、分布図、比較地図のCopy/PNGを生成。各ペアのPNGハッシュ一致、画像末尾への内部provenance混入なし。ClipboardItemのimage/pngを確認。外部Officeへの貼付は未確認。
- CSV保存操作成功。CSV内のsemantic・rate_origin・原典等はテストで検証。
- 可視化の出典から公表数表W6（28,783）へ移動し、「このデータを可視化」でliverへ復帰。出典モーダルでW6/B6と同原本SHAを確認。
- 共通比較地図ヘッダーの固定高さを解除し、人数が地図と重ならないよう修正。地図・凡例の描画寸法は変更しない。
- ローカル確認：http://127.0.0.1:4200/?review=1&theme=liver&indicator=liver&year=2023&region=15
- commit・push・公開ポインター変更なし。
