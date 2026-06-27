# 現在の作業状況

## Phase 1 完了（2026-06-27）

### 完了済み
- [x] `apps/web/` に Next.js 16 + TypeScript プロジェクト作成
- [x] globals.css（デザイントークン + 共通スタイル）
- [x] src/types/index.ts（型定義）
- [x] src/lib/auth.ts（認証ユーティリティ）
- [x] src/lib/api.ts（APIクライアント）
- [x] /login → ログインページ（Railway API接続済み）
- [x] /signup → 新規登録ページ
- [x] /app/layout.tsx → 下部ナビ + 認証ガード
- [x] /app/dashboard → ホーム（今日の売上・クイック入力・グラフ・今日の記録・編集削除）
- [x] /app/ledger → 台帳（年別/月別/日別、月ピッカー、編集削除）
- [x] /app/analytics → 集計（年別/月別/日別、Chart.js グラフ、KPI、3ヶ月比較）
- [x] /app/settings → 設定（アカウント・マスタCRUD・CSV出力/インポート）
- [x] /app/accounting → 経理レポート（月次レポート・日別明細・印刷/PDF・CSV）
- [x] Vercel デプロイ完了 → https://amatoseitai-v2.vercel.app

### 本番URL
- **Vercel（新Next.jsアプリ）**: https://amatoseitai-v2.vercel.app
- **Railway API**: https://amatoseitai-v2-production.up.railway.app
- **GitHub Pages（旧index.html）**: まだ生きている（廃止予定）

## 構成
- Railway: index.js（変更なし）
- Vercel: apps/web/ （Root Directory: apps/web）
- 環境変数: NEXT_PUBLIC_API_URL=https://amatoseitai-v2-production.up.railway.app

## Phase 2 完了（2026-06-27）
- [x] LP（ランディングページ）/ → ヒーロー・機能紹介・3ステップ・料金（準備中）・CTA・フッター
- [x] /onboarding → 3ステップチェックリスト・進捗バー・localStorageで進捗管理
- [x] サインアップ後 → /onboarding へリダイレクト

## Phase 3 完了・動作確認済み（2026-06-27）
- [x] initDb: DROP TABLE 廃止（本番データ消失リスク解消）
- [x] レート制限: /api/login, /api/register → 15分20回
- [x] パスワードリセット: Resend連携・/forgot-password・/reset-password
- [x] localStorage → httpOnly Cookie（SameSite=none・credentials:include）
- [x] /api/logout 追加
- [x] 本番動作確認済み: auth_tokenがJSから読めないことを確認

## Phase 4 進行中（2026-06-27）
- [x] clinics / memberships / customers テーブル追加
- [x] /api/clinics/me, POST /api/clinics, PUT /api/clinics/me
- [x] /app/clinic-setup 院登録ページ（初回ログイン時リダイレクト）
- [x] 顧客管理ページ /app/customers（一覧・追加・編集・削除・検索）
- [x] GET/POST/PUT/DELETE /api/customers
- [x] ナビに顧客タブ追加（ホーム/台帳/顧客 | + | 集計/設定）
- [x] sales / master_items に clinic_id カラム追加（ALTER TABLE）
- [x] 院作成時に既存データをバックフィル（UPDATE WHERE clinic_id IS NULL）
- [x] addSale / addMaster: 新規レコードにclinic_idをセット
- [x] visits テーブル追加（clinic_id/customer_id/sale_id）
- [x] GET/POST/DELETE /api/visits・GET /api/customers/stats
- [x] 来院登録モーダル（マスタ選択＋手入力）
- [x] /app/customers/[id] 顧客詳細ページ（来院履歴・累計売上）

## 本番動作確認済み（2026-06-27）
- テスト院「テスト整体院」登録 → 既存売上バックフィル確認済み
- テスト顧客3名（山田花子・田中太郎・佐藤美咲）登録確認済み
- 来院記録6件・顧客詳細ページ（来院回数・累計売上・履歴）確認済み
- バグ修正: index.jsのTypeScript型注釈混入（`stats: Record<string, unknown>`）→ 修正済み

## Phase 4 完了（2026-06-27）
- マルチテナント基盤（clinics/memberships）
- 顧客管理（customers）
- 来院管理（visits）

## UI修正（2026-06-27）
- [x] 顧客管理ページ: ヘッダーの「＋ 追加」ボタンを廃止、リスト上部に独立した「顧客を追加」ボタンへ移動
- [x] 顧客追加・編集フォーム: 下からスライドするモーダル（底面シート）→ フルスクリーン表示に変更（顧客リストと重なって見える問題を解消）

## 次のフェーズ（Phase 5以降）
- Phase 5: Stripe連携
- 詳細は SPEC.md 参照
