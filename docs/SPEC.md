# MissLIX 仕様書

## 1. プロダクト概要

**MissLIX** は、分散型SNS「Misskey」向けのマルチアカウント・マルチカラム SPAクライアントWebアプリケーションである。

### コンセプト
- **静的ページで完結**: サーバーサイド不要。GitHub Pages等の静的ホスティングで動作
- **軽量・高速**: Svelte 5 の runes による最適なリアクティビティ
- **マルチアカウント・マルチカラム**: 1画面上で複数アカウント・複数タイムラインを並列表示

---

## 2. 技術スタック

| カテゴリ | 技術 | バージョン | 選定理由 |
|---|---|---|---|
| フレームワーク | Svelte 5 | latest | runes による軽量リアクティビティ |
| ビルドツール | Vite | 6.x | 高速HMR、静的ビルド |
| CSS | Tailwind CSS 4 | latest | ユーティリティファースト |
| UIテーマ | DaisyUI 5 | latest | テーマ切替、コンポーネント基盤 |
| 言語 | TypeScript | 5.x | strict mode |
| Misskey API | misskey-js | latest | 公式API・型・ストリーミング |
| MFM | mfm-js | latest | MFM構文解析 |
| 絵文字 | @discordapp/twemoji | latest | Unicode絵文字レンダリング |
| 日付 | dayjs | latest | 軽量日付処理 |
| デプロイ | 静的ビルド | - | `vite build` → dist/ |

---

## 3. アーキテクチャ

### 3.1 ディレクトリ構成

```
misslix/
├── index.html
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
├── package.json
├── src/
│   ├── main.ts                    # エントリポイント
│   ├── App.svelte                 # ルートコンポーネント
│   ├── app.css                    # グローバルCSS + Tailwind
│   ├── lib/
│   │   ├── types.ts               # 全型定義
│   │   ├── stores/
│   │   │   ├── accounts.svelte.ts # アカウント状態管理
│   │   │   ├── timelines.svelte.ts# タイムライン状態管理
│   │   │   └── settings.svelte.ts # 設定状態管理
│   │   ├── api/
│   │   │   ├── client.ts          # Misskey APIクライアント管理
│   │   │   ├── streaming.ts       # WebSocketストリーミング管理
│   │   │   └── endpoints.ts       # APIエンドポイント定義
│   │   ├── mfm/
│   │   │   ├── MfmRenderer.svelte # MFMレンダラー
│   │   │   └── parser.ts          # MFMパース補助
│   │   ├── emoji/
│   │   │   ├── EmojiRenderer.svelte # 絵文字表示
│   │   │   └── cache.ts           # 絵文字キャッシュ (Cache API)
│   │   └── utils/
│   │       ├── storage.ts         # localStorage永続化
│   │       ├── date.ts            # dayjs日付フォーマット
│   │       └── mute.ts            # ミュート判定ロジック
│   └── components/
│       ├── layout/
│       │   ├── Navbar.svelte      # 上部ナビゲーション
│       │   └── ColumnContainer.svelte # カラム横並びコンテナ
│       ├── column/
│       │   ├── Column.svelte      # カラム本体
│       │   ├── ColumnHeader.svelte# カラムヘッダー
│       │   ├── ColumnFooter.svelte# カラムフッター
│       │   └── ColumnSettings.svelte # カラム個別設定
│       ├── timeline/
│       │   ├── NoteList.svelte    # ノートリスト（スクロール管理）
│       │   ├── NoteCard.svelte    # 個別ノート表示
│       │   ├── NoteBody.svelte    # ノート本文
│       │   ├── NoteMedia.svelte   # メディア表示
│       │   ├── NoteReactions.svelte # リアクション表示
│       │   └── NoteUser.svelte    # ユーザー情報
│       ├── composer/
│       │   ├── PostModal.svelte   # 投稿モーダル
│       │   └── InlineComposer.svelte # インライン投稿
│       ├── notification/
│       │   └── NotificationPanel.svelte # 通知パネル
│       ├── reaction/
│       │   ├── ReactionButton.svelte # リアクションボタン
│       │   └── ReactionDeck.svelte   # リアクション選択UI
│       ├── settings/
│       │   ├── SettingsModal.svelte  # 設定モーダル
│       │   ├── AuthSettings.svelte   # 認証設定
│       │   ├── GeneralSettings.svelte# 一般設定
│       │   ├── MuteSettings.svelte   # ミュート設定
│       │   └── AccountSettings.svelte# アカウント設定
│       └── common/
│           ├── Modal.svelte       # 汎用モーダル
│           ├── Avatar.svelte      # アバター表示
│           └── LoadingSpinner.svelte # ローディング
└── docs/
    ├── SPEC.md                    # 本仕様書
    └── PLAN.md                    # 実装計画
```

