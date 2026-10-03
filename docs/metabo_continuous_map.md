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

## 非該当のgreen化（2026-10-03）

- 非該当のみ、旧blue `#d0e5f4 → #a9cde8 → #7fb3da → #518fbe → #356b96` を `#d7eadf → #afd6bf → #82bf9c → #559f78 → #357556` に変更。
- 共通の区分識別色も `#629fce` から `#559f78` に変更。地図・凡例・区分アイコン・表／グラフ等の区分色は同じ定義を参照し、値・配分・計算は変更しない。
- 固定domain 40–85%、domain_version `metabo-continuous-v1`、区分線形sRGB補間、端色clampは維持。palette_versionのみ非該当を `metabo-noncase-green-v1` として記録。
- 40 / 55 / 70 / 85%の表示色は `#d7eadf` / `#a0ceb3` / `#64aa84` / `#357556`。
- greenは区分識別色であり、健康・安全・良好・改善などの意味を持たせない。利用者向け説明文は変更しない。
- サイトのブランドblue、rose / amber / slate、HDL・尿潜血・空腹時血糖の既存blueは維持する。非総合テーマの割合地図は復活させない。
- releaseの旧paletteは過去版再現用として不変。現行表示では共通の `groupVisuals.metabo.noncase` を使う。
- 検証：UI 220件、E2E 74件（desktop 37件／iPhone相当37件）成功。アプリ・E2EのTypeScript成功。E2E用production build（`tsc`、`vite build`）成功。1920×1200とiPhone相当でgreenとブランドblueの区別、凡例の可読性を目視確認。
