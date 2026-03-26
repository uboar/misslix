# MissLIX

Misskey 向けのマルチアカウント・マルチカラム Web クライアントです。

## 主な機能

- **マルチアカウント** — 複数の Misskey サーバーのアカウントを同時に管理・投稿
- **マルチカラム** — タイムライン、通知などを自由にカラム配置
- **MFM レンダリング** — mfm-js による Misskey Flavored Markdown の表示
- **絵文字** — Twemoji によるカスタム絵文字・Unicode 絵文字の描画
- **リアクション** — リアクションの追加/削除、リアクションデッキ
- **メディア添付** — ファイルアップロード付きの投稿
- **CW (Content Warning)** — 閲覧注意の折りたたみ
- **ミュート** — ユーザー・キーワード単位のミュート
- **PWA** — インストール可能なプログレッシブ Web アプリ
- **レスポンシブ** — デスクトップ / モバイル対応

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Svelte 5 |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS 4 + daisyUI 5 |
| ビルド | Vite 8 |
| テスト | Vitest + Testing Library |
| デプロイ | Cloudflare Workers (静的アセット) |
| Misskey API | misskey-js |
| MFM パーサー | mfm-js |
| 絵文字 | @discordapp/twemoji |
| アイコン | Lucide |

## セットアップ

```bash
# 依存パッケージのインストール
pnpm install

# 開発サーバー起動 (http://localhost:5173)
pnpm dev

# 型チェック
pnpm check

# テスト実行
pnpm test

# ビルド
pnpm build

# Cloudflare Workers へデプロイ
pnpm deploy
```

## プロジェクト構成

```
src/
├── App.svelte              # ルートコンポーネント
├── lib/
│   ├── api/                # API クライアント・ストリーミング
│   ├── emoji/              # 絵文字キャッシュ・レンダラー
│   ├── mfm/                # MFM パーサー・レンダラー
│   ├── stores/             # Svelte ストア (アカウント, タイムライン, 設定等)
│   ├── types.ts            # 型定義
│   └── utils/              # ユーティリティ (日付, エラー, ミュート等)
└── components/
    ├── column/             # カラム管理 UI
    ├── common/             # 共通コンポーネント (Modal, Avatar等)
    ├── composer/           # 投稿 UI (PostModal, InlineComposer)
    ├── layout/             # レイアウト (Navbar, ColumnContainer)
    ├── notification/       # 通知パネル
    ├── reaction/           # リアクション UI
    ├── settings/           # 設定画面
    ├── timeline/           # タイムライン表示 (NoteCard, NoteList等)
    └── user/               # ユーザー詳細
```
