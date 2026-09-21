# 公開前仕上げ（2026-09-21）

## 実装

- 公開ブランドを Health Data Vault に統一。header/footer と hero の CivITech 表記を削除。
- `web/src/seo.ts` に4ページの title/description を集約。`web/vite.config.ts` で各ルートの静的 HTML head、canonical、OGP、Twitter Card、robots、sitemap を生成。
- production base URL は `PUBLIC_SITE_URL=https://health-data-vault.netlify.app/`。未設定時は noindex,nofollow。Netlify の `CONTEXT=production` かつ正式 origin の場合だけ index 許可。
- Deploy Preview/branch deploy は noindex、robots Disallow、空の sitemap。localhost と review/exportReview は HTML の robots と HTTP X-Robots-Tag で noindex。
- `web/netlify/edge-functions/index-policy.ts` と `hdv/serve.py` が HTTP 側を担当。review URL は canonical/sitemap に含めない。
- `web/public/og.png` は実在する1200×630画像。favicon/Apple touch icon/manifest も追加。新しい依存ライブラリなし。
- JSON-LD は WebSite。承認済み公開データセットの範囲を確定するまでは Dataset を作らない。
- `web/src/contact.tsx` に問い合わせフォーム。静的な `web/public/forms.html` で Netlify のフォーム検出に対応。メールアドレス・本文必須、honeypot、送信中二重送信抑止、失敗表示。成功応答時だけ完了表示。確認環境では送信無効。
- `web/src/public-shell.tsx`、`web/src/public.css` を全4ページで共有。main.tsx、site-intro.tsx、index.html を接続。

## SEO一覧

正式URLは設定値から生成し、queryを除外する。正確な title/description は `web/src/seo.ts` を正本とする。

|ページ|title|description|canonical|
|---|---|---|---|
|/|Health Data Vault｜新潟県の特定健診データを市町村別に可視化|新潟県30市町村の特定健康診査データを、市町村別・年度別に地図、表、グラフで可視化。公表された人数や割合を、対象年度・定義・出典とともに確認できます。年度間の比較可能性など、データを読む際の制約も示しています。|https://health-data-vault.netlify.app/|
|/learn|特定健診を知る｜Health Data Vault|特定健診、医師の判断、メタボ判定、特定保健指導の違いを公式資料に基づいて説明します。健診データの読み方と比較上の注意点を確認できます。|https://health-data-vault.netlify.app/learn|
|/tables|公表数表｜新潟県の特定健診データ｜Health Data Vault|新潟県の特定健康診査等結果報告を、年度別の公表数表で確認できます。原表の行列順、再掲、セルの原値と出典を保持しています。|https://health-data-vault.netlify.app/tables|
|/contact|お問い合わせ｜Health Data Vault|Health Data Vaultのデータ、表示、掲載内容に関するご意見・お問い合わせを受け付けています。|https://health-data-vault.netlify.app/contact|

## 検証

- TypeScript 成功、frontend 134テスト成功。production/preview build 成功。
- productionの4ルートの静的title/canonical/robots/OG画像参照、JSON-LD JSON解析を確認。
- local HTTP X-Robots-Tag と robots Disallow を確認。
- 1366×768 PC、390×844スマートフォンの問い合わせ画面とナビゲーションを確認。
- フォームの必須・メール形式validation、mock送信の成功/失敗を確認。実送信は未実施。
- 公表数表と説明ページのローカル表示確認。既存データ値、契約、Validator、公開releaseは変更なし。

## 公開前に残る作業

1. GitHubのhealth-data-vaultリポジトリをNetlifyへ接続し、production branchから自動デプロイする。site name「health-data-vault」の空きは未確認。利用可能ならPUBLIC_SITE_URL=https://health-data-vault.netlify.app/を設定する。将来独自ドメインへ変更する場合はこの環境変数を更新して再ビルドする。production branch名はNetlifyで選択し、推測で固定しない。
2. Netlify側のフォーム検出を有効化し、デプロイ後に認識・通知先・実受信を確認する。通知先メールアドレスはHTMLに埋め込まない。
3. 現在のweb/publicには承認済みpublic-data snapshotを配置していない。ローカルは既存候補releaseをreview専用で提供。正式公開前に既存承認手順でsnapshotを用意し、配信先へ配置する必要がある。今回公開版切替・デプロイは行っていない。
4. Netlify上のEdge Function適用とプレビューのHTTP noindexをデプロイ後に検証する。
5. 検索エンジンのインデックス結果、SNSサービス側のOGP取得は未確認。

Netlify公式資料: https://docs.netlify.com/manage/forms/setup/

ローカル確認: http://127.0.0.1:4202/?review=1 、お問い合わせ: http://127.0.0.1:4202/contact?review=1

commit・pushは未実施。


## 最終承認（2026-09-21）
確認者：岸克也。地図の再利用条件確認済み。統計は確認者による公開判断（statistical_reuse_decision=reviewer_approved）。公式ライセンス・CC BY確認済みとは記録しない。判断根拠は docs/public_reuse_decision.json に保存。
既存approveのdata_rights_reviewed=trueは、この確認者判断を経た意味であり、公式ライセンスを確認した意味ではない。
承認済みrelease: 8e1fe8695fc86b4358bb695ce0a1c3ccfccdb9f5c0f5ecc45098a6d5fb915827。既存Validator再実行error 0、データのhashは候補と同一。
GitHub→Netlify用にweb/public/public-data/current.json、reuse-decision.json、releases/<hash>.json（約13.3MB）を明示的にGit登録する。raw、ローカルreview、その他候補は登録しない。build成果物内の承認・hash照合成功。review指定なしの通常画面でも読込成功。
前節の承認・配信未完了はこの最終承認で解消。Netlify Deployと本番フォーム実送信は未実施。
