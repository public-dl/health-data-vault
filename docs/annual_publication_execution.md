# 医師の判断・公表数表・制度説明 実行報告

確認日：2026-09-20。commit・push・公開承認は未実施。

## 設計と公開状態

[設計・公式根拠](annual_publication_design.md)に基づき、既存public-3のcompatible条件は変更せず、site-1に別契約annual-1とpublished_tablesを追加した。既存analysisの744人数・744割合レコードはそのまま格納する。

医師の判断は `doctor_judgment`、指標は `physician_normal`（異常認めず）、`physician_guidance`（保健指導）、`physician_referral`（受診勧奨）。279人数・279割合、93分母、93構成検証証跡を生成した。単年度表示可否 `annual_display_allowed` と年度間比較 `comparison_allowed=false` / `comparability_status=pending` を別管理する。割合もpendingを維持する。経年グラフ・前年差・経年差・年度再生は表示せず、年度選択による個別閲覧だけを提供する。

2021～2023年度×県計＋30市町村の93組すべてで、H＋I＋J＝K＝B、差0。原表の結果概要にある医師判断の構成割合も分子÷受診者数と照合した。母集団・原本版・行・年度の不一致、欠損、分母0、構成不一致は候補生成を停止する。

| 県計の実績年度 | 異常認めず | 保健指導 | 受診勧奨 | 受診者数 |
|---|---:|---:|---:|---:|
| 2021 | 3,654 | 27,477 | 86,013 | 117,144 |
| 2022 | 4,022 | 28,731 | 83,558 | 116,311 |
| 2023 | 3,992 | 29,418 | 80,361 | 113,771 |

この表は監査記録であり、年度間の増減を評価するものではない。

## 公表数表

3原本の主表（42列、2021/2023は55行、2022は51行）、計6,762セルを収録。行順、計・再掲、新潟市50/51行、2021/2023の国保組合52～55行を維持する。2022に国保組合行を補わない。

原値、保存済み値、型、数式、表示形式、値状態、座標、原典URL・取得日時・SHA-256を保存する。数値0の表示形式によるハイフンと空欄を区別する。原表の書体や印刷寸法を完全複製する方式ではない。多段見出しの隣接空欄は画面上だけcolspanでまとめ、元セル配列は維持する。

`/tables?year=2023&cell=H6&review=1` で年度・原典セルへ移動する。図表の出典モーダルから原表へ、原表の採用済みセルから対応する指標・地域・年度へ往復できる。未公開列や新潟市再掲行から新しい指標を生成しない。TSV/CSVは表示用出力であり、Excel数式注入対策を行う。原値は候補JSONに別途保持する。

## 画面・出力

- 医師の判断全区分：100人ピクトグラム、3区分地図、単年度表、現在年度だけのDATA NOTES、個別Copy/CSV/PNG、地図・ピクトグラム比較画像、出典モーダル。
- 単区分：地図・単年度表・DATA NOTES。構成図と経年グラフは表示しない。
- 年度間pendingの説明は画面・単年度表TSV・CSV・画像出力に保持する。正確な人数・割合を使用し、TSVには各区分名も収録する。
- `/learn`：8項目の説明と資料URL・該当ページを掲載。厚生労働省令和6年度版は制度説明に用い、過去値を最新基準で再判定しない。医師の判断と特定保健指導の分類を区別する。

## テストと実画面確認

- `pytest tests -q`：60 passed、66 subtests passed。
- Vitest：83 passed、10 files。
- TypeScript型検査、Vite production build：成功。
- site Validator：errors 0。内包する既存analysis公開Validatorもerrors 0。
- 1366×768：県計単独、県計vs長岡市、2022/2023、人数/割合、入替、単区分/全区分を確認。医師判断のグラフ・年度再生が存在しないことを確認。
- 390×844：100人図の10×10フォールバック、単年度表、説明8項目を確認。ページ全体の横スクロールなし（表内部の横スクロールは許可）。
- 原表2022/2023の年度切替、末尾行、H6選択、可視化リンク、出典モーダルからH6への逆リンクを確認。
- Copy/CSV/PNG操作の成功通知を確認。TSVの区分名・pending維持は自動テストで確認。ブラウザー越しのOSクリップボード内容の再読取は確認できていない。

## 制約・未解決

P1（服薬・判定と集計の対応）、P7（心電図基準変更の適用と総合判定への影響）は公式資料で確定できずpendingを継続。合計一致を年度間比較の根拠にはしない。既存の原典警告72件と、2023境界を全年度に用いる地図の留保を維持する。原表ビューに載ることは分析用指標としての公開承認を意味しない。

## 候補・確認URL

候補：`881d1548fa002e532440e90b67454e731cbadd33a51a6985b0fc2d15088be937`

元analysis：`f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17`

候補はGit除外の `data/site/candidates/`。rawは変更しない。`data/site/current.json` と `data/public/current.json` は未作成で、今回公開版への切替はない。

- 地域比較：<http://127.0.0.1:4178/?review=1>（表示項目で医師の判断を選択）
- 公表数表：<http://127.0.0.1:4178/tables?year=2023&review=1>
- 制度説明：<http://127.0.0.1:4178/learn?review=1>

## 今回のファイル

追加：`hdv/site_release.py`、`tests/test_site_release.py`、`web/src/annual-model.ts`、`web/src/annual-model.test.ts`、`web/src/annual-views.tsx`、`web/src/annual-pages.css`、`web/src/source-table.tsx`、`web/src/learn.tsx`、`docs/annual_publication_design.md`、本書。

変更：`hdv/serve.py`、`web/src/model.ts`、`web/src/main.tsx`、`web/src/pictograms.tsx`、`web/src/visual-metadata.ts`、`web/src/content-navigation.tsx`、`web/src/context-bar.tsx`、`web/src/panels.tsx`、`web/src/comparison-export.tsx`、`web/src/site-intro.tsx`、`README.md`。

既存の未コミット変更は維持。既存Validator・割合計算・グループ判定コードの安全条件は変更していない。
