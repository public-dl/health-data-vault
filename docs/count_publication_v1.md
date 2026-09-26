# 総合判定以外の人数限定公開：実装・検証記録

## 方針と版

2026-09-26のユーザー指示に基づく `reported-count-publication-v1`。
公開reported schemaは `reported-annual-6`。総合判定の `public-3` / `annual-1` は変更しない。
作業ブランチは `codex/count-only-publication`。本番へのpush・deployは行わない。

| 対象 | 公開割合 | 公開人数 |
| --- | --- | --- |
| 総合判定11指標 | 維持（744+279件） | 維持 |
| bp_guidance / bp_referral | 停止 | 維持 |
| lipid_people / triglycerides / hdl / ldl / total_cholesterol | 停止 | 維持 |
| liver | 停止 | 維持 |
| glucose_people / urine_glucose / fasting_glucose / hba1c | 停止 | 維持 |
| urine_protein | 停止 | 維持 |
| random_glucose / renal_urinary_people / urine_blood / creatinine | 従来どおりなし | 維持 |

13指標×93件=1,209件のderived_rateを新releaseのreported.recordsから除外。
17指標×93件=1,581件の原表人数を維持。numeric 0は11件（総コレステロール6、尿蛋白2、クレアチニン3）。
原値、原本SHA-256、sheet（2023年度の末尾空白を含む）、cell、地域・年度・定義版・comparabilityを維持。
変更するレコードフィールドは、derived_rate削除、display_contractの版、regional_difference_allowed=falseのみ。

## 証拠と公開許可の分離

`hdv/count_publication.py` のprojectは、旧契約による原典・公式式・割合検証が成功したpayloadにだけ適用する。
8指標の公式式証拠、旧rate_policy、旧renal_contract、旧indicator metadataは
`reported.audit_evidence`へ**内容を変更せず**保存する。
この監査専用領域に残る旧rate設定・式は現在の表示許可ではなく、将来の再審査と過去版再現の証拠である。
通常UI・CSV・PNG・Copyはこの領域を参照しない。

公開indicator側は `public_capability=rate_disabled_pending_denominator_review`、
`count_only=true / recipient_rate=false / map_mode=none / distribution=false / can_compare_regions=false`。
rate、rate_origin、rate_contract、map_scale、chart_max等を除外する。
将来再承認する場合は、この版のフラグを安易に戻さず個別の分母監査と新しい公開版が必要。

## UIと出力

- 01：原表人数。受診者数は参考情報。A/Bを並べても差・比・評価は生成しない。
- 02：全17指標で地図を停止し、理由と表へのリンクを表示。随時血糖も人数地図へ置換しない。
- 03：共通TemporalTableで人数・参考受診者数を別行表示。複数項目表も人数のみ。人数の補助バーを使わず、数値を示す。
- 04：グラフ・地域分布を停止し、理由と表へのリンク。chart chunkを新契約では呼び出さない。
- 自動コメントは年度・地域・指標の報告人数の事実のみ。年度間pendingを維持。
- sidebarの表示値は「報告人数」のみ。旧 `measure=rate` URLも新契約では人数へ解決。
- CSVは人数・出典・年度・comparability等を出力し、rate、percentage、formula、point difference、rate origin列を作らない。
- Copy/PNGは共通ExportSurfaceを使用。表の既存DATA NOTES accordionがexportを拒否していたため、表示用detailsに明示マーカーを追加。
  provenance・dialog・監査情報・未指定detailsは引き続き拒否し、閉じたDATA NOTES本文はcloneから除く。
- 公表数表の原値・型・行列順・表示形式は変更しない。reported対象1,581セルの可視化リンクだけ `#table` へ変更。
- SEOの説明文を「公表された報告人数と総合判定の構成比」に修正。robots/canonical/sitemap/JSON-LDの生成機構、ヒーローは不変。

## Validatorと再現性

新公開契約はrateフィールドがnullでも存在すればerror。
capabilityの矛盾、人数・zero・provenance・証拠の変更もerror。
site_release.inspectは新契約の禁止フィールド検証に加え、原本からの完全再構築一致を検証する。
旧Validatorやcomparabilityの条件は緩和していない。

旧releaseはファイルを上書きせず、以下2版を同コードから再構築してerror 0と完全一致を確認。

- `f325c8b7373317aea721442edbf49867788a7270eb4b7da3e3477d38fc479ff9`（腎・尿路系の割合公開版）
- `8e1fe8695fc86b4358bb695ce0a1c3ccfccdb9f5c0f5ecc45098a6d5fb915827`（従前版）

