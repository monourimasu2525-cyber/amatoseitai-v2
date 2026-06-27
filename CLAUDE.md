# amatoseitai-v2

あまと整体院の売上管理Webアプリ。現在LP一体型SaaSへ移行中。

## 必読

**セッション開始時は必ず `SPEC.md` を読むこと。** 全機能・API・DB・移行計画・フェーズが記載されている。

## 構成

- `index.html` — フロントエンド（移行後廃止予定）
- `index.js` — Express APIサーバー（Railway上で動作・Phase 1は変更なし）
- `apps/web/` — Next.js フロント（Vercelデプロイ・移行先）
- DB: Railway PostgreSQL（`DATABASE_URL`環境変数）

## デプロイ

```
git push だけで両方自動デプロイされる
- index.html → GitHub Pages（1〜2分）
- index.js   → Railway（自動）
```

git push はClaudeが行う。

## コード方針

- **シンプル優先**。読みやすさ・わかりやすさを最大化する
- 余計な抽象化・ヘルパー関数・共通化はしない
- コメントは最小限（WHYが非自明なときだけ）
- 既存の動いている部分は壊さない。変更は最小限に

## Claudeの動き方

- 小さい変更（バグ修正・UI調整）→ 判断して進めてOK
- 大きい変更（構造変更・機能追加）→ 先に方針を確認してから実装
- ファイルは頼まれたもの以外増やさない
