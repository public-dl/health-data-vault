# 保健所管内：年次公表実績の接続表示許可

公開方針 `health-center-annual-facts-v1`。ユーザーの明示的な公開許可更新に基づく。
実装・候補生成のみ。本番への配信切替、commit、pushは未実施。

## 対象と根拠

新潟市、村上、新発田、新津、三条、長岡、魚沼、南魚沼、十日町、柏崎、上越、糸魚川、佐渡の13保健所管内。
メタボ判定と保健指導レベルのそれぞれについて、2021→2022、2022→2023の全26区間を承認する。
合計は2指標群×13管内×2区間=52件。

`health_center_temporal_audit.md`、`health_center_blank_zero_audit.md`、
`health_center_derived_zero.md`の監査結果を再確認。
派生0適用後の各39地域年度の完全構成・分母一致を候補生成時に再検証する。
同じ採用母集団・判定区分の公表実績という範囲で、追加の阻害要因は確認されていない。
年度末の管轄資料と原表集計ブロックの一致を根拠とし、全期間の法的管轄や年齢性別調整を
確認済みと読み替えない。医師判断の定義・集計仕様の問題は解消していない。

## 許可範囲

人数・派生割合の双方にcompatibleと両区間許可を設定する。
`temporal_display_scope=annual_facts_only`、`temporal_difference_allowed=false`、
`trend_evaluation_allowed=false`、`causal_evaluation_allowed=false`を同時に保持。
これは実績点の線接続許可であり、改善・悪化、増減傾向、施策効果、因果関係の評価を許可しない。
前年度差の自動コメントも新規許可しない。

医師の判断は全13管内・両区間pending、他テーマの人数のみ方針も変更しない。
派生0の全証跡・raw nullは前候補から変更なし。旧releaseの再生成経路も維持。
派生0内のtemporal_reviewは以前の候補監査記録として保持し、正式な許可は別の
`health_center_temporal_policy`に記録する。

## Validator・UI

Validatorは許可対象を総合判定analysisのメタボ・保健指導に限定し、全地域・年度の
カテゴリ集合・分母・構成証跡を検証。改変された区間、評価許可、医師判断の許可を拒否する。
原本からの再構築一致および派生0検証は従来どおり必須。

グラフは共通connect関数で各年度を接続。地域Bは既存の破線＋四角。
全区分グラフは3年度×2地域の構成表示と、区分の年次実績表示を利用可能。
県計↔魚沼、三条↔燕、新津↔十日町、新津の保健指導、十日町の保健指導をUI回帰テストに追加。
医師判断のpendingと線接続なし、年度差コメントを生成しないことも検証。

候補ID: `1e0b2f10ab797f8f635573d522c212f8f223d6d195851bddbd7fdb13cf3c9b17`

保存先: `data/site/candidates/<ID>/data.json`。
原本再構築Validator error 0、UI179件成功、TypeScript・production build成功。

Python全109件成功。旧公開releaseのSHA-256不変を確認。commit・push・本番配信切替なし。

## 公開承認（2026-09-27）
ユーザーの最終公開指示を受け、同一候補を岸克也氏の既存再利用判断を保持して承認済みreleaseへ昇格。配信currentと新release、health-center-temporal-publication-lineage.jsonを追加。旧release・reuse-decision.jsonは不変。最終Python109件、UI179件、TypeScript、Netlify production設定build、Validator error 0を再確認。本節以前の未公開記載は候補作成時点の履歴。