### 3.2 状態管理（Svelte 5 Runes）

クラスベースのストアで `$state` / `$derived` を活用する。

```typescript
// accounts.svelte.ts
class AccountStore {
  accounts = $state<Account[]>([]);

  get activeAccounts() {
    return $derived(this.accounts.filter(a => a.ok));
  }

  addAccount(account: Account) { ... }
  removeAccount(id: number) { ... }
  restore() { ... }  // localStorageから復元
  persist() { ... }   // localStorageに保存
}

export const accountStore = new AccountStore();
```

### 3.3 データ永続化

| データ | 保存先 | 理由 |
|---|---|---|
| 認証トークン | localStorage | シンプル、静的ホスティング互換 |
| タイムライン設定 | localStorage | 少量の構造化データ |
| アプリ設定 | localStorage | 少量の構造化データ |
| カスタム絵文字 | Cache API | サーバーごとに大量、オフライン対応 |

### 3.4 データフロー

```
[起動]
  │
  ├─ localStorage → アカウント復元 → Stream/APIClient生成
  ├─ localStorage → タイムライン設定復元
  └─ localStorage → アプリ設定復元
  │
  ▼
[各タイムライン初期化]
  │
  ├─ REST API → 初期ノート取得 (N件)
  └─ WebSocket → ストリーム接続 → リアルタイム更新
  │
  ▼
[ユーザー操作]
  │
  ├─ 投稿 → REST API (notes/create) × 選択アカウント数
  ├─ リアクション → REST API (notes/reactions/create|delete)
  ├─ スクロール → REST API (過去ノート取得 untilId)
  └─ 設定変更 → localStorage 保存
```

---

## 4. 機能仕様

### 4.1 認証・アカウント管理

#### MiAuth認証フロー
1. ユーザーがホスト名を入力
2. `https://{host}/miauth/{uuid}` にリダイレクト（権限リクエスト付き）
3. 認証後コールバック → `POST /api/miauth/{uuid}/check` でトークン取得
4. アカウント情報をlocalStorageに保存

#### 直接トークン認証
- ホスト名、ユーザーID、アクセストークンを手動入力
- MiAuth非対応サーバー向け

#### アカウントデータ構造
```typescript
type Account = {
  id: number;              // 一意ID（タイムスタンプ）
  userName: string;
  hostUrl: string;
  token: string;
  sessionId?: string;
  ok: boolean;
  themeColor?: string;     // インスタンスカラー
};
```

#### ランタイムアカウント状態
```typescript
type AccountRuntime = {
  stream: Stream;
  cli: APIClient;
  mainConnection: Connection;
  notifications: Notification[];
  hasUnread: boolean;
  emojis: Emoji[];
  busy: boolean;           // レート制限中
};
```

### 4.2 マルチカラム

#### カラム（タイムライン）種別

| 種別 | チャンネル名 | API | パラメータ |
|---|---|---|---|
| ホーム | homeTimeline | notes/timeline | - |
| ローカル | localTimeline | notes/local-timeline | - |
| ソーシャル | hybridTimeline | notes/hybrid-timeline | - |
| グローバル | globalTimeline | notes/global-timeline | - |
| チャンネル | channel | channels/timeline | channelId |
| アンテナ | antenna | antennas/notes | antennaId |
| リスト | userList | notes/user-list-timeline | listId |
| ロール | roleTimeline | roles/notes | roleId |

