# Health Data Vault v0.1

新潟県「特定健康診査等結果報告」のR3・R4・R5実績（2021・2022・2023年度）を、公式年度ページから取得し、出典付きのJSON Linesへ変換・検証するPythonのデータ基盤です。第1弾Web UI、公開候補生成・検証・明示的な承認の機構を追加しました。外部サイトへのデプロイ、GitHub Actions、NDB UIは含みません。

Webの最小手順は下記「第1弾Web UI」を参照してください。通常表示は承認済みreleaseだけを読みます。今回生成した候補は未承認で、ローカル確認用の専用URLでのみ表示します。

仕様は [AGENTS.md](AGENTS.md)、[データ目録](docs/data_inventory.md)、[判定定義調査](docs/tokuteikenshin_definitions.md)。年度は西暦開始年で保持し、掲載年度2022・2023・2024と実績年度2021・2022・2023を分離します。

## 最小実行手順

Python 3.11以上を使用します。リポジトリのルートで実行してください。

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -e .
.venv\Scripts\python -m hdv collect --transport powershell
.venv\Scripts\python -m hdv normalize
.venv\Scripts\python -m hdv validate
.venv\Scripts\python -m unittest discover -s tests -v
```

Windows以外では `python3 -m venv .venv`、実行Pythonは `.venv/bin/python` とし、`--transport powershell` を省略してください。標準の通信方式はurllibです。WindowsのPowerShell方式はOSの証明書ストアを使い、TLS検証を無効化しません。ダウンロードには公式サイトへのネットワーク接続とOSの一時フォルダーへの書込み権限が必要です。

一括実行もできます。

```powershell
.venv\Scripts\python -m hdv run --transport powershell
```

`--data-dir D:\hdv-data` 等で保存先を変更できます。すべての段階で同じディレクトリを指定してください。デフォルトの `data/` はGit除外済みです。別の保存先を選ぶ場合もraw・加工物をGitに追加しないでください。

検証エラー時は終了コード1、警告のみの場合は0です。Collectorの通信失敗や構造の変更を自動修復しません。失敗したコマンドの後、過去の成功結果を今回の結果として扱わないでください。

テストは標準ライブラリのunittestで実行でき、pytestの追加インストールは不要です。テストはネットワークを使いません。デフォルトの `data/processed/latest.json` がある場合は実データ関連の3テストも実施し、なければその3テストのみスキップします。

## 出力の読み方

`data/processed/latest.json` の `run_id` を読み、その実行ディレクトリ内の `validation_report.json` を確認します。`status` が `failed` / `incomplete` の実行は利用を保留します。

| ファイル | 内容 |
|---|---|
| `records.jsonl` | 検証前の共通スキーマ。重複・対象外を含む全原値 |
| `validated_records.jsonl` | 全レコードに品質検証結果・比較許可を付与 |
| `annual_records.jsonl` | 市町村国保の採用行。pending・incompatibleも保持。比較用ではない |
| `comparable_records.jsonl` | 検証を通過し、比較可能な数値レコードのみ |
| `source_cells.jsonl` | 全シートの使用矩形内のセル証跡。概要・式・保存済み値・空欄も保持 |
| `row_decisions.json` | 新潟市重複行の一致確認と採否理由 |
| `normalization_issues.json` | 構造変更・エラー等の抽出時診断 |
| `validation_report.json` | エラー・警告、123セル回帰検証、件数・採否内訳 |
| `collection.json` / `run.json` | 入力原本・取得履歴と設定ファイルのハッシュ、実行版 |

JSONLはUTF-8で1行1オブジェクトです。`null`を0に変換しないでください。数値0をハイフン表示するExcel書式でも、原値が数値0なら `value=0, value_state="zero"` とします。判定不能「人数」は数値のまま独立指標に保持し、文字としての判定不能と区別します。

```python
from pathlib import Path
from hdv.common import read_json, read_jsonl
from hdv.validator import comparable_series

