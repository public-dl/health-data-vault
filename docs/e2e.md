# 代表ブラウザE2E

## 追加・変更ファイル

- `web/playwright.config.ts`：2画面サイズ、production server、失敗成果物
- `web/e2e/serve.mjs`：buildとpreview起動
- `web/e2e/fixtures.ts`：ローカル配信、approved release照合、画面操作
- `web/e2e/hdv.spec.ts`：代表30ケース
- `web/e2e/tsconfig.json`：E2Eコードの型検査
- `web/package.json` / `package-lock.json`：実行コマンドとdevDependencies
- `.github/workflows/e2e.yml`：PR/手動CI
- `.gitignore`：生成レポート・trace・video・ログ除外
- `docs/e2e.md`：実行・運用・検証範囲

追加devDependenciesは`@playwright/test` 1.63.0、`@types/node` 22.20.4。アプリbundleにimportしない。既存Vitestは`src`内、Playwrightは`e2e`内を収集し、両runnerの混在を防ぐ。

## 実行

```sh
cd web
npm ci
npx playwright install chromium
npm run test:e2e
# 片方だけ / 対話実行 / HTMLレポート
npm run test:e2e -- --project=desktop
npm run test:e2e -- --project=iphone
npm run test:e2e:ui
npm run test:e2e:report
npx tsc -p e2e/tsconfig.json
```

Playwright Test / Chromium。desktopは1920×1080、iphoneはiPhone 13のviewport・touch・mobile設定をChromiumで使用する。実機Safariの保証ではない。WebKit/Firefoxは初期対象外。

起動のたびにTypeScript → Vite production build → Vite preview（4399、strict port）を実行する。既存dev serverは再利用しない。`dist`は再生成されるため、別のローカルpreviewと同時使用しない。公開データ・承認済みreleaseの再生成は行わない。

## 本番相当のSEOとネットワーク

buildには既存GitHub Pages workflowと同じPUBLIC_SITE_URL / CONTEXTを使用する。ブラウザ側のrouteで本番originへのリクエストをローカルpreviewの応答へ差し替える。本番サイトには接続・書き込みしない。location.origin、初期HTML、既存robots guardを変更せず検証できる。これは本番配信/CDNそのものの試験ではない。

通常URLの初期HTMLはindex,follow。review/exportReviewも静的HTML自体は同じであり、既存guardの実行後にnoindex,nofollowとなる制約を明示的に検証する。SEO仕様は変更しない。

## 期待値と監査境界

current.jsonがapprovedであることと実ファイルSHA-256を検証し、そのreleaseの地域・指標・実績年度から期待値を取り出す。重複/不在はエラー。取得した各代表recordの原本SHA・シート・セルを公表数表の保存原値へ照合する。UI側の計算helperは期待値生成に使わない。

独立した固定値は、2023燕市メタボ基準該当793人、受診者3401人、表示23.3%、2023県計尿蛋白4689人。燕市の原典位置E23、シート`保険者別 `（末尾空白あり）、原本SHA-256も固定する。release更新時に固定値を機械的に書き換えず、原本監査で根拠を確認する。

このE2Eは**監査済み原本・releaseから画面までの代表回帰確認**。県HPのExcelを毎回ダウンロードする全セル監査の代替ではない。県側の原本差し替え検知と取り込みValidatorは既存の監査・検証工程で行う。派生0はraw空欄とchild sumも照合し、画面の出典モーダルまで確認する。

## 30ケース（両projectで計60実行）

1. 固定既知値・原典位置・release hashと画面
2–4. 県計・燕市・三条保健所管内：人数、割合、100人、3年度表/構成棒
5–7. 三条管内対燕市：メタボ/保健指導の年度接続、医師の判断の非接続
8. 県計対魚沼管内：3年度×2地域の構成棒
9–13. 血圧・脂質・肝機能・糖代謝・腎尿路：人数と地図/グラフの正式非表示案内
14–16. 腎実人員・尿潜血・クレアチニンの選択、未承認rate非表示
17. 新津派生0と原表空欄の出典説明
18. sidebarのテーマ色/年度/A/B更新
19. 01〜04のanchor/active表示
20. 独立した見どころの開閉
21. 年度比較表の列間・カード間のフォント回帰
22–24. production通常/review/exportReviewのrobots、初期HTML、canonical
25–27. コピー成功/拒否/非対応：通常・地図・表・グラフ・比較画像
28. PNG保存
29–30. 医師の判断の表示順（県計／十日町保健所管内、三条保健所管内／燕市）：指標選択・100人図・地図・表の順序と人数・割合を照合

医師の判断は現行仕様どおり単年度表を年度selectorで切替確認し、経年グラフ自体がないことと線がないことを検証する。テストを通すためにUI仕様やcomparabilityを変えない。

## セレクタと成果物

既存のrole/name、section ID、`data-export-surface`、`data-person`、`data-region`、`data-year`、`data-temporal-connection`、`data-export-notes`を利用する。新しい本体test hookや見た目の変更は不要。CSSの色/書式の実測は専用回帰ケースに限る。

コピーはPNG生成を実行し、Clipboard API境界だけを制御する。成功はimage/png・非空Blobと通知、失敗はPNGダウンロード・署名・通知を確認する。OSの実クリップボード、権限ダイアログや実機Chrome/Edgeの組合せは別の手動確認範囲。

同一通知を連続表示した際に既存の通知タイマーが延長されないため、各コピー操作は前の通知が消えたことを待って独立確認する。固定sleepやアプリの通知ロジック変更は使用しない。

失敗時にtest-resultsへスクリーンショット・trace・videoを保持。HTMLレポートはplaywright-report。比較表の書式ケースは成功時もスクリーンショットをレポートへ添付する。これらはGit除外。traceは`npx playwright show-trace <trace.zip>`で確認できる。

## CI

`Representative browser E2E` workflowはmain向けPR（web変更）または手動dispatch。main pushごとの重複実行やdeployは追加しない。2 workers、CIのみretry 1、20分上限。成果物は成功/失敗に関わらず14日保存。GitHub上での実行はこの変更のpush後となり、ローカルで成功してもCI実行済みとは扱わない。

マージ前の必須チェックにする場合は、このworkflowの成功をGitHub branch protectionへ登録する運用を推奨する。現段階では設定変更していない。

## ローカル実行結果（2026-09-28）

- `npm run test:e2e`：60 passed、4.4分、retryなし。desktop 30/30、iphone相当30/30。
- 既存UI：36ファイル、191件成功。
- アプリTypeScript / E2E TypeScript：成功。
- production build：成功（各E2E起動時に`tsc`と`vite build`を実行）。
- コピー成功・拒否・非対応fallback、PNG署名検証：両projectで成功。
- 通常URL index,follow、review/exportReview noindex,nofollow、canonical：両projectで成功。
- テスト対象release：`1e0b2f10ab797f8f635573d522c212f8f223d6d195851bddbd7fdb13cf3c9b17`。内容・hash不変。
- feature branch：`codex/e2e-tests`。commit/push/deploy未実施。既存の未コミットconfig 3件は変更対象外。

最新HTMLレポートは`web/playwright-report/index.html`。CIのGitHub上での実行、WebKit/Firefox、iPhone実機Safari、OSの実クリップボードは未確認。県HP現行Excelの再取得監査は本E2Eとは別工程。