新release / SHA-256：
`819d9ba9988bd53408a032f6092a94782e96054e3e9c71ed7853ad8868f67553`

生成は `python -m hdv.site_release --data-dir data build --analysis-release <旧releaseのanalysis_release_id> --include-renal --count-only`。
旧版再構築には既存version dispatchを維持。
候補・validation・承認はdata/siteに保存し、新しいimmutable JSONとcurrent pointerをweb/public/public-dataへ配置。
既存の岸克也氏の再利用判断をそのまま参照し、今回の人数限定公開指示との関係を `count-publication-lineage.json` に記録。
公式ライセンス確認済み・CC BY確認済みとはしていない。

## 検証結果

- Python：95件成功（新規5件）。最初の新規テストで公式式の旧metadataをbooleanとして参照していた点を、既存rate_originの実構造へ修正して全件再実行。
- UI：31ファイル163件成功（新規5件）。並列実行時の旧テスト2件のtimeoutは、制限時間を変えずworker=1で再実行して成功。
- TypeScript：成功。
- production build：成功（Vite 207modules、初期index JS約234.86kB、dashboard約142.28kB）。
- public validator：error 0。既存入力の72警告は別問題として保持。
- SEO：本番初期HTML、runtime noindex guard、canonical、OGP、robots.txt、sitemapの既存チェック成功。
- 実データテスト：総合判定analysis/annualは旧JSONと完全一致、公表数表はリンク先以外完全一致。
- 全17指標のpublic/review描画、全5非総合テーマの指標選択、全項目表・単独表、CSV/比較CSVを自動確認。
- ブラウザ：6テーマ切替、年度・地域変更、01～04、尿蛋白県計4,689人・粟島浦村0人、総合判定の割合・100人図・地図・グラフを確認。
- 実画像：尿蛋白人数表、尿蛋白A/B主要値、血圧全区分A/B表のimage/pngを取得・目視確認。割合・差・監査本文を含まない。
  人数表Copy/PNGのblob SHA-256は双方 `fdb114bbd6d53b08de3d1708e24ce8d441aa11142cfe88934b700bf423439aa6`。
  A/B主要値は双方 `671c406e937c7197c56a7551bf9c041ef083be3bd8db2c3a2a342a1d961708c2`。

ローカル確認：`http://127.0.0.1:4222/?theme=renal-urinary&indicator=urine_protein&year=2023&region=15&measure=count#table`
review候補はignoredのdist/review/data.jsonのみで提供（public配下にはreview JSONを追加しない）。
再起動時は `hdv.serve --site-review-release <新release ID>` でも同候補を原本検証後に配信できる。

未解決のデータ定義（検査実施者分母、実人員の具体的な重複処理、年度間比較可能性）は未確認のまま保持。
割合の再公開を許可する変更はしていない。本番反映はユーザー確認後の別工程。

## 最終画面確認と変更範囲

390×844のモバイルでは条件drawerと既存の表の横スクロールを確認。
尿蛋白2023年度の出典AD6から公表数表へ移動し、原値4,689を確認して、可視化リンクで人数表へ戻れることを確認した。
スクリーンショットと実際のCopy画像は原作業ディレクトリの `data/count-publication-review/` に保存。
PNG保存操作の生成blobとCopy画像は同一ハッシュ。ブラウザのdownloadイベント取得はタイムアウトしたため、ダウンロード先ファイルの確認は未実施。

変更ファイル群：

- 公開契約・生成：`hdv/count_publication.py`（新規）、`hdv/site_release.py`
- UI・出力：`web/src/model.ts`、`reported-model.ts`、`reported-views.tsx`、`reported-table.tsx`、`temporal-table.tsx`、`dashboard.tsx`、`panels.tsx`、`visual-metadata.ts`、`comparison-export-model.ts`、`source-links.ts`、`data-notes.tsx`、`export.ts`
- SEO説明：`web/src/seo.ts`
- テスト：`tests/test_count_publication.py`、`web/src/count-publication.test.tsx`、`web/src/export.test.ts`
- 配信：`web/public/public-data/current.json`、`count-publication-lineage.json`、新release JSON
- 報告：本書

既存config 3ファイルの改行由来のworking tree状態は維持し、意味的な変更を加えていない。
作業branchは `codex/count-only-publication`。commit・push・production deployは未実施。
