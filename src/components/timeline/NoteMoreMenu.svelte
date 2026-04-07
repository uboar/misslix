<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import { Clipboard, Link2, Star, ArrowLeft, Trash2 } from 'lucide-svelte';

  type Props = {
    noteId: string;
    noteText: string | null;
    hostUrl: string;
    runtime: AccountRuntime;
    positionStyle: string;
    isOwnNote: boolean;
    onclose: () => void;
    ondeleted?: () => void;
  };

  const { noteId, noteText, hostUrl, runtime, positionStyle, isOwnNote, onclose, ondeleted }: Props = $props();

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
      await (runtime.cli as any).request('notes/favorites/create', { noteId });
      message = 'お気に入りに追加しました';
      setTimeout(() => { message = ''; onclose(); }, 800);
    } catch (err: unknown) {
      // 既にお気に入りの場合は削除
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('ALREADY_FAVORITED') || errorMessage.includes('already')) {
        try {
          await (runtime.cli as any).request('notes/favorites/delete', { noteId });
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
      const res = await (runtime.cli as any).request('clips/list', {});
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
      await (runtime.cli as any).request('clips/add-note', { clipId, noteId });
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

  // ノート削除
  let deleteConfirm = $state(false);

  async function deleteNote() {
    if (!deleteConfirm) {
      deleteConfirm = true;
      return;
    }
    if (busy) return;
    busy = true;
    try {
      await (runtime.cli as any).request('notes/delete', { noteId });
      message = '削除しました';
      setTimeout(() => { message = ''; onclose(); ondeleted?.(); }, 800);
    } catch {
      message = '削除に失敗しました';
      deleteConfirm = false;
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
            <Clipboard class="w-3.5 h-3.5 shrink-0 text-base-content/40" aria-hidden="true" />
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
          <ArrowLeft class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
        <Clipboard class="w-3.5 h-3.5 shrink-0 text-base-content/40" aria-hidden="true" />
        ノート内容をコピー
      </button>
      <button
        class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
        onclick={copyLink}
        role="menuitem"
      >
        <Link2 class="w-3.5 h-3.5 shrink-0 text-base-content/40" aria-hidden="true" />
        ノートリンクをコピー
      </button>
      <div class="border-t border-base-300/30 my-0.5"></div>
      <button
        class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
        onclick={toggleFavorite}
        disabled={busy}
        role="menuitem"
      >
        <Star class="w-3.5 h-3.5 shrink-0 text-base-content/40" aria-hidden="true" />
        お気に入り
      </button>
      <button
        class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-base-200 transition-colors"
        onclick={showClips}
        disabled={busy}
        role="menuitem"
      >
        <Clipboard class="w-3.5 h-3.5 shrink-0 text-base-content/40" aria-hidden="true" />
        クリップに追加
      </button>
      {#if isOwnNote}
        <div class="border-t border-base-300/30 my-0.5"></div>
        <button
          class="menu-item flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors
            {deleteConfirm ? 'text-error hover:bg-error/10' : 'text-error/60 hover:bg-error/10 hover:text-error'}"
          onclick={deleteNote}
          disabled={busy}
          role="menuitem"
        >
          <Trash2 class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {deleteConfirm ? '本当に削除しますか？' : 'ノートを削除'}
        </button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .menu-item:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
