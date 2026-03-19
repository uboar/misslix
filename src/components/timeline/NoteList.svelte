<script lang="ts">
  import { onMount } from 'svelte';
  import type { entities } from 'misskey-js';
  import type { AccountRuntime, ColumnConfig } from '$lib/types';
  import { CHANNEL_ENDPOINTS } from '$lib/api/endpoints';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import NoteCard from './NoteCard.svelte';
  import LoadingSpinner from '$components/common/LoadingSpinner.svelte';

  type Props = {
    account: AccountRuntime;
    config: ColumnConfig;
    onnotesloaded?: (noteIds: string[]) => void;
  };

  let { account, config, onnotesloaded }: Props = $props();

  // ミュート設定
  const muteUsers = $derived(settingsStore.settings.muteUsers);
  const muteWords = $derived(settingsStore.settings.muteWords);

  // ホストURL (タイムスタンプリンク用)
  const hostUrl = $derived(accountStore.findById(config.accountId)?.hostUrl ?? '');

  // ノートリスト
  let notes = $state<entities.Note[]>([]);
  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let hasMore = $state(true);

  // スクロールコンテナ参照
  let scrollContainer = $state<HTMLDivElement | null>(null);

  // カスタム絵文字マップ (accountのemojisから変換)
  const emojiMap = $derived(
    Object.fromEntries(
      account.emojis.map(e => [e.name, e.url ?? ''])
    ) as Record<string, string>
  );

  // チャンネルエンドポイント情報
  const endpointInfo = $derived(CHANNEL_ENDPOINTS[config.channel]);

  // リクエストパラメータ構築
  function buildParams(untilId?: string): Record<string, unknown> {
    const params: Record<string, unknown> = { limit: 20 };

    // チャンネル固有パラメータ
    if (endpointInfo.paramKey && config.channelId) {
      params[endpointInfo.paramKey] = config.channelId;
    }

    if (untilId) {
      params.untilId = untilId;
    }

    return params;
  }

  // 初期ノート取得
  async function fetchInitial() {
    if (loading) return;
    loading = true;
    error = null;

    try {
      const params = buildParams();
      const res = await account.cli.request(
        endpointInfo.restEndpoint as Parameters<typeof account.cli.request>[0],
        params as Parameters<typeof account.cli.request>[1],
      );
      notes = (res as unknown as entities.Note[]).slice(0, config.maxNotes);
      hasMore = notes.length >= 20;
      // ストリーミングでリアクション更新を受信するためsubNote購読
      onnotesloaded?.(notes.map(n => n.id));
    } catch (e) {
      error = e instanceof Error ? e.message : 'ノートの取得に失敗しました';
    } finally {
      loading = false;
    }
  }

  // 過去ノート取得 (無限スクロール)
  async function fetchMore() {
    if (loadingMore || !hasMore || notes.length === 0) return;
    loadingMore = true;

    try {
      const untilId = notes[notes.length - 1].id;
      const params = buildParams(untilId);
      const res = await account.cli.request(
        endpointInfo.restEndpoint as Parameters<typeof account.cli.request>[0],
        params as Parameters<typeof account.cli.request>[1],
      );
      const newNotes = res as unknown as entities.Note[];
      hasMore = newNotes.length >= 20;

      // maxNotes/bufferSize に基づいてノート数を制限
      const combined = [...notes, ...newNotes];
      notes = combined.slice(0, config.bufferSize);
    } catch (e) {
      error = e instanceof Error ? e.message : '追加読み込みに失敗しました';
    } finally {
      loadingMore = false;
    }
  }

  /**
   * ストリーミング統合用: 上部に新しいノートを追加する
   * Agent E (streaming-agent) またはメインが呼び出す
   */
  export function addNote(note: entities.Note) {
    notes = [note, ...notes].slice(0, config.bufferSize);
  }

  /**
   * ストリーミング統合用: ノートを更新する (リアクション等)
   */
  export function updateNote(noteId: string, updates: Partial<entities.Note>) {
    notes = notes.map(n => n.id === noteId ? { ...n, ...updates } : n);
  }

  /**
   * ストリーミング統合用: ノートを削除する
   */
  export function removeNote(noteId: string) {
    notes = notes.filter(n => n.id !== noteId);
  }

  /**
   * ストリーミング統合用: リアクション追加を反映する
   */
  export function applyReaction(
    noteId: string,
    reaction: string,
    emoji: { name: string; url: string } | undefined,
    userId: string,
  ) {
    notes = notes.map(n => {
      // 対象ノートまたはrenote先を探す
      const target = n.id === noteId ? n : (n.renote && n.renote.id === noteId ? n : null);
      if (!target) return n;

      const actualNote = n.id === noteId ? n : n.renote!;
      const updatedReactions = { ...(actualNote.reactions ?? {}) };
      updatedReactions[reaction] = (updatedReactions[reaction] ?? 0) + 1;

      // reactionEmojis にカスタム絵文字URLを追加
      const reactionEmojis = { ...((actualNote as any).reactionEmojis ?? {}) };
      if (emoji?.url) {
        reactionEmojis[emoji.name] = emoji.url;
      }

      // 自分のリアクションかどうか判定
      const isSelf = isCurrentUser(userId);
      const myReaction = isSelf ? reaction : actualNote.myReaction;

      if (n.id === noteId) {
        return { ...n, reactions: updatedReactions, reactionEmojis, myReaction };
      } else {
        return { ...n, renote: { ...actualNote, reactions: updatedReactions, reactionEmojis, myReaction } };
      }
    });
  }

  /**
   * ストリーミング統合用: リアクション削除を反映する
   */
  export function applyUnreaction(
    noteId: string,
    reaction: string,
    userId: string,
  ) {
    notes = notes.map(n => {
      const target = n.id === noteId ? n : (n.renote && n.renote.id === noteId ? n : null);
      if (!target) return n;

      const actualNote = n.id === noteId ? n : n.renote!;
      const updatedReactions = { ...(actualNote.reactions ?? {}) };
      const newCount = (updatedReactions[reaction] ?? 1) - 1;
      if (newCount <= 0) {
        delete updatedReactions[reaction];
      } else {
        updatedReactions[reaction] = newCount;
      }

      const isSelf = isCurrentUser(userId);
      const myReaction = isSelf ? null : actualNote.myReaction;

      if (n.id === noteId) {
        return { ...n, reactions: updatedReactions, myReaction };
      } else {
        return { ...n, renote: { ...actualNote, reactions: updatedReactions, myReaction } };
      }
    });
  }

  /**
   * 現在のアカウントのユーザーIDか判定する
   */
  function isCurrentUser(userId: string): boolean {
    return account.userId === userId;
  }

  // スクロールイベント処理 (無限スクロール)
  function handleScroll(e: Event) {
    const el = e.currentTarget as HTMLDivElement;
    const threshold = 200; // 下端から200px以内で読み込み
    if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
      fetchMore();
    }
  }

  // 初期化
  onMount(() => {
    fetchInitial();
  });
