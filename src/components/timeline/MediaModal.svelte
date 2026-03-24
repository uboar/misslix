<script lang="ts">
  import type { entities } from 'misskey-js';

  type Props = {
    open: boolean;
    files: entities.DriveFile[];
    initialIndex?: number;
    onclose: () => void;
  };

  let { open, files, initialIndex = 0, onclose }: Props = $props();

  let currentIndex = $state(initialIndex);
  let dialogEl = $state<HTMLDialogElement | null>(null);

  // スワイプ状態
  let touchStartX = $state(0);
  let touchDeltaX = $state(0);
  let isSwiping = $state(false);

  const currentFile = $derived(files[currentIndex]);

  $effect(() => {
    currentIndex = initialIndex;
  });

  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      if (!dialogEl.open) dialogEl.showModal();
    } else {
      if (dialogEl.open) dialogEl.close();
    }
  });

  function prev() {
    currentIndex = (currentIndex - 1 + files.length) % files.length;
  }

  function next() {
    currentIndex = (currentIndex + 1) % files.length;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
    } else if (e.key === 'ArrowLeft') {
      prev();
    } else if (e.key === 'ArrowRight') {
      next();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    // 画像やボタン以外（オーバーレイ部分）をクリックしたら閉じる
    const target = e.target as HTMLElement;
    if (target === dialogEl || target.closest('.modal-backdrop-area')) {
      onclose();
    }
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchDeltaX = 0;
    isSwiping = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isSwiping) return;
    touchDeltaX = e.touches[0].clientX - touchStartX;
  }

  function handleTouchEnd() {
    if (!isSwiping) return;
    isSwiping = false;
    const threshold = 50;
    if (touchDeltaX < -threshold) {
      next();
    } else if (touchDeltaX > threshold) {
      prev();
    }
    touchDeltaX = 0;
  }
</script>

<style>
  dialog {
    transition: none !important;
    animation: none !important;
  }
  dialog::backdrop {
    transition: none !important;
    animation: none !important;
  }
</style>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialogEl}
  class="modal bg-black/80 backdrop-blur-sm"
  style="transition: none; animation: none;"
  onkeydown={handleKeydown}
  onclick={handleBackdropClick}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-backdrop-area relative flex items-center justify-center w-screen h-screen p-4"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
    role="presentation"
  >
    <!-- 閉じるボタン -->
    <button
      class="absolute top-4 right-4 z-20 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-0"
      onclick={onclose}
      aria-label="閉じる"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- メイン画像 -->
    {#if currentFile}
      <img
        src={currentFile.url}
        alt={currentFile.comment || currentFile.name}
        class="max-w-full max-h-[90vh] object-contain select-none"
        style="transform: translateX({isSwiping ? touchDeltaX * 0.3 : 0}px); transition: {isSwiping ? 'none' : 'transform 0.2s ease'};"
        draggable="false"
      />
    {/if}

    <!-- ナビゲーションボタン -->
    {#if files.length > 1}
      <button
        class="absolute left-3 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-0"
        onclick={(e) => { e.stopPropagation(); prev(); }}
        aria-label="前の画像"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button
        class="absolute right-3 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-0"
        onclick={(e) => { e.stopPropagation(); next(); }}
        aria-label="次の画像"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- インジケーター -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {#each files as _, i}
          <button
            class="w-2 h-2 rounded-full transition-colors {i === currentIndex ? 'bg-white' : 'bg-white/40'}"
            onclick={(e) => { e.stopPropagation(); currentIndex = i; }}
            aria-label={`画像 ${i + 1}`}
          ></button>
        {/each}
      </div>
    {/if}

    <!-- カウンター -->
    {#if files.length > 1}
      <div class="absolute top-4 left-4 z-10 text-sm text-white/70 bg-black/40 rounded-full px-3 py-1">
        {currentIndex + 1} / {files.length}
      </div>
    {/if}
  </div>
</dialog>
