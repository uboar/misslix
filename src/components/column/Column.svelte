<script lang="ts">
  import type { ColumnConfig } from '$lib/types';
  import { COLUMN_WIDTH_MAP } from '$lib/types';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import ColumnHeader from './ColumnHeader.svelte';
  import ColumnFooter from './ColumnFooter.svelte';

  type Props = {
    config: ColumnConfig;
  };

  let { config }: Props = $props();

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

    <!-- メインエリア (Phase 4でNoteListに置換) -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden p-3">
      <div class="flex flex-col items-center justify-center h-full min-h-32 gap-3 opacity-40">
        <svg
          class="w-8 h-8 text-base-content/30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18" />
        </svg>
        <p class="text-xs text-base-content/50 text-center select-none leading-relaxed">
          ノートがここに表示されます<br />
          <span class="text-base-content/30">(Phase 4で実装)</span>
        </p>
      </div>
    </div>

    <ColumnFooter {config} />
  {/if}
</div>