#### カラム設定
```typescript
type ColumnConfig = {
  id: number;
  accountId: number;       // 紐づくアカウント
  channel: ChannelType;
  channelId?: string;
  channelName: string;
  color: string;           // アクセントカラー
  width: ColumnWidth;      // "sm"|"md"|"lg"|"xl"|"full"
  maxNotes: number;        // 表示上限 (default: 100)
  bufferSize: number;      // バッファ上限 (default: 250)
  collapsed: boolean;
  autoCollapse: boolean;
  lowRate: boolean;        // Misskey.ioレート制限
  reactionDeck: string[];
  noteDisplay: {
    mediaHidden: boolean;
    mediaSize: number;
    reactionsHidden: boolean;
    reactionSize: number;
    cwExpanded: boolean;
    nsfwShown: boolean;
    collapseEnabled: boolean;
    collapseHeight: number;
  };
};

type ColumnWidth = "sm" | "md" | "lg" | "xl" | "full";
// sm=12rem, md=24rem, lg=36rem, xl=48rem, full=100vw
```

#### レイアウト
- 外側: `flex flex-col overflow-x-auto` (横スクロール)
- 内側: `flex flex-row w-fit` (カラム横並び)
- 各カラム: 固定幅、縦スクロール独立

### 4.3 ノート表示

#### ノート構造
```typescript
type NoteWrapper = Note & {
  renote?: NoteWrapper;
  reply?: NoteWrapper;
  reactionEmojis?: Record<string, string>;
};
```

#### 表示要素
- ユーザーアバター・名前（MFM対応）
- 可視性アイコン (public/home/followers/specified)
- CW (Content Warning) トグル
- 本文 (MFM)
- メディア（画像カルーセル、動画、音声、ファイル。NSFW対応）
- リアクションバッジ（カウント付き、クリックで追加/削除）
- Renote/引用/リプライ表示
- ミュートノートの折り畳み表示

#### MFM対応構文
center, bold, italic, strike, small, code, codeBlock, quote, mention, hashtag, url, link, emojiCode, unicodeEmoji, search, fn

### 4.4 投稿

- **マルチアカウント同時投稿**: 選択した複数アカウントで `Promise.allSettled`
- **モーダル投稿**: Navbarから起動
- **インライン投稿**: カラム内コンポーザー（リプライ・Renote対応）
- **機能**: テキスト、CW、公開範囲(public/home/followers)、ローカル限定、プレビュー、絵文字挿入

### 4.5 通知

- アカウントごとにWebSocket `main` チャンネルで受信
- 種別: follow, mention, reply, renote, reaction, quote, pollEnded等
- バッファサイズ設定可能（デフォルト100件）
- 未読インジケータ（カラムフッターに表示）

### 4.6 リアクション

- `notes/reactions/create` / `notes/reactions/delete` で追加・削除
- カラムごとのリアクションデッキ（クイック選択）
- 絵文字検索・サジェストUI
- WebSocket `subNote` / `noteUpdated` でリアルタイム同期

### 4.7 設定

| カテゴリ | 項目 |
|---|---|
| テーマ | DaisyUIテーマ選択 |
| 絵文字 | 前後スペース挿入 |
| パフォーマンス | バーチャルスクロール、自動ノート読み込み |
| ミュート | ユーザーミュート (user@host)、正規表現ワードミュート |
| 通知 | バッファサイズ、ミュート情報表示 |

### 4.8 その他

- **クイックリンク**: Misskeyインスタンスの各ページへのリンク集
- **レート制限**: Misskey.io向け投稿クールダウン
- **エラーハンドリング**: API失敗時のリトライ・通知

---

## 5. 画面構成

```
┌──────────────────────────────────────────────────────┐
│ [Navbar]  MissLIX  │  投稿  │  カラム追加  │  設定   │
├──────────┬──────────┬──────────┬──────────┬───────────┤
│ [Header] │ [Header] │ [Header] │ [Header] │           │
│ TL名     │ TL名     │ TL名     │ TL名     │           │
│──────────│──────────│──────────│──────────│  横       │
│          │          │          │          │  ス       │
│  Notes   │  Notes   │  Notes   │  Notes   │  ク       │
│  (scroll)│  (scroll)│  (scroll)│  (scroll)│  ロ       │
│          │          │          │          │  ｜       │
│          │          │          │          │  ル       │
│──────────│──────────│──────────│──────────│           │
│ [Footer] │ [Footer] │ [Footer] │ [Footer] │           │
│ 通知|投稿│ 通知|投稿│ 通知|投稿│ 通知|投稿│           │
└──────────┴──────────┴──────────┴──────────┴───────────┘
```