root = Path("data/processed")
run = root / read_json(root / "latest.json")["run_id"]
rows = read_jsonl(run / "comparable_records.jsonl")
series = comparable_series([
    r for r in rows
    if r["geography_name"] == "新潟市" and r["indicator_id"] == "metabo_case"
])
print([(r["observation_fiscal_year"], r["value"]) for r in series])
```

`comparable_series` はpending・incompatible・未検証・重複年度・混在した地域／指標を拒否します。全市町村と県計・保健所計を足す処理は提供していません。自治体別地図に使う場合は `geography_level="municipality"` だけを選んでください。自治体コード・境界データの対応付けは、第1弾Web UI用の公開データ生成時に検証します。

## 原本・比較・集計の方針

- Collectorは登録済み公式年度ページを毎回取得し、HTMLに実在する対象Excelリンクを解決します。ExcelのURLを年度文字列の置換で生成しません。リンクなし・複数候補・公式外へのリンクは失敗扱いです。
- 原本は `data/raw/objects/<SHA-256>.xlsx` に無加工で保存します。HTMLもハッシュ付きで保存し、取得イベントは `data/raw/events/` に追記します。同一URLの前回ハッシュとの違いを `content_changed` として記録し、旧原本も残します。並列実行を想定したサービスではなく、CLIを1実行ずつ使います。
- 対象Excelの第2シートを共通レコードにします。第1シートの県概要は既出実績・割合を含むため、別の観測値として二重登録せずセル証跡に保持します。新しい指標や年度を黙って追加しません。
- R3・R5末尾にある国保組合の4行は別母集団として保持し、`out_of_scope` とします。R4にない行を0で生成しません。
- 新潟市50・51行は、原値・保存済み値・型・書式が41項目すべて一致する場合だけ50行目を採用します。51行目も `duplicate_excluded` として保存します。不一致や未知の重複は両方を保留し、検証エラーにします。
- 5.2節の比較判定を採用し、メタボC–F・保健指導L–Oの8指標だけをcompatibleとします。心電図判定AHは通算incompatibleで、区間別ではR3→R4 pending、R4→R5 incompatibleを保持します。それ以外と仕様未判定の合計・実施件数はpendingです。
- 閾値の再計算、疾病有病率への読み替え、欠測補完、独自の割合算出は行いません。検査判定の人数の単位は「人」、実施件数は「件」です。
- シート名（空白を含む）、表題・多段見出し、行ラベル、結合・印刷範囲・使用領域などを年度別契約と照合します。未知の列・構造変更があれば原本とセル証跡を保持して採用を停止します。
- Validatorは原本SHAを再確認し、再抽出したレコードとの一致、キー一意性、型・単位・定義版、県計123セル、分類合計、市町村30団体から県計への合計を検証します。欠測を含む合計は0補完せず「検証不能」の警告にします。
- エラーが1件でもあれば、その実行の比較用出力は空にします。再検証開始時にも前回の比較出力を無効化し、途中で失敗した場合に古い合格結果を残しません。年度別原値は失いません。

## 構成・詳細

```text
hdv/
  collector.py       公式ページ探索・取得・原本履歴
  normalizer.py      セル読取・スキーマ変換・行採否
  validator.py       品質検証・比較利用の制限
  common.py          JSON・ハッシュ・パス等
  config/
    contracts.json            年度別構造契約（値の全量コピーではない）
    indicators.json           41指標・原見出し位置・単位・比較判定
    province_reference.json   公式PDFと照合済みの県計123セル
tests/               合成データ・障害ケース・実データ回帰テスト
data/                Git管理外の原本・履歴・生成物
```

スキーマと制約は [データモデル](docs/data_model.md)、今回の実行結果は [v0.1実行報告](docs/v0_1_execution.md) を参照してください。構造契約や判定辞書の変更は、公式資料・調査文書の更新とレビューを伴う必要があります。新しい原本から期待値を毎回生成して検証を通す運用は禁止です。

## 第1弾Web UI

### 初回準備

Python環境は上の手順で準備します。地図変換を行う環境では `pip install -e ".[geography]"` で追加依存を導入してください。フロントエンドはNode.js 22以上、pnpm 11を使用します。lockfileを保持します。

```powershell
.venv\Scripts\python -m pip install -e ".[geography]"
cd web
pnpm install --frozen-lockfile
pnpm build
pnpm test
cd ..
```

地図原本・生成物もGit管理外の `data/` に保存します。公式ページの実リンクを確認して2023年1月1日版を取得し、新潟市の区を市に統合します。以下は境界を再生成する場合の手順です。既に `data/geography/niigata.json` があれば、同じ候補の再確認時には再取得不要です。

```powershell
.venv\Scripts\python -m hdv.geography data/geography/raw data/geography/niigata.json --fetch --transport powershell
```

### 公開候補を生成してローカルで確認

入力runを明示してください。下記は今回の既存検証済みrunです。ビルド時には原本から再検証し、元のprocessedファイルは更新しません。

```powershell
.venv\Scripts\python -m hdv.publisher build --run-id 44595cc6bf204cffa81c485d72f91019
# 出力された64桁のrelease IDを指定
.venv\Scripts\python -m hdv.publisher validate --release-id <release-id>
.venv\Scripts\python -m hdv.serve --review-release <release-id> --port 4174
```

`http://127.0.0.1:4174/?review=1` を開きます。これは未承認候補のローカル確認専用です。`current.json` は作成・変更しません。公開モードへ自動フォールバックすることもありません。サーバーは127.0.0.1限定、配信対象は `web/dist` と明示したデータだけです。リポジトリルートを `http.server` で公開しないでください。

初期表示は「受診者に占める割合（%）」で、「報告人数（人）」へ切り替えられます。原本人数を置き換えず、同じ地域・年度の受診者数を分母とした派生割合を保持します。現在の候補はメタボ判定4区分・保健指導レベル4区分、県計＋30市町村、2021～2023年度の744レコードです。初期表示は県計、自治体選択で上下の比較表示に切り替わります。表コピー、CSV、図表のPNG・画像コピー、出典モーダルに対応します。Clipboard APIが拒否・非対応の場合はエラーを表示し、PNG/CSV保存を使えます。

