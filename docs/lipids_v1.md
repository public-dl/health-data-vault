# 脂質テーマ第1版

2026-09-20。ユーザーの脂質第1版仕様に基づく実装。公開版の承認・切替、commit、pushは実施しない。

## 原表と派生割合

2021～2023年度の「判定区分（保健指導以上を再掲）／脂質代謝」に掲載された人数のみを使用する。

| ID | 原表名称 | 列 | 割合由来 |
| --- | --- | --- | --- |
| lipid_people | 実人員 | R | hdv-derived |
| triglycerides | 中性脂肪 | S | official-formula-confirmed |
| hdl | HDLコレステロール | T | official-formula-confirmed |
| ldl | LDLコレステロール | U | official-formula-confirmed |
| total_cholesterol | 総コレステロール | V | hdv-derived |

5項目すべて、同年度・同地域の原表人数÷B列の特定健診受診者数×100。精度を保持して算出し、表示のみ既存ルールの小数1桁に丸める。分母を検査実施者数へ読み替えない。

県計の公式概要J16/J18/J20の算式、分子J15/J17/J19、分母J4および保存済み計算値を原本から検証する。2021・2022は `=J15/J$4*100` 等、2023は `=J15/J4*100` 等。県概要の同算式確認と、市町村値をHDVで算出したことを区別してprovenanceへ記録する。R・Vはユーザーが明示的に許可したHDV派生割合であり、公式公表割合とは称さない。

実人員の詳細な重複排除条件は未確定。項目を加算せず、差から重複人数・正常・非該当・判定不能等を生成しない。100人図、100%積み上げ、合計行を作らない。基準値の説明例は今回追加せず、人数の算出にも使用しない。

## 契約と検証

`reported-annual-3` を追加し、既存1/2の再検証互換性を維持。既存の非構成型割合Validatorで、原本・年度・地域・母集団・行・分子列・分母B列・正の分母・整数人数・範囲・算式・pending・権限を検証する。脂質ではさらに由来証拠を必須とし、SHA・sheet・列の一致を確認する。構成Validatorおよびcompatibleの条件は緩和しない。

全5指標は年度間pendingを維持。年度別実績値を表へ並べることと、同年度A/Bの算術差だけを許可し、経年差・トレンド・折れ線を生成しない。

候補ID：`512b45e24b3520c62f4233dc33f9efbc6bca6a3c9eae5777d8b7e99a61a7b46f`

保存先：`data/site/candidates/<候補ID>/`。公開版ポインターは変更していない。

## 共通UI

- theme `lipids` を有効化。選択肢は `set:lipids`（全項目）と既存5 ID。構成groupではなく表示用集合。
- 01は共通ReportedViewsの主要値カード。5項目一覧／単独／2地域比較。タイトル・注記・人数ラベルをmetadataから取得。
- 02は共通MapPanel。全項目時は5枚の個別地図、A/B比較、年度同期、Copy/PNG、DATA NOTES。割合の凡例は下記追補のindicator別固定階級で、医学的閾値ではない。
- 03は共通TemporalTable、ReportedSetTable、CategoryYearTable、DataNotesを使用。全項目表は5行、合計行なし。選択年度までの既存年度表示方式を維持。
- 04は比較可能性確認中の説明のみ。
- 専用CSSや脂質専用画面を追加しない。PCは既存2列、狭幅は既存1列と表内部の横スクロール。
- 色は識別用。実人員は既存HDV navy、TGは既存teal、HDLは既存blue、LDLは既存green、総コレステロールは既存slateのvisual tokenを参照。医学的な良否・重症度を表さない。
- Copy/PNGは既存ExportSurfaceと同一PNG Blob経路。詳細provenanceはモーダルに分離。CSVへ人数・分母・割合・割合由来を共通追加し、健康テーマ・release・既存原典情報も保持。
- 公表数表R～Vの公開対象セルのみ、既存SHA/sheet/cell照合で双方向リンク。原表順・値・形式・空欄を維持。

## 確認結果

