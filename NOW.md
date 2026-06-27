# 現在の作業状況

## 方針決定（2026-06-27）

LP一体型SaaSへの移行を開始する。詳細は `SPEC.md` 参照。

**決定事項:**
- 技術スタック: Next.js 14+ App Router + TypeScript + Vercel
- フロントだけ先に移行（Railway APIはPhase 1で変更なし）
- 顧客管理・分析機能を追加（マルチテナント設計から）
- `apps/web/` ディレクトリにNext.jsプロジェクトを作成
- Vercelの「Root Directory」を `apps/web` に設定

## 次やること（Phase 1開始）

1. `apps/web/` に Next.js プロジェクト作成
   - `npx create-next-app@latest apps/web --typescript --app --no-tailwind --no-eslint`
   - CSS Modulesで実装（Tailwindは使わない）
2. デザイントークン定義（SPEC.mdのカラー変数をCSS変数として）
3. 認証ページ（/login, /signup）
4. アプリ画面を1枚ずつ移植
   - /app/dashboard（ホーム）
   - /app/ledger（台帳）
   - /app/analytics（集計）
   - /app/settings（設定）
5. LP（/）は後回し

## 作業ログ

- 2026-06-24: Next.js(Vercel)移行を試みたが失敗→元に戻した（原因: DATABASE_URLがRailway内部URLだった）
- 2026-06-27: SaaS移行方針確定。SPEC.md作成。Phase 1開始準備完了
