---
name: misslix-test
description: MissLIXのテストを実行する。ユニット/コンポーネント/E2Eの各レイヤーを個別または一括で実行可能。
argument-hint: "[scope: unit|component|e2e|all] [phase?: number]"
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Agent
---

# MissLIX Test — テスト実行コマンド

テスト戦略 (`docs/TEST_STRATEGY.md`) に従い、テストを実行します。

## 引数

- スコープ: `$0` — `unit`, `component`, `e2e`, `all` のいずれか
- Phase (任意): `$1` — 特定Phaseのテストのみ実行する場合に指定

## 実行計画

### unit — ユニットテスト

```bash
pnpm run test:unit
```

Phase指定がある場合、対象ファイルをフィルタ:
- Phase 1: `src/lib/stores/`, `src/lib/utils/storage.ts`, `src/lib/api/endpoints.ts`
- Phase 2: `src/lib/api/client.ts`, `src/components/settings/Auth*`
- Phase 3: `src/components/layout/`, `src/components/column/`
- Phase 4: `src/components/timeline/`, `src/lib/mfm/`, `src/lib/emoji/`, `src/lib/api/streaming.ts`, `src/lib/utils/date.ts`, `src/lib/utils/mute.ts`
- Phase 5: `src/components/composer/`, `src/components/reaction/`
- Phase 6: `src/components/notification/`, `src/components/settings/`

### component — コンポーネントテスト

```bash
pnpm run test:component
```

### e2e — Docker Misskeyインテグレーションテスト

**e2e-agent** を起動してDocker環境でのテストを実行:

```
Agent(name: "e2e-agent", prompt: "E2Eインテグレーションテストを実行してください。手順はe2e-agentの定義に従ってください。")
```

Phase指定がある場合、対象テストファイルを絞り込む:
- Phase 2: `tests/e2e/auth.test.ts`
- Phase 4: `tests/e2e/timeline.test.ts`, `tests/e2e/streaming.test.ts`, `tests/e2e/emoji.test.ts`
- Phase 5: `tests/e2e/note.test.ts`, `tests/e2e/reaction.test.ts`
- Phase 6: `tests/e2e/notification.test.ts`

### all — 全テスト実行

1. ユニットテスト (`pnpm run test:unit`)
2. コンポーネントテスト (`pnpm run test:component`)
3. E2Eテスト (e2e-agent起動)

各ステップの結果を報告し、失敗があればそこで停止して原因を分析してください。

## テスト作成モード

テストが存在しない場合、**test-agent** を起動して作成:

```
Agent(name: "test-agent", prompt: "Phase {N} のテストを作成してください。対象モジュール: {ファイル一覧}")
```

## 結果報告

テスト実行後、以下を報告してください:
- パス/失敗数
- 失敗したテストの詳細
- カバレッジ (ユニットテストの場合)
- 修正が必要な場合の提案
