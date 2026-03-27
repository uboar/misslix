<script lang="ts">
  import { onMount } from 'svelte';
  import type { AccountRuntime, ColumnConfig, MergeSourceDef } from '$lib/types';
  import type { MergeNoteStore } from '$lib/stores/mergeNotes.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { CHANNEL_ENDPOINTS } from '$lib/api/endpoints';
  import type { entities } from 'misskey-js';
  import NoteCard from './NoteCard.svelte';
  import LoadingSpinner from '$components/common/LoadingSpinner.svelte';
  import { AlertCircle, AlignJustify, RefreshCw } from 'lucide-svelte';

  type Props = {
    store: MergeNoteStore;
    config: ColumnConfig;
    runtimes: Map<number, AccountRuntime>;
    onnotesloaded?: (noteIds: string[]) => void;
  };

  let { store, config, runtimes, onnotesloaded }: Props = $props();

  const muteUsers = $derived(settingsStore.settings.muteUsers);
  const muteWords = $derived(settingsStore.settings.muteWords);

  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let hasMore = $state(true);
  let isRefreshing = $state(false);

  // ソースごとの最古ノートIDを追跡 (無限スクロール用)
  let oldestPerSource = $state<Map<number, string>>(new Map());

  // スクロールコンテナ参照
  let scrollContainer = $state<HTMLDivElement | null>(null);

  const sourceColumns = $derived(config.sourceColumns ?? []);

  function getSourceLabel(source: MergeSourceDef): string {
    const account = accountStore.findById(source.accountId);
    const host = account?.hostUrl?.replace(/^https?:\/\//, '') ?? '?';
    return `${source.channelName}@${host}`;
  }

  function getAccountHostUrl(source: MergeSourceDef): string {
    return accountStore.findById(source.accountId)?.hostUrl ?? '';
  }

  // ソースごとのカスタム絵文字マップ (レンダリング用)
  function getEmojiMapForSource(source: MergeSourceDef): Record<string, string> {
    const runtime = runtimes.get(source.accountId);
    if (!runtime) return {};
    return Object.fromEntries(
      runtime.emojis.map(e => [e.name, e.url ?? ''])
    );
  }

  // 初期ノート取得 (全ソースから並列)
  export async function fetchInitial() {
    if (loading) return;
    loading = true;
    error = null;

    try {
      const results = await Promise.allSettled(
        sourceColumns.map(async (source) => {
          const runtime = runtimes.get(source.accountId);
          if (!runtime) return [];

          const endpointInfo = CHANNEL_ENDPOINTS[source.channel];
          if (!endpointInfo.restEndpoint) return [];

          const params: Record<string, unknown> = { limit: 20 };
          if (endpointInfo.paramKey && source.channelId) {
            params[endpointInfo.paramKey] = source.channelId;
          }

          const res = await runtime.cli.request(
            endpointInfo.restEndpoint as Parameters<typeof runtime.cli.request>[0],
            params as Parameters<typeof runtime.cli.request>[1],
          );
          const notes = res as unknown as entities.Note[];

          // 最古ID記録
          if (notes.length > 0) {
            oldestPerSource.set(source.accountId, notes[notes.length - 1].id);
          }

          return notes.map(note => ({
            note,
            sourceLabel: getSourceLabel(source),
            sourceAccountId: source.accountId,
            sourceColor: source.color,
            accountHostUrl: getAccountHostUrl(source),
          }));
        })
      );

      const allItems = results.flatMap(r =>
        r.status === 'fulfilled' ? r.value : []
      );

      store.addNotesBulk(allItems);
      hasMore = allItems.length >= 20;

      const noteIds = store.notes.map(w => w.note.id);
      onnotesloaded?.(noteIds);
    } catch (e) {
      error = e instanceof Error ? e.message : 'ノートの取得に失敗しました';
    } finally {
      loading = false;
    }
  }

  // 追加読み込み (全ソースから並列)
  export async function fetchMore() {
    if (loadingMore || !hasMore) return;
    loadingMore = true;

    try {
      const results = await Promise.allSettled(
        sourceColumns.map(async (source) => {
          const runtime = runtimes.get(source.accountId);
          if (!runtime) return [];

          const endpointInfo = CHANNEL_ENDPOINTS[source.channel];
          if (!endpointInfo.restEndpoint) return [];

          const untilId = oldestPerSource.get(source.accountId);
          const params: Record<string, unknown> = { limit: 20 };
          if (endpointInfo.paramKey && source.channelId) {
            params[endpointInfo.paramKey] = source.channelId;
          }
          if (untilId) {
            params.untilId = untilId;
          }

          const res = await runtime.cli.request(
            endpointInfo.restEndpoint as Parameters<typeof runtime.cli.request>[0],
            params as Parameters<typeof runtime.cli.request>[1],
          );
          const notes = res as unknown as entities.Note[];

          if (notes.length > 0) {
            oldestPerSource.set(source.accountId, notes[notes.length - 1].id);
          }

          return notes.map(note => ({
            note,
            sourceLabel: getSourceLabel(source),
            sourceAccountId: source.accountId,
            sourceColor: source.color,
            accountHostUrl: getAccountHostUrl(source),
          }));
        })
      );

      const allItems = results.flatMap(r =>
        r.status === 'fulfilled' ? r.value : []
      );

      store.addNotesBulk(allItems);
      hasMore = allItems.some((_, __, arr) => arr.length >= 20);
    } catch (e) {
      error = e instanceof Error ? e.message : '追加読み込みに失敗しました';
    } finally {
      loadingMore = false;
    }
  }

  /**
   * タイムラインを更新する (ストアをクリアして再取得)
   */
  export async function refresh() {
    if (loading) return;
    isRefreshing = true;
    store.clear();
    oldestPerSource = new Map();
    hasMore = true;
    await fetchInitial();
    isRefreshing = false;
  }

  onMount(() => {
    fetchInitial();
  });

  // ─── プルリフレッシュ ───
  let pullDistance = $state(0);
  let isPulling = $state(false);
  let touchStartY = 0;
  const PULL_THRESHOLD = 64;

  function handleTouchStart(e: TouchEvent) {
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      touchStartY = e.touches[0].clientY;
      isPulling = true;
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isPulling) return;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY > 0 && scrollContainer && scrollContainer.scrollTop === 0) {
      e.preventDefault();
      pullDistance = Math.min(deltaY * 0.5, PULL_THRESHOLD + 20);
    } else {
      isPulling = false;
      pullDistance = 0;
    }
  }

  function handleTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD && !loading) {
      refresh();
    }
    isPulling = false;
    pullDistance = 0;
  }

  // passive:false でtouchmoveを登録 (preventDefault可能にするため)
  $effect(() => {
    const el = scrollContainer;
    if (!el) return;
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  });

  // スクロールイベント (無限スクロール)
  function handleScroll(e: Event) {
    const el = e.currentTarget as HTMLDivElement;
    const threshold = 200;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
      fetchMore();
    }
  }

  // NoteCardのhostUrl解決: sourceAccountIdに紐づくアカウントのhostUrl
  function getHostUrlForNote(sourceAccountId: number): string {
    return accountStore.findById(sourceAccountId)?.hostUrl ?? '';
  }

  // NoteCardの絵文字マップ: sourceAccountIdのランタイムから取得
  function getEmojiMapForNote(sourceAccountId: number): Record<string, string> {
    const runtime = runtimes.get(sourceAccountId);
    if (!runtime) return {};
    return Object.fromEntries(
      runtime.emojis.map(e => [e.name, e.url ?? ''])
    );
  }
