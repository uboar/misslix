<script lang="ts">
  import type { AccountRuntime, Visibility } from '$lib/types';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';
  import type { entities } from 'misskey-js';

  type Note = entities.Note;

  type Props = {
    runtime: AccountRuntime;
    replyId?: string;
    renoteId?: string;
    replyNote?: Note | null;
    renoteNote?: Note | null;
    /** 投稿完了時コールバック */
    oncomplete?: () => void;
    /** キャンセル時コールバック */
    oncancel?: () => void;
  };

  let {
    runtime,
    replyId,
    renoteId,
    replyNote = null,
    renoteNote = null,
    oncomplete,
    oncancel,
  }: Props = $props();

  // ── フォーム状態 ──
  let text = $state('');
  let cwEnabled = $state(false);
  let cwText = $state('');
  let visibility = $state<Visibility>('public');
  let localOnly = $state(false);
  let posting = $state(false);
  let error = $state('');
  let previewMode = $state(false);
  let emojiPickerOpen = $state(false);

  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  // ── 文字数 ──
  const charCount = $derived(text.length + (cwEnabled ? cwText.length : 0));

  // ── 絵文字マップ (プレビュー用) ──
  const emojiMap = $derived<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const e of runtime.emojis) {
      result[e.name] = e.url;
    }
    return result;
  });

  // ── 表示用絵文字リスト ──
  const pickerEmojis = $derived(runtime.emojis.slice(0, 200));

  // ── モード判定 ──
  const isReply = $derived(!!replyId);
  const isRenote = $derived(!!renoteId);

  // ── 送信可能判定 ──
  const canPost = $derived(
    (text.trim().length > 0 || (isRenote && !text.trim())) &&
    !posting
  );

  function insertEmoji(name: string) {
    const insertion = `:${name}: `;
    if (!textareaEl) {
      text += insertion;
      emojiPickerOpen = false;
      return;
    }
    const start = textareaEl.selectionStart ?? text.length;
    const end = textareaEl.selectionEnd ?? text.length;
    text = text.slice(0, start) + insertion + text.slice(end);
    emojiPickerOpen = false;
    requestAnimationFrame(() => {
      if (textareaEl) {
        const pos = start + insertion.length;
        textareaEl.setSelectionRange(pos, pos);
        textareaEl.focus();
      }
    });
  }

  async function post() {
    if (!canPost) return;
    posting = true;
    error = '';

    try {
      const params: Record<string, unknown> = {
        visibility,
        localOnly,
      };

      if (text.trim()) {
        params.text = text.trim();
      }
      if (cwEnabled && cwText.trim()) {
        params.cw = cwText.trim();
      }
      if (replyId) {
        params.replyId = replyId;
      }
      if (renoteId) {
        params.renoteId = renoteId;
      }

      await runtime.cli.request('notes/create', params as Parameters<typeof runtime.cli.request>[1]);

      // 成功: リセット
      text = '';
      cwEnabled = false;
      cwText = '';
      previewMode = false;
      emojiPickerOpen = false;
      oncomplete?.();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      posting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+Enter または Cmd+Enter で投稿
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      post();
    }
  }

  function handleCancel() {
    text = '';
    cwEnabled = false;
    cwText = '';
    previewMode = false;
    emojiPickerOpen = false;
    error = '';
    oncancel?.();
  }

  const visibilityOptions: { value: Visibility; label: string; icon: string }[] = [
    { value: 'public', label: 'パブリック', icon: '🌐' },
    { value: 'home', label: 'ホーム', icon: '🏠' },
    { value: 'followers', label: 'フォロワー', icon: '🔒' },
  ];

  // ── 引用/リプライ対象の本文を短縮表示 ──
  function truncate(str: string | null | undefined, len = 60): string {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  }
</script>

