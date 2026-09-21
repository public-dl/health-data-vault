# 任意2地域の比較出力

## 実装

- 地域別のコピー／CSV／PNGは維持。地域B選択時だけ、表・地図に「比較結果（A vs B）」操作を表示。
- 表コピー：年度列（存在する最大5年度）×項目・地域行のTSVとHTML table。全区分ではカテゴリーごとにA/Bを並べる。タイトル、母集団、release ID、原典セルを付記。
- CSV：UTF-8 BOM・CRLF・既存の数式注入対策。地域×年度×指標の長形式。既存のindicator_id、numerator、denominator、原典URL・シート・セル・SHA等を保持し、region_role/id/name、indicator_group、category_id、actual_year、publication_year、rate、comparability、rate_comparability、release_idを追加。既存の派生値を使用し再計算しない。
- 比較PNG：画面全体のキャプチャではなく、既存の表出力SVG／地図SVGを専用の比較SVGへ配置し、CanvasでPNG化。左右／上下の選択を反映。指標・単位・両地域・年度・母集団・出典・releaseを付記。追従バーや操作ボタンは含まない。
- 地図は指標・年度・単位・凡例階級の一致を出力前に確認。全区分一覧は現在選択中の1地域の4カテゴリー、地域比較は選択カテゴリーの2地域を出力。8地図を結合しない。
- グラフは既存のON系列だけを出力。選択A/BとON系列名・年度を画像注記に追記。
- Clipboard：表はHTML+TSVを試み、失敗時はTSVのみへフォールバック。双方失敗時は比較CSVを案内。画像コピー失敗時はPNG保存を案内。

## 検証（2026-09-19）

- Vitest 74件成功（比較出力10件追加）、Python unittest 55件成功、production build成功。
- 公開Validator：passed、errors 0。744人数、744派生割合、93分母、186構成、8指標・31地域。
- 既存警告を維持：入力全体72件、2023年参考境界の全年度利用、母集団・年齢性別未調整の制約。
- 実ブラウザーで県計 vs 糸魚川市／基準該当／割合のコピー成功通知、CSV保存、左右・上下PNGを確認。PNGを開いて値・地域名・注記を目視確認。
- CSV実ファイル：県計3年度E6と糸魚川市3年度E47、分子・分母・未丸め割合を確認。2023県計21934/113771、糸魚川市375/2150。
- 長岡市 vs 新潟市の入替後、出力順が新潟市A・長岡市Bとなることを確認。全区分表のコピー／CSV／PNG、地域比較地図PNG、人数・2022年度への変更、保健指導全区分のコピーを確認。
- OFF系列検証：構成グラフの長岡市をOFFにし、SVGと保存PNGに新潟市だけが残ること、注記に選択地域とON系列が別記されることを確認。
- Clipboard拒否時のTSVフォールバック／CSV案内は自動テスト。Excel・Word・PowerPointそれぞれへの貼付けは未検証（貼付け先のHTML対応に依存）。
- ローカル確認： http://127.0.0.1:4176/?review=1 。未承認candidateの確認用。approvedへの切替なし。

## 今回の変更ファイル

新規：`web/src/comparison-export-model.ts`、`web/src/comparison-export.tsx`、`web/src/comparison-export.test.tsx`、本書。
変更：`web/src/main.tsx`、`web/src/panels.tsx`、`web/src/group-views.tsx`、`web/src/style.css`。
データ・計算・Validatorは変更せず、commit・pushなし。