</script>

<div class="merge-note-list-wrapper flex flex-col flex-1 min-h-0">
  <!-- プルリフレッシュインジケーター -->
  <div
    class="flex items-center justify-center gap-1.5 overflow-hidden shrink-0 text-xs text-base-content/50"
    style="height: {isRefreshing ? '36px' : pullDistance > 0 ? `${Math.min(pullDistance * 0.6, 36)}px` : '0px'}; transition: height 0.15s ease;"
  >
    {#if isRefreshing}
      <LoadingSpinner size="xs" />
      <span>更新中...</span>
    {:else if pullDistance >= PULL_THRESHOLD}
      <RefreshCw class="w-3.5 h-3.5" />
      <span>離すと更新</span>
    {:else}
      <RefreshCw class="w-3.5 h-3.5" />
      <span>引き下げて更新</span>
    {/if}
  </div>

  <!-- 更新ボタン -->
  <div class="flex justify-end px-1.5 py-0.5 shrink-0 border-b border-base-300/50">
    <button
      class="btn btn-ghost btn-xs gap-1 text-[0.65rem] opacity-40 hover:opacity-80 h-6 min-h-6"
      onclick={refresh}
      disabled={loading}
      aria-label="タイムラインを更新"
      title="タイムラインを更新"
    >
      <RefreshCw class="w-3 h-3 {loading && isRefreshing ? 'animate-spin' : ''}" />
      更新
    </button>
  </div>

  <!-- スクロールコンテナ -->
  <div
    bind:this={scrollContainer}
    class="flex-1 overflow-y-auto overflow-x-hidden"
    onscroll={handleScroll}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="feed"
    aria-label="マージタイムライン"
    aria-busy={loading}
  >
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>

    {:else if error && store.notes.length === 0}
      <div class="flex flex-col items-center justify-center py-8 gap-2 px-4">
        <AlertCircle class="w-5 h-5 text-error/60" aria-hidden="true" />
        <p class="text-xs text-error/70 text-center">{error}</p>
        <button class="btn btn-xs btn-ghost text-[0.65rem]" onclick={fetchInitial}>
          再試行
        </button>
      </div>

    {:else if store.notes.length === 0}
      <div class="flex flex-col items-center justify-center py-8 gap-2 opacity-40">
        <AlignJustify class="w-6 h-6 text-base-content/30" aria-hidden="true" />
        <p class="text-xs text-base-content/40">ノートがありません</p>
      </div>

    {:else}
      {#each store.notes as wrapper (wrapper.note.id)}
        <NoteCard
          note={wrapper.note}
          {config}
          emojis={getEmojiMapForNote(wrapper.sourceAccountId)}
          hostUrl={getHostUrlForNote(wrapper.sourceAccountId)}
          {muteUsers}
          {muteWords}
          runtime={runtimes.get(wrapper.sourceAccountId)}
          sourceLabel={wrapper.sourceLabel}
          sourceColor={wrapper.sourceColor}
          availableRuntimes={runtimes}
          sourceAccountId={wrapper.sourceAccountId}
        />
      {/each}

      {#if loadingMore}
        <div class="flex items-center justify-center py-4">
          <LoadingSpinner size="xs" />
        </div>
      {/if}

      {#if !hasMore && store.notes.length > 0}
        <div class="flex items-center justify-center py-4">
          <span class="text-[0.6rem] text-base-content/25">-- 終端 --</span>
        </div>
      {/if}

      {#if error && store.notes.length > 0}
        <div class="flex items-center justify-center gap-1.5 py-2 px-3">
          <span class="text-[0.6rem] text-error/60">{error}</span>
          <button
            class="text-[0.6rem] text-primary/60 hover:text-primary underline"
            onclick={() => { error = null; fetchMore(); }}
          >
            再試行
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>
