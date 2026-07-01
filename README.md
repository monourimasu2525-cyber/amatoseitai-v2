# あまと整体院 売上管理アプリ

整体院の売上・患者・来院を一元管理できるWebアプリです。

## アプリを開く

👉 **https://amatoseitai-v2.vercel.app**

スマホのブラウザで開くだけで使えます。インストール不要。

---

## 画面一覧

### ホーム
- 今日の売上・件数がひと目でわかる
- **クイック入力**：マスタボタンを1タップで売上登録。患者名を入力すれば既存患者と紐づけ、または新規患者をその場で登録できる
- 今月の売上と先月比（%）
- 今日の記録一覧（患者名・金額・時刻）、編集・削除も可

### 台帳
- 月ごとの全来院記録を一覧表示
- 月ピッカーで過去の記録を参照・編集・削除

### 顧客
- 患者の追加・編集・削除・検索
- 患者ごとに来院登録（マスタ選択、カルテ記入）
- 患者詳細：来院回数・累計売上・来院履歴・カルテ

### 集計
- 年別・月別・日別のグラフと内訳表
- CSV出力・過去データインポート

### 分析
各指標に対象期間・計算方法を明示

| 指標 | 内容 |
|------|------|
| 来院数 | 選択月の合計件数 |
| 稼働率 | 来院数 ÷ (稼働日数 × 1日の枠数) |
| 継続率 | 前月来院者が今月も来院した割合 |
| 年間LTV | 過去12ヶ月の総売上 ÷ 来院顧客数 |
| 2回目来院率 | 初回来院後に2回目来院した割合（全期間） |
| リピート率 | 2〜5回目まで各回の来院率（全期間コホート） |
| 媒体別・CPA | 集客媒体ごとの新規数・広告費 ÷ 新規数 |

### 設定
- **マスタ管理**：クイック入力のボタン（種別名・金額）を登録
- **院設定**：院名・1日の施術枠数
- **広告媒体**：集客媒体の登録・月次広告費の入力
- **データインポート**：顧客CSV・来院CSVの一括登録

---

## はじめて使う手順

1. **https://amatoseitai-v2.vercel.app** を開く
2. アカウント登録 → 院情報を登録
3. **設定** → マスタ追加（例：新規 3,270円 / 常連 2,200円）
4. **設定** → 広告媒体を追加（例：ホームページ・チラシ・紹介）
5. **顧客** タブで患者を登録（集客媒体も選択）
6. **ホーム** のクイック入力で日々の売上を記録

---

## システム構成（開発者向け）

```
フロント   : Vercel（Next.js 16 / apps/web/）
バックエンド: Railway（Node.js + Express / index.js）
データベース: Railway PostgreSQL
```

### リポジトリ構成

```
amatoseitai-v2/
├── index.js          # Express APIサーバー（Railway）
├── apps/web/         # Next.js フロント（Vercel）
│   └── src/app/app/
│       ├── dashboard/   # ホーム
│       ├── ledger/      # 台帳
│       ├── customers/   # 顧客管理
│       ├── analytics/   # 集計
│       ├── analysis/    # 分析（7指標）
│       └── settings/    # 設定
├── SPEC.md           # 全機能・API・DB仕様
├── NOW.md            # 現在の作業状況
└── CLAUDE.md         # Claude向け開発ガイド
```

### デプロイ

```bash
git push  # これだけで両方自動デプロイ
# フロント(apps/web/) → Vercel（1〜2分）
# バックエンド(index.js) → Railway（自動）
```

### 主要APIエンドポイント

| メソッド | パス | 内容 |
|--------|------|------|
| GET | `/api/initData` | 初期データ一括取得 |
| POST | `/api/addSale` | 売上登録（顧客記録なし） |
| GET/POST/PUT/DELETE | `/api/customers` | 顧客CRUD |
| GET/POST/DELETE | `/api/visits` | 来院登録（売上+来院を同時作成） |
| GET | `/api/analytics/advanced` | 分析7指標 |
| POST | `/api/import/customers` | 顧客CSV一括登録 |
| POST | `/api/import/visits` | 来院CSV一括登録 |

### 認証

httpOnly Cookie（`auth_token`）、SameSite=none。フロントは `credentials: 'include'` で全APIを呼ぶ。

### ローカル開発

```bash
# APIサーバー
npm install
node index.js   # localhost:3001

# フロント
cd apps/web
npm install
npm run dev     # localhost:3000
```

`.env` に `DATABASE_URL`（Railway PostgreSQL）が必要。

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| フロント | Next.js 16 / TypeScript / Chart.js |
| バックエンド | Node.js / Express |
| データベース | PostgreSQL |
| ホスティング | Vercel（フロント）+ Railway（API+DB）|
| 認証 | JWT + httpOnly Cookie |
