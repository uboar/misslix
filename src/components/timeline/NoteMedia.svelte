<script lang="ts">
  import type { entities } from 'misskey-js';
  import type { ColumnConfig } from '$lib/types';
  import MediaModal from './MediaModal.svelte';

  type Props = {
    files: entities.DriveFile[];
    config: ColumnConfig;
  };

  let { files, config }: Props = $props();

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

  // 読み込み状態 (スケルトン表示用)
  let imageLoaded = $state<Record<string, boolean>>({});
  let videoLoaded = $state<Record<string, boolean>>({});

  function markImageLoaded(fileId: string) {
    imageLoaded = { ...imageLoaded, [fileId]: true };
  }

  function markVideoLoaded(fileId: string) {
    videoLoaded = { ...videoLoaded, [fileId]: true };
  }
</script>

{#if files.length > 0}
  <div class="note-media mt-1.5 flex flex-col gap-1">

    <!-- 画像カルーセル -->
    {#if imageFiles.length === 1}
      <!-- 単一画像 -->
      {@const file = imageFiles[0]}
      <div
        class="relative overflow-hidden rounded-md bg-base-300/40 {!imageLoaded[file.id] ? 'animate-pulse' : ''}"
        style="{imageLoaded[file.id] ? 'max-height' : 'height'}: {mediaSize}px;"
      >
        {#if shouldBlur(file)}
          <!-- NSFWぼかし -->
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
              class="w-full object-cover blur-xl scale-105 transition-all duration-300"
              style="max-height: {mediaSize}px;"
              loading="lazy"
              onload={() => markImageLoaded(file.id)}
              onerror={() => markImageLoaded(file.id)}
            />
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-base-300/60 backdrop-blur-sm">
              <svg class="w-5 h-5 text-base-content/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round"/>
              </svg>
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
              class="w-full object-contain rounded-md transition-opacity duration-300 {imageLoaded[file.id] ? 'opacity-100 hover:opacity-90' : 'opacity-0'}"
              style="max-height: {mediaSize}px;"
              loading="lazy"
              onload={() => markImageLoaded(file.id)}
              onerror={() => markImageLoaded(file.id)}
            />
          </button>
        {/if}
      </div>

    {:else if imageFiles.length > 1}
      <!-- 複数画像カルーセル -->
      <div
        class="relative overflow-hidden rounded-md bg-base-300/40 {!imageLoaded[currentCarouselFile?.id] ? 'animate-pulse' : ''}"
        style="{imageLoaded[currentCarouselFile?.id] ? 'max-height' : 'height'}: {mediaSize}px;"
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
                onload={() => markImageLoaded(currentCarouselFile.id)}
                onerror={() => markImageLoaded(currentCarouselFile.id)}
              />
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-base-300/60 backdrop-blur-sm">
                <svg class="w-5 h-5 text-base-content/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round"/>
                </svg>
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
                class="w-full object-contain rounded-md transition-opacity duration-300 {imageLoaded[currentCarouselFile.id] ? 'opacity-100 hover:opacity-90' : 'opacity-0'}"
                style="max-height: {mediaSize}px;"
                loading="lazy"
                onload={() => markImageLoaded(currentCarouselFile.id)}
                onerror={() => markImageLoaded(currentCarouselFile.id)}
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
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button
              class="absolute right-1 top-1/2 -translate-y-1/2 btn btn-circle btn-xs bg-base-100/70 hover:bg-base-100 border-0"
              onclick={next}
              aria-label="次の画像"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
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
              <svg class="w-5 h-5 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="text-xs text-base-content/50">NSFW動画</span>
            </div>
          {:else}
            <!-- svelte-ignore a11y_media_has_caption -->
            <div
              class="relative {!videoLoaded[file.id] ? 'animate-pulse bg-base-300/40 rounded-md' : ''}"
              style="{videoLoaded[file.id] ? '' : `height: ${mediaSize}px;`}"
            >
              <video
                src={file.url}
                controls
                preload="metadata"
                class="w-full rounded-md transition-opacity duration-300 {videoLoaded[file.id] ? 'opacity-100' : 'opacity-0'}"
                style="max-height: {mediaSize}px;"
                onloadedmetadata={() => markVideoLoaded(file.id)}
                onerror={() => markVideoLoaded(file.id)}
              ></video>
              {#if !videoLoaded[file.id]}
                <div class="absolute inset-0 flex items-center justify-center">
                  <svg class="w-8 h-8 text-base-content/20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              {/if}
            </div>
          {/if}
        {:else if isAudio(file)}
          <!-- 音声プレーヤー -->
          <div class="flex items-center gap-2 bg-base-200 rounded-md p-2">
            <svg class="w-4 h-4 text-base-content/50 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
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
            <svg class="w-4 h-4 text-base-content/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="14,2 14,8 20,8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
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
