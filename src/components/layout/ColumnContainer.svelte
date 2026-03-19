<script lang="ts">
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import Column from '../column/Column.svelte';

  type Props = {
    onadd?: () => void;
  };

  let { onadd }: Props = $props();

  let columns = $derived(timelineStore.columns);
</script>

<div class="column-container flex-1 flex flex-row overflow-x-auto overflow-y-hidden h-full">
  {#if columns.length === 0}
    <!-- カラムが0件の場合 -->
    <div class="flex-1 flex flex-col items-center justify-center gap-4 text-base-content/40">
      <svg
        class="w-16 h-16 opacity-30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="5" height="18" rx="1" />
        <rect x="9.5" y="3" width="5" height="18" rx="1" />
        <rect x="17" y="3" width="5" height="18" rx="1" />
        <path d="M17.5 7v10M22.5 12h-5" stroke-width="1.5" />
      </svg>
      <div class="text-center">
        <p class="text-sm font-medium text-base-content/50">カラムを追加してください</p>
        <p class="text-xs text-base-content/30 mt-1">上部の「カラム追加」ボタンから始めましょう</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick={onadd}>
        <svg class="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        カラムを追加
      </button>
    </div>
  {:else}
    <!-- カラム一覧 -->
    {#each columns as config (config.id)}
      <Column {config} />
    {/each}
  {/if}
</div>
