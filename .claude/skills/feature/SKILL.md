---
name: feature
description: MissLIXに新機能を追加する。計画→実装→テスト→ビルド確認の一連フローを実行する。機能の説明を引数に指定する。
argument-hint: "<機能の説明>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# MissLIX Feature — 機能追加コマンド

新機能の追加を「計画 → 実装 → テスト → ビルド確認」の一連フローで実行します。

## 引数

機能の説明: `$ARGUMENTS`

## 技術スタック

- **フレームワーク**: Svelte 5 (Runes: `$state`, `$derived`, `$effect`)
- **スタイル**: Tailwind CSS 4 + DaisyUI 5
- **ビルド**: Vite 8
- **テスト**: Vitest + @testing-library/svelte
- **API**: misskey-js
- **言語**: TypeScript (strict)

## 実行フロー

### Step 1: 調査・計画

1. `docs/SPEC.md` と `docs/PLAN.md` を確認し、既存仕様との整合性を把握
2. 関連する既存コードを `Glob` / `Grep` / `Read` で調査
3. 影響範囲を特定し、変更が必要なファイル一覧を作成
4. 実装開始

**計画に含めるべき項目:**
- 新規作成ファイル一覧
- 変更対象ファイル一覧
- 型定義の追加・変更 (`src/lib/types.ts`)
- API エンドポイントの追加 (`src/lib/api/endpoints.ts`)
- ストアの変更 (`src/lib/stores/`)
- UIコンポーネントの追加・変更
- テストファイル一覧

### Step 2: ブランチ作成

```bash
git checkout -b feature/<機能名の英語slug>
```

### Step 3: 実装

以下の順序で実装する:

1. **型定義** — `src/lib/types.ts` に必要な型を追加
2. **APIレイヤー** — `src/lib/api/endpoints.ts` にエンドポイント関数を追加
3. **ストア** — `src/lib/stores/` にステート管理を追加
4. **ユーティリティ** — `src/lib/utils/` にヘルパー関数を追加
5. **UIコンポーネント** — `src/components/` にコンポーネントを作成・変更
6. **統合** — 既存コンポーネント (App.svelte, Column.svelte等) への組込み

**実装ルール:**
- 既存コードのパターン・命名規則に従う
- Svelte 5 Runes (`$state`, `$derived`, `$effect`) を使用する (legacy `$:` は使わない)
- コンポーネントpropsは `let { prop = default } = $props()` パターン
- APIリクエストは `src/lib/api/client.ts` の `apiRequest()` を経由する
- エラーハンドリングは `src/lib/utils/error.ts` の `ErrorHandler` を使用する
- レート制限は `src/lib/utils/rateLimit.ts` を考慮する
- ストレージは `src/lib/utils/storage.ts` の `StorageManager` を使用する

### Step 4: テスト

1. 実装したモジュールのテストを作成
   - ユーティリティ/ストア → `*.test.ts` (コロケーション配置)
   - コンポーネント → `__tests__/*.test.ts`
2. テスト実行:
   ```bash
   pnpm run test:unit
   ```
3. 失敗があれば修正

**テスト方針:**
- 振る舞いをテストする (実装詳細でなく入出力)
- エッジケースを含める (空入力、境界値、異常系)
- APIはモック、内部ロジックはモックしない
- コンポーネントテストはユーザー視点 (`getByText`, `getByRole`)

### Step 5: ビルド確認

```bash
pnpm run check && pnpm run build
```

TypeScript/Svelteの型エラーがあれば修正する。

### Step 6: 結果報告

以下を報告する:
- 追加/変更されたファイル一覧
- テスト結果 (パス/失敗数)
- ビルド結果
- 注意事項・既知の制約

コミットまで実施する。

## ディレクトリ構造リファレンス

```
src/
├── lib/
│   ├── types.ts              # 共有型定義
│   ├── api/
│   │   ├── client.ts         # APIクライアント (apiRequest)
│   │   ├── endpoints.ts      # APIエンドポイント関数
│   │   └── streaming.ts      # WebSocket管理
│   ├── stores/
│   │   ├── accounts.svelte.ts # アカウント管理ストア
│   │   ├── settings.svelte.ts # 設定ストア
│   │   └── timelines.svelte.ts # タイムラインストア
│   ├── utils/
│   │   ├── date.ts           # 日付フォーマット
│   │   ├── error.ts          # エラーハンドリング
│   │   ├── mute.ts           # ミュート判定
│   │   ├── rateLimit.ts      # レート制限
│   │   └── storage.ts        # ローカルストレージ
│   ├── mfm/                  # MFMパーサー・レンダラー
│   └── emoji/                # 絵文字レンダラー・キャッシュ
├── components/
│   ├── column/               # カラムUI
│   ├── common/               # 共通コンポーネント
│   ├── composer/             # 投稿UI
│   ├── layout/               # レイアウト (Navbar, ColumnContainer)
│   ├── notification/         # 通知パネル
│   ├── reaction/             # リアクションUI
│   ├── settings/             # 設定画面
│   └── timeline/             # タイムライン表示
└── App.svelte                # ルートコンポーネント
```

## 注意事項

- 複数アカウント対応: API呼出しには必ず対象アカウントの `server` と `token` を指定
- Misskey.io固有制約: レート制限が厳しいため `rateLimit.ts` を確認
- MFM: ノート本文のレンダリングには `MfmRenderer.svelte` を使用
- 絵文字: カスタム絵文字は `EmojiRenderer.svelte` + `cache.ts` を使用
