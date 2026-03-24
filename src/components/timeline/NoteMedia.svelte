<script lang="ts">
  import type { entities } from 'misskey-js';
  import type { ColumnConfig, MediaDisplayMode } from '$lib/types';
  import MediaModal from './MediaModal.svelte';
  import { EyeOff, ChevronLeft, ChevronRight, Music, FileText } from 'lucide-svelte';

  type Props = {
    files: entities.DriveFile[];
    config: ColumnConfig;
    mediaDisplayMode?: MediaDisplayMode;
  };

  let { files, config, mediaDisplayMode = 'grid' }: Props = $props();

  // メディアサイズ (px)
  const mediaSize = $derived(config.noteDisplay.mediaSize);
  const nsfwShown = $derived(config.noteDisplay.nsfwShown);

  // NSFWぼかし状態 (ファイルごと)
  let nsfwRevealed = $state<Record<string, boolean>>({});

  function isImage(file: entities.DriveFile): boolean {
    return file.type?.startsWith('image/') ?? false;
  }

  function isVideo(file: entities.DriveFile): boolean {
    return file.type?.startsWith('video/') ?? false;
  }

  function isAudio(file: entities.DriveFile): boolean {
    return file.type?.startsWith('audio/') ?? false;
  }

  function isNsfw(file: entities.DriveFile): boolean {
    return file.isSensitive ?? false;
  }

  function shouldBlur(file: entities.DriveFile): boolean {
    return isNsfw(file) && !nsfwShown && !nsfwRevealed[file.id];
  }

  function revealNsfw(fileId: string) {
    nsfwRevealed = { ...nsfwRevealed, [fileId]: true };
  }

  // カルーセル状態
  let currentIndex = $state(0);
  const imageFiles = $derived(files.filter(isImage));
  const nonImageFiles = $derived(files.filter(f => !isImage(f)));
  const currentCarouselFile = $derived(imageFiles[currentIndex] ?? imageFiles[0]);

  function prev() {
    currentIndex = (currentIndex - 1 + imageFiles.length) % imageFiles.length;
  }

  function next() {
    currentIndex = (currentIndex + 1) % imageFiles.length;
  }

  // スワイプ
  let touchStartX = $state(0);
  let touchDeltaX = $state(0);
  let isSwiping = $state(false);

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

  // モーダル状態
  let modalOpen = $state(false);
  let modalInitialIndex = $state(0);

  function openModal(index: number) {
    modalInitialIndex = index;
    modalOpen = true;
  }

  // グリッドレイアウト計算
  // imageFiles の件数に応じてグリッドクラスを返す
  function getGridClass(count: number): string {
    if (count === 2) return 'grid-2';
    if (count === 3) return 'grid-3';
    if (count === 4) return 'grid-4';
    return 'grid-5plus';
  }

  // 5枚以上の場合は最初の4枚を表示し、残りは+N表示
  const gridImageFiles = $derived(imageFiles.slice(0, 4));
  const extraCount = $derived(Math.max(0, imageFiles.length - 4));
</script>

