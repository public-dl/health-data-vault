# 公開preflight（2026-09-21）

## 現在状態
- branch: main / HEAD: b383e65 Initial Health Data Vault data pipeline
- remote: https://github.com/katsuya0505/health-data-vault.git
- 変更済み tracked: .gitignore / README.md / pyproject.toml
- 未追跡: web一式、hdvの公開・可視化用モジュールとpublic_config、対応tests、設計・実行docs、netlify.toml。前回以降の実装がまとめて未commit。
- 公開不要画像 ダウンロード.png（2,481,133 bytes）を除外。.env/.env.* と Netlify local設定もGit除外追加。
- Git対象候補157ファイルの秘密情報パターン・ローカル絶対パス検査で該当なし。秘密情報の不存在を数学的に保証する検査ではない。
- public-facing source/buildのCivITech/CiviTech/シビテック検索は該当なし。

## 実行結果
- Python unittest: 84成功。一度sandboxの一時ディレクトリー権限で失敗したが、権限を整えた再実行で成功。
- UI vitest: 134成功（22ファイル）。既存SVG titleのReact警告は残る。
- TypeScript: 成功。
- production build: 成功。PUBLIC_SITE_URL=https://health-data-vault.netlify.app/、CONTEXT=production。
- / /learn /tables /contactの静的head、canonical、OGP、Twitter Card、lang=ja、JSON-LD、sitemap4ルートを検証。
- Netlify Forms検出用静的HTMLとhoneypotを確認。
- 候補 8e1fe8695fc86b4358bb695ce0a1c3ccfccdb9f5c0f5ecc45098a6d5fb915827 を原本から再構築して再検証：error 0。analysis744件、単年度279件、reported1209件、原表6762セル。
- annual comparability=pendingを維持。入力全体72警告、固定参考境界、母集団に関する既存注意も維持。
- トップの公開予定5テーマとplanned3テーマの表示確認。

## 未完了・停止要因
1. ユーザーがNetlify設定画面でproject name=health-data-vault、production branch=main、base=web、command=npm ci && npm run build、publish=dist（base相対）、PUBLIC_SITE_URL=https://health-data-vault.netlify.app/を確認。Deploy未実行。netlify.tomlのcommandも一致させた。
2. data/site/current.jsonと承認済みreleaseが未作成。既存approve処理は確認者名、対象hash、統計・地図の権利確認を必須とする。ユーザーへ確認中。フラグを架空に記録しない。
3. 承認済みstatic snapshotのGitHub→Netlifyへの配布は未完了。候補を承認済みと偽装しない。
4. 本番HTTP/テーマ/出力/フォーム実送信検証はデプロイ後に実施する。

全preflight完了条件をまだ満たさないためcommit/pushは未実施。ログイン・承認情報を受け取り、公開配布を整えてから最終差分確認・commit/pushへ進む。

## 設定確認後の再検証
Python 84 / UI 134 / TypeScript / production build / Validator error 0を再確認。Git対象候補157ファイルの秘密情報・ローカルパス検査は該当なし。git diff --check成功。承認済みreleaseと配信snapshotは引き続き存在しないため、条件付きcommit/push指示の前提が未充足。commit/push/Deployは未実施。


## 最終承認（2026-09-21）
確認者：岸克也。地図の再利用条件確認済み。統計は確認者による公開判断（statistical_reuse_decision=reviewer_approved）。公式ライセンス・CC BY確認済みとは記録しない。判断根拠は docs/public_reuse_decision.json に保存。
既存approveのdata_rights_reviewed=trueは、この確認者判断を経た意味であり、公式ライセンスを確認した意味ではない。
承認済みrelease: 8e1fe8695fc86b4358bb695ce0a1c3ccfccdb9f5c0f5ecc45098a6d5fb915827。既存Validator再実行error 0、データのhashは候補と同一。
GitHub→Netlify用にweb/public/public-data/current.json、reuse-decision.json、releases/<hash>.json（約13.3MB）を明示的にGit登録する。raw、ローカルreview、その他候補は登録しない。build成果物内の承認・hash照合成功。review指定なしの通常画面でも読込成功。
前節の承認・配信未完了はこの最終承認で解消。Netlify Deployと本番フォーム実送信は未実施。
