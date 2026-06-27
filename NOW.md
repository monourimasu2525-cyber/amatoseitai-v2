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

## Phase 3 進行中（2026-06-27）
- [x] initDb: DROP TABLE 廃止（本番データ消失リスク解消）
- [x] レート制限: /api/login, /api/register → 15分20回
- [x] パスワードリセット: Resend連携・/forgot-password・/reset-password
- [ ] localStorage → httpOnly Cookie（次）

## 次のフェーズ（Phase 4以降）
- Phase 4: マルチテナント設計 + 顧客管理・分析機能
- Phase 5: Stripe連携
- 詳細は SPEC.md 参照