- 5項目×31地域×3年度=465件を原本Excelセルと一致確認。独立割合465件を再計算検証。
- 2023年度県計：74,971/65.9%、31,433/27.6%、5,467/4.8%、53,381/46.9%、37,544/33.0%。分母113,771人。
- 柏崎市・刈羽村V41/V42の数値0、柏崎保健所計V40の空欄を3年度とも保持。
- 公表数表は各年度155セル、計465セルに脂質リンク追加。リンク情報以外の全原表セルの値・型・表示形式・順序が旧候補と同一。
- 旧候補と新候補のValidator再検証成功、エラー0。総合判定analysisと医師の判断annualのpayloadは旧候補と同一。
- 入力全体の既存警告72件は残存。脂質追加によって解消したとは扱わない。年度間定義・実人員の詳細条件等は引き続き未確定。
- Python 69 tests成功、Vitest 108 tests成功、TypeScript型チェック・production build成功。
- ブラウザ：5指標、全項目、2021/22/23、割合/人数、県計/長岡市比較、柏崎市0、S6原表往復、2種類の割合由来、血圧/総合判定への切替を確認。
- 1366×768および390×844を確認。モバイルdocument幅375px、viewport390pxで全体横スクロールなし。表は550pxで表内スクロール。
- 実出力を目視：実人員比較カード、中性脂肪比較地図、全項目表、LDL単独カード、LDL単独年度表。各CopyとPNGのBlob SHA一致、画像はカード下端で終了し内部provenance混入なし。CSV保存操作と内容生成テストも成功。Word/PowerPoint等への実貼付は今回未確認。

## 変更ファイル

データ契約：`hdv/lipids.py`、`hdv/reported_annual.py`、`hdv/single_judgment_rates.py`、`hdv/site_release.py`。

UI：`web/src/health-themes.ts`、`model.ts`、`reported-model.ts`、`reported-views.tsx`、`reported-table.tsx`、`visual-metadata.ts`、`temporal-table.tsx`、`panels.tsx`、`main.tsx`、`comparison-export.tsx`、`comparison-export-model.ts`。

テスト：`tests/test_lipids.py`、`web/src/lipids.test.tsx`。ビルド成果物：`web/dist`。

ローカル確認：<http://127.0.0.1:4186/?review=1&theme=lipids&indicator=set%3Alipids&year=2023>

## 固定choropleth階級の実装追補

ユーザー確定値を `hdv/lipids.py` の `RATE_MAP_BREAKS` に定義し、各indicatorの `rate.map_breaks` へ収録。年度・地域からは計算しない。人数用階級と既存パレットは変更なし。

| indicator | 固定breaks（%） | 2023年度30市町村の第1～5階級件数 |
| --- | --- | --- |
| lipid_people | 60,65,70,75 | 2,9,12,6,1 |
| triglycerides | 24,28,32,36 | 5,9,5,5,6 |
| hdl | 4,5,6,8 | 3,7,12,6,2 |
| ldl | 40,45,50,55 | 2,8,11,7,2 |
| total_cholesterol | 25,30,35,40 | 6,3,9,10,2 |

既存 `displayData` が割合用breaksを選択し、MapPanelのSVG凡例とモバイル凡例が同じ配列から生成される。地図は丸め前のvalueについて `value >= break` の境界数を色番号とする。境界ちょうどは上側、0は第1階級、null/undefinedは欠損ハッチ。テストで全境界直前・一致値・0・欠損を実際のMapPanelに通して確認。

候補版 `map_scale_version=lipids-fixed-2021-2023-v1` を追加。過去候補は旧階級のまま再構築・再検証できる。新旧候補の差は脂質の割合breaksと版情報のみ。analysis、annual、原表、報告人数、派生割合、分母、血圧metadata、色は同一。

新候補：`ee96f341d0c9d817acd47759ebf5cde46bc6790d381b8f398400f54665defe9d`。Validatorエラー0。UIテスト109件成功。5指標の実地図で2023件数を照合し、2021/2022・A/Bでも固定値を確認。5指標のCopy/PNGを目視、ハッシュ一致確認（HDLはA/B比較画像）。画像内の凡例・色は画面と一致。

今回のコード変更：`hdv/lipids.py`、`hdv/reported_annual.py`、`hdv/site_release.py`。テスト変更：`tests/test_lipids.py`、`web/src/lipids.test.tsx`。地図コンポーネント・CSS・既存色は変更していない。

新しいローカル確認：<http://127.0.0.1:4187/?review=1&theme=lipids&indicator=set%3Alipids&year=2023#map>。公開ポインター変更・commit・pushなし。
