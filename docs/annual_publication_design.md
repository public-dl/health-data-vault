# 単年度表示・公表数表の独立契約

2026-09-20。ユーザー承認済みの単年度構成監査を実装条件にする。

- 既存 `public-3` と `validate_public` の compatible 条件は変更しない。
- `site-1` は既存 analysis、独立した annual、published_tables をまとめる配布単位。候補の生成・検証と人間の公開承認を分離する。
- `annual-1` は医師の判断の報告人数・単年度構成専用。counts/rates とも comparability=pending、comparison_allowed=false。annual_display_allowed=true は構成検証済みのその年度だけを許可する。経年グラフ、差分、年度再生には渡さない。
- 年度・地域・母集団・原本版・シート・行が一致する H/I/J/K/B を原本から再検証する。3区分合計=K=B、分母>0、非負有限数、正確な93組、採用行一意性を必須とする。原本結果概要シートにも医師の判断の人数・構成割合があることを根拠とし、単なる算術一致のみで分類を推測しない。
- 公表数表は主表全セルの値、数式、保存値、型、表示形式、座標、出典を保持する。分析用行選択を適用しない。原表の空欄と数値0のハイフン表示は別状態のまま保持する。未対応表示形式を黙って数値表示へ変えずビルドを停止する。
- 公開リンクは収録済みの原典版・シート・セルとの完全一致でのみ生成する。公表数表から未公開指標を生成しない。
- 医師の判断の単年度公開は医学的妥当性や年度間の同一定義を認定するものではない。年齢・性別調整も行わない。P1/P7は引き続きpending。
- 新たな公開候補を人間が承認するまではレビューURLでのみ閲覧し、既存公開ポインターは変更しない。

## 公式根拠と未解決事項

確認日2026-09-20。制度説明ページ `/learn` は次の一次資料と対応付ける。令和6年度版は制度説明の参考であり、2021～2023実績の再判定には使わない。

| 説明 | 公式資料・該当箇所 |
|---|---|
| 対象・制度 | [厚生労働省 特定健診・特定保健指導について](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000161103.html)、[令和6年度版 第2編第4章 p.60](https://www.mhlw.go.jp/content/10900000/001081574.pdf) |
| 検査値だけでなく総合評価・情報提供 | [同 第2編第2章 p.48–55、とくにp.52・54–55](https://www.mhlw.go.jp/content/10900000/001153023.pdf) |
| 保健指導判定値・受診勧奨判定値 | [同 別紙5 p.125、フィードバック文例集](https://www.mhlw.go.jp/content/10900000/001231392.pdf) |
| 階層化、服薬、年齢、対象外への支援 | [同 第2編第3章 p.56–59](https://www.mhlw.go.jp/content/10900000/001081570.pdf)、[第4章 p.61–62](https://www.mhlw.go.jp/content/10900000/001081574.pdf) |
| 医師判断・メタボ・保健指導の区別 | [新潟県 健（検）診ガイドライン各年度版](https://www.nhf.or.jp/concerned/guideline.html)、R3–R5冊子p.6–7（既存定義監査G-c） |
| 原表の3区分と構成割合 | 各Excelの主表H3:K5とH/I/J/K/Bの採用行、結果概要シートB5・C8・J4:J10。原典URLは候補内sourceと各セルのprovenanceに収録。 |

P1/P7追加調査：財団の[特定健診事業ページ](https://nhf.or.jp/concerned/healthcheckb.html)と[令和4年度結果集計報告](https://www.nhf.or.jp/editor/upload/admin/files/2022.pdf)の「ご利用にあたって」p.1、データ範囲チェックp.2、判定値p.3、市町村別集計p.7–8を再確認。法定報告との対象差、範囲外除外、眼底単独結果の除外等は記載されるが、主表の医師判断と検査値再判定の優先規則、服薬の集計コードへの対応（P1）、R5心電図基準変更の適用時点と総合判定への影響（P7）は確定できない。両方pendingを維持する。別表の陽性率の説明をH～Jの集計規則として流用しない。

## データ構造と閲覧

`data/site/candidates/<SHA-256>/data.json` は `site-1`。この候補内の既存analysisは元のpublic-3そのもの。annualは279人数レコードと279派生割合、93分母・93構成証拠を持つ。構成証拠にはK列の合計レコードも保存する。

published_tablesは年度ごとに `source`（URL/掲載年度/取得日時/SHA-256）、`source_sheet`、行列数、結合範囲、行順・階層、全セルを保持。セルはrow/column/coordinate、original_value、cached_value、source_data_type、number_format、formula、value_state、display_text、許可済みvisualizationリンクを持つ。原値の空欄はnull、表示は空文字。数値0のハイフン表示と文字のハイフンは異なる状態。

原本主表の範囲は2021 A1:AP55、2022 A1:AP51、2023 A1:AP55。新潟市50/51行を両方保持、分析リンクは採用行50だけ。2021・2023の52–55行の国保組合を保持、2022に空行を捏造しない。見出しの連続空セルはHTML上のcolspanでまとめるが、元セル配列・CSVでは全位置を保持する。Excelの書体・印刷レイアウトの完全複製は対象外。

`/tables?year=2023&cell=H6` は年度と行列座標を保持してハイライトする。戻りリンクは `/?year=2023&region=15&indicator=physician_normal#map`。review=1はローカル候補に限り引き継ぐ。原表→可視化は同じ原本SHA・シート・セルに対応する収録済みレコードがある場合のみ許可。

## 実行

```powershell
.venv\Scripts\python.exe -m hdv.site_release build --analysis-release <検証済み既存候補ID>
.venv\Scripts\python.exe -m hdv.site_release validate --release-id <新候補ID>
.venv\Scripts\python.exe -m hdv.serve --site-review-release <新候補ID> --port 4178
```

候補build/validateはcurrentを書かない。公開には別の明示的approve（reviewer、exact hash、data/map rights確認）が必要。今回approveは実行しない。`site/current.json`がない場合、既存publicの承認経路を維持する。ある場合はsiteの承認と内容ハッシュを必須とし、不正時は旧版・候補へフォールバックしない。
