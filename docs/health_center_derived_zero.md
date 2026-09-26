# 保健所計：HDV派生0の公開候補

方針version: `health-center-derived-zero-v1`。既存の地域契約に明示opt-inする追加方針。
`site_release build --derived-zero --health-centers --count-only --include-renal` で生成する。
旧版の生成経路、旧release、公開ポインタは変更しない。

## 許可条件と証跡

原表保健所計が空欄で数式なし、構成市町村mappingと原表の名称・全行が一致、
対象年度の管轄確認資料が存在、全子セルが数値型の厳密な0（bool不可）、数式なしの場合だけ採用。
文字列ハイフン、空欄、非ゼロ、不完全な集合、未確認年度は採用しない。
対象年度は2021〜2023。根拠は年度監査報告と各年度末の公式管轄一覧
（350980.pdf、399881.pdf、446824.pdf）。全期間の法的管轄確認と混同しない。

`original_value=null`、`raw_value=null`を維持し、表示値`value=0`、`derived_value=0`、
`value_origin=derived_zero_from_complete_child_sum`を別に保持する。
公表数表は原表どおり空欄。通常UIの0はHDV派生値で、公式記載の0とは呼ばない。
各レコードの`zero_derivation`に保健所セル、全子セルとraw値、合計、原本情報・SHA・
正確なsheet名、mappingと確認資料URLを記録。詳細ダイアログで説明と子セルを表示する。

全62セルに適用可能、適用不可0セル。公開指標に属するのは9セル（総合判定6、総コレステロール3）。
残る53セルは証跡に含むが、新しい公開指標を追加するものではない。
総合判定以外の割合は生成しない。

## 構成検証と年度比較

メタボ、保健指導とも13地域×3年度=39構成が合計一致。
新津：各年度のカテゴリー合計=受診者数は2021:2844、2022:2611、2023:2561。
十日町：2021:3698、2022:3471、2023:3316。
これにより新津メタボ3年度、新津保健指導2021/2023、十日町保健指導2021の構成検証が成立。
既存の構成許可フィールドを通じて100人図・100%積み上げ・構成比が利用可能になる。

前回の年度監査と合わせ、メタボ・保健指導は各26/26区間が記述的比較の候補となる。
特に新津メタボ・新津保健指導・十日町保健指導は両区間とも候補。
`derived_zero_policy.temporal_review`にcandidateとして記録し、公開許可とは分離する。
既存の`comparability_status=pending`、`comparison_allowed=false`は維持し、
線接続・前年差の新規許可は行わない。医師の判断は定義・集計仕様の追加監査が必要でpending。

## Validatorと再現性

Validatorは公表数表から子セル集合と派生証跡を再構築し、厳密なJSON一致を要求する。
公開候補の検証処理は取得済み原本から全候補を再生成して比較する。
原表、旧release、市町村既存値、公開指標定義は維持。

候補ID: `e037ebc15bcdfe44b0ffae5092d2e728ce4ed77b851345bfdcf6c24e0186ba44`。
保存先: `data/site/candidates/<ID>/data.json`。公開承認・配信先切替は未実施。

検証結果：原本再構築site Validator error 0、Python 105件成功、UI 173件成功、TypeScript成功、production build成功。旧releaseのSHA-256はad50d1980ded8094a30f9da67df32e63cc85bf9ba7a24547e6de6e123848a753のまま。
