# Wordle Solver · NestJS + SQLite

[![Node >= 18.17](https://img.shields.io/badge/node-%3E%3D18.17-339933?logo=node.js&logoColor=white)](./package.json)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeORM](https://img.shields.io/badge/ORM-TypeORM-262627?logo=typeorm)](https://typeorm.io/)
[![SQLite](https://img.shields.io/badge/DB-SQLite-044a64?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Wordle の解答支援 Web
API + 簡易フロント。5 文字の推測と各文字の HIT/BITE/ABSENT を入力すると、情報量（エントロピー）最大の次手を 1 語提案します。

## 特徴

- NestJS + TypeORM + SQLite（ローカル `data/words.db`）
- 初回アクセス時に `dwyl/english-words` から英単語辞書を取得・5 文字のみ保存
- 1 文字ごとのインデックス（`first`〜`fifth`）でクイックフィルタ
- 大量候補時のヒューリスティック高速化、少数時はパターン分布からエントロピー計算
- CORS 有効、`public/` をルートに静的配信
- ESLint + Prettier、Node 18+ 対応

## クイックスタート

前提: Node.js >= 18.17, npm

```sh
npm install
npm run start:dev
```

ブラウザで http://localhost:3000 を開くか、API を直接叩けます。初回は辞書ダウンロード後に SQLite に保存されます（数秒〜）。

任意: 事前に辞書をロードするには下記を 1 回叩きます。

```sh
curl -s http://localhost:3000/words/load
```

環境変数:

- `PORT`（任意）: デフォルト `3000`

データ保存先:

- `data/words.db`（自動作成）

## API

ベース URL: `http://localhost:3000`

### POST /solve

指定した履歴に整合する候補から、次の 1 語を提案します。

リクエスト（例）:

```json
{
  "guesses": [
    {
      "word": "crane",
      "results": [
        { "letter": "c", "result": "ABSENT" },
        { "letter": "r", "result": "BITE" },
        { "letter": "a", "result": "HIT" },
        { "letter": "n", "result": "ABSENT" },
        { "letter": "e", "result": "ABSENT" }
      ]
    }
  ]
}
```

レスポンス（例）:

```json
{ "word": "ratio", "entropy": 3.71 }
```

候補が尽きた場合:

```json
{ "message": "No candidates left" }
```

備考:

- `word` は 5 文字小文字。`results` は 5 要素で、各 `letter` は 1 文字、`result` は
  `HIT|BITE|ABSENT`。
- 内部では与えられた履歴に一致する候補集合を DB + 厳密照合で生成し、パターン分布のエントロピーを最大化する語を返します（候補 >
  3000 の場合はヒューリスティックに短絡）。

### GET /words/count

登録済み 5 文字単語の総数を返します（初回はロードが走ります）。

レスポンス例:

```json
{ "count": 10657 }
```

### GET /words/load

辞書の遅延ロードを明示的に実行し、ロード状態と件数を返します。

レスポンス例:

```json
{ "loaded": true, "count": 10657 }
```

## 技術スタック / 構成

- NestJS 10, TypeORM 0.3, SQLite3
- `ServeStaticModule` で `public/index.html` を配信
- `TypeOrmModule` は `data/words.db` を使用（自動マイグレーション相当: `synchronize: true`）
- 主要モジュール
  - `WordsModule`: 辞書取得・保存・検索
  - `SolverModule`: パターン評価・候補列挙・エントロピー計算

プロジェクト構成（抜粋）:

```
src/
  main.ts
  modules/
    app.module.ts
    words/
      words.controller.ts  # /words/*
      words.service.ts
      word.entity.ts       # word, first..fifth にインデックス
    solver/
      solver.controller.ts # POST /solve
      solver.service.ts
public/
  index.html
data/
  words.db                # 自動生成
```

## 開発

スクリプト:

- `npm run start:dev` 開発サーバ（ホットリロード）
- `npm run build` ビルド
- `npm run lint` ESLint 実行
- `npm run format` Prettier で整形

TypeScript, ESLint, Prettier の設定はリポジトリに含まれます。Node は 18.17 以上を使用してください。

## 既知の制限 / 今後の拡張

- 初手から「全語を許す探索（解候補外も試行語にする）」は今後拡張で対応可能
- 辞書は `dwyl/english-words` ベースのため、Wordle 本家とは語彙が異なる場合があります
- 文字重複ケースの扱いは Wordle 仕様に準拠するよう配慮していますが、境界条件は要検証

## 謝辞

- 英単語データ: [dwyl/english-words](https://github.com/dwyl/english-words)

## ライセンス

MIT
