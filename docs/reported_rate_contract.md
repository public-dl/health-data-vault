# 原表掲載人数からの共通非構成割合契約

契約版 `reported-recipient-rate-v2`、表示契約 `reported-annual-5`。

## v3：肝機能の明示的追加（2026-09-21）

`reported-recipient-rate-v3` は既存v2に `liver`（W列）を追加する。
`official_formula_confirmed` として県概要J25/J4→J26を3年度照合し、W/Bの93組を同じ非構成割合Validatorで検証する。既存v2候補は従来の指標集合・契約版で再構築できる。条件の緩和は行わない。

肝機能の割合ラベルは「特定健診受診者数に占める割合（％）」、地図・市町村分布の固定domainは18～32%。詳細は `docs/liver_v1.md`。以下はv2導入時の記録を保持する。

## 定義と許可

分子は「判定区分（保健指導以上を再掲）」の原表掲載人数、分母は同年度・同地域のB列「特定健診受診者数」。式は分子÷分母×100。県計は県計セル、市町村は各市町村セルを使う。原本照合済みの値だけを使用する。

| origin | 指標 |
| --- | --- |
| official_formula_confirmed | triglycerides, hdl, ldl, urine_glucose, fasting_glucose, hba1c |
| hdv_derived_from_reported_count | bp_guidance, bp_referral, lipid_people, total_cholesterol, glucose_people |
| 未承認・人数のみ | random_glucose |

公式式確認のある指標についても、市町村の割合自体は当該市町村の人数と受診者数から計算する。由来は内部metadata・provenanceで区別し、公開ラベルは「特定健診受診者に占める割合（%）」で統一する。

脂質代謝：実人員、糖代謝：実人員は原表名称を保持する。具体的なOR条件・重複処理は未確認。患者数、疾病者数、重複除外人数とは断定しない。受診者数を検査実施者数と読み替えない。項目合計・残差・正常区分・100%構成を生成しない。

## 共通基盤

`hdv/reported_rate_contract.py` の明示的なSPECSから `rate_contract`、`rate_origin`、`rate_definition`、`capabilities.recipient_rate`、分母名称、固定map_scale、chart_maxを構築する。共通policyはこのmetadataを使う。`derive_single_rate` / `validate_single_rate` を全11指標へ適用する。

検証条件は、許可、整数人数、同一地域・年度・母集団・原本・シート・行、分子列・B列、分母正数、0≦分子≦分母、原典追跡、割合再計算、pending維持。公式式を根拠とする指標は公式式証拠も必須。公式式がないことを公式確認済みへ読み替えず、承認済みHDV派生割合を別originとして扱う。

旧契約1～4の再構築経路は維持し、新契約はsite候補構築時に明示的に適用する。既存の構成割合Validator、原本、公開ポインターは変更しない。

## UIと尺度

既存ReportedOverview、MapPanel / MapLegend、TemporalTable / ReportedSetTable、ReportedCharts、ExportSurfaceを共有。テーマ専用component・CSSは追加しない。

糖代謝実人員の固定map domainは40～90%。3年度×31地域を含み、年度や地域変更で再計算しない。血圧・脂質のmap domainと年次グラフ上限は従来値をmetadataへ移し維持。糖代謝の既存3割合の尺度も維持。

血圧の独立指標間比較をtheme metadataで有効化。全テーマで年度別参考表示、30市町村のみ・非加重の箱ひげ、県計navy diamond、選択市町村teal markerを継承。全5糖代謝項目の合計は作らず、指標間比較は承認された4割合のみ。

## 検証・出力

- 11指標×31地域×3年度=1,023割合を共通検証。人数・分母・原典対応・既存割合値は保持。随時血糖93件は割合なし。
- 2023県計の糖代謝実人員は78,101÷113,771×100=68.647546387…%、表示68.6%。
- Python 78テスト、UI 124テスト、TypeScript、Vite build成功。入力の既存72警告は保持。
- 実画面で糖代謝実人員の県計／長岡市、血圧全区分、脂質全項目、随時血糖人数限定を確認。
- 共通Copy/PNG処理を維持。糖代謝実人員の比較カード・比較地図を実生成し、両出力のSHA-256一致と、画像がカード末尾で終了することを確認。外部アプリへの貼付は未確認。
- CSVは共通出力を使用し、人数・分母・許可割合・原典・比較状態を保持。公表数表の原表順・セル対応は変更しない。

最終候補: `e074bb3ee988a9f3ab903bb3ce678a35bf59ad9c1343e0a36a2e193a1fa402d6`。

ローカル確認: http://127.0.0.1:4198/?review=1&theme=glucose&indicator=glucose_people&year=2023

commit・push・公開切替は実施しない。

変更ファイル: `hdv/reported_rate_contract.py`（新規）、`hdv/single_judgment_rates.py`、`hdv/site_release.py`、`web/src/model.ts`、`main.tsx`、`reported-model.ts`、`reported-views.tsx`、`health-themes.ts`、`visual-metadata.ts`、`web/src/glucose.test.tsx`、`tests/test_reported_rate_contract.py`（新規）。