### 人間による承認と承認済み版の配信

**今回この承認操作は実施していません。** 候補・警告・説明文・統計および地理データの再利用条件を確認した担当者が実行する手順です。承認者名は監査記録用であり、CLI自体に認証・電子署名機能はありません。承認権限は実行環境のアクセス制御で分離してください。

```powershell
.venv\Scripts\python -m hdv.publisher approve --release-id <release-id> --confirm-hash <同じrelease-id> --reviewer "確認者名" --data-rights-reviewed --map-rights-reviewed
.venv\Scripts\python -m hdv.serve --port 4174
```

承認済みモードは `http://127.0.0.1:4174/`。原本・設定・候補の再検証後にのみ公開参照先を原子的に切り替えます。ブラウザーも承認状態とSHA-256を確認します。以前の承認済み版へ戻す場合も、その版を明示して再承認します。設定変更後の古い候補を再承認するには、その候補の入力・設定を再現できる環境が必要です。

静的配信ファイルを用意する場合は、承認後に `python -m hdv.publisher export` を実行してから `web` で再ビルドします。出力先 `web/public/public-data/` はGit除外済み。ホスティングへ配布する操作は別途承認された作業として行います。ブラウザーは `processed/latest.json` を参照しません。

### 指標の拡張と監視

公開指標は `hdv/public_config/indicators.json` で管理します。UIに8指標の固定リストはありません。追加する指標は、先に元の定義辞書でcompatibleとなり、対応する原本・構造・比較区間・単位の検証を通過している必要があります。公開設定だけを書き換えてpendingを昇格させることはできません。

```powershell
# 登録済み年度ページと、そこから発見した年度ページを確認・取得
.venv\Scripts\python -m hdv.monitor --transport powershell
# 既知の構造契約で検証できるデータだけを処理し、公開「候補」まで作成
.venv\Scripts\python -m hdv.monitor --transport powershell --process-known
```

監視元の公式一覧ページは `--index-page <公式URL>` で追加できます。新年度・未登録のファイルは契約と定義のレビュー待ちとなります。未登録の年度を自動でcompatibleにせず、現在の公開版は維持します。年度一覧のリンク形式やファイル名の変更にも対応確認が必要です。スケジューラーへの登録・通知連携・外部公開の自動実行はまだ行っていません。

詳細は [公開データモデル](docs/public_data_model.md)、[公開手順と制約](docs/publication_workflow.md)、[第1弾実行報告](docs/web_v1_execution.md) を参照してください。

割合の監査・定義・比較判定は [受診者構成割合の監査](docs/recipient_percentage_audit.md) を参照してください。公開候補は744人数レコード、744派生割合、93分母レコードです。元の分母人数のpendingを変更せず、割合専用にR3→R4→R5の比較判定を管理します。分母0・欠損・区分合計不一致・母集団不一致は候補生成／公開検証を停止します。

## 全区分表示（public-3、ローカル確認）

メタボ判定・保健指導レベルの「全区分」を表示項目から選択できます。グループ設定は `hdv/public_config/groups.json`。既存人数・派生割合を維持し、原本再検証を経てグループ構成の検証証跡を付けます。

```powershell
.venv\Scripts\python -m hdv.publisher build --run-id 44595cc6bf204cffa81c485d72f91019
.venv\Scripts\python -m hdv.publisher validate --release-id f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17
cd web
pnpm build
cd ..
.venv\Scripts\python -m hdv.serve --review-release f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17 --port 4176
```

確認URLは `http://127.0.0.1:4176/?review=1`。上のIDは現在の候補です。設定・入力が変わった場合はbuildが返したIDを使用してください。公開承認は行いません。詳しくは [全区分表示](docs/group_views.md) と [実行報告](docs/web_v1_execution.md) を参照してください。

## 医師の判断・公表数表（site-1、未承認候補）

医師の判断は単年度表示のみ許可し、年度間比較はpendingのままです。既存public-3の比較条件を緩和せず、別契約annual-1と原表表示用published_tablesを追加しています。

```powershell
.venv\Scripts\python.exe -X utf8 -m hdv.site_release build --analysis-release f66a35326c7f394b31ef7a8e4fb46bdbddbd28701583248afd9d8edfda19ac17
.venv\Scripts\python.exe -X utf8 -m hdv.site_release validate --release-id 881d1548fa002e532440e90b67454e731cbadd33a51a6985b0fc2d15088be937
# webでpnpm buildを実行後、リポジトリ直下から起動
.venv\Scripts\python.exe -X utf8 -m hdv.serve --site-review-release 881d1548fa002e532440e90b67454e731cbadd33a51a6985b0fc2d15088be937 --port 4178
```

入力・設定が変わる場合はbuildが返す候補IDを使用してください。確認URLは `http://127.0.0.1:4178/?review=1`、公表数表は `/tables?year=2023&review=1`、制度説明は `/learn?review=1`。候補生成は公開承認・現在版切替を行いません。[設計と公式根拠](docs/annual_publication_design.md)、[検証結果・変更ファイル](docs/annual_publication_execution.md)を参照してください。
