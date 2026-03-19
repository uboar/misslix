# MissLIX テスト戦略

## 設計思想

テストを **3層** に分け、開発速度とAPI互換性の両方を担保する。

- **Layer 1: ユニットテスト** — ロジック単体の正確性
- **Layer 2: コンポーネントテスト** — UIコンポーネントの描画・操作
- **Layer 3: E2Eインテグレーションテスト** — 実Misskeyサーバーとの通信・動作確認

```
信頼性 ▲
       │  Layer 3: E2E (Docker Misskey)
       │  ─────────────────────────
       │  Layer 2: コンポーネント
       │  ─────────────────────────
       │  Layer 1: ユニット
       ▼
速度   ▶
```

---

## 技術スタック

| 用途 | ツール | 選定理由 |
|---|---|---|
| テストランナー | Vitest | Viteネイティブ、高速HMR対応 |
| コンポーネントテスト | @testing-library/svelte | Svelte 5対応、DOM操作テスト |
| DOM環境 | jsdom | ブラウザ環境シミュレーション |
| E2E通信テスト | Vitest + fetch/WebSocket | 実API呼出しに対応 |
| Misskeyサーバー | Docker Compose | 再現可能な環境 |
| カバレッジ | v8 (Vitest built-in) | 追加依存不要 |

---

## Layer 1: ユニットテスト

### 対象

純粋関数・ロジックモジュール。副作用なし。

| モジュール | テスト内容 |
|---|---|
| `lib/utils/storage.ts` | localStorage 読書き、バリデーション |
| `lib/utils/date.ts` | 日付フォーマット、相対時刻表示 |
| `lib/utils/mute.ts` | ミュート判定（ユーザー/ワード/正規表現） |
| `lib/mfm/parser.ts` | MFMパース補助関数 |
| `lib/emoji/cache.ts` | キャッシュキー生成、データ変換 |
| `lib/api/endpoints.ts` | エンドポイントマップの正確性 |
| `lib/stores/*.svelte.ts` | ストアの追加/削除/永続化ロジック |

### 実行方法

```bash
pnpm run test:unit          # ユニットテスト実行
pnpm run test:unit:watch    # ウォッチモード
pnpm run test:unit:coverage # カバレッジ付き
```

### ディレクトリ構成

```
src/
├── lib/
│   ├── utils/
│   │   ├── storage.ts
│   │   ├── storage.test.ts      ← コロケーション
│   │   ├── date.ts
│   │   ├── date.test.ts
│   │   ├── mute.ts
│   │   └── mute.test.ts
│   ├── mfm/
│   │   ├── parser.ts
│   │   └── parser.test.ts
│   └── stores/
│       ├── accounts.svelte.ts
│       ├── accounts.test.ts
│       ├── timelines.svelte.ts
│       ├── timelines.test.ts
│       ├── settings.svelte.ts
│       └── settings.test.ts
```

コロケーション方式（テストファイルを実装の隣に配置）を採用。対象モジュールとの距離が近く、見落としを防ぐ。

---

## Layer 2: コンポーネントテスト

### 対象

Svelteコンポーネントの描画・ユーザー操作。API呼出しはモック。

| コンポーネント | テスト内容 |
|---|---|
| `Modal.svelte` | 開閉、ESCキー、オーバーレイクリック |
| `NoteCard.svelte` | ノート表示、CWトグル、Renote展開 |
| `NoteReactions.svelte` | リアクション表示、クリックイベント発火 |
| `MfmRenderer.svelte` | 各MFM構文のHTML出力 |
| `EmojiRenderer.svelte` | カスタム/Unicode絵文字の描画 |
| `PostModal.svelte` | 入力、公開範囲選択、送信イベント |
| `AuthSettings.svelte` | 認証フォーム入力、バリデーション |
| `ColumnContainer.svelte` | カラム追加/削除、並替え |

### 実行方法

```bash
pnpm run test:component     # コンポーネントテスト実行
```

