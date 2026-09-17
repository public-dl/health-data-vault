# Health Data Vault v0.1

新潟県「特定健康診査等結果報告」のR3・R4・R5実績（2021・2022・2023年度）を、公式年度ページから取得し、出典付きのJSON Linesへ変換・検証するPythonのデータ基盤です。Web UI、APIサーバー、GitHub Actionsは含みません。

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

`comparable_series` はpending・incompatible・未検証・重複年度・混在した地域／指標を拒否します。全市町村と県計・保健所計を足す処理は提供していません。自治体別地図に使う場合は `geography_level="municipality"` だけを選んでください。自治体コード・境界データの対応付けは未実装です。

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
