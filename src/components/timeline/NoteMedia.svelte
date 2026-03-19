<script lang="ts">
  import type { entities } from 'misskey-js';
  import type { ColumnConfig } from '$lib/types';

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
</script>

{#if files.length > 0}
  <div class="note-media mt-1.5 flex flex-col gap-1">

    <!-- 画像カルーセル -->
    {#if imageFiles.length === 1}
      <!-- 単一画像 -->
      {@const file = imageFiles[0]}
      <div class="relative overflow-hidden rounded-md" style="max-height: {mediaSize}px;">
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
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <img
              src={file.thumbnailUrl ?? file.url}
              alt={file.comment || file.name}
              class="w-full object-cover rounded-md transition-opacity hover:opacity-90"
              style="max-height: {mediaSize}px;"
              loading="lazy"
            />
          </a>
        {/if}
      </div>

    {:else if imageFiles.length > 1}
      <!-- 複数画像カルーセル -->
      <div class="relative overflow-hidden rounded-md" style="max-height: {mediaSize}px;">
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
                <svg class="w-5 h-5 text-base-content/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round"/>
                </svg>
                <span class="text-[0.6rem] text-base-content/60">NSFW — タップして表示</span>
              </div>
            </div>
          {:else}
            <a href={currentCarouselFile.url} target="_blank" rel="noopener noreferrer">
              <img
                src={currentCarouselFile.thumbnailUrl ?? currentCarouselFile.url}
                alt={currentCarouselFile.comment || currentCarouselFile.name}
                class="w-full object-cover rounded-md transition-opacity hover:opacity-90"
                style="max-height: {mediaSize}px;"
                loading="lazy"
              />
            </a>
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
