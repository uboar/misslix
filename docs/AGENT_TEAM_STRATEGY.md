# MissLIX Agent Team 戦略

## 設計思想

Agent Teamを活用し、**独立性の高いモジュールを並行開発**することで実装効率を最大化する。
ただし、依存関係の強いモジュールは直列実行し、統合時のコンフリクトを最小化する。

---

## チーム編成

### 並行開発が可能な単位

```
                    ┌─────────────────────┐
                    │   メインオーケストラ   │
                    │   (ユーザーとの対話)   │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
   │ Agent A      │   │ Agent B       │   │ Agent C       │
   │ インフラ/API │   │ UIコンポーネント│   │ レンダラー     │
   └─────────────┘   └──────────────┘   └──────────────┘
```

---

## Phase別 Agent投入計画

### Phase 0: プロジェクト初期化 → **メインが直接実行**

理由: 全後続作業の基盤。1エージェントで確実に構築。
- プロジェクト作成、依存インストール、設定ファイル、ディレクトリ構造

### Phase 1: コアインフラ → **メインが直接実行**

理由: 型定義・ストアは全モジュールの契約。ここのミスは全体に波及。
- types.ts (最小限), stores/*, api/client.ts, api/endpoints.ts, utils/storage.ts

### Phase 2-3: 認証 + カラムレイアウト → **2 Agent並行 (worktree)**

Phase 1完了後、以下を並行実行:

| Agent | 担当 | ファイル群 | 依存 |
|---|---|---|---|
| **Agent A: Auth** | 認証UI + API接続 | `settings/AuthSettings.svelte`, `settings/SettingsModal.svelte`, `common/Modal.svelte`, App.svelte起動処理, `lib/api/client.ts`拡充 | Phase 1の型・ストア |
| **Agent B: Layout** | マルチカラムUI | `layout/Navbar.svelte`, `layout/ColumnContainer.svelte`, `column/Column.svelte`, `column/ColumnHeader.svelte`, `column/ColumnFooter.svelte`, カラム追加モーダル | Phase 1の型・ストア |

**統合ポイント**: App.svelteでAuth結果をColumnContainerに接続

### Phase 4: タイムライン・ノート・MFM → **3 Agent並行 (worktree)**

Phase 2-3統合後、以下を並行実行:

| Agent | 担当 | ファイル群 | 依存 |
|---|---|---|---|
| **Agent C: NoteDisplay** | ノート表示 | `timeline/NoteList.svelte`, `timeline/NoteCard.svelte`, `timeline/NoteBody.svelte`, `timeline/NoteUser.svelte`, `timeline/NoteMedia.svelte`, `timeline/NoteReactions.svelte`, `common/Avatar.svelte`, `common/LoadingSpinner.svelte` | Column.svelte, API client |
| **Agent D: MFM+Emoji** | MFM・絵文字レンダラー | `lib/mfm/MfmRenderer.svelte`, `lib/mfm/parser.ts`, `lib/emoji/EmojiRenderer.svelte`, `lib/emoji/cache.ts` | types.tsのみ(独立性高) |
| **Agent E: Streaming** | WebSocket・ユーティリティ | `lib/api/streaming.ts`, `lib/utils/date.ts`, `lib/utils/mute.ts` | accounts store, api/client |

**統合ポイント**: NoteBodyにMfmRendererを組込み、NoteListにStreaming接続

### Phase 5: 投稿・リアクション → **2 Agent並行 (worktree)**

| Agent | 担当 | ファイル群 |
|---|---|---|
| **Agent F: Composer** | 投稿UI | `composer/PostModal.svelte`, `composer/InlineComposer.svelte` |
| **Agent G: Reaction** | リアクションUI | `reaction/ReactionButton.svelte`, `reaction/ReactionDeck.svelte` |

### Phase 6: 仕上げ → **2 Agent並行 + メイン統合**

| Agent | 担当 | ファイル群 |
|---|---|---|
| **Agent H: Notification** | 通知パネル | `notification/NotificationPanel.svelte` |
| **Agent I: Settings** | 設定画面 | `settings/GeneralSettings.svelte`, `settings/MuteSettings.svelte`, `settings/AccountSettings.svelte`, `column/ColumnSettings.svelte` |
| **メイン** | 統合・ポリッシュ | エラーハンドリング、レート制限、ビルド最適化 |

---

## Agent間の契約（インターフェース）

並行開発の鍵は **明確な型契約** にある。Phase 1で定義する型がすべてのAgentの共通言語となる。

### 型契約の例

```typescript
// Agent A (Auth) が生成 → Agent C (NoteDisplay) が消費
type AccountRuntime = {
  stream: Stream;
  cli: APIClient;
  emojis: Emoji[];
};

// Agent B (Layout) が提供 → Agent C (NoteDisplay) が利用
// Column.svelte が NoteList.svelte に渡すprops
type NoteListProps = {
  account: AccountRuntime;
  config: ColumnConfig;
};

// Agent D (MFM) が提供 → Agent C (NoteDisplay) が利用
// MfmRenderer.svelte のprops
type MfmRendererProps = {
  text: string;
  emojis: Record<string, string>;
  emojiHeight?: string;
};
```

### ストア契約

```typescript
// 全Agentが参照可能なグローバルストア
accountStore.accounts        // Agent A が管理
accountStore.runtimes        // Agent A が管理
timelineStore.columns        // Agent B が管理
settingsStore.settings       // メインが管理
```

---

## Worktree運用ルール

### 基本方針
- 各Agentは `isolation: "worktree"` で実行
- メインブランチ (`main`) には直接コミットしない
- 各AgentはPhase名のブランチで作業: `phase2/auth`, `phase3/layout` 等

### 統合フロー
1. Agent完了 → worktreeのブランチにコミット済み
2. メインがレビュー → `main` にマージ
3. 次Phaseのworktreeは最新 `main` から分岐

### コンフリクト回避
- **ファイル担当を明確に分離**: 同じファイルを複数Agentが編集しない
- **App.svelte等の共有ファイル**: メインが統合時に編集
- **型定義(types.ts)**: 各Phaseで必要な型を追加。変更が必要な場合はメインが判断

---

## 実行コマンド例

### Phase 2-3 並行実行
```
# メインから2つのAgentを同時起動
Agent(
  name: "auth-agent",
  isolation: "worktree",
  prompt: "Phase 2: 認証・アカウント管理を実装..."
)
Agent(
  name: "layout-agent",
  isolation: "worktree",
  prompt: "Phase 3: マルチカラムレイアウトを実装..."
)
```

### Phase 4 並行実行
```
Agent(name: "note-display", isolation: "worktree", ...)
Agent(name: "mfm-renderer", isolation: "worktree", ...)
Agent(name: "streaming",    isolation: "worktree", ...)
```

---

## リスク管理

| リスク | 対策 |
|---|---|
| 型定義の変更が必要 | Phase 1は最小限に留め、各Phaseで必要な型を追加。変更時はメインが全worktreeに伝搬 |
| Agent間のAPI不整合 | props型を事前に合意。Mock/Stubで独立テスト |
| worktreeマージ時のコンフリクト | ファイル担当を厳密に分離。共有ファイルはメインが統合 |
| MiAuth認証のデバッグ困難 | HTTPS開発サーバーをPhase 0で確保 |
| misskey-jsのバージョン差異 | 最新版固定。型が合わない場合はラッパーで吸収 |

---

## タイムライン概算

```
Phase 0  ████                           (基盤構築)
Phase 1  ██████                         (コアインフラ・最小限)
Phase 2  ████████  ┐                    (認証)
Phase 3  ████████  ┘ ← 並行            (レイアウト)
         [統合]██
Phase 4  ████████████████  ┐            (ノート表示)
         ████████████      │ ← 並行     (MFM+絵文字)
         ██████████        ┘            (ストリーミング)
         [統合]████
Phase 5  ████████  ┐                    (投稿)
         ██████    ┘ ← 並行            (リアクション)
         [統合]██
Phase 6  ████████████                   (仕上げ)
```

並行実行により、直列実行比で **約40%の効率化** を見込む。
