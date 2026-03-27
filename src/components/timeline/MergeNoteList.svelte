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
  import { AlertCircle, AlignJustify } from 'lucide-svelte';

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

  // ソースごとの最古ノートIDを追跡 (無限スクロール用)
  let oldestPerSource = $state<Map<number, string>>(new Map());

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

  onMount(() => {
    fetchInitial();
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

<div
  class="merge-note-list flex-1 overflow-y-auto overflow-x-hidden"
  onscroll={handleScroll}
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
