# 糖代謝 第1版・単独割合の定義

定義版: `glucose-recipient-rate-v1`。2021～2023年度、県計＋30市町村を対象とする。原本・分析用IDは変更しない。

## 公開候補の範囲

| ID | 原表列 | 人数 | 特定健診受診者に占める割合 | 割合地図の固定domain |
| --- | --- | --- | --- | --- |
| glucose_people | X | 93件 | 未承認・生成しない | なし |
| urine_glucose | Y | 93件 | 93件 | 0～25% |
| fasting_glucose | Z | 93件 | 93件 | 0～40% |
| random_glucose | AA | 93件 | 未承認・生成しない | なし |
| hba1c | AB | 93件 | 93件 | 30～90% |

原表階層は「判定区分（保健指導以上を再掲）／糖代謝異常」。実人員の詳細集計条件は未確認。受診者数を測定者数に読み替えず、人数の合計・残差・正常区分・構成図は作らない。HbA1cの割合は報告人数の割合であり、検査値ではない。

## 割合の根拠と検証

尿糖は概要J28=J27/J4×100、空腹時血糖はJ22=J21/J4×100、HbA1cはJ24=J23/J4×100に対応する。2021・2022年度の式の分母参照はJ$4。原本の数式と保存済み計算値を両方検査する。

市町村の派生割合は同年度・同地域のY/Z/AB人数÷B受診者数×100。原本SHA-256、シート、分子・分母セル、数式証拠、県計との一致、31地域の一意性、分母正数、人数範囲、再計算を検証する。未承認のX/AA割合を生成しない。欠損は0にしない。

`single_judgment_rates.py`の定義参照を、indicator metadataの`rate_definition`から作るpolicyへ一般化した。旧候補の再現には旧定義参照を維持する。厳密な検証条件は緩和していない。新しい表示契約は`reported-annual-4`で、人数のみと割合許可のcapabilityを分離する。

全5指標の2021→2022、2022→2023は`pending`のまま。年度別実績の参考表示は許可するが、増減評価・改善悪化・前年差を生成しない。

## 共通UI

- 健康テーマmetadataで糖代謝を有効化し、全項目＋5指標を既存IDに結び付ける。
- 01: 既存ReportedOverviewの5カード。人数のみ2項目を空欄や0%で補完しない。
- 02: 共通MapPanel・MapLegend。許可3項目は固定domainの連続色、X/AAは既存の人数尺度。全項目では凡例ごとの単位を明示する。
- 03: TemporalTable / ReportedSetTable。3年度を横並び、人数のみ2項目も正しく表示。合計行なし。
- 04: ReportedChartsをtheme metadataで一般化。許可3項目の年度別実績、30市町村の箱ひげ、独立した指標間棒グラフ。人数のみ2項目の割合グラフは生成しない。
- 箱ひげは県計除外、非加重、丸め前値の線形補間。県計navy diamond、選択地域teal circleを既存tokenから継承。
- 色: 実人員は既存lipid_people、尿糖はdoctor_judgment.normal、空腹時血糖はmetabo.noncase、随時血糖はmetabo.indeterminate、HbA1cはguidance.noneのvisual metadataを参照。医学的良否を意味しない。
- ExportSurface / 共通PNG rendererを再利用。CopyとPNGは同じBlob、詳細provenanceは境界外。CSVは指標・地域・年度・人数・受診者数・許可割合・theme・原典・release・比較状態を保持する。
- 公表数表X～ABのセル対応を生成。原表順・再掲・実値は変更しない。

## 変更ファイル

データ: `hdv/glucose.py`（追加）、`hdv/lipids.py`、`hdv/single_judgment_rates.py`、`hdv/reported_annual.py`、`hdv/site_release.py`。

UI: `web/src/model.ts`、`health-themes.ts`、`visual-metadata.ts`、`reported-model.ts`、`reported-views.tsx`、`reported-table.tsx`、`reported-charts.tsx`、`reported-chart-model.ts`、`comparison-export-model.ts`、`map-notes.tsx`、`panels.tsx`、`main.tsx`。専用CSS・複製コンポーネントは追加していない。

テスト: `tests/test_glucose.py`、`web/src/glucose.test.tsx`。

## 検証結果（2026-09-21）

- 原典465人数一致。公式式9組から279割合を独立検証。残る186件は人数のみ。
- 2023県計: X=78,101、Y=7,673、Z=17,839、AA=6,806、AB=73,580、B=113,771。許可割合はそれぞれ6.7%、15.7%、64.7%（表示丸め）。
- Python 75/75、UI 123/123成功。TypeScript・Vite build成功。
- 新候補検証エラー0。従来の入力警告72件を保持し、解決済みにはしていない。
- PC 1366×768、スマートフォン390×844で確認。ページ全体の横overflowなし。モバイル表は既存の表内部スクロールを使用。
- 5指標×3年度の切替、県計／長岡市比較、固定domain、X6原典セルとの往復をブラウザ確認。自動テストでは各年度155セルの対応を検証。
- 主要値・比較地図・全項目表・単独年度表・箱ひげについてCopyとPNGを生成し、画像内容とSHA-256一致を確認。内部監査情報は混入しない。単独HbA1c年度表のCopy/PNGは双方 `ff9e0cfe28e43f6640d0faff5770b42c7b339cac8000ac8c80e02b0b201fca7b`。ClipboardItem処理の成功は確認したが、Word等の別アプリへの貼付は未確認。

候補ID: `0065008bfcb6259ef879cf0d1a93f08247b6074582748a7ab1fe2bb6b86dd7af`。

ローカル確認: http://127.0.0.1:4196/?review=1&theme=glucose&indicator=set%3Aglucose&year=2023

これは未承認ローカル候補。公開ポインター切替、commit、pushは行わない。
