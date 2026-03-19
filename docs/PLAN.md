# MissLIX 実装計画

## フェーズ概要

```
Phase 0: プロジェクト初期化           ← ビルド環境
Phase 1: コアインフラ                 ← 最小限の型・ストア・API基盤
Phase 2: 認証・アカウント管理          ← ログイン・アカウント操作
Phase 3: マルチカラムレイアウト        ← カラム表示・操作
Phase 4: タイムライン・ノート・MFM     ← ノート取得・表示・MFM・絵文字・ストリーミング
Phase 5: 投稿・リアクション           ← ユーザーアクション
Phase 6: 通知・設定・仕上げ           ← 残機能・ポリッシュ
```

---

## Phase 0: プロジェクト初期化

**目標**: ビルド・開発環境の構築

### タスク
- [ ] Svelte 5 + Vite 6 + TypeScript プロジェクト作成 (`npx sv create`)
- [ ] Tailwind CSS 4 + DaisyUI 5 導入
- [ ] tsconfig.json 設定 (strict mode, path aliases)
- [ ] vite.config.ts 設定 (HTTPS開発サーバー, base path設定可能)
- [ ] ディレクトリ構造作成
- [ ] index.html (lang="ja", viewport設定)
- [ ] app.css (Tailwind directives, スクロールバースタイル)
- [ ] 空のApp.svelte + main.ts

### 成果物
- `pnpm run dev` で空のSvelteアプリが起動
- `pnpm run build` で静的ファイル生成

---

## Phase 1: コアインフラ

**目標**: Phase 2-3で必要な最小限の型・ストア・ユーティリティを用意

### 設計方針
型とストアは **使う直前に定義** する。Phase 1では認証・カラム管理に必要な部分のみ実装し、ノート表示やMFM関連の型はPhase 4で追加する。

### タスク
- [ ] `lib/types.ts` — Phase 2-3で必要な型のみ
  - Account, ColumnConfig, SettingsType
  - ColumnWidth, ChannelType, Visibility 等のユニオン型
- [ ] `lib/stores/settings.svelte.ts` — アプリ設定ストア
  - テーマ設定、localStorage永続化 (save/restore)
- [ ] `lib/stores/accounts.svelte.ts` — アカウントストア
  - Account[] 管理、追加/削除/復元、localStorage永続化
  - ※ AccountRuntime (stream, cli) はPhase 2で認証実装時に追加
- [ ] `lib/stores/timelines.svelte.ts` — タイムラインストア
  - ColumnConfig[] 管理、追加/削除/並替、localStorage永続化
- [ ] `lib/api/client.ts` — APIClient生成ヘルパー（基本構造のみ）
- [ ] `lib/api/endpoints.ts` — APIエンドポイント定義マップ
- [ ] `lib/utils/storage.ts` — localStorage読書き

### 依存パッケージ
```
misskey-js dayjs
```

### 成果物
- 認証・カラム管理に必要な型が定義済み
- ストアがlocalStorageと同期
- APIクライアント生成可能

---

## Phase 2: 認証・アカウント管理

**目標**: ログイン・アカウント追加/削除が動作

### タスク
- [ ] `components/common/Modal.svelte` — 汎用モーダル
- [ ] `components/settings/SettingsModal.svelte` — 設定モーダル (タブUI)
- [ ] `components/settings/AuthSettings.svelte` — 認証UI
  - MiAuth認証フロー (リダイレクト→コールバック→トークン取得)
  - 直接トークン入力フォーム
  - アカウント一覧・削除
- [ ] `lib/api/client.ts` に認証完了後のStream/APIClient初期化を実装
- [ ] `lib/types.ts` に AccountRuntime 追加
- [ ] `App.svelte` に起動時アカウント復元処理を実装

### 成果物
- MiAuth/直接トークンでアカウント追加可能
- アプリ再起動後もアカウント維持
- 各アカウントのStream/APIClientが接続済み

---

## Phase 3: マルチカラムレイアウト

**目標**: カラムの追加・表示・横スクロールが動作

### タスク
- [ ] `components/layout/Navbar.svelte` — 上部バー (投稿/カラム追加/設定ボタン)
- [ ] `components/layout/ColumnContainer.svelte` — カラム横並びコンテナ
  - flex-row + overflow-x-auto レイアウト
- [ ] `components/column/Column.svelte` — カラム本体
  - 固定幅、縦スクロール、折り畳み/展開
- [ ] `components/column/ColumnHeader.svelte` — タイムライン名・カラーバー・操作ボタン
- [ ] `components/column/ColumnFooter.svelte` — ボタンスロット（中身は後のPhaseで接続）
- [ ] カラム追加モーダル
  - アカウント選択 → チャンネル種別選択 → チャンネル/アンテナ/リスト/ロール選択
  - 動的にAPIで選択肢取得

### 成果物
- カラムを追加・削除・横スクロール可能
- カラム設定変更がlocalStorageに永続化
- 折り畳み/展開動作
- ※ カラム内はプレースホルダー表示（ノートはPhase 4で実装）

---

## Phase 4: タイムライン・ノート表示・MFM・絵文字

**目標**: ノートの取得・MFM表示・リアルタイム更新が一通り動作

### 設計方針
ノート表示とMFMレンダリングは不可分。MFMがないとノート表示をテストできないため、同一Phaseで実装する。ストリーミングもここで統合し、タイムラインとしての体験を完成させる。

### タスク

