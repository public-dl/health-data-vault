# 血圧第1版：単年度報告人数

## 意味と公開範囲

未知は未知のまま保持する。原表P列 `bp_guidance` とQ列 `bp_referral` の人数のみを対象とする。
2021～2023年度・県計＋30市町村＝186件。受診者数B列93件を原典追跡付きで併記するが、血圧測定者数とは呼ばない。
残差、正常、非該当、判定不能、全区分、構成証明、割合、平均値は生成しない。
人数の単年度表示許可は、医学的分類の再定義や年度間比較の許可ではない。

## 独立契約

`hdv/reported_annual.py` の `reported-annual-1`。入力は既存 `verified_records` の原本照合済みレコードに限定する。
年度・地域・指標の完全性、一意性、整数人数、非負、受診者数以下、単位、人の母集団、P/Q/B列、同一原本・sheet・行・年度・地域、県計と市町村合計を検証する。
`comparability_status=pending`、`comparison_allowed=false`、2区間pendingを要求する。率・派生値の混入は拒否する。
既存public Validatorと構成割合Validatorの条件は変更しない。

割合は保留。県概要に受診者数を使う割合の原式は存在するが、市町村の分母・分類規則の意味が未確定である。構成割合経路へ通さず、今回は単独割合の公開許可・派生値を追加しない。

## UIと出力

血圧テーマはrelease内に対象指標がある場合のみ有効。全区分選択肢はない。
01はmetadata `visualization_type=reported_count` の主要値、02は既存MapPanel、03は既存TablePanel、04はpending説明のみ。
`reportedContext` が選択年度だけのレコードを共通描画・出力へ渡す。受診者数は `denominator_record_id` で参照し、割合を計算しない。
年度スライダーは個別閲覧のみで再生しない。出力にも単年度制限・指標ID・pending・release IDと受診者数を保持する。
色は識別用の青緑／紫。階級100・500・2,000・10,000人は全年度・全地域共通の表示階級で、医学的閾値ではない。
公表数表のリンクは原本SHA-256＋sheet＋cellで付与。採用済み31地域のP/Qのみ有効にし、再掲・集計行・国保組合を自動公開しない。

## 既存releaseと承認

既存site-1の `reported` 拡張は任意。旧候補を再検証する際は旧内容を再構築する。
buildは新しいローカル候補のみを生成する。current.json・approved releaseの切替、公開・デプロイは実施しない。

## 検証

Python回帰63件、フロントエンド94件、TypeScript、Vite build成功。
原典186人数・93受診者、欠落・不正値・分母対応・比較許可の改変拒否、P/Q deep link、単年度限定出力を検証する。
ローカル候補: `37b86bd3ff4478a6121a96150b404bc03dfc7e102dfaac5da7d792fc3093dfdb`。
入力全体に以前からある警告72件は維持。既存分析契約と今回候補の検証エラー0件。

ブラウザー確認：1366×768と390×844でページ横スクロールなし。県計／長岡市、保健指導／受診勧奨、2021～2023個別閲覧、スライダー同期、地域入替、総合判定への復帰を確認。
Q28を選択した公表数表との往復、出典モーダルのB28参照を確認。
単年度TSVのクリップボード内容と、画像クリップボードのPNGを読み戻して確認。CSV保存の完了通知を確認。
PNG保存ボタンも実行したが、ブラウザー自動化のdownloadイベントは取得できなかったため、保存先ファイルの検証とは区別する。PNG本体は画像コピーから読み戻し、値・年度・地域・指標ID・pending・release IDを目視確認した。

## 今回の変更ファイル

- 追加：`hdv/reported_annual.py`、`web/src/reported-views.tsx`、`tests/test_reported_annual.py`、`web/src/reported-views.test.tsx`、本書。
- 接続：`hdv/site_release.py`、`web/src/main.tsx`、`web/src/model.ts`、`web/src/health-themes.ts`。
- 共通表示・出力：`web/src/panels.tsx`、`web/src/map-summary.tsx`、`web/src/temporal-table.tsx`、`web/src/comparison-export.tsx`、`web/src/comparison-export-model.ts`。
- 操作・スタイル：`web/src/year-timeline.tsx`、`web/src/content-navigation.tsx`、`web/src/context-bar.tsx`、`web/src/style.css`。
- 自動生成：`data/site/candidates/37b86bd3ff4478a6121a96150b404bc03dfc7e102dfaac5da7d792fc3093dfdb/`、`web/dist/`。

既存の未コミット変更は維持。原本、既存公開ポインター、Validatorの比較・構成条件は変更していない。
