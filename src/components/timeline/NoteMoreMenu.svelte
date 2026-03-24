<script lang="ts">
  import type { AccountRuntime } from '$lib/types';

  type Props = {
    noteId: string;
    noteText: string | null;
    hostUrl: string;
    runtime: AccountRuntime;
    positionStyle: string;
    onclose: () => void;
  };

  const { noteId, noteText, hostUrl, runtime, positionStyle, onclose }: Props = $props();

  let busy = $state(false);
  let message = $state('');

  // ノート内容をコピー
  async function copyContent() {
    if (!noteText) return;
    try {
      await navigator.clipboard.writeText(noteText);
      message = 'コピーしました';
      setTimeout(() => { message = ''; onclose(); }, 800);
    } catch {
      message = 'コピーに失敗しました';
    }
  }

  // ノートリンクをコピー
  async function copyLink() {
    const url = `${hostUrl}/notes/${noteId}`;
    try {
      await navigator.clipboard.writeText(url);
      message = 'リンクをコピーしました';
      setTimeout(() => { message = ''; onclose(); }, 800);
    } catch {
      message = 'コピーに失敗しました';
    }
  }

  // お気に入り追加
  async function toggleFavorite() {
    if (busy) return;
    busy = true;
    try {
      await runtime.cli.request('notes/favorites/create', { noteId } as Parameters<typeof runtime.cli.request>[1]);
      message = 'お気に入りに追加しました';
      setTimeout(() => { message = ''; onclose(); }, 800);
    } catch (err: unknown) {
      // 既にお気に入りの場合は削除
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('ALREADY_FAVORITED') || errorMessage.includes('already')) {
        try {
          await runtime.cli.request('notes/favorites/delete', { noteId } as Parameters<typeof runtime.cli.request>[1]);
          message = 'お気に入りを解除しました';
          setTimeout(() => { message = ''; onclose(); }, 800);
        } catch {
          message = 'お気に入り解除に失敗しました';
        }
      } else {
        message = 'お気に入り追加に失敗しました';
      }
    } finally {
      busy = false;
    }
  }

  // クリップに追加
  let clipMode = $state(false);
  let clips = $state<{ id: string; name: string }[]>([]);
  let loadingClips = $state(false);

  async function showClips() {
    if (loadingClips) return;
    loadingClips = true;
    clipMode = true;
    try {
      const res = await runtime.cli.request('clips/list', {} as Parameters<typeof runtime.cli.request>[1]);
      clips = (res as unknown as { id: string; name: string }[]);
    } catch {
      message = 'クリップ一覧の取得に失敗しました';
    } finally {
      loadingClips = false;
    }
  }

  async function addToClip(clipId: string) {
    if (busy) return;
    busy = true;
    try {
      await runtime.cli.request('clips/add-note', { clipId, noteId } as Parameters<typeof runtime.cli.request>[1]);
      message = 'クリップに追加しました';
      setTimeout(() => { message = ''; onclose(); }, 800);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('ALREADY_CLIPPED') || errorMessage.includes('already')) {
        message = '既にクリップに追加済みです';
      } else {
        message = 'クリップ追加に失敗しました';
      }
    } finally {
      busy = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (clipMode) {
        clipMode = false;
      } else {
        onclose();
      }
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-40"
  onclick={handleBackdropClick}
>
  <div
    class="fixed z-50 rounded-lg shadow-xl border border-base-300 bg-base-100 py-1"
    style="min-width: 180px; max-width: 240px; {positionStyle}"
    role="menu"
    aria-label="ノートメニュー"
    onkeydown={handleKeydown}
  >
    {#if message}
      <div class="px-3 py-2 text-xs text-center text-base-content/70">{message}</div>
    {:else if clipMode}
      <!-- クリップ選択 -->
      <div class="px-3 py-1.5 text-[0.65rem] text-base-content/40 font-semibold">クリップを選択</div>
      {#if loadingClips}
        <div class="flex items-center justify-center py-3">
          <span class="loading loading-spinner loading-xs"></span>
        </div>
      {:else if clips.length === 0}
        <div class="px-3 py-2 text-xs text-base-content/40">クリップがありません</div>
      {:else}
        {#each clips as clip}
          <button
            class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors disabled:opacity-40"
            disabled={busy}
            onclick={() => addToClip(clip.id)}
            role="menuitem"
          >
            <svg class="w-3.5 h-3.5 shrink-0 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <span class="truncate">{clip.name}</span>
          </button>
        {/each}
      {/if}
      <div class="border-t border-base-300/50 mt-1 pt-1">
        <button
          class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-base-content/50 hover:bg-base-200 transition-colors"
          onclick={() => { clipMode = false; }}
          role="menuitem"
        >
          <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          戻る
        </button>
      </div>
    {:else}
      <!-- メインメニュー -->
      <button
        class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
        onclick={copyContent}
        disabled={!noteText}
        role="menuitem"
      >
        <svg class="w-3.5 h-3.5 shrink-0 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ノート内容をコピー
      </button>
      <button
        class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
        onclick={copyLink}
        role="menuitem"
      >
        <svg class="w-3.5 h-3.5 shrink-0 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ノートリンクをコピー
      </button>
      <div class="border-t border-base-300/30 my-0.5"></div>
      <button
        class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
        onclick={toggleFavorite}
        disabled={busy}
        role="menuitem"
      >
        <svg class="w-3.5 h-3.5 shrink-0 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        お気に入り
      </button>
      <button
        class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
        onclick={showClips}
        disabled={busy}
        role="menuitem"
      >
        <svg class="w-3.5 h-3.5 shrink-0 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
        クリップに追加
      </button>
    {/if}
  </div>
</div>

<style>
  .menu-item:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
