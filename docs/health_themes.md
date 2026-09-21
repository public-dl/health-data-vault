# 健康テーマによる指標選択

## 実装

`web/src/health-themes.ts` は画面用metadata。release payload、既存indicator/group/category ID、Validatorは変更しない。

- overall（総合判定）: metabo / doctor_judgment / guidance。
- blood-pressure / lipids / glucose / liver / other: planned。説明は予定であり、未公開・未監査のデータを追加しない。
- 各テーマはid、label、description、icon、groupIds、indicatorIds、statusを持つ。
- availableでもrelease内に所属指標が存在しなければ無効。グループは全カテゴリーの存在を確認する。公開・比較権限は既存contractと各ビューの検査が正本。

`HealthThemeMenu` はSVGアイコンと名前・説明を持つbutton群。未公開テーマはnative disabledと「準備中」「予定」を表示する。選択状態は有効なindicatorから導出し、二重状態の不整合を避ける。同じテーマの再クリックでは指標を変更しない。

PCは6列、1000px以下は3列、560px以下は2列。メニューは既存条件パネル内で全幅を使用し、地域・年度・表示値のstateは独立したまま。

## 表示方式の拡張設計

groupPresentationのvisualizationTypeはcomposition / category_distribution / continuous。現在の3グループはcompositionを明示し、構成表示の既存ガードに接続。overviewLabelは将来の見出し設定用で、現在の見出しは変更しない。

category_distributionやcontinuousの描画機能・データは今回追加しない。前者は排他性・網羅性の監査と公開許可がなければ100人図へ接続しない。後者の実装時はKPI等のrendererと見出しを接続し、100人配分へ渡さない。visualizationTypeだけでallowed_viewsやcomparabilityを上書きしない。

## URL互換性

既存indicator / region / yearを継続。group:metabo等の全区分IDも復元可能にした。theme、region2、measureを追加し、変更はreplaceStateで現URLへ保存する。review等の他パラメータとhashは保持。履歴を操作ごとに増やさない。

有効なindicator指定はtheme指定より優先し、対応テーマを推定する。未知のindicator/themeや準備中themeは利用可能な既定値へフォールバック。地域2は既存地域かつ地域1と異なる場合だけ復元。公表数表の既存リンク形式は変更しない。

## 確認（2026-09-20）

- TypeScript検査、Vite build成功。フロントエンド91テスト成功（テーマ関連5件追加）。既存比較・出力・年度・単年度制限・配分テストを含む。
- site-1 Validator: errors 0、analysis 744レコード、単年度279レコード / 93構成、原表3年度 / 6762セル。年度間comparability pendingを維持。既存入力警告72件と境界年度の制約は継続。
- 1366×768でテーマ6列、390×844で2列×3段。全体の横スクロールなし。モバイルで全テーマ名と準備中を目視確認。
- メタボ初期表示、医師の判断2022年の単年度表示、保健指導＋長岡市比較、比較状態のリロード、従来形式のphysician_referral / 県計 / 2021 deep link、公表数表2021ページをブラウザー確認。
- Copy / CSV / PNGは既存出力テストで確認。今回各ファイルの手動保存・画像内容再照合は実施していない。
- ローカル確認: http://127.0.0.1:4178/?review=1 （未承認候補）。commit・push・公開切替なし。