### ディレクトリ構成

```
src/
├── components/
│   ├── common/
│   │   ├── Modal.svelte
│   │   └── Modal.test.ts
│   ├── timeline/
│   │   ├── NoteCard.svelte
│   │   └── NoteCard.test.ts
│   └── ...
```

---

## Layer 3: E2Eインテグレーションテスト（Docker Misskey）

### 目的

実際のMisskeyサーバーに対してAPIを呼び出し、以下を検証する:

- **API互換性**: misskey-jsのバージョンと実サーバーの応答が一致するか
- **認証フロー**: トークン取得→API利用が実際に動作するか
- **WebSocket通信**: ストリーミング接続・イベント受信が正常か
- **データ整合性**: 投稿→取得→リアクションの一連のフローが通るか

### Docker環境

```
docker/
├── docker-compose.test.yml
├── misskey/
│   └── default.yml          # Misskey設定
└── setup/
    └── seed.ts               # テストデータ投入スクリプト
```

#### docker-compose.test.yml

```yaml
services:
  misskey:
    image: misskey/misskey:latest
    ports:
      - "3333:3000"
    environment:
      - MISSKEY_URL=http://localhost:3333
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./misskey/default.yml:/misskey/.config/default.yml

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: misskey_test
      POSTGRES_USER: misskey
      POSTGRES_PASSWORD: misskey_test_pass
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U misskey"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

#### misskey/default.yml

```yaml
url: http://localhost:3333
port: 3000

db:
  host: db
  port: 5432
  db: misskey_test
  user: misskey
  pass: misskey_test_pass

redis:
  host: redis
  port: 6379
```

### セットアップスクリプト (seed.ts)

テスト実行前にMisskeyサーバーの初期状態を構築する。

```typescript
// docker/setup/seed.ts
// Misskeyの管理者API経由でテスト用データを投入

const MISSKEY_URL = "http://localhost:3333";

async function seed() {
  // 1. 管理者アカウント作成（初回起動時）
  const admin = await createInitialAdmin();

  // 2. テスト用ユーザー作成
  const testUserA = await createUser("test_user_a");
  const testUserB = await createUser("test_user_b");

  // 3. テスト用チャンネル・リスト・アンテナ作成
  await createChannel(testUserA.token, "test-channel");
  await createList(testUserA.token, "test-list", [testUserB.id]);
  await createAntenna(testUserA.token, "test-antenna");

  // 4. テスト用ノート投稿
  await createNote(testUserA.token, "Hello from test_user_a!");
  await createNote(testUserB.token, "Hello from test_user_b!");

  // 5. 認証情報をファイル出力（テストで利用）
  writeTestCredentials({ admin, testUserA, testUserB });
}
```

### テスト内容

```
tests/
├── e2e/
│   ├── setup.ts              # Docker起動・seed実行・teardown
│   ├── auth.test.ts          # 認証フロー
│   ├── timeline.test.ts      # タイムライン取得
│   ├── note.test.ts          # ノート投稿・取得・削除
│   ├── reaction.test.ts      # リアクション追加・削除
│   ├── streaming.test.ts     # WebSocket接続・イベント受信
│   ├── emoji.test.ts         # カスタム絵文字取得
│   └── notification.test.ts  # 通知受信
```

| テストファイル | 検証内容 |
|---|---|
| `auth.test.ts` | 直接トークン認証、APIクライアント生成、ユーザー情報取得 |
| `timeline.test.ts` | 各種タイムライン (home/local/global) のノート取得、ページネーション |
| `note.test.ts` | ノート作成、CW付き投稿、リプライ、Renote、削除 |
| `reaction.test.ts` | リアクション追加、削除、ノート反映確認 |
| `streaming.test.ts` | WebSocket接続、`note`イベント受信、`noteUpdated`イベント受信 |
| `emoji.test.ts` | カスタム絵文字一覧取得、絵文字URL解決 |
| `notification.test.ts` | フォロー/リプライ/リアクション通知の受信 |

### テスト例: ストリーミング

```typescript
// tests/e2e/streaming.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("WebSocket Streaming", () => {
  let stream: Stream;

  beforeAll(async () => {
    const credentials = loadTestCredentials();
    stream = new Stream(
      `ws://localhost:3333/streaming`,
      { token: credentials.testUserA.token }
    );
  });

  afterAll(() => {
    stream.close();
  });

  it("homeTimelineチャンネルでノートを受信する", async () => {
    const connection = stream.useChannel("homeTimeline");

    const notePromise = new Promise<Note>((resolve) => {
      connection.on("note", resolve);
    });

    // 別ユーザーからノート投稿
    await postNote(credentials.testUserB.token, "streaming test note");

    const received = await withTimeout(notePromise, 5000);
    expect(received.text).toBe("streaming test note");
  });
});
```

### 実行方法

```bash
# Docker環境を起動してE2Eテスト実行
pnpm run test:e2e

