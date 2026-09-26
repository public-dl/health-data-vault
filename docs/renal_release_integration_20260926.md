# 腎・尿路系 release 統合結果（2026-09-26）

## 原因・既存実装
production相当の作業ブランチは codex/ui-release（HEAD 2d4fb27、origin/mainと同じ）。腎実装は別のローカル作業ツリー codex/analysis-sidebar に未コミットで存在し、include_renal=True の候補生成までで止まっていた。現在の承認済みreleaseには未収録だった。publisherの制約を緩和せず、既存のrenal実装・テストと共通UIのcapability対応だけを移植した。重複実装はしていない。

## Releaseと承認
旧: 8e1fe8695fc86b4358bb695ce0a1c3ccfccdb9f5c0f5ecc45098a6d5fb915827
新: f325c8b7373317aea721442edbf49867788a7270eb4b7da3e3477d38fc479ff9
新releaseは既存候補と同じSHA-256で再現した。site_release.inspectで原本から再構築し一致を確認、error 0。承認者は既存記録の岸克也。今回の明示的なユーザー承認に基づき同じ再利用判断を適用した。reuse-decision.jsonはバイト単位で変更せず、renal-release-lineage.jsonに旧記録のSHA-256、旧新release、適用理由を記録。official_license_verified=false、cc_by_verified=falseを維持。旧releaseファイルも保持。

## 公開データ
| indicator | 人数records | 派生割合records |
|---|---:|---:|
| renal_urinary_people |93|0|
| urine_protein |93|93|
| urine_blood |93|0|
| creatinine |93|0|

reported.recordsは1209→1581（+372）。analysis 744件、annual 279件と既存reported 1209件は同一。公表数表の原値・順序も同一（正式セルの可視化リンクのみ追加）。尿蛋白は公式計算式の証拠J29/J4/J30を保持し、市町村割合はHDV派生値。AC/AE/AFにrateを生成していない。

0は粟島浦村のAF12（2021/2022/2023）、AD12（2022/2023）の5セル。numeric 0、value_state=zeroを保持。372セルを元Excelと照合。2023のsheet名「保険者別 」の末尾空白を保持。全4項目の2021_2022/2022_2023はpending、comparison_allowed=false。

尿蛋白90市町村年の最小0、最大7.588532883642496%。既存採用domain 0–8%を維持。県計は箱ひげの分布計算から除外。

## 検証
- Python:90件成功（既存84+腎6）
- UI:158件成功（30 files）
- TypeScript:成功
- production build:成功（tscとviteを直接実行。環境にnpmコマンドなし）
- public/site validator:error 0、SHA-256一致、distへの完全コピー確認
- SEO built check:成功。canonical/OGP/robots/sitemap/初期HTML/runtime guard。設定変更なし。
- 既存の入力全体72警告と境界等の注意書きは維持。error 0は警告0を意味しない。

## 実画面
127.0.0.1:4222のproduction buildをreviewなしで確認。4指標が選択可能、配信データ未収録表示なし。2023県計は実人員19,960、尿蛋白4,689（4.1%）、尿潜血14,061、クレアチニン3,397。尿蛋白は30市町村地図、粟島浦村0.0%、3年度表、年度別点表示、30市町村分布を確認。その他3指標は人数表と地図/割合分布の非公開案内を維持。01〜04アンカーで移動可能。既存テーマ・ピクトグラム・ナビ等は既存UIテストで回帰確認。

## 変更ファイル
- hdv: renal.py, reported_annual.py, single_judgment_rates.py, site_release.py
- Python test: tests/test_renal.py
- UI: dashboard.tsx, health-theme-menu.tsx, health-themes.ts, model.ts, panels.tsx, reported-charts.tsx, reported-views.tsx, visual-metadata.ts
- UI test: health-themes.test.tsx, startup-screen.test.tsx, renal.test.tsx
- 配信: web/public/public-data/current.json、新release JSON、renal-release-lineage.json
- docs: renal_urinary_v1.md（既存監査記録）、本ファイル

hdv/configの3ファイルは改行正規化表示のみで意味差分なし。既存runが記録する設定hashと一致するLFを維持し、契約内容は変更していない。
commit/push/deployは未実施。mainへのpush前で停止。