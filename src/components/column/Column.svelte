<script lang="ts">
  import type { ColumnConfig, AccountRuntime } from '$lib/types';
  import { COLUMN_WIDTH_MAP } from '$lib/types';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import { connectTimeline } from '$lib/api/streaming';
  import type { NoteUpdatedData } from '$lib/api/streaming';
  import ColumnHeader from './ColumnHeader.svelte';
  import ColumnFooter from './ColumnFooter.svelte';
  import NoteList from '../timeline/NoteList.svelte';

  type Props = {
    config: ColumnConfig;
    runtime?: AccountRuntime;
  };

  let { config, runtime }: Props = $props();

  // NoteList コンポーネント参照
  let noteList = $state<ReturnType<typeof NoteList> | null>(null);

  // 折り畳み状態 (configと同期)
  let collapsed = $derived(config.collapsed);

  // 折り畳み時の幅
  const COLLAPSED_WIDTH = '3rem';

  let columnWidth = $derived(
    collapsed ? COLLAPSED_WIDTH : COLUMN_WIDTH_MAP[config.width]
  );

  function handleToggle() {
    timelineStore.updateColumn(config.id, { collapsed: !config.collapsed });
  }

  function handleRemove() {
    timelineStore.removeColumn(config.id);
  }

  // ストリーミング接続
  import type { TimelineConnection } from '$lib/api/streaming';
  let connection = $state<TimelineConnection | null>(null);

  $effect(() => {
    if (!runtime || collapsed) {
      connection?.disconnect();
      connection = null;
      return;
    }

    const conn = connectTimeline(runtime, config, {
      onNote(note) {
        noteList?.addNote(note);
      },
      onNoteUpdated(data) {
        if (data.type === 'deleted') {
          noteList?.removeNote(data.id);
        } else if (data.type === 'reacted' || data.type === 'unreacted') {
          // リアクション更新は body から reactions を更新
          // 簡易実装: NoteList側で全体を再取得はしない
        }
      },
    });
    connection = conn;

    return () => {
      conn.disconnect();
    };
  });
</script>

<div
  class="column flex flex-col h-full border-r border-base-300 bg-base-100 transition-all duration-200 ease-in-out overflow-hidden shrink-0"
  style="width: {columnWidth}; min-width: {columnWidth};"
  role="region"
  aria-label={config.channelName}
>
  <!-- ヘッダー: collapsed時は縦向きに表示 -->
  {#if collapsed}
    <!-- 折り畳み状態: ヘッダーのみ縦向き -->
    <div class="flex flex-col items-center w-full h-full overflow-hidden">
      <!-- アクセントバー (横) -->
      <div class="accent-bar w-full h-[3px] shrink-0" style="background-color: {config.color};"></div>

      <div class="flex flex-col items-center flex-1 py-2 gap-2 w-full overflow-hidden">
        <!-- 展開ボタン -->
        <button
          class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content"
          onclick={handleToggle}
          aria-label="展開"
          title="展開"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <!-- タイムライン名 (縦書き) -->
        <div
          class="flex-1 flex items-center justify-center overflow-hidden"
          style="writing-mode: vertical-rl; text-orientation: mixed;"
        >
          <span
            class="text-xs font-semibold text-base-content/60 select-none truncate"
            title={config.channelName}
            style="max-height: 12rem;"
          >
            {config.channelName}
          </span>
        </div>

        <!-- 削除ボタン -->
        <button
          class="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error"
          onclick={handleRemove}
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
    <ColumnHeader {config} onremove={handleRemove} ontoggle={handleToggle} />

    <!-- メインエリア -->
    {#if runtime}
      <NoteList bind:this={noteList} account={runtime} {config} />
    {:else}
      <div class="flex-1 flex items-center justify-center">
        <span class="loading loading-spinner loading-sm text-base-content/30"></span>
      </div>
    {/if}

    <ColumnFooter {config} />
  {/if}
</div>