# 内部的には以下を順次実行:
# 1. docker compose -f docker/docker-compose.test.yml up -d
# 2. ヘルスチェック (Misskeyサーバー応答待ち)
# 3. npx tsx docker/setup/seed.ts
# 4. vitest run --config vitest.e2e.config.ts
# 5. docker compose -f docker/docker-compose.test.yml down -v
```

---

## Vitest設定

### vitest.config.ts（ユニット + コンポーネント）

```typescript
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**"],
    },
  },
});
```

### vitest.e2e.config.ts（E2E）

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    globalSetup: ["tests/e2e/setup.ts"],
  },
});
```

---

## package.json スクリプト

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:unit:watch": "vitest --config vitest.config.ts",
    "test:unit:coverage": "vitest run --config vitest.config.ts --coverage",
    "test:component": "vitest run --config vitest.config.ts --include 'src/components/**/*.test.ts'",
    "test:e2e": "bash scripts/test-e2e.sh",
    "test:e2e:run": "vitest run --config vitest.e2e.config.ts"
  }
}
```

---

## E2E実行スクリプト

### scripts/test-e2e.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker/docker-compose.test.yml"

echo "=== Starting Misskey test server ==="
docker compose -f "$COMPOSE_FILE" up -d

echo "=== Waiting for Misskey to be ready ==="
for i in $(seq 1 60); do
  if curl -sf http://localhost:3333/api/meta > /dev/null 2>&1; then
    echo "Misskey is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Timeout: Misskey did not start in time."
    docker compose -f "$COMPOSE_FILE" logs misskey
    docker compose -f "$COMPOSE_FILE" down -v
    exit 1
  fi
  sleep 2
done

echo "=== Seeding test data ==="
npx tsx docker/setup/seed.ts

echo "=== Running E2E tests ==="
npx vitest run --config vitest.e2e.config.ts
TEST_EXIT=$?

echo "=== Tearing down ==="
docker compose -f "$COMPOSE_FILE" down -v

exit $TEST_EXIT
```

---

## Phase別テスト計画

テストは各Phase実装と同時に追加する。

| Phase | テスト追加内容 |
|---|---|
| Phase 0 | Vitest設定、テストスクリプト |
| Phase 1 | ストア・ユーティリティのユニットテスト |
| Phase 2 | 認証ロジックのユニットテスト、Docker E2E (auth.test.ts) |
| Phase 3 | カラムコンポーネントテスト |
| Phase 4 | MFMパーサーユニットテスト、ノート表示コンポーネントテスト、Docker E2E (timeline, streaming, emoji) |
| Phase 5 | 投稿・リアクションコンポーネントテスト、Docker E2E (note, reaction) |
| Phase 6 | 通知テスト、Docker E2E (notification)、全体回帰テスト |

---

## テスト Agent 定義

専用のテストAgentを用意し、実装Agentとは独立してテストを作成・実行する。