</script>

<div
  bind:this={scrollContainer}
  class="note-list flex-1 overflow-y-auto overflow-x-hidden"
  onscroll={handleScroll}
  role="feed"
  aria-label="{config.channelName} タイムライン"
  aria-busy={loading}
>
  <!-- 初期ローディング -->
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <LoadingSpinner size="md" />
    </div>

  <!-- エラー -->
  {:else if error && notes.length === 0}
    <div class="flex flex-col items-center justify-center py-8 gap-2 px-4">
      <svg class="w-5 h-5 text-error/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke-linecap="round"/>
        <line x1="12" y1="16" x2="12.01" y2="16" stroke-linecap="round"/>
      </svg>
      <p class="text-xs text-error/70 text-center">{error}</p>
      <button
        class="btn btn-xs btn-ghost text-[0.65rem]"
        onclick={fetchInitial}
      >
        再試行
      </button>
    </div>

  <!-- ノートなし -->
  {:else if notes.length === 0}
    <div class="flex flex-col items-center justify-center py-8 gap-2 opacity-40">
      <svg class="w-6 h-6 text-base-content/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18"/>
      </svg>
      <p class="text-xs text-base-content/40">ノートがありません</p>
    </div>

  {:else}
    <!-- ノートリスト -->
    {#each notes as note (note.id)}
      <NoteCard
        {note}
        {config}
        emojis={emojiMap}
        {hostUrl}
        {muteUsers}
        {muteWords}
        runtime={account}
      />
    {/each}

    <!-- 追加ローディング -->
    {#if loadingMore}
      <div class="flex items-center justify-center py-4">
        <LoadingSpinner size="xs" />
      </div>
    {/if}

    <!-- これ以上読み込めない -->
    {#if !hasMore && notes.length > 0}
      <div class="flex items-center justify-center py-4">
        <span class="text-[0.6rem] text-base-content/25">— 終端 —</span>
      </div>
    {/if}

    <!-- 部分エラー -->
    {#if error && notes.length > 0}
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
