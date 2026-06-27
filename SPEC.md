# Amato整体院 SaaS 仕様書

> **毎セッション冒頭にこのファイルを読むこと。**
> 実装判断の基準はすべてここにある。

---

## 1. プロジェクト概要

整体院向け売上管理SaaS。現在は単院（あまと整体院）用として動作しているが、**マルチテナント・LP一体型SaaSに移行中**。

### 将来像
- 50院向け月額サブスク
- 顧客管理・分析機能追加
- LP → signup → onboarding → app の王道SaaS動線

---

## 2. 現在の構成（移行元）

```
index.html  → GitHub Pages（フロント全体・1355行）
index.js    → Railway（Express API・389行）
DB          → Railway PostgreSQL
```

### デプロイ
- `git push` だけで両方自動デプロイ
- GitHub Pages: index.html
- Railway: index.js（`PORT`環境変数）

### 重要な環境変数
- `DATABASE_URL` — Railway PostgreSQL接続文字列
- `JWT_SECRET` — JWTシークレット（生成済み: 0332ce123b7ca05dfe7772c4525d529d0a1db40b6597f8e41d6ff46083b32798）

---

## 3. 現在のDB設計

```sql
users
  id SERIAL PRIMARY KEY
  email VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) NOT NULL
  created_at TIMESTAMPTZ DEFAULT NOW()

sales
  id SERIAL PRIMARY KEY
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()
  type VARCHAR(50)          -- 種別（新規/常連/etc）
  amount INTEGER            -- 金額
  input_method VARCHAR(30)  -- 'WebApp' or 'CSV'

master_items
  id SERIAL PRIMARY KEY
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  type VARCHAR(50)
  amount INTEGER
  description TEXT DEFAULT ''
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ DEFAULT NOW()
```

### 既知の問題
- `initDb()`内に `DROP TABLE IF EXISTS sales CASCADE` が残っている → **本番で危険、Phase 3で廃止**

---

## 4. 現在の全API一覧

| Method | Path | 認証 | 概要 |
|--------|------|------|------|
| GET | /health | なし | ヘルスチェック |
| POST | /api/register | なし | 新規登録（email, password） |
| POST | /api/login | なし | ログイン → JWT返却 |
| GET | /api/initData | Bearer | 初期ロード（今日/今月/マスタ/履歴） |
| GET | /api/getTodayStats | Bearer | 今日の集計 |
| GET | /api/getMonthStats | Bearer | 月次集計（?year=&month=） |
| GET | /api/getRecentHistory | Bearer | 最近の記録（?days=） |
| GET | /api/getDailyBreakdown | Bearer | 日別内訳（?year=&month=） |
| GET | /api/getMonthReport | Bearer | 月次レポート（?year=&month=） |
| GET | /api/getDayRecords | Bearer | 日次記録（?year=&month=&day=） |
| GET | /api/getMaster | Bearer | マスタ一覧 |
| POST | /api/addSale | Bearer | 売上登録（type, amount） |
| PUT | /api/editSale/:id | Bearer | 売上編集（type, amount） |
| DELETE | /api/deleteSale/:id | Bearer | 売上削除 |
| POST | /api/addMaster | Bearer | マスタ追加（type, amount, description） |
| PUT | /api/updateMaster/:id | Bearer | マスタ編集 |
| DELETE | /api/deleteMaster/:id | Bearer | マスタ削除（ソフトデリート） |
| GET | /api/getCsv | Bearer or ?token= | CSVエクスポート（?year=&month= 省略可） |
| POST | /api/importCsv | Bearer | CSVインポート（multipart/form-data） |

**CSVインポート形式:** `日付,種別,金額`（例: `2024/6/1,新規,3270`）

---

## 5. 現在の画面・機能一覧（index.html）

### 認証
- ログイン（メール+パスワード）
- 新規登録
- ログアウト
- JWT → localStorage保存（`auth_token`, `auth_email`）

### ナビ（下部タブ）
- ホーム / 台帳 / ＋（クイック入力） / 集計 / 設定

### ホーム
- 今日の売上（合計・件数）
- 今月合計・新規・常連KPI
- クイック入力プランカード（横スクロール）
- 今月の売上グラフ（日別棒グラフ）
- 今月のプラン比率バー
- 今日の記録一覧（編集・削除）

### クイック入力フロー
1. ＋ボタン → プラン選択シート（下から出るボトムシート）
2. プランタップ → 支払方法選択（現金/クレカ/PayPay）
3. 登録 → 完了オーバーレイ表示

### 台帳
- タブ: 年別 / 月別 / 日別
- 年別: 年選択 → 年間サマリー + 月別テーブル
- 月別: 月ナビ + 月ピッカー → 月間サマリー + 日別一覧（日をタップで日別へジャンプ）
- 日別: 日ナビ + 日付ピッカー → 日次サマリー + 記録テーブル（編集・削除）

### 集計
- タブ: 年別 / 月別 / 日別
- 年別: 年選択 → KPI + 月別推移グラフ（積み上げ棒） + 月別テーブル
- 月別: 月ナビ → KPI + 新規/常連 + 日別棒グラフ + 3ヶ月比較グラフ + 種別内訳テーブル
- 日別: 月ナビ → 日別棒グラフ + 日別実績テーブル

### 経理レポート（設定から遷移・印刷対応）
- 年月セレクター
- 印刷ボタン（`window.print()`）
- CSVダウンロード
- 月次レポート（サマリー + 日別明細）

### 設定
- アカウント表示 + ログアウト
- マスタ追加（種別名・金額・備考）
- マスタ一覧（編集・削除）
- 経理レポートへのリンク
- CSVエクスポート（月別 / 全件）
- CSVインポート（ファイル選択 or ドラッグ&ドロップ）