### Agent構成

```
                    ┌─────────────────────┐
                    │   メインオーケストラ   │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
   │ 実装Agent群  │   │ Test Agent   │   │ E2E Agent    │
   │ (Phase別)   │   │ (Unit/Comp)  │   │ (Docker)     │
   └─────────────┘   └──────────────┘   └──────────────┘
```

### Test Agent: ユニット + コンポーネントテスト

各Phase完了後に起動し、実装されたモジュールに対してテストを追加する。

```
Agent(
  name: "test-agent",
  isolation: "worktree",
  prompt: """
  Phase {N} のテストを作成・実行してください。

  対象モジュール:
  - {Phaseで実装されたファイル一覧}

  ルール:
  1. 各モジュールの隣に *.test.ts を作成（コロケーション）
  2. Vitest + @testing-library/svelte を使用
  3. API呼出しはモック（vi.mock）
  4. 全テストがパスすることを確認: pnpm run test:unit
  5. カバレッジ80%以上を目標
  """
)
```

### E2E Agent: Docker Misskeyインテグレーション

Docker環境を立ち上げ、実APIとの通信テストを実行する専用Agent。

```
Agent(
  name: "e2e-agent",
  prompt: """
  E2Eインテグレーションテストを実行してください。

  手順:
  1. Docker Compose でMisskeyテストサーバーを起動
     docker compose -f docker/docker-compose.test.yml up -d
  2. サーバーのヘルスチェック（http://localhost:3333/api/meta が応答するまで待機）
  3. テストデータのシード: npx tsx docker/setup/seed.ts
  4. E2Eテスト実行: pnpm run test:e2e:run
  5. 結果を報告
  6. Docker環境をクリーンアップ
     docker compose -f docker/docker-compose.test.yml down -v

  失敗時:
  - テスト失敗ログを詳細に報告
  - Misskeyのログ確認: docker compose logs misskey
  - 修正可能な場合はテストコードを修正して再実行
  """
)
```

### Agent投入タイミング

```
Phase 0  ████                           (基盤構築)
Phase 1  ██████                         (コアインフラ)
         └─ Test Agent: ストア・ユーティリティテスト
Phase 2  ████████  ┐                    (認証)
Phase 3  ████████  ┘ ← 並行            (レイアウト)
         └─ Test Agent: 認証・カラムテスト
         └─ E2E Agent: auth.test.ts
         [統合]██
Phase 4  ████████████████               (ノート・MFM・ストリーミング)
         └─ Test Agent: MFM・コンポーネントテスト
         └─ E2E Agent: timeline, streaming, emoji
         [統合]████
Phase 5  ████████                       (投稿・リアクション)
         └─ Test Agent: 投稿・リアクションテスト
         └─ E2E Agent: note, reaction
         [統合]██
Phase 6  ████████████                   (仕上げ)
         └─ Test Agent: 通知・設定テスト
         └─ E2E Agent: notification + 全体回帰
```

### Test Agent の worktree運用

- Test Agentは `isolation: "worktree"` で実行
- ブランチ名: `test/phase{N}-unit`, `test/phase{N}-e2e`
- 実装Agentのブランチマージ後に起動（最新コードに対してテスト作成）
- テスト完了後、メインが `main` にマージ

### E2E Agent の注意点

- E2E Agentは **worktreeを使わない**（Docker操作がホストに依存するため）
- Docker Composeの起動/停止は必ずペアで実行（リソースリーク防止）
- テスト失敗時でもクリーンアップ（`down -v`）を保証する
- ポート3333が空いていることを事前確認

---

## CI/CD統合（将来）

GitHub Actionsで自動実行する場合の構成案:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm ci
      - run: pnpm run test:unit:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm ci
      - run: pnpm run test:e2e
```

---

## 依存パッケージ（devDependencies）

```
vitest
@testing-library/svelte
@testing-library/jest-dom
jsdom
```
