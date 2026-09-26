# 保健所管内 第1版（ローカル候補）

## 範囲と出自

2021～2023年度、県計1・保健所管内13・市町村30。既存の人数限定公開候補を基礎に `--health-centers` で明示的に拡張する。既存31地域のレコード、指標、地図は変更しない。公開ポインター・承認記録・本番は切り替えない。

地域定義の単一管理元は `hdv/health_centers.py` の AREAS / registry。配信metadataをUIの地域選択、parent/child、地図選択、諸元で共用する。

- 12県保健所：原表の公式保健所計行。`value_origin=official_health_center_total`。
- 新潟市保健所管内：採用済み新潟市municipality record（50行）を1対1対応。`value_origin=municipality_identity_mapping`。元record IDを保持。51行は使用しない。
- 統計値のsource URL・SHA-256・sheet・cellは統計原本。管轄根拠は `mapping_provenance` に別管理。
- 2023年度sheet名 `保険者別 ` の末尾空白も保持する。

管轄資料の確認は2021-03-31、2022-03-31、現行県公式一覧の時点情報として保持する。未確認年度全期間への拡張はせず、`full_year_jurisdiction_status=pending`。資料URL・確認方法はmetadata参照。

## 数値・欠損・割合

28指標×13管内×3年度＝1,092レコード追加（分母レコードは別）。内訳：12公式管内1,008セル＝999数値＋9空欄、新潟市identity84セル。空欄を市町村合計0で補完しない。

数値を持つ公式999セルは構成市町村合計と一致。値には公式セルを使用し、市町村合計は照合専用。既存numeric 0は保持。

総合判定だけ、同年度同地域の受診者数に対する構成割合を許可する。構成全区分・公式計・分母の一致を検証してから、独立した `regional_contract=health-center-areas-v1` を付与する。年度間 `comparison_allowed` はfalse、両区間pendingを維持する。欠損を含む構成は図・割合を保留する（新津のメタボ全3年度、新津の保健指導2021/2023、十日町の保健指導2021）。人数原値自体は保持。

血圧・脂質・肝機能・糖代謝・腎尿路は人数のみ。保健所データにも `reported-annual-6` を適用し、割合フィールドがnullであってもvalidatorで拒否する。

## geometry / UI

既存2023-01-01参考境界の市町村polygonをShapely unionし、12管内を作成。新潟市管内は元polygonそのもの。簡略化・島の削除は行わない。元geometry SHA・構成コード・処理方法を保持し、再構成一致も検証する。利用には既存 geography optional dependencies が必要。

地域選択は県・保健所・市町村のoptgroup。保健所選択の地図は13管内、市町村側は従来の30市町村。A/Bで異なる地域レベルを並べられる。地図のカテゴリー色・breaksは既存metadataのまま。新しい地図意味色は導入しない。

総合判定の表は各年度の値を表示し「年度間比較は確認中」と明記。保健所を含むグラフは選択年度の構成・値に限定し、推移モードへ昇格させない。画像出力は既存ExportSurfaceを共用する。

## 検証・ローカル確認

候補ID：`ad50d1980ded8094a30f9da67df32e63cc85bf9ba7a24547e6de6e123848a753`

三条2023受診者12,084人、燕市3,401人。メタボ基準該当は2,519人／793人（20.8%／23.3%）。UIで確認済み。

Python100件、UI166件、TypeScript、production build、原本からの再構成を含むpublic validator error0。

再現：`python -m hdv.site_release build --data-dir <既存data> --analysis-release <既存analysis ID> --include-renal --count-only --health-centers`。
検証：同コマンドの `validate --release-id <候補ID>`。
レビュー：`python -m hdv.serve --data-dir <既存data> --web-dir web/dist --site-review-release <候補ID> --port 4222`。
候補データの追加Python integration testsは環境変数 `HDV_HEALTH_CENTER_CANDIDATE` に候補data.jsonの絶対パスを指定する（今回は指定して全件実行）。

UI fixtureは当候補から2023年度の三条・燕・新潟市管内・新潟市・新津を抜粋したテスト専用原値。地図geometryはPython側で完全検証し、UI fixtureでは省略。

承認・commit・push・production deployは本作業では実施していない。

## 2026-09-27 公開承認・最終検証

ユーザーが13管内機能を本番公開候補として承認し、commit・main push・Netlify production deployを明示指示。上記「ローカル候補／未公開」は初回実装時点の記録。

同一候補ハッシュを承認済みreleaseとして配信準備。再利用判断は既存 `reuse-decision.json`（SHA-256:68778860b8f6833afc2e1e27f8561428905c059346c44af623d43d08772e5561）のまま。新しい公式ライセンス確認事実を追加していない。承認の対応は `health-center-publication-lineage.json`。

人数限定公開の旧候補もimmutable基準データとして保持。currentは13管内版を指す。Pythonの回帰テストは旧候補を固定比較基準にし、13管内の実データテストはcurrentから常時実行（環境変数なしでもskipしない）。

最終検証：Python100件・UI166件・TypeScript・production build・public validator error0。既存入力72警告と未確認事項は保持。非総合17指標2,244件に公開割合フィールドなし、numeric 0は11件。総合判定1,056件・医師判断396件、既存31地域の原値と出典は一致。
