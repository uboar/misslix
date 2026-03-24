<script lang="ts">
  import type { ColumnConfig, AccountRuntime } from '$lib/types';
  import { COLUMN_WIDTH_MAP } from '$lib/types';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import { connectTimeline } from '$lib/api/streaming';
  import type { NoteUpdatedData } from '$lib/api/streaming';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import ColumnHeader from './ColumnHeader.svelte';
  import { getEmojiMap } from '$lib/emoji/cache';
  import ColumnFooter from './ColumnFooter.svelte';
  import NoteList from '../timeline/NoteList.svelte';

  type Props = {
    config: ColumnConfig;
    runtime?: AccountRuntime;
    ondragstart?: (e: DragEvent) => void;
    ondragend?: (e: DragEvent) => void;
    ondragover?: (e: DragEvent) => void;
    ondragleave?: (e: DragEvent) => void;
    ondrop?: (e: DragEvent) => void;
    dropIndicator?: 'left' | 'right' | null;
  };

  let { config, runtime, ondragstart, ondragend, ondragover, ondragleave, ondrop, dropIndicator = null }: Props = $props();

  // アカウント情報 (ColumnFooterのリンク集に使用)
  let account = $derived(accountStore.findById(config.accountId));

  // NoteList コンポーネント参照
  let noteList = $state<ReturnType<typeof NoteList> | null>(null);

  // 折り畳み状態 (configと同期)
  let collapsed = $derived(config.collapsed);

  // 折り畳み時の幅
  const COLLAPSED_WIDTH = '3rem';

  let columnWidth = $derived(
    collapsed ? COLLAPSED_WIDTH : COLUMN_WIDTH_MAP[config.width]
  );

  // ドラッグ後のクリック誤発火を防止するフラグ
  let wasDragged = $state(false);

  function handleDragStartWrapper(e: DragEvent) {
    wasDragged = false;
    ondragstart?.(e);
  }

  function handleDragEndWrapper(e: DragEvent) {
    wasDragged = true;
    ondragend?.(e);
    // 次のクリックイベントをブロックした後リセット
    setTimeout(() => { wasDragged = false; }, 0);
  }

  function handleToggle() {
    if (wasDragged) return;
    timelineStore.updateColumn(config.id, { collapsed: !config.collapsed });
  }

  function handleRemove() {
    timelineStore.removeColumn(config.id);
  }

  const emojiMap = $derived(runtime ? getEmojiMap('', runtime.emojis) : {});

  // ストリーミング接続
  import type { TimelineConnection } from '$lib/api/streaming';
  let connection = $state<TimelineConnection | null>(null);
  let wsConnected = $state(true);

  $effect(() => {
    if (!runtime || collapsed) {
      connection?.disconnect();
      connection = null;
      return;
    }

    const conn = connectTimeline(runtime, config, {
      onNote(note) {
        noteList?.addNote(note);
        // 新規ノートのリアクション更新を購読
        conn.subNote(note.id);
      },
      onNoteUpdated(data) {
        if (data.type === 'deleted') {
          noteList?.removeNote(data.id);
        } else if (data.type === 'reacted') {
          const body = data.body as { reaction: string; emoji?: { name: string; url: string }; userId: string };
          noteList?.applyReaction(data.id, body.reaction, body.emoji, body.userId);
        } else if (data.type === 'unreacted') {
          const body = data.body as { reaction: string; userId: string };
          noteList?.applyUnreaction(data.id, body.reaction, body.userId);
        }
      },
      onStateChange(connected) {
        wsConnected = connected;
      },
    });
    connection = conn;

    return () => {
      conn.disconnect();
    };
  });

  function handleReconnect() {
    connection?.reconnect();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="column flex flex-col h-full border-r border-base-300 bg-base-100 transition-all duration-200 ease-in-out overflow-hidden shrink-0 relative"
  class:opacity-50={dropIndicator !== null}
  style="width: {columnWidth}; min-width: {columnWidth};"
  role="region"
  aria-label={config.channelName}
  {ondragover}
  {ondragleave}
  {ondrop}
>
  <!-- ヘッダー: collapsed時は縦向きに表示 -->
  {#if collapsed}
    <!-- 折り畳み状態: ヘッダーのみ縦向き -->
    <div class="flex flex-col items-center w-full h-full overflow-hidden">
      <!-- アクセントバー (横) -->
      <div class="accent-bar w-full h-[3px] shrink-0" style="background-color: {config.color};"></div>

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col items-center flex-1 py-2 gap-2 w-full overflow-hidden cursor-pointer hover:bg-base-200/60 transition-colors"
        draggable="true"
        ondragstart={handleDragStartWrapper}
        ondragend={handleDragEndWrapper}
        onclick={handleToggle}
        title="展開"
      >
        <!-- 展開アイコン -->
        <svg class="w-3 h-3 shrink-0 text-base-content/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>

        <!-- タイムライン名 (縦書き) -->
        <div
          class="flex-1 flex items-center justify-center overflow-hidden"
          style="writing-mode: vertical-rl; text-orientation: mixed;"
        >
          <span
            class="text-xs font-semibold text-base-content/60 select-none truncate"
            title={config.customName ? `${config.customName} (${config.channelName})` : config.channelName}
            style="max-height: 12rem;"
          >
            {config.customName || config.channelName}
          </span>
        </div>

        <!-- 削除ボタン -->
        <button
          class="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error"
          onclick={(e) => { e.stopPropagation(); handleRemove(); }}
          aria-label="カラムを削除"
          title="カラムを削除"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  {:else}
    <!-- 通常表示 -->
    <ColumnHeader {config} onremove={handleRemove} ontoggle={handleToggle} ondragstart={handleDragStartWrapper} ondragend={handleDragEndWrapper} emojis={emojiMap} {wsConnected} onreconnect={handleReconnect} />

    <!-- メインエリア -->
    {#if runtime}
      <NoteList
        bind:this={noteList}
        account={runtime}
        {config}
        onnotesloaded={(noteIds) => {
          // 初期ノートのリアクション更新を購読
          for (const id of noteIds) {
            connection?.subNote(id);
          }
        }}
      />
    {:else}
      <div class="flex-1 flex items-center justify-center">
        <span class="loading loading-spinner loading-sm text-base-content/30"></span>
      </div>
    {/if}

    <ColumnFooter {config} {runtime} {account} />
  {/if}
</div>
