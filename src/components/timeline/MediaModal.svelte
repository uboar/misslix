<script lang="ts">
  import type { entities } from 'misskey-js';
  import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';

  type Props = {
    open: boolean;
    files: entities.DriveFile[];
    initialIndex?: number;
    onclose: () => void;
  };

  let { open, files, initialIndex = 0, onclose }: Props = $props();

  let currentIndex = $state(initialIndex);
  let dialogEl = $state<HTMLDialogElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);

  // ウィンドウ幅（ストリップ計算用）
  let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 390);

  // スワイプ/スライド状態
  let touchStartX = $state(0);
  let touchDeltaX = $state(0);
  let isSwiping = $state(false);
  let isSlideAnimating = $state(false);
  // アニメーション中のストリップ目標 X（-windowWidth=中央, 0=右, -2*windowWidth=左）
  let slideTargetX = $state(0);

  // ズーム状態
  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);

  // ピンチ追跡
  let isPinching = $state(false);
  let pinchStartDistance = $state(0);
  let pinchStartScale = $state(1);

  // パン追跡
  let isPanning = $state(false);
  let panStartX = $state(0);
  let panStartY = $state(0);

  // 表示する3スロット: [prev, current, next]
  const visibleFiles = $derived([
    files[(currentIndex - 1 + files.length) % files.length],
    files[currentIndex],
    files[(currentIndex + 1) % files.length],
  ]);

  // ストリップの X 座標
  // 中央基点 = -windowWidth、スワイプ中は deltaX だけ動く
  const stripX = $derived(
    isSlideAnimating
      ? slideTargetX
      : (-windowWidth + (isSwiping && scale <= 1 ? touchDeltaX : 0))
  );
  const stripTransition = $derived(isSlideAnimating ? 'transform 0.28s ease' : 'none');

  // 中央画像のズームトランスフォーム
  const imgTransition = $derived((isPinching || isPanning) ? 'none' : 'transform 0.2s ease');

  $effect(() => {
    currentIndex = initialIndex;
  });

  $effect(() => {
    if (!dialogEl) return;
    if (open) {
      if (!dialogEl.open) {
        windowWidth = window.innerWidth;
        dialogEl.showModal();
      }
    } else {
      if (dialogEl.open) dialogEl.close();
      resetZoom();
    }
  });

  // 画像変更時にズームリセット
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    currentIndex;
    resetZoom();
  });

  // non-passive touchmove（ピンチ/パン中は preventDefault が必要）
  $effect(() => {
    if (!containerEl) return;

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        const distance = getPinchDistance(e.touches);
        scale = Math.min(Math.max(pinchStartScale * (distance / pinchStartDistance), 1), 5);
      } else if (e.touches.length === 1) {
        if (isPanning) {
          e.preventDefault();
          panX = e.touches[0].clientX - panStartX;
          panY = e.touches[0].clientY - panStartY;
        } else if (isSwiping) {
          touchDeltaX = e.touches[0].clientX - touchStartX;
        }
      }
    }

    containerEl.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => containerEl?.removeEventListener('touchmove', onTouchMove);
  });

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
  }

  function getPinchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ストリップをスライドアニメーションして index を更新
  function commitSlide(direction: 'prev' | 'next') {
    if (isSlideAnimating) return;
    isSlideAnimating = true;
    isSwiping = false;
    // 'next' → 左へ（-2 * windowWidth）、'prev' → 右へ（0）
    slideTargetX = direction === 'next' ? -windowWidth * 2 : 0;

    setTimeout(() => {
      // トランジションなしで index 更新 + ストリップを中央に戻す
      if (direction === 'next') {
        currentIndex = (currentIndex + 1) % files.length;
      } else {
        currentIndex = (currentIndex - 1 + files.length) % files.length;
      }
      touchDeltaX = 0;
      slideTargetX = -windowWidth;
      isSlideAnimating = false;
    }, 280);
  }

  function prev() {
    if (files.length > 1) commitSlide('prev');
  }

  function next() {
    if (files.length > 1) commitSlide('next');
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

  function handleTouchStart(e: TouchEvent) {
    if (isSlideAnimating) return;

    if (e.touches.length === 2) {
      isPinching = true;
      isSwiping = false;
      isPanning = false;
      pinchStartDistance = getPinchDistance(e.touches);
      pinchStartScale = scale;
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        isPanning = true;
        isSwiping = false;
        panStartX = e.touches[0].clientX - panX;
        panStartY = e.touches[0].clientY - panY;
      } else {
        touchStartX = e.touches[0].clientX;
        touchDeltaX = 0;
        isSwiping = true;
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (e.touches.length < 2 && isPinching) {
      isPinching = false;
      if (scale < 1.1) {
        scale = 1;
        panX = 0;
        panY = 0;
      }
    }

    if (e.touches.length === 0) {
      isPanning = false;

      if (isSwiping && scale <= 1) {
        const threshold = 50;
        if (touchDeltaX < -threshold && files.length > 1) {
          commitSlide('next');
        } else if (touchDeltaX > threshold && files.length > 1) {
          commitSlide('prev');
        } else {
          // 閾値未満: 元の位置にスナップバック
          isSwiping = false;
          touchDeltaX = 0;
        }
      } else {
        isSwiping = false;
      }
    }
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
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={containerEl}
    class="relative w-screen h-screen overflow-hidden"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    role="presentation"
  >
    <!-- 閉じるボタン -->
    <button
      class="absolute top-4 right-4 z-20 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-0"
      onclick={onclose}
      aria-label="閉じる"
    >
      <X class="w-4 h-4" aria-hidden="true" />
    </button>

    <!-- 画像ストリップ: [prev][current][next] を横並び -->
    <div
      class="flex h-full"
      style="width: {windowWidth * 3}px; transform: translateX({stripX}px); transition: {stripTransition}; will-change: transform;"
    >
      {#each visibleFiles as file, slotIndex}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="flex-shrink-0 flex items-center justify-center p-4"
          style="width: {windowWidth}px; height: 100%;"
          onclick={(e) => { if (e.target === e.currentTarget && slotIndex === 1) onclose(); }}
          role="presentation"
        >
          {#if file}
            <img
              src={file.url}
              alt={file.comment || file.name}
              class="max-w-full max-h-[90vh] object-contain select-none"
              style={slotIndex === 1
                ? `transform: translate(${panX}px, ${panY}px) scale(${scale}); transition: ${imgTransition}; touch-action: none;`
                : 'touch-action: none; opacity: 0.6;'}
              draggable="false"
              onclick={(e) => e.stopPropagation()}
            />
          {/if}
        </div>
      {/each}
    </div>

    <!-- ナビゲーションボタン -->
    {#if files.length > 1}
      <button
        class="absolute left-3 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-0"
        onclick={prev}
        aria-label="前の画像"
      >
        <ChevronLeft class="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        class="absolute right-3 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-0"
        onclick={next}
        aria-label="次の画像"
      >
        <ChevronRight class="w-4 h-4" aria-hidden="true" />
      </button>

      <!-- インジケーター -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {#each files as _, i}
          <button
            class="w-2 h-2 rounded-full transition-colors {i === currentIndex ? 'bg-white' : 'bg-white/40'}"
            onclick={() => { currentIndex = i; }}
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
