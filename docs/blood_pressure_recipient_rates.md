# 血圧：特定健診受診者に占める単独判定割合

## 表示契約

ユーザーの正式仕様に基づく非構成型の派生割合。`bp_guidance` は原表P列、`bp_referral` はQ列を分子とし、同じ原本・シート・行・地域・実績年度のB列「受診者数」を分母とする。式は `分子 / 分母 * 100`。表示名は「特定健診受診者に占める割合（%）」。血圧測定者に占める割合ではない。

正常、非該当、判定不能、残差カテゴリーを生成しない。2指標を合計100%の構成として扱わず、100人図・100%積み上げは提供しない。

## 独立検証

`hdv/single_judgment_rates.py` が検証済み整数入力、監査済み指標・年度・母集団、P/Q/Bセル、原本SHA・地域・年度の一致、正の分母、0以上かつ分母以下の分子、計算結果と全属性の再生成一致を検証する。既存構成Validatorと年度間比較Validatorを緩和しない。

2021～2023年度 × 県計＋30市町村 × 2指標 = 186件。分母93件。2023年度県計はP=24,736、Q=29,305、B=113,771。割合は内部で丸めず、画面では小数1桁を基本とする。

## 比較の分離

年度間comparabilityはpending、comparison_allowed=falseを維持する。同年度・同指標・同母集団の地域間に限って別のregional_difference_allowedを検証し、B地域割合−A地域割合を算術差として表示する。年度差・トレンド・健康状態の評価へ転用しない。

## 画面・出力

既存01～04、地図、地域比較、年度選択、表、公表数表セルの往復、Copy/CSV/PNGを共用。01は人数・割合・受診者数。02は割合を初期値とし人数にも切替可能。03は選択年度の人数・受診者数・割合・掲載年度・pendingを表示。04は年度間比較確認中の説明のみ。

出力は地域・年度・指標・分子分母・割合・release・comparability・原典セルを保持する。原本や承認済み公開ポインターは変更しない。

`reported-annual-2` を追加し、旧 `reported-annual-1` 候補の再現検証も維持する。旧人数限定仕様は本仕様で拡張される。

検証候補: `6537561b89552609f1844596ee6f7849cdf7baed7ea587a54be4fa8854cbf0b0`。

## 実装・確認記録

- Backend: `hdv/single_judgment_rates.py`, `hdv/reported_annual.py`, `hdv/site_release.py`。
- UI: `web/src/reported-model.ts`, `reported-views.tsx`, `model.ts`, `main.tsx`, `panels.tsx`, `temporal-table.tsx`, `map-summary.tsx`, `map-notes.tsx`, `comparison-export-model.ts`, `comparison-export.tsx`, `style.css`。
- Tests: `tests/test_single_judgment_rates.py`, `web/src/reported-views.test.tsx`。
- Python全67テスト、フロントエンド全96テスト成功。TypeScript型検査・Viteビルド成功。候補再構築検証エラー0。旧候補再現テストも成功。
- 実画面: 1366×768、390×844。県計2023年度受診勧奨29,305人／113,771人＝25.8%、長岡市3,572人／14,660人＝24.4%。地域差−1.4pt、入れ替え後+1.4ptを確認。2022年度へのスライダー変更で主要値・地図・表・NOTESが同期。
- モバイルでページ全体の横スクロールなし。表の長い見出しを2行化。総合判定の既存100人図・地図・全区分表・構成グラフも表示を確認。
- 2022年度長岡市Q28へのdeep link、原表からの同指標・地域・年度復帰、B28分母のprovenanceを確認。
- 表コピーの実テキスト、画像コピーの実PNGを確認。CSVは出力モデルの回帰テストで確認。OSの保存済みダウンロードファイル自体は照合していない。
- ローカルURL: http://127.0.0.1:4185/?review=1 。公開ポインター更新・commit・pushは未実施。
