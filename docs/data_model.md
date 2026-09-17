# v0.1 共通データモデル

正本はUTF-8 JSON Lines。1レコードは「原本の1セルに記録された、実績年度×地域集計階層×指標の値」。JSONの数値とnullを区別し、加工前・検証後のファイルを分離する。

## フィールド

| フィールド | 型 | 意味 |
|---|---|---|
| schema_version | string | `0.1` |
| publication_fiscal_year | integer | 掲載年度の西暦開始年（2022–2024） |
| observation_fiscal_year | integer | 実績年度の西暦開始年（2021–2023） |
| geography_name | string | 空白を整理した原表地域名。県計等を自治体名に読み替えない |
| geography_original_label | string | 原表A列の未変更ラベル |
| geography_level | enum | prefecture_total / city_total / town_village_total / health_center_total / municipality / insurance_union_total / insurance_union / unknown |
| indicator_id | string | `hdv/config/indicators.json` の固定ID |
| original_label | string | 原表の多段見出しを区切り付きで保持。元の改行等も保存 |
| source_label_cells | array[string] | 見出しを構成したセルの一覧 |
| value | numberまたはnull | 数値の原値または式の保存済み値。非数値はnull、欠測を0にしない |
| unit | enum | 人 / 件。検査値mg/dl等ではない |
| population_scope | string | 市町村国保の範囲／国保組合の別母集団を明示 |
| source_url / annual_page_url | string | Excel直接URL／発見元公式年度ページ |
| source_sheet / source_cell / source_row | string / string / integer | 原シート名（空白含む）・セル座標・行番号 |
| source_sha256 / retrieved_at | string | 原本のバイト識別子・タイムゾーン付き取得日時 |
| comparability_status | enum | compatible / pending / incompatible。品質合格とは別軸 |
| comparability_intervals | object | 2021_2022 / 2022_2023 の区間別比較判定 |
| comparability_reason / definition_reference | string | 判定理由・調査文書の所在 |
| definition_version | string | `niigata-tokutei-{実績年度}-v0.1`。年度別基準を維持 |
| comparison_group | string | 同じ意味で比較できる候補グループ。これだけでは比較を許可しない |
| validation_status | enum | unvalidated / passed / warning / excluded / failed |
| comparison_allowed | boolean | compatible・採用・数値・検証合格を全て満たす場合のみtrue |
| original_value / cached_value | JSON scalarまたはnull | 元セルの内容（式を含む）／保存済み値 |
| formula | stringまたはnull | 元のExcel数式。再計算しない |
| source_data_type / number_format | string | Excelのセル型／表示書式 |
| value_state | enum | 下記の原値状態 |
| judgement_category | stringまたはnull | F/Oの「判定不能人数」はindeterminate。値が欠損という意味ではない |
| included | boolean | 対象範囲・構造・重複判定による採用フラグ。比較許可とは別 |
| selection_status / selection_reason | string | included / out_of_scope / duplicate_excluded / duplicate_conflict / structure_quarantined と理由 |
| duplicate_group | string（任意） | 検出した重複群の識別子 |

`value_state` は `numeric`, `zero`, `blank`, `empty_string`, `hyphen`, `not_applicable_marker`, `not_performed`, `not_ascertained`, `indeterminate_text`, `excel_error`, `formula_cache_missing`, `unexpected_text`, `unexpected_boolean`, `invalid_number`。文字ハイフンの種類はoriginal_valueで保持する。異常な日付型が現れた場合はISO文字列と元のセル型を保存し、数値指標として採用しない。

## キーと比較範囲

採用レコードの論理キーは `(observation_fiscal_year, indicator_id, geography_level, geography_name, population_scope)`。原値証跡には重複があるため、原本ハッシュ・原シート・セルを別の物理識別子にする。二つのキーを混同しない。別の取得版は別実行に保存し、自動的に混ぜない。

compatibleは、メタボC–F・保健指導L–Oの**報告された判定人数**という限定した意味。判定不能人数も独立した数値指標である。受診率、有病率、年齢調整率、検査値の平均・分布への読み替えは不可。合計・実施件数など調査文書で比較可と確定していない指標はpendingで保持する。

比較用出力は品質検証でエラーがない実行に限る。compatibleでも空欄のレコードは含めない。時系列APIの入口として `hdv.validator.comparable_series` を利用する。年度別ファイルの全値に対して、利用側が独自に比較許可を付けない。

地理階層は加算可能な同じ母集団の階層集合ではない。県計、市計、町村計、保健所計、市町村は重なりを持つ。Validatorが行う地域合計照合は、個別市町村30団体だけから県計への比較。複合指標（脂質実人員等）の内訳を足す処理は行わない。

## 監査・版の保持

取得イベントごとにURL、実際の応答URL、ファイル名、日時、bytes、SHA-256、HTTP Content-Type/Last-Modified/ETag、前回ハッシュ、差し替え検出を保存する。原本はSHA-256でアドレスし上書きしない。公式ページHTMLのハッシュもExcel取得と結び付ける。

各実行は入力コレクションと設定ファイルのSHA-256を保存する。Validatorは原本から再抽出して加工前レコードとの一致を検査し、構造問題を再検出する。結果だけを書き換えて検証済みにする運用は認めない。

`source_cells.jsonl` は第1シートの概要と未知の列を含め、元ファイルの使用領域の全セルを保存する補助証跡。観測レコードには第2シートのみを登録するため、概要の前年度値や割合による二重登録は生じない。セル証跡から新しい系列を作る場合は別途定義と検証が必要。

コード・小さな構造契約・123セルの回帰基準をGit管理候補とし、raw・全量加工物・検証時の一時ファイルは `data/` 以下などGit管理外に保存する。v0.1は単一プロセスのローカルCLI用で、同時実行ロック、配信API、自治体コード対応、公開前の再利用条件の最終審査は含まない。