<div class="inline-composer flex flex-col gap-2 p-2 bg-base-200 border-t border-base-300">

  <!-- リプライ対象プレビュー -->
  {#if isReply && replyNote}
    <div class="flex items-start gap-1.5 bg-base-300 rounded px-2 py-1 text-xs text-base-content/60">
      <svg class="w-3 h-3 mt-0.5 shrink-0 text-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <div class="min-w-0">
        <span class="font-semibold">@{replyNote.user?.username}</span> へのリプライ:
        <span class="opacity-70">{truncate(replyNote.text)}</span>
      </div>
    </div>
  {:else if isReply}
    <div class="flex items-center gap-1 text-xs text-info">
      <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span>リプライ</span>
    </div>
  {/if}

  <!-- Renote対象プレビュー -->
  {#if isRenote && renoteNote}
    <div class="flex items-start gap-1.5 bg-base-300 rounded px-2 py-1 text-xs text-base-content/60">
      <svg class="w-3 h-3 mt-0.5 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
      <div class="min-w-0">
        <span class="font-semibold">@{renoteNote.user?.username}</span> をRenote:
        <span class="opacity-70">{truncate(renoteNote.text)}</span>
      </div>
    </div>
  {:else if isRenote}
    <div class="flex items-center gap-1 text-xs text-success">
      <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
      <span>引用Renote</span>
    </div>
  {/if}

  <!-- CW トグル + 入力 -->
  <div class="flex items-center gap-2">
    <label class="flex items-center gap-1 cursor-pointer select-none">
      <input
        type="checkbox"
        class="checkbox checkbox-xs checkbox-warning"
        bind:checked={cwEnabled}
      />
      <span class="text-xs text-warning font-semibold">CW</span>
    </label>
    {#if cwEnabled}
      <input
        type="text"
        class="input input-bordered input-xs input-warning flex-1 text-xs"
        placeholder="警告文..."
        bind:value={cwText}
      />
    {/if}
  </div>

  <!-- テキストエリア / プレビュー -->
  {#if previewMode && text.trim()}
    <div class="border border-base-300 rounded p-2 min-h-16 bg-base-100 text-sm break-words">
      <MfmRenderer text={text} emojis={emojiMap()} />
    </div>
  {:else}
    <textarea
      bind:this={textareaEl}
      class="textarea textarea-bordered textarea-sm w-full text-sm resize-none min-h-16"
      placeholder={isReply ? 'リプライを入力... (Ctrl+Enter で送信)' : isRenote ? '引用コメントを入力... (空白でもRenote可)' : '投稿内容を入力... (Ctrl+Enter で送信)'}
      bind:value={text}
      rows={3}
      onkeydown={handleKeydown}
    ></textarea>
  {/if}

  <!-- 絵文字ピッカー -->
  {#if emojiPickerOpen}
    <div class="border border-base-300 rounded p-1.5 max-h-32 overflow-y-auto bg-base-100">
      {#if pickerEmojis.length === 0}
        <p class="text-xs text-base-content/50 text-center py-1">カスタム絵文字なし</p>
      {:else}
        <div class="flex flex-wrap gap-0.5">
          {#each pickerEmojis as emoji (emoji.name)}
            <button
              class="btn btn-ghost btn-xs p-0.5 h-auto min-h-0 hover:bg-base-300"
              onclick={() => insertEmoji(emoji.name)}
              title=":{emoji.name}:"
            >
              <img
                src={emoji.url}
                alt=":{emoji.name}:"
                class="h-5 w-auto max-w-6 object-contain"
              />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- エラー表示 -->
  {#if error}
    <p class="text-xs text-error">{error}</p>
  {/if}

  <!-- アクションバー -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1">
      <!-- 絵文字ピッカートグル -->
      <button
        class="btn btn-ghost btn-xs {emojiPickerOpen ? 'btn-active' : ''}"
        onclick={() => { emojiPickerOpen = !emojiPickerOpen; previewMode = false; }}
        title="絵文字を挿入"
      >
        <span class="text-sm">😀</span>
      </button>

      <!-- プレビュートグル -->
      <button
        class="btn btn-ghost btn-xs {previewMode ? 'btn-active' : ''}"
        onclick={() => { previewMode = !previewMode; emojiPickerOpen = false; }}
        title="プレビュー"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      <!-- 公開範囲 -->
      <select
        class="select select-bordered select-xs text-xs"
        bind:value={visibility}
      >
        {#each visibilityOptions as opt (opt.value)}
          <option value={opt.value}>{opt.icon}</option>
        {/each}
      </select>

      <!-- ローカル限定 -->
      <label class="flex items-center gap-1 cursor-pointer select-none" title="ローカル限定">
        <input
          type="checkbox"
          class="checkbox checkbox-xs"
          bind:checked={localOnly}
        />
        <span class="text-xs text-base-content/60">L</span>
      </label>

      <!-- 文字数 -->
      <span class="text-xs text-base-content/40 ml-1">{charCount}</span>
    </div>

    <div class="flex items-center gap-1">
      {#if oncancel}
        <button class="btn btn-ghost btn-xs" onclick={handleCancel} disabled={posting}>
          キャンセル
        </button>
      {/if}
      <button
        class="btn btn-primary btn-xs gap-1"
        onclick={post}
        disabled={!canPost}
      >
        {#if posting}
          <span class="loading loading-spinner loading-xs"></span>
        {:else}
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        {/if}
        {isRenote && !text.trim() ? 'Renote' : '投稿'}
      </button>
    </div>
  </div>

</div>
