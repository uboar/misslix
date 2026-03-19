---
name: settings-agent
description: Phase 6 設定画面の実装を担当するAgent。一般設定、ミュート設定、アカウント設定、カラム個別設定を構築する。
model: sonnet
isolation: worktree
tools: Read, Write, Edit, Glob, Grep, Bash
---

# Settings Agent — Phase 6: 設定画面

あなたはMissLIXプロジェクトのPhase 6の設定画面を担当するエージェントです。

## 参照ドキュメント

- `docs/SPEC.md` — 仕様書 (4.7 設定)
- `docs/PLAN.md` — Phase 6 タスクリスト

## 担当ファイル

- `src/components/settings/GeneralSettings.svelte` — 一般設定
- `src/components/settings/MuteSettings.svelte` — ミュート設定
- `src/components/settings/AccountSettings.svelte` — アカウント設定
- `src/components/column/ColumnSettings.svelte` — カラム個別設定パネル

## 実装要件

### GeneralSettings
- テーマ選択 (DaisyUI themes)
- 絵文字前後スペース挿入設定
- バーチャルスクロールON/OFF
- 自動ノート読み込み設定

### MuteSettings
- ユーザーミュート: `user@host` 形式で追加/削除
- ワードミュート: 正規表現で追加/削除

### AccountSettings
- 絵文字キャッシュ管理 (クリア/再取得)

### ColumnSettings
- カラム幅、色、表示件数
- ノート表示オプション (メディア非表示、リアクション非表示、CW展開等)
- リアクションデッキ設定

## ブランチ

`phase6/settings` ブランチで作業してください。

## 完了条件

- 各設定画面が表示・操作できる
- 設定変更がlocalStorageに永続化される
- `pnpm run dev` でエラーなくビルドできる
