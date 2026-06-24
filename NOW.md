# 現在の作業状況

## 直近の作業（2026-06-24）
- Next.js移行完了（バニラJS → Next.js 15 + React + Tailwind）
- index.html・index.js（Express）を削除
- app/（API Routes + Reactコンポーネント）+ lib/（共通ライブラリ）作成
- ビルド成功・GitHubにpush済み

## 次にやること
- Vercelにデプロイ（ユーザーが手動でVercel設定）
  1. vercel.com でアカウント作成（GitHubログイン）
  2. New Project → amatoseitai-v2 を選択
  3. 環境変数: DATABASE_URL, JWT_SECRET を入力
  4. Deploy ボタン
- Railwayの Express サービスを停止（DB だけ残す）

## 構成（移行後）
- フロント + API: Vercel（Next.js）
- DB: Railway PostgreSQL（変わらず）
- デプロイ: git push → Vercel自動デプロイ

## メモ
- stop hook: CWDを見てプロジェクトを自動判別
- CLAUDE.mdあり
