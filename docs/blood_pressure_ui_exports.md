# 血圧UI・画像コピー・表示順の修正（2026-09-20）

後続のCopy / PNGへの内部情報混入修正と最新の実画像検証は [export_surfaces.md](export_surfaces.md) を参照。以下は先行変更時点の記録。

## 表示metadata

- `health-themes.ts` の `bloodPressureDisplayOrder` を `bp_referral, bp_guidance` と定義。指標選択、全区分01・02・03、DATA NOTES、CSV、画像内の列挙に使用。
- `visual-metadata.ts` の `indicatorColorAliases` は `groupVisuals.metabo.case` と `groupVisuals.metabo.preliminary` の既存オブジェクトを直接参照。色コード・パレットを複製しない。
- `model.ts` の表示用変換で適用。公開候補のデータ・ID・定義・分子分母・pendingは変更しない。
- 公表数表の原表順は別系統。2023県計 P6=24,736（保健指導）、Q6=29,305（受診勧奨）の順序・対応を実画面でも確認。

## 共通コンポーネント

- 単独指標：既存 `TablePanel` / `TemporalTable`、共通 `panel group-table` / `group-table-body`。
- 全区分：総合判定と同じ `CategoryYearTable` に加え `CategoryValue` を共用。血圧は2行のみで、合計・残差行なし。
- `DataNotes` を抽出し、総合判定・血圧の見出し／タグ／背景／余白を共有。
- 年度ヘッダー・主値・人数・分母は共通16px、濃紺 `#24486c`。ヘッダー650、数値600以上。掲載年度・pending等は補助階層。
- 血圧専用table CSSは追加せず、古い `reported-kpi` CSSと、比較表の先頭年度だけ13pxになる指定を除去。

## 出力

- `Actions` / `ComparisonActions` はテキスト専用コピー分岐を廃止。旧TSV clipboard helperも削除。
- `cardsPng` で実カードDOMと計算済みスタイルからPNG Blobを生成。コピー／PNG保存は同じ生成処理。
- `ClipboardItem({'image/png': Promise<Blob>})` をクリック処理中に `navigator.clipboard.write` へ渡す。非対応・拒否時は明示的な案内。テキストへ自動代替しない。
- A/Bの地図・表・主要値比較を1画像化。左右／上下／狭幅時の実配置に対応。
- モバイル表はスクロール外の年度列も画像へ収録。表のcaption由来の高さ二重計上を防止。
- CSVのデータ内容は維持し、血圧全区分の表示順のみ受診勧奨→保健指導に整列。原本レコードは非破壊。

## 確認結果

- TypeScript型検査、Viteビルド成功。
- フロントエンド101テスト成功（旧テキストclipboardの2テストは廃止仕様として除去、画像clipboard・色参照・表示順／P/Q対応のテストを追加）。
- Python67テスト成功。
- 既存レビュー候補 `6537561b89552609f1844596ee6f7849cdf7baed7ea587a54be4fa8854cbf0b0` の再検証 passed、errors=0。血圧186レコード、公表数表3年度6,762セル。既存入力全体の72警告等は従来どおり保持。
- 実ブラウザ1366×768／390×844で県計・長岡市、単独／A/B、全区分／単区分を確認。ページ全体の横スクロールなし。
- 実ClipboardItemの結果として `image/png` を読取確認。全区分表、単独区分比較表、左右／上下比較地図、主要値比較。PNGを画像として開き、値・色・順序を確認。
- PNG保存・CSV保存の成功通知を実操作で確認。ブラウザのdownloadイベント取得はこの確認環境ではタイムアウトしたため、OS上の保存先ファイル照合は未実施。
- Word／PowerPoint／Teams等のネイティブアプリへのCtrl+V貼付は未確認。

ローカル確認： http://127.0.0.1:4185/?review=1&theme=blood-pressure&indicator=set%3Ablood-pressure&year=2023&region=15&measure=rate

原本・release・Validator条件・公表数表componentは変更していない。承認済み公開ポインター切替、commit、pushは行っていない。
