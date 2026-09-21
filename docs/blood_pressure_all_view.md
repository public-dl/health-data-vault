# 血圧：原表掲載2区分の同時表示と年度別実績表

2026-09-20のUI変更。以前の「全区分なし」「表も単年度のみ」のUI方針を、ユーザーの追加仕様に従って更新した。原本・派生割合・Validator・releaseデータ・年度間比較許可は変更していない。

## 全区分の定義

`health-themes.ts` の `reportedSets` に `set:blood-pressure` を定義。既存の `bp_guidance` と `bp_referral` の2つの検証済み割合指標が利用可能な場合のみ選択肢を表示する。これはUI表示セットであり、indicator/groupの公開ID追加や構成groupではない。URLに表示セットを保存する。既存の単独指標URLは維持する。

正常・その他・判定不能・残差の生成は行わない。合計行・100人構成図・100%積み上げ・経年グラフも作らない。

## 表示

- 01: 1地域では保健指導と受診勧奨の2カードを並べ、各カードに人数・割合・特定健診受診者数を表示。2地域では指標ごとにA/Bを並べる。
- 02: 1地域では2地図を並べる。2地域では指標ごとにA/Bペア。地域・指標の人数を合算せず、各指標の既存割合を使用する。指標／比較ペアごとの年度スライダーは同じ選択年度に同期する。
- 03: 選択年度まで最大5年（総合判定の既存ルール）の年度別実績を表示。2023年度選択時は2021・2022・2023年度。単独指標は割合、判定人数／受診者数、掲載年度、比較可否の4行。全区分は原表の2区分のみを行、実績年度を列にする。
- 04: 年度間比較確認中の説明のみ。前年差・増減率・トレンド解釈は生成しない。

## 共通化

`CategoryYearTable` を総合判定の `GroupTable` と血圧の `ReportedSetTable` で共用。年度見出し、公表年度補助表示、選択年度背景、最小列幅、caption、共通CSSを維持。カード・数値セル・出典ボタン・DATA NOTES・Copy/CSV/PNGは既存部品／スタイルを使用する。

単独指標は `TablePanel` / `TemporalTable` を再利用し、DATA NOTESを総合判定と同様に表の下へ置く。

## pendingと表示範囲

`reportedContext(..., true)` は既存の各年度単独値検証を全収録年度へ適用する。年度値を併記する `annualValues` と、比較の許可 `comparison_allowed` を分離する。後者はfalse、comparabilityはpendingのまま。主要値・地図は選択年度へ限定し、表・表出力だけを年度別実績へ広げる。

同年度の地域間算術差は既存許可を維持。異なる年度を減算する処理は追加していない。全区分表では指標を合算せず各レコードの値を出力する。

## 変更箇所

`web/src/health-themes.ts`, `main.tsx`, `reported-views.tsx`, `reported-table.tsx`, `category-year-table.tsx`, `group-views.tsx`, `temporal-table.tsx`, `panels.tsx`, `comparison-export-model.ts`, `comparison-export.tsx`, `reported-views.test.tsx`。

## 確認

- Python 67テスト成功。フロントエンド99テスト成功。TypeScript型検査・Viteビルド成功。
- 1366×768: 県計の保健指導24,736人／21.7%、受診勧奨29,305人／25.8%、受診者113,771人。2カード・2地図・2行×3年度表を確認。
- 県計vs長岡市: 4地図、2つの年度表、左右／上下切替、両スライダーの2022年度同期を確認。
- 390×844: 表内部の横スクロール、ページ全体の横スクロールなしを確認。
- 全区分表コピーの実テキストで2指標×3年度、人数、分母、割合、掲載年度、pending、P/Q/B原典参照、releaseを確認。CSVと比較出力は回帰テストでも検証。
- ローカル確認: http://127.0.0.1:4185/?review=1&theme=blood-pressure&indicator=set%3Ablood-pressure&year=2023&region=15&measure=rate

commit・push・公開版切り替えは未実施。
