# あまと整体院 売上管理アプリ

整体院の日々の売上をスマホで簡単に記録・管理できるWebアプリです。

## アプリを開く

👉 **https://monourimasu2525-cyber.github.io/amatoseitai-v2/**

ブラウザで上のURLを開くだけで使えます。インストール不要です。

---

## 使い方

### ホーム画面
- **今日の売上・新規・常連** の数字がひと目でわかります
- **今月の売上** と先月との比較（%）が表示されます
- **クイック入力ボタン** を1タップするだけで売上が登録されます
- **金額を指定して入力** から自由な金額を入力することもできます
- 今日の記録が下に一覧表示されます

### 台帳
月ごとの全記録をスプレッドシートのように一覧で見ることができます。
- 左上の「◀ 前月」「翌月 ▶」で月を切り替えられます
- 各行の「編集」「✕」ボタンで修正・削除ができます

### 集計
売上データをグラフや表で確認できます。

| タブ | 内容 |
|------|------|
| **年別** | 年間売上の月別棒グラフ＋月別内訳表 |
| **月別** | 日別の棒グラフ・3ヶ月比較・種別内訳 |
| **日別** | 日ごとの売上棒グラフ＋一覧表 |

### 経理
月ごとの売上レポートを印刷したりCSVで書き出したりできます。

### 設定
- **マスタ追加**：「新規」「常連」などのボタンと金額を登録します
- **CSVエクスポート**：月別または全データをExcel等で開ける形式で保存できます

---

## マスタの登録方法（最初にやること）

アプリを初めて使う際は、まず**設定タブ**でマスタを追加してください。

1. 「設定」タブを開く
2. 種別名（例：新規）と金額（例：3270）を入力
3. 「追加する」を押す
4. 同様に「常連」も追加する

マスタを登録すると、ホーム画面にクイック入力ボタンが表示されます。

---

## システム構成（開発者向け）

```
フロント  : GitHub Pages（このリポジトリの index.html）
バックエンド: Railway（Node.js + Express）
データベース: Railway PostgreSQL
```

### ファイル構成

```
amatoseitai-v2/
├── index.html     # アプリ本体（フロントエンド）
├── index.js       # サーバー（Railway上で動くAPI）
├── package.json   # Node.jsの設定
└── .gitignore
```

### APIエンドポイント

| メソッド | パス | 内容 |
|--------|------|------|
| GET | `/api/initData` | 初期データ一括取得 |
| GET | `/api/getTodayStats` | 今日の集計 |
| GET | `/api/getMonthStats` | 月別集計 |
| GET | `/api/getDailyBreakdown` | 日別内訳（グラフ用） |
| GET | `/api/getMonthReport` | 月次レポート（経理用） |
| GET | `/api/getRecentHistory` | 直近の履歴 |
| GET | `/api/getMaster` | マスタ一覧 |
| GET | `/api/getCsv` | CSVダウンロード |
| POST | `/api/addSale` | 売上登録 |
| PUT | `/api/editSale/:id` | 売上修正 |
| DELETE | `/api/deleteSale/:id` | 売上削除 |
| POST | `/api/addMaster` | マスタ追加 |
| PUT | `/api/updateMaster/:id` | マスタ修正 |
| DELETE | `/api/deleteMaster/:id` | マスタ削除 |

### デプロイの流れ

```
コードを編集
  ↓
git push → GitHub
  ↓
フロント（index.html）: GitHub Pagesが自動で反映（1〜2分）
バックエンド（index.js）: Railwayが自動でデプロイ
```

### ローカル開発

```bash
# 依存パッケージのインストール
npm install

# ローカルで起動（http://localhost:3000）
node index.js
```

※ ローカルで動かすには `.env` ファイルに `DATABASE_URL` を設定する必要があります。

---

## 技術スタック

- **フロントエンド**: HTML / CSS / JavaScript（フレームワークなし）
- **グラフ**: Chart.js 4.4
- **バックエンド**: Node.js + Express
- **データベース**: PostgreSQL
- **ホスティング**: GitHub Pages（フロント）+ Railway（API＋DB）
