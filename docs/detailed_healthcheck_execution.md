# 詳細な健診項目：実行報告

実施日：2026-11-07（Asia/Tokyo）。公開リポジトリmain `6713dce6d8b96082b97a27e05ff3afd261e16656` を基点とする。
作業ブランチ：`codex/detailed-healthcheck-v1`。
作業先：`C:\Users\user\Documents\CivITech\health-data-vault\data\detailed-worktree`。
元の作業領域にある未コミット変更は保持した。CivITech紹介サイトのソースにも変更していない。

## 追加・変更

- `hdv/detailed.py`：原表の6項目を既存の人数公開契約の後に追加。人／件、空欄／0、心電図incompatibleを維持。年度差・割合を生成しない。
- `hdv/site_release.py`：`--include-detailed`、候補生成・完全再構築検証。既存の投影・保健所検証を緩和せず、追加部分を除いて先に検証する。
- `web/src/health-themes.ts`：詳細タブを有効化。配信データに項目がない場合は無効のまま。
- `web/src/model.ts`：詳細契約の型と、人数・件数どちらも正しく示せるテキスト出力。
- `web/src/reported-views.tsx`：詳細契約だけに許可した単位「件」と、比較不可の心電図表示。地図・割合・トレンドなし。
- `web/src/temporal-table.tsx`：実施件数の単位、欠損と0、心電図比較不可の表示。
- `web/src/dashboard.tsx`、`panels.tsx`、`presentation-copy.ts`：現在条件・諸元・概要・表・SVGの人／件表示。
- `web/src/comparison-export-model.ts`：コピー・比較出力の単位。既存の割合表示でも分子は人を維持。
- `tests/test_detailed.py`、`web/src/detailed.test.tsx`：原本一致・欠損・不正入力・比較権限・単位・CSV・既存機能の回帰。
- `web/src/health-themes.test.tsx`、`startup-screen.test.tsx`、`count-publication.test.tsx`：既存リリースに詳細データがないケースも維持したナビゲーション確認。
- `docs/detailed_healthcheck_v1.md`：定義・原典・制限・再現手順。

既存の設定JSON6件はWindows checkoutのCRLFを元のLFに戻したのみで、HEADとバイト一致を確認済み。意味・設定・原本は変更していない。

## データ・検証

- 3原本のハッシュを前後比較し、792値を原セルと照合。単位・末尾空白を含む実シート名・出典・取得情報を保持。
- 6欠損・16数値0。柏崎保健所管内の眼底判定人数／実施件数は、3年度とも原表空欄を維持。
- 2023年度県計：貧血15,407人／96,437件、心電図13,525人／61,232件、眼底775人／37,990件。
- 追加部分を除いた候補は承認済みrelease `1e0b2f10ab797f8f635573d522c212f8f223d6d195851bddbd7fdb13cf3c9b17` と完全一致。
- 新候補：`7f4b5b8dfee4bd415413442bff14884d03d8f1826644614ba0ef86f9459804c3`、20,588,853 bytes。既存2244レコード＋詳細792＝3036レコード。
- `site_release validate`：再構築一致、errors=0、status=passed。
- Pythonの詳細健診テスト6件成功。Web既存テスト39ファイル・228件成功後、追加の割合表示回帰テストを含む関連25件と詳細6件を再確認。
- TypeScriptチェック・Vite build成功。
- PC1440×1000／スマートフォン390×844で6項目の切替、表示値・単位、比較不可、原典AH6、内部HTTPエラー・console error 0件を確認。
- 欠損表示の最終確認とスクリーンショットは `data/detailed-review/` を参照。

Webテストに元からあるReact SVG titleの警告は残るが、今回の詳細タブのブラウザ検証でconsole errorはなかった。
将来の割合対応には、実施件数と判定人数の対象範囲・定義を指標ごとに別途確認する必要がある。

## 保存先と公開状態

原本：既存 `data/raw/objects/`（読み取りのみ）。新規ダウンロードなし。
候補：`data/site/candidates/7f4b5b8dfee4bd415413442bff14884d03d8f1826644614ba0ef86f9459804c3/`。
調査・検証ログ、ブラウザ検証コード、画像：`data/detailed-review/`（Git除外）。
`current.json` と承認済みreleaseは変更せず、新候補を公開用 `web/public/public-data/` に配置していない。
commit・push・公開は未実施。ローカルのループバックプレビューのみ。

プレビュー：`node data/detailed-review/serve-preview.cjs`（元のリポジトリルートから実行）。
確認URL：`http://127.0.0.1:4197/?review=1&theme=detailed&indicator=anemia&year=2023&region=15&measure=count`。


## 公開依頼への対応（2026-11-07）

ユーザーから「commit・push・公開をお願いします」と明示的な依頼を受け、上記候補を公開対象として承認処理・全再検証した。
参照元Excelと地図は以前の承認済み版と同じで、既存の名前付き再利用判断を継承。公式ライセンス確認済みという新たな認定は行っていない。
web/public/public-data/current.json、ハッシュ別release JSON、detailed-publication-lineage.jsonを配信対象に追加。
本節より前の「未公開」「未承認」の記載は、ローカル検証完了時点の記録。
本番URL: https://public-dl.github.io/health-data-vault/?theme=detailed&indicator=anemia&year=2023&region=15&measure=count

公開直前に新しい配信用current.jsonを使用して再確認：Web 39ファイル・229テスト、Python詳細6テスト、TypeScript、Pages本番環境のVite buildが成功。
