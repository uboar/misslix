# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MissLIX is a Misskey web client: multi-account, multi-column SPA. Static build deployed to Cloudflare Workers (assets only, SPA fallback). No backend of its own — all state is local; all data flows through `misskey-js` against user-configured Misskey instances.

## Commands

```bash
pnpm dev                  # Vite dev server (http://localhost:5173)
pnpm build                # Production build → dist/
pnpm check                # svelte-check + tsc on tsconfig.node.json
pnpm test                 # All unit/component tests (vitest run)
pnpm test:unit:watch      # Watch mode
pnpm test:component       # Only src/components/**/*.test.ts
pnpm test:e2e             # Full E2E: spins up Docker Misskey, seeds, runs vitest.e2e.config.ts, tears down
pnpm test:e2e:run         # E2E tests only (assumes server already running on :3333)
pnpm deploy               # build + wrangler deploy
```

Run a single test: `pnpm vitest run path/to/file.test.ts -t "test name"`.

E2E uses `docker/docker-compose.test.yml` + `docker/setup/seed.ts`. Requires Docker; the test Misskey listens on port 3333.

## Architecture

### Reactivity model

Svelte 5 with **runes** (`$state`, `$derived`, `$effect`). Stores live in `src/lib/stores/*.svelte.ts` — each is a module that exports a singleton `xxxStore` object built from runes (not the legacy Svelte 3/4 store contract). Treat these as global mutable reactive state. Most stores have a `persist()` method that writes to localStorage.

Key stores:
- `accountStore` — accounts + active selection; source of truth for which Misskey servers are connected
- `timelineStore` — column definitions and their notes; `columns[]` drives the UI layout
- `notificationsStore`, `settingsStore`, `presets.svelte.ts`, `mergeNotes.svelte.ts`

### Account runtimes

Each account has an `AccountRuntime` (see `src/lib/types.ts` and `src/lib/api/client.ts`) bundling its `misskey-js` API client + WebSocket streaming connection. `App.svelte` owns a `Map<accountId, AccountRuntime>` and (re)initializes them when accounts change. Components receive runtimes via props — never construct API clients ad hoc; always go through `initAccountRuntime` so streaming and auth stay consistent.

### API + streaming

- `src/lib/api/client.ts` — runtime lifecycle (create/destroy)
- `src/lib/api/endpoints.ts` — typed wrappers around Misskey endpoints
- `src/lib/api/streaming.ts` — WebSocket channel subscriptions; new notes flow into `timelineStore` / `notificationsStore`

### MFM + emoji rendering

- `src/lib/mfm/` — `mfm-js` parses MFM text; `MfmRenderer.svelte` walks the AST recursively
- `src/lib/emoji/` — custom emoji cache (per-instance) + Twemoji for Unicode emoji. `twemojiSetup` configures global twemoji options. Emoji rendering is performance-sensitive — many notes × many reactions; preserve the existing caching shape when editing.

### Components

`src/components/` is grouped by feature: `column/`, `composer/`, `timeline/`, `reaction/`, `notification/`, `settings/`, `user/`, plus `layout/` (Navbar, ColumnContainer, SpeedDial) and `common/` (Modal, Toast, Avatar, etc.). The composer supports posting to multiple accounts in a single action.

### Specs

`docs/SPEC.md`, `docs/PLAN.md`, `docs/TEST_STRATEGY.md`, `docs/AGENT_TEAM_STRATEGY.md` document the original design. Code is the source of truth when they disagree, but SPEC.md is useful context for unfamiliar areas.

## Conventions

- Store files use the `.svelte.ts` extension so the Svelte compiler processes runes inside them. New stateful modules must follow the same convention.
- Path alias `$lib` → `src/lib`. Use it instead of relative `../../lib` paths.
- Tailwind CSS 4 + daisyUI 5 — prefer daisyUI component classes (`btn`, `modal`, `card`) over hand-rolled styles; theme switching depends on daisyUI tokens.
- Tests next to source as `*.test.ts` (unit/component) or under `tests/e2e/` (integration against real Misskey).
- UI text is Japanese.
