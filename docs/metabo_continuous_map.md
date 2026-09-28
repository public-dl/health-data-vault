# メタボ判定地図：固定連続色 v1

2026-09-29のユーザー承認に基づく表示専用設定。医学的な判定閾値ではない。

- 基準該当10–40%、予備群5–20%、非該当40–85%、判定不能0–4%。
- web/src/metabo-map-scales.tsを共通の表示metadataとし、全区分・単区分・全地域・全年度で共有。自動rescaleしない。
- 既存5色をdomainの0/25/50/75/100%位置に置き、隣接色を区分線形sRGB補間する。色チャンネルのみ整数化し、統計値は丸めない。
- 凡例も同じ5色stopを使用。目盛りは分類境界ではない。
- 範囲外は端色にclampし、地図のtitle/アクセシブル名と地図下の地域別一覧で「表示範囲より高い／低い」を明示。欠損ハッチと区別し、0を欠損扱いしない。
- effective_from_releaseはこの表示版の基準となる統計releaseを示す。本番配信済みという意味ではない。min/maxはdomain_min/domain_maxに相当する。
- domain、palette、補間、clamp、レビュー日と根拠を版管理。変更は新しい表示版としてレビューし、過去版はGitで保持する。
- hdv/public_config/groups.jsonとindicators.json、および旧releaseのthresholdは旧版再現用に保持する。新UIのメタボ割合経路ではmap_breaksを空にし、共通scaleのみ使用する。
- 保健指導・医師の判断の地図階級、非総合テーマの人数公開方針、統計release、Validator、100人図、表・グラフは変更しない。

## 検証

approved releaseの44地域×3年度×4区分=528件でモード間の色一致、範囲内、元release非変更を検証。全目盛り、5色stop、端のclamp、null/NaN/0、範囲外説明を回帰テストする。
E2Eは4区分×desktop/iPhoneで全区分→単区分、3年度、県計・三条保健所管内・燕市・粟島浦村、凡例の目盛り重なりを検証する。