{#if files.length > 0}
  <div class="note-media mt-1.5 flex flex-col gap-1">

    {#if mediaDisplayMode === 'grid'}
      <!-- グリッドモード -->
      {#if imageFiles.length === 1}
        <!-- 単一画像 -->
        {@const file = imageFiles[0]}
        <div class="relative overflow-hidden rounded-md bg-base-300/30" style="max-height: {mediaSize}px;">
          {#if shouldBlur(file)}
            <div
              class="relative cursor-pointer"
              onclick={() => revealNsfw(file.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && revealNsfw(file.id)}
              aria-label="センシティブなコンテンツ — クリックして表示"
            >
              <img
                src={file.thumbnailUrl ?? file.url}
                alt={file.comment || file.name}
                class="w-full object-cover blur-xl scale-105"
                style="max-height: {mediaSize}px;"
                loading="lazy"
              />
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-base-300/60 backdrop-blur-sm">
                <EyeOff class="w-5 h-5 text-base-content/60" aria-hidden="true" />
                <span class="text-[0.6rem] text-base-content/60 font-medium">NSFW — タップして表示</span>
              </div>
            </div>
          {:else}
            <button
              class="w-full cursor-pointer border-0 bg-transparent p-0"
              onclick={() => openModal(0)}
              aria-label="画像を拡大表示"
            >
              <img
                src={file.thumbnailUrl ?? file.url}
                alt={file.comment || file.name}
                class="w-full object-contain rounded-md transition-opacity hover:opacity-90"
                style="max-height: {mediaSize}px;"
                loading="lazy"
              />
            </button>
          {/if}
        </div>

      {:else if imageFiles.length > 1}
        <!-- 複数画像グリッド -->
        <div
          class="media-grid {getGridClass(imageFiles.length)} rounded-md overflow-hidden"
          style="max-height: {mediaSize}px;"
        >
          {#each gridImageFiles as file, i (file.id)}
            <div class="media-grid-item relative overflow-hidden bg-base-300/30 {imageFiles.length === 3 && i === 0 ? 'grid-item-large' : ''}">
              {#if shouldBlur(file)}
                <div
                  class="w-full h-full relative cursor-pointer"
                  onclick={() => revealNsfw(file.id)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && revealNsfw(file.id)}
                  aria-label="センシティブなコンテンツ — クリックして表示"
                >
                  <img
                    src={file.thumbnailUrl ?? file.url}
                    alt={file.comment || file.name}
                    class="w-full h-full object-cover blur-xl scale-105"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-base-300/60 backdrop-blur-sm">
                    <EyeOff class="w-4 h-4 text-base-content/60" aria-hidden="true" />
                    <span class="text-[0.55rem] text-base-content/60 font-medium">NSFW</span>
                  </div>
                </div>
              {:else}
                <button
                  class="w-full h-full cursor-pointer border-0 bg-transparent p-0 relative"
                  onclick={() => openModal(i)}
                  aria-label="画像を拡大表示"
                >
                  <img
                    src={file.thumbnailUrl ?? file.url}
                    alt={file.comment || file.name}
                    class="w-full h-full object-cover transition-opacity hover:opacity-90"
                    loading="lazy"
                  />
                  <!-- 5枚以上の最後のセルに +N バッジ -->
                  {#if i === 3 && extraCount > 0}
                    <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span class="text-white font-bold text-lg">+{extraCount}</span>
                    </div>
                  {/if}
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

    {:else}
      <!-- カルーセルモード (従来通り) -->
      {#if imageFiles.length === 1}
        <!-- 単一画像 -->
        {@const file = imageFiles[0]}
        <div class="relative overflow-hidden rounded-md bg-base-300/30" style="max-height: {mediaSize}px;">
          {#if shouldBlur(file)}
            <div
              class="relative cursor-pointer"
              onclick={() => revealNsfw(file.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && revealNsfw(file.id)}
              aria-label="センシティブなコンテンツ — クリックして表示"
            >
              <img
                src={file.thumbnailUrl ?? file.url}
                alt={file.comment || file.name}
                class="w-full object-cover blur-xl scale-105"
                style="max-height: {mediaSize}px;"
                loading="lazy"
              />
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-base-300/60 backdrop-blur-sm">
                <EyeOff class="w-5 h-5 text-base-content/60" aria-hidden="true" />
                <span class="text-[0.6rem] text-base-content/60 font-medium">NSFW — タップして表示</span>
              </div>
            </div>
          {:else}
            <button
              class="w-full cursor-pointer border-0 bg-transparent p-0"
              onclick={() => openModal(0)}
              aria-label="画像を拡大表示"
            >
              <img
                src={file.thumbnailUrl ?? file.url}
                alt={file.comment || file.name}
                class="w-full object-contain rounded-md transition-opacity hover:opacity-90"
                style="max-height: {mediaSize}px;"
                loading="lazy"
              />
            </button>
          {/if}
        </div>

      {:else if imageFiles.length > 1}
        <!-- 複数画像カルーセル -->
        <div
          class="relative overflow-hidden rounded-md bg-base-300/30"
          style="max-height: {mediaSize}px;"
          ontouchstart={handleTouchStart}
          ontouchmove={handleTouchMove}
          ontouchend={handleTouchEnd}
          role="presentation"
        >
          <div class="relative">
            {#if shouldBlur(currentCarouselFile)}
              <div
                class="relative cursor-pointer"
                onclick={() => revealNsfw(currentCarouselFile.id)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && revealNsfw(currentCarouselFile.id)}
                aria-label="センシティブなコンテンツ — クリックして表示"
              >
                <img
                  src={currentCarouselFile.thumbnailUrl ?? currentCarouselFile.url}
                  alt={currentCarouselFile.comment || currentCarouselFile.name}
                  class="w-full object-cover blur-xl scale-105"
                  style="max-height: {mediaSize}px;"
                  loading="lazy"
                />
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-base-300/60 backdrop-blur-sm">
                  <EyeOff class="w-5 h-5 text-base-content/60" aria-hidden="true" />
                  <span class="text-[0.6rem] text-base-content/60">NSFW — タップして表示</span>
                </div>
              </div>
            {:else}
              <button
                class="w-full cursor-pointer border-0 bg-transparent p-0"
                onclick={() => openModal(currentIndex)}
                aria-label="画像を拡大表示"
                style="transform: translateX({isSwiping ? touchDeltaX * 0.3 : 0}px); transition: {isSwiping ? 'none' : 'transform 0.2s ease'};"
              >
                <img
                  src={currentCarouselFile.thumbnailUrl ?? currentCarouselFile.url}
                  alt={currentCarouselFile.comment || currentCarouselFile.name}
                  class="w-full object-contain rounded-md transition-opacity hover:opacity-90"
                  style="max-height: {mediaSize}px;"
                  loading="lazy"
                />
              </button>
            {/if}

            <!-- カルーセルナビゲーション -->
            {#if imageFiles.length > 1}
              <button
                class="absolute left-1 top-1/2 -translate-y-1/2 btn btn-circle btn-xs bg-base-100/70 hover:bg-base-100 border-0"
                onclick={prev}
                aria-label="前の画像"
              >
                <ChevronLeft class="w-3 h-3" aria-hidden="true" />
              </button>
              <button
                class="absolute right-1 top-1/2 -translate-y-1/2 btn btn-circle btn-xs bg-base-100/70 hover:bg-base-100 border-0"
                onclick={next}
                aria-label="次の画像"
              >
                <ChevronRight class="w-3 h-3" aria-hidden="true" />
              </button>

              <!-- インジケーター -->
              <div class="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                {#each imageFiles as _, i}
                  <button
                    class="w-1.5 h-1.5 rounded-full transition-colors {i === currentIndex ? 'bg-white' : 'bg-white/40'}"
                    onclick={() => { currentIndex = i; }}
                    aria-label={`画像 ${i + 1}`}
                  ></button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}

    <!-- 動画・音声・その他ファイル -->
    {#each nonImageFiles as file}
      <div class="rounded-md overflow-hidden">
        {#if isVideo(file)}
          <!-- 動画プレーヤー -->
          {#if shouldBlur(file)}
            <div
              class="relative cursor-pointer flex items-center justify-center bg-base-300 rounded-md p-4 gap-2"
              onclick={() => revealNsfw(file.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && revealNsfw(file.id)}
              aria-label="センシティブな動画 — クリックして表示"
            >
              <EyeOff class="w-5 h-5 text-base-content/40" aria-hidden="true" />
              <span class="text-xs text-base-content/50">NSFW動画</span>
            </div>
          {:else}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video
              src={file.url}
              controls
              preload="metadata"
              class="w-full rounded-md"
              style="max-height: {mediaSize}px;"
            ></video>
          {/if}
        {:else if isAudio(file)}
          <!-- 音声プレーヤー -->
          <div class="flex items-center gap-2 bg-base-200 rounded-md p-2">
            <Music class="w-4 h-4 text-base-content/50 shrink-0" aria-hidden="true" />
            <audio src={file.url} controls preload="metadata" class="flex-1 h-7"></audio>
          </div>
        {:else}
          <!-- その他ファイル -->
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 bg-base-200 hover:bg-base-300 rounded-md p-2 transition-colors"
          >
            <FileText class="w-4 h-4 text-base-content/50 shrink-0" aria-hidden="true" />
            <span class="text-xs text-base-content/70 truncate">{file.name}</span>
            {#if file.size}
              <span class="text-[0.6rem] text-base-content/40 shrink-0 ml-auto">
                {(file.size / 1024).toFixed(0)}KB
              </span>
            {/if}
          </a>
        {/if}
      </div>
    {/each}

  </div>
{/if}

<!-- 画像モーダル -->
{#if imageFiles.length > 0}
  <MediaModal
    open={modalOpen}
    files={imageFiles}
    initialIndex={modalInitialIndex}
    onclose={() => { modalOpen = false; }}
  />
{/if}

<style>
  /* グリッドレイアウト */
  .media-grid {
    display: grid;
    gap: 2px;
    width: 100%;
    aspect-ratio: 16 / 9;
  }

  /* 2枚: 左右並べ */
  .grid-2 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }

  /* 3枚: 左に大きく1枚、右に上下2枚 */
  .grid-3 {
    grid-template-columns: 2fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .grid-3 .grid-item-large {
    grid-row: 1 / 3;
  }

  /* 4枚: 2x2グリッド */
  .grid-4 {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  /* 5枚以上: 最初の4枚を2x2で表示し、4枚目に +N バッジ */
  .grid-5plus {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .media-grid-item {
    min-height: 0;
    min-width: 0;
  }

  .media-grid-item img {
    display: block;
  }

  .media-grid-item button {
    display: block;
  }
</style>
