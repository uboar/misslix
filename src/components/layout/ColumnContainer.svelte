<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import Column from '../column/Column.svelte';
  import MergeColumn from '../column/MergeColumn.svelte';
  import MergeNotificationColumn from '../column/MergeNotificationColumn.svelte';
  import { Plus, Columns2 } from 'lucide-svelte';

  type Props = {
    onadd?: () => void;
    runtimes?: Map<number, AccountRuntime>;
    onpost?: () => void;
  };

  let { onadd, runtimes = new Map(), onpost }: Props = $props();

  let columns = $derived(timelineStore.columns);

  // ─── ドラッグ&ドロップ状態 ───
  let dragFromIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);
  let dropSide = $state<'left' | 'right' | null>(null);

  function handleDragStart(index: number, e: DragEvent) {
    dragFromIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragEnd() {
    dragFromIndex = null;
    dropTargetIndex = null;
    dropSide = null;
  }

  function handleDragOver(index: number, e: DragEvent) {
    if (dragFromIndex === null) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    // カラム要素の中心を基準に左右を判定
    const target = (e.currentTarget as HTMLElement);
    const rect = target.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const side = e.clientX < midX ? 'left' : 'right';

    dropTargetIndex = index;
    dropSide = side;
  }

  function handleDragLeave(index: number, e: DragEvent) {
    // 子要素への移動は無視
    const related = e.relatedTarget as HTMLElement | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;

    if (dropTargetIndex === index) {
      dropTargetIndex = null;
      dropSide = null;
    }
  }

  function handleDrop(index: number, e: DragEvent) {
    e.preventDefault();
    if (dragFromIndex === null) return;

    // ドロップ先のインデックスを計算
    let toIndex = index;
    if (dropSide === 'right') {
      toIndex = index + 1;
    }

    // ドラッグ元が手前にある場合、削除後にインデックスがずれるので補正
    if (dragFromIndex < toIndex) {
      toIndex -= 1;
    }

    if (dragFromIndex !== toIndex) {
      timelineStore.moveColumn(dragFromIndex, toIndex);
    }

    dragFromIndex = null;
    dropTargetIndex = null;
    dropSide = null;
  }

  function getDropIndicator(index: number): 'left' | 'right' | null {
    if (dragFromIndex === null || dropTargetIndex !== index) return null;
    if (dragFromIndex === index) return null;
    return dropSide;
  }
</script>

<div class="column-container flex-1 flex flex-row overflow-x-auto overflow-y-hidden h-full">
  {#if columns.length === 0}
    <!-- カラムが0件の場合 -->
    <div class="flex-1 flex flex-col items-center justify-center gap-4 text-base-content/40">
      <Columns2 class="w-16 h-16 opacity-30" aria-hidden="true" />
      <div class="text-center">
        <p class="text-sm font-medium text-base-content/50">カラムを追加してください</p>
        <p class="text-xs text-base-content/30 mt-1">右下の「カラム追加」ボタンから始めましょう</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick={onadd}>
        <Plus class="w-3.5 h-3.5 mr-1" aria-hidden="true" />
        カラムを追加
      </button>
    </div>
  {:else}
    <!-- カラム一覧 -->
    {#each columns as config, index (config.id)}
      {@const indicator = getDropIndicator(index)}
      <div class="relative flex flex-row shrink-0" style="height: 100%;">
        <!-- 左側ドロップインジケーター -->
        {#if indicator === 'left'}
          <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary z-50 rounded-full"></div>
        {/if}

        {#if config.channel === 'mergeTimeline'}
          <MergeColumn
            {config}
            {runtimes}
            {onpost}
            ondragstart={(e) => handleDragStart(index, e)}
            ondragend={handleDragEnd}
            ondragover={(e) => handleDragOver(index, e)}
            ondragleave={(e) => handleDragLeave(index, e)}
            ondrop={(e) => handleDrop(index, e)}
            dropIndicator={dragFromIndex === index ? null : indicator}
          />
        {:else if config.channel === 'mergeNotificationTimeline'}
          <MergeNotificationColumn
            {config}
            {runtimes}
            ondragstart={(e) => handleDragStart(index, e)}
            ondragend={handleDragEnd}
            ondragover={(e) => handleDragOver(index, e)}
            ondragleave={(e) => handleDragLeave(index, e)}
            ondrop={(e) => handleDrop(index, e)}
            dropIndicator={dragFromIndex === index ? null : indicator}
          />
        {:else}
          <Column
            {config}
            runtime={runtimes.get(config.accountId)}
            ondragstart={(e) => handleDragStart(index, e)}
            ondragend={handleDragEnd}
            ondragover={(e) => handleDragOver(index, e)}
            ondragleave={(e) => handleDragLeave(index, e)}
            ondrop={(e) => handleDrop(index, e)}
            dropIndicator={dragFromIndex === index ? null : indicator}
          />
        {/if}

        <!-- 右側ドロップインジケーター -->
        {#if indicator === 'right'}
          <div class="absolute right-0 top-0 bottom-0 w-1 bg-primary z-50 rounded-full"></div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