#### 型・ユーティリティ追加
- [ ] `lib/types.ts` に NoteWrapper, PostNote 等のノート関連型を追加
- [ ] `lib/utils/date.ts` — dayjs日付フォーマット
- [ ] `lib/utils/mute.ts` — ミュート判定 (ユーザー/ワード)

#### MFM・絵文字レンダリング
- [ ] `lib/mfm/MfmRenderer.svelte` — MFMレンダラー (Svelteコンポーネント)
  - mfm-jsでパース → Svelteで描画
  - 対応: center, bold, italic, strike, small, code, codeBlock, quote,
    mention, hashtag, url, link, emojiCode, unicodeEmoji, search, fn
- [ ] `lib/mfm/parser.ts` — パース補助ユーティリティ
- [ ] `lib/emoji/EmojiRenderer.svelte` — 絵文字表示コンポーネント
  - カスタム絵文字: img要素、サーバー固有URL
  - Unicode絵文字: twemojiで変換
- [ ] `lib/emoji/cache.ts` — Cache APIでサーバー絵文字取得・保存

#### ノート表示
- [ ] `components/timeline/NoteList.svelte` — ノートリスト
  - 初期ノート取得 (REST API)
  - 無限スクロール (untilIdページネーション)
  - バーチャルスクロール対応
- [ ] `components/timeline/NoteCard.svelte` — ノートカード
  - ミュート判定・折り畳み
  - Renote/リプライの再帰表示
- [ ] `components/timeline/NoteBody.svelte` — ノート本文
  - CW表示/非表示トグル
  - 可視性アイコン
- [ ] `components/timeline/NoteUser.svelte` — ユーザー表示
  - アバター、ユーザー名(MFM)
- [ ] `components/timeline/NoteMedia.svelte` — メディア
  - 画像カルーセル、動画、音声、ファイル
  - NSFWぼかし
- [ ] `components/timeline/NoteReactions.svelte` — リアクション表示
  - 絵文字バッジ + カウント
- [ ] `components/common/Avatar.svelte` — アバター表示
- [ ] `components/common/LoadingSpinner.svelte` — ローディング

#### ストリーミング
- [ ] `lib/api/streaming.ts` — WebSocketストリーミング管理
  - チャンネル接続 → `note` イベントでリアルタイム追加
  - `subNote` / `noteUpdated` でリアクション・削除同期

### 依存パッケージ追加
```
mfm-js @discordapp/twemoji
```

### 成果物
- 全8種のタイムラインでノート表示（MFM/絵文字付き）
- WebSocketでリアルタイム更新
- 無限スクロールで過去ノート読み込み

---

## Phase 5: 投稿・リアクション

**目標**: ノート投稿とリアクション操作が動作

### タスク
- [ ] `components/composer/PostModal.svelte` — 投稿モーダル
  - マルチアカウント選択 (複数選択 → 同時投稿)
  - テキスト、CW、公開範囲、ローカル限定
  - プレビュー (MfmRenderer利用)
  - 絵文字ピッカー
- [ ] `components/composer/InlineComposer.svelte` — インライン投稿
  - リプライ/Renote対応
  - CW、公開範囲
- [ ] `components/reaction/ReactionButton.svelte` — リアクションボタン
  - クリックで追加/削除 (API呼出)
- [ ] `components/reaction/ReactionDeck.svelte` — リアクション選択UI
  - カラム設定のリアクションデッキ表示
  - 絵文字検索・サジェスト

### 成果物
- モーダル/インラインでノート投稿可能
- リアクション追加/削除が動作
- リアクションデッキから選択可能

---

## Phase 6: 通知・設定・仕上げ

**目標**: 残り機能の実装とポリッシュ

### タスク
- [ ] `components/notification/NotificationPanel.svelte` — 通知パネル
  - フォロー、メンション、リプライ、Renote、リアクション表示
  - 未読インジケータ
- [ ] `components/column/ColumnSettings.svelte` — カラム個別設定パネル
  - 幅、色、表示件数、ノート表示オプション、リアクションデッキ
- [ ] `components/settings/GeneralSettings.svelte` — 一般設定
  - テーマ選択、絵文字スペース、バーチャルスクロール、自動取得
- [ ] `components/settings/MuteSettings.svelte` — ミュート設定
  - ユーザーミュート (user@host) 追加/削除
  - 正規表現ワードミュート 追加/削除
- [ ] `components/settings/AccountSettings.svelte` — アカウント設定
  - 絵文字キャッシュ管理
- [ ] クイックリンクパネル — Misskeyインスタンスへのリンク集
- [ ] レート制限対応 (Misskey.io検出 + クールダウン)
- [ ] エラーハンドリング全般
- [ ] ビルド最適化・デプロイ設定

### 成果物
- 全機能が動作する完成版
- 静的ビルド → デプロイ可能

---

## 依存関係グラフ

```
Phase 0 ──→ Phase 1 ──┬──→ Phase 2 ──┐
                       │               │
                       └──→ Phase 3 ──┤
                                       │
                                       ▼
                                   Phase 4 ──→ Phase 5 ──→ Phase 6
```

- Phase 0→1: 基盤→インフラは直列
- Phase 2, 3: Phase 1完了後は並行可能
- Phase 4: Phase 2のAPI接続 + Phase 3のカラムUIが必要。MFM・絵文字・ストリーミングも含む
- Phase 5: Phase 4のノート表示・MFMが必要
- Phase 6: Phase 5以降
