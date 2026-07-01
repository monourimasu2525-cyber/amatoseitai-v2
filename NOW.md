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
- [x] 集計ページの「顧客」タブ → /app/analysis として独立ページ化
- [x] ナビに「分析」タブ追加（ホーム/台帳/顧客 | + | 集計/分析/設定）
- [x] 集計ページは年別/月別/日別の3タブのみに整理

## Phase 4 追加実装（2026-06-27）
- [x] advertising_channels テーブル（広告媒体マスター）
- [x] monthly_ad_spend テーブル（月次広告費）
- [x] clinics.daily_capacity（1日の施術枠数）
- [x] customers.source_id（集客媒体）
- [x] PUT /api/visits/:id（カルテ更新）
- [x] GET /api/analytics/advanced（稼働率・継続率・リピート率2〜5回目・CPA・媒体別）
- [x] 設定ページ: 院設定（枠数）・広告媒体マスター管理
- [x] 顧客フォーム: 集客媒体選択
- [x] 来院登録モーダル: カルテ欄（テンプレ付き）
- [x] 顧客詳細: 来院ごとカルテ表示・編集
- [x] 分析ページ: 指標タブ（稼働率・継続率・リピート率・媒体別・CPA）追加

## 本番動作確認済み（2026-06-27）
- 設定ページ: 院設定・広告媒体マスター（ホームページ/チラシ/紹介/その他）追加 ✅
- 顧客フォーム: 集客媒体ドロップダウン表示 ✅
- 分析ページ: 来院数・稼働率・継続率・リピート率・媒体別表示 ✅
- 顧客詳細: カルテテンプレート自動挿入・編集 ✅
- Turbopackビルドエラー修正: TSX内でのPUT<{...message?:string}>を `as` 型アサーションに変更

## Phase 4 追加実装 その2（2026-06-27）
- [x] POST /api/import/customers — 顧客CSV一括登録（名前+電話重複スキップ、集客媒体名で照合）
- [x] POST /api/import/visits — 来院CSV一括登録（visited_at指定可、顧客名照合、sales+visitsトランザクション）
- [x] 設定ページ「データインポート」セクション（顧客/来院タブ、プレビュー、結果表示）

## デモデータ（2026-06-28投入済み）
- 顧客25名（渡辺俊夫・木村義雄・川口幸恵ほか）
- 来院270件（2025-07〜2026-06、週1〜月1回のさまざまなパターン）
- 集客媒体: ホームページ・チラシ・紹介・その他
- 主訴: 脊柱管狭窄症・腰痛・坐骨神経痛・肩こり・頸椎ヘルニアなど

## バグ修正（2026-06-28）
- CSVインポートした売上が全件「今日」になっていた → getTodayStats/getMonthStats/getDailyBreakdown/getMonthReport/getDayRecords のクエリを `COALESCE(v.visited_at, s.created_at)` に変更して来院日基準にした（commit c041735）

## 分析ページ改修（2026-06-29）
- 指標/顧客の2タブ廃止 → 1スクロールページに統合（commit d8d3a44）
- 月別来院数推移グラフ（過去12ヶ月棒グラフ）追加
- セクション見出し追加・月ナビ最上部に移動・視認性改善（commit ab14fd3）
- LTV = 直近12ヶ月の総売上 ÷ 直近12ヶ月に来院した全顧客数（水増しなし）
- 2回目来院率をサマリーカードとして独立表示

## UX改善（2026-06-29 commit 05c0818）
- 今日の記録に顧客名を表示（getMonthReport/getDayRecordsでcustomer_nameを返す）
- クイック入力に「顧客記録なし」注記と顧客タブへの誘導を追加
- 来院登録モーダル: 種別手入力欄削除・カルテをデフォルト折りたたみ
- 分析: 月途中は稼働率・継続率を赤表示しない

## 分析ページ・ダッシュボード改善（2026-07-01 commit 657851f）
- 分析ページ: 各指標に対象期間・計算方法の説明テキストを追加
  - 来院数「YYYY年MM月の合計（N日稼働）」
  - 稼働率「MM月 · 1日N枠基準」
  - 継続率「前月来院者が今月も来た割合」
  - LTV「過去12ヶ月の総売上 ÷ 来院顧客数」
  - 2回目来院率「初回来院後に2回目来院した割合（全期間）」
  - リピート率「全期間コホート分析」説明を追加
- 分析ページ: セクション間余白を増やし視認性改善
- ホーム・クイック入力: 支払確認シートに患者選択欄を追加
  - 名前で既存患者を検索してリンク
  - 新規患者をその場で登録可能（名前のみ）
  - 顧客あり→/api/visits、顧客なし→/api/addSale

## バグ修正（2026-07-01）
- Vercelビルド失敗の原因: `<SL>集客の効率（{advMonth}月）</SL>` でchildren型エラー → テンプレートリテラルに修正
- dashboard/page.tsx で `React.ChangeEvent<HTMLInputElement>` 使用時にReactインポート追加
- 上記2件のTSエラーにより `657851f` 以降のVercelビルドが全て失敗していた（`4e6e725`コンパクト版が表示され続けていた）

## 分析ページ改善（2026-07-01 commit 854c8fe）
- デフォルト表示月を今月（0件・月途中）→ 前月（最新の完結データがある月）に変更

## 残タスク
- 広告費の月次入力UIをフロントに追加（index.jsのAPIは完成）
- 既存顧客への集客媒体登録（現状は新規顧客追加時のみ設定可）

## 次のフェーズ（Phase 5以降）
- Phase 5: Stripe連携
- 詳細は SPEC.md 参照
