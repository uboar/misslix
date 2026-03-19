---
name: misslix-build
description: MissLIX実装戦略に従い、指定Phaseの実装をAgent Teamで並行実行する。Phase番号を引数に指定する。
argument-hint: "[phase-number: 0|1|2|3|4|5|6|all]"
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Agent
---

# MissLIX Build — Phase実行コマンド

指定されたPhaseの実装をAGENT_TEAM_STRATEGYに従って実行します。

## 事前確認

実行前に以下のドキュメントを確認してください:
- `docs/SPEC.md` — 仕様書
- `docs/PLAN.md` — 実装計画
- `docs/AGENT_TEAM_STRATEGY.md` — Agent Team戦略
- `docs/TEST_STRATEGY.md` — テスト戦略

## 引数

Phase番号: `$ARGUMENTS`

## 実行計画

### Phase 0: プロジェクト初期化

**メインが直接実行。** Agentは使わない。
- Svelte 5 + Vite 6 + TypeScript プロジェクト作成
- Tailwind CSS 4 + DaisyUI 5 導入
- Vitest設定 (`vitest.config.ts`, `vitest.e2e.config.ts`)
- Docker E2E環境ファイル (`docker/docker-compose.test.yml` 等)
- ディレクトリ構造作成
- `pnpm run dev` で空のSvelteアプリが起動することを確認

### Phase 1: コアインフラ

**メインが直接実行。** 全後続Agentの型契約を定義する重要なPhase。
- `lib/types.ts`, `lib/stores/*`, `lib/api/client.ts`, `lib/api/endpoints.ts`, `lib/utils/storage.ts`
- 完了後、**test-agent** を起動してユニットテストを作成:
  ```
  Agent(name: "test-agent", prompt: "Phase 1のテストを作成。対象: lib/stores/*, lib/utils/storage.ts, lib/api/endpoints.ts")
  ```

### Phase 2-3: 認証 + カラムレイアウト (並行)

以下の2 Agentを**同時に**起動:
```
Agent(name: "auth-agent")    → Phase 2: 認証・アカウント管理
Agent(name: "layout-agent")  → Phase 3: マルチカラムレイアウト (frontend-design skill付き)
```

両Agent完了後:
1. メインがApp.svelteで統合 (Auth結果をColumnContainerに接続)
2. **test-agent** を起動してPhase 2-3のテスト作成
3. **e2e-agent** を起動して `auth.test.ts` を実行

### Phase 4: タイムライン・ノート・MFM (3 Agent並行)

以下の3 Agentを**同時に**起動:
```
Agent(name: "note-display-agent")  → ノート表示UI (frontend-design skill付き)
Agent(name: "mfm-emoji-agent")     → MFM・絵文字レンダリング
Agent(name: "streaming-agent")     → WebSocket・ユーティリティ
```

全Agent完了後:
1. メインが統合: NoteBodyにMfmRenderer組込み、NoteListにStreaming接続
2. **test-agent** を起動してPhase 4のテスト作成
3. **e2e-agent** を起動して `timeline.test.ts`, `streaming.test.ts`, `emoji.test.ts` を実行

### Phase 5: 投稿・リアクション (2 Agent並行)

以下の2 Agentを**同時に**起動:
```
Agent(name: "composer-agent")  → 投稿UI
Agent(name: "reaction-agent")  → リアクションUI
```

全Agent完了後:
1. メインがColumnFooterに投稿/リアクション機能を接続
2. **test-agent** を起動してPhase 5のテスト作成
3. **e2e-agent** を起動して `note.test.ts`, `reaction.test.ts` を実行

### Phase 6: 仕上げ (2 Agent並行 + メイン)

以下の2 Agentを**同時に**起動:
```
Agent(name: "notification-agent")  → 通知パネル
Agent(name: "settings-agent")      → 設定画面
```

メインは並行して:
- エラーハンドリング全般
- レート制限対応 (Misskey.io検出 + クールダウン)
- ビルド最適化・デプロイ設定

全Agent完了後:
1. メインが統合・最終ポリッシュ
2. **test-agent** を起動して全Phase回帰テスト
3. **e2e-agent** を起動して `notification.test.ts` + 全体回帰

### all: 全Phase順次実行

Phase 0 → 1 → 2-3 → 4 → 5 → 6 を順次実行します。
各Phaseの完了を確認してから次に進んでください。

## 実行ルール

1. **ドキュメント参照**: 各Phaseの実行前に `docs/PLAN.md` の該当セクションを確認
2. **Agent起動**: 並行可能なAgentは**必ず同時に**起動 (1つのメッセージで複数のAgent tool call)
3. **統合**: 全Agent完了後、メインがApp.svelte等の共有ファイルを統合
4. **テスト**: 統合後にtest-agentとe2e-agentを起動
5. **ブランチ**: 各Agentは指定ブランチで作業。統合時にメインがmainにマージ