---

## 6. デザインシステム

```css
--bg: #F5EDE4           /* クリーム */
--card: #fff
--text: #1a0f0a
--sub: #8B5A3A           /* 茶色サブ */
--sub2: #B8967A
--border: #EAD9C8
--primary: #3D2314       /* ダークブラウン */
--primary-m: #5C3520
--primary-l: #FDF0E8
--accent: #C4622D        /* テラコッタ */
--accent-l: #FEF0E8
--pos: #2D7D4F           /* 緑（増加） */
--neg: #b91c1c           /* 赤（減少） */
```

- フォント: -apple-system, Hiragino Kaku Gothic ProN, Meiryo
- モバイルファースト（底部ナビ60px固定）
- セーフエリア対応（env(safe-area-inset-bottom)）

---

## 7. 移行先アーキテクチャ（SaaS）

### 技術スタック
- **フロント**: Next.js 14+ App Router + TypeScript + Vercel
- **バックエンド**: 既存 Railway Express（Phase 1は変更なし）
- **DB**: 既存 Railway PostgreSQL

### リポジトリ構成
```
amatoseitai-v2/
├── index.js              ← Railway（変更なし）
├── index.html            ← 移行後は廃止
├── package.json          ← Railway用（変更なし）
├── SPEC.md               ← この仕様書
├── NOW.md                ← 現在の作業状況
├── CLAUDE.md             ← Claudeへの指示
└── apps/
    └── web/              ← Next.jsフロント（Vercelデプロイ）
        ├── app/
        │   ├── (marketing)/
        │   │   ├── page.tsx          # /  LP
        │   │   ├── pricing/page.tsx  # /pricing
        │   │   ├── login/page.tsx    # /login
        │   │   └── signup/page.tsx   # /signup
        │   ├── onboarding/page.tsx   # /onboarding
        │   └── app/
        │       ├── dashboard/page.tsx    # /app/dashboard
        │       ├── ledger/page.tsx       # /app/ledger
        │       ├── analytics/page.tsx    # /app/analytics
        │       ├── customers/page.tsx    # /app/customers  ★新規
        │       └── settings/page.tsx     # /app/settings
        ├── components/
        │   ├── marketing/
        │   ├── auth/
        │   ├── app/
        │   └── shared/
        ├── lib/
        │   ├── api/      # APIクライアント（Railway APIを叩く）
        │   └── auth/
        ├── types/
        └── middleware.ts
```

---

## 8. 追加予定の機能（SaaS化で追加）

### 顧客管理システム（新規）
- 顧客登録（名前・電話・生年月日・メモ）
- 来院履歴（売上と紐付け）
- 施術記録

### 分析システム（強化）
- 既存の売上集計に加えて
- 顧客属性別分析（新規/常連リテンション率）
- 顧客LTV分析
- リピート周期分析

### 追加予定DBテーブル（SaaS化時）
```sql
clinics         -- 院（テナント）
  id, name, slug, owner_user_id, created_at

memberships     -- ユーザーと院の紐付け
  id, clinic_id, user_id, role(owner/admin/staff), status

customers       -- 顧客
  id, clinic_id, name, phone, birthday, memo, created_at

visits          -- 来院履歴（顧客と売上の紐付け）
  id, clinic_id, customer_id, sale_id, date, note

payment_methods -- 支払方法マスタ（現状はハードコード）
  id, clinic_id, name, sort_order, is_active

onboarding_progress -- オンボーディング進捗
  id, user_id, clinic_id, step_key, completed_at

plans           -- SaaSプラン
  id, name, monthly_price, trial_days, is_active

subscriptions   -- 契約状態
  id, clinic_id, plan_id, status, started_at, trial_ends_at
```

---

## 9. 実装フェーズ

### Phase 1: Next.jsフロント構築（現在進行中）
- `apps/web/` にNext.js App Router + TypeScript
- LP（/）・認証（/login, /signup）・既存全画面の移植
- 既存Railway APIをそのまま利用
- Vercelデプロイ設定（Root Directory: apps/web）

### Phase 2: オンボーディング
- /onboarding（チェックリスト導線）
- 各ステップ動画
- 進捗保存（onboarding_progressテーブル）

### Phase 3: 認証・セキュリティ強化
- localStorage → httpOnly Cookie
- パスワードリセット
- レート制限
- query token廃止
- migration導入（initDb DROP廃止）

### Phase 4: テナント・顧客管理
- clinics / memberships テーブル追加
- sales / master_items に clinic_id 追加
- 顧客管理（customers + visits）
- 顧客分析ダッシュボード

### Phase 5: SaaS基盤
- Stripe連携（月額課金）
- 新規院サインアップフロー

---

## 10. セキュリティ上の既知問題（対応優先度付き）

| 問題 | リスク | 対応Phase |
|------|--------|-----------|
| JWT → localStorage保存 | XSS時にトークン漏洩 | Phase 3 |
| query token（CSVダウンロード） | URLログに認証情報 | Phase 3 |
| initDb() の DROP TABLE | 本番データ消失リスク | Phase 3 |
| パスワードリセット未実装 | ユーザーサポート負担 | Phase 3 |
| レート制限なし | ブルートフォース攻撃 | Phase 3 |

---

## 11. 引き継ぎ注意点

- **支払方法**は現在ハードコード（現金/クレカ/PayPay）。SaaS化時に `payment_methods` テーブルへ移行
- **CST変換**は index.js の `toJST()` で UTC+9 として処理
- **マスタ削除**はソフトデリート（`is_active=false`）
- 現在の `user_id` ベース設計は、SaaS化時に `clinic_id` ベースに移行が必要
- Chart.js v4.4 を使用（Next.js移行後はReact Chartsまたはrecharts検討）
