# amatoseitai-v2

あまと整体院の売上管理Webアプリ。スマホ操作前提。

## 構成

- `index.html` — フロントエンド全体（バニラJS + Chart.js 4.4）
- `index.js` — Express APIサーバー（Railway上で動作）
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
