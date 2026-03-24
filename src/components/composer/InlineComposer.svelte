<script lang="ts">
  import type { AccountRuntime, Visibility } from '$lib/types';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';
  import EmojiPickerPopup from './EmojiPickerPopup.svelte';
  import FileAttachmentArea from './FileAttachmentArea.svelte';
  import { uploadFileToDrive } from './composerLogic';
  import { loadFromStorage, saveToStorage } from '$lib/utils/storage';
  import type { entities } from 'misskey-js';
  import { MessageSquare, Repeat2, Eye, Send } from 'lucide-svelte';

  type Note = entities.Note;

  type Props = {
    runtime: AccountRuntime;
    replyId?: string;
    renoteId?: string;
    replyNote?: Note | null;
    renoteNote?: Note | null;
    /** チャンネルへの投稿時のチャンネルID */
    channelId?: string;
    /** デフォルト公開範囲 (省略時: 'public') */
    defaultVisibility?: Visibility;
    /** デフォルトローカル限定設定 (省略時: false) */
    defaultLocalOnly?: boolean;
    /** リアクションデッキ (絵文字ピッカーに表示) */
    reactionDeck?: string[];
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
    channelId,
    defaultVisibility = 'public',
    defaultLocalOnly = false,
    reactionDeck = [],
    oncomplete,
    oncancel,
  }: Props = $props();

  // ── 前回の投稿設定を復元 ──
  type ComposerSettings = { visibility: Visibility; localOnly: boolean; cwEnabled: boolean };
  const SETTINGS_KEY = 'composer-last-settings';
  const savedSettings = loadFromStorage<ComposerSettings | null>(SETTINGS_KEY, null);

  // ── フォーム状態 ──
  let text = $state('');
  let cwEnabled = $state(savedSettings?.cwEnabled ?? false);
  let cwText = $state('');
  let visibility = $state<Visibility>(savedSettings?.visibility ?? defaultVisibility);
  let localOnly = $state(savedSettings?.localOnly ?? defaultLocalOnly);
  let posting = $state(false);
  let error = $state('');
  let previewMode = $state(false);
  let emojiPickerOpen = $state(false);
  let attachedFiles = $state<File[]>([]);

  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  // ── 文字数 ──
  const charCount = $derived(text.length + (cwEnabled ? cwText.length : 0));

  // ── 絵文字マップ (プレビュー用 & ピッカー用) ──
  const emojiMap = $derived<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const e of runtime.emojis) {
      result[e.name] = e.url;
    }
    return result;
  });

  // ── モード判定 ──
  const isReply = $derived(!!replyId);
  const isRenote = $derived(!!renoteId);

  // ── 送信可能判定 ──
  const canPost = $derived(
    (text.trim().length > 0 || (isRenote && !text.trim()) || attachedFiles.length > 0) &&
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
      // ファイルをアカウントのドライブにアップロード
      let fileIds: string[] = [];
      if (attachedFiles.length > 0) {
        const token = runtime.cli.credential ?? '';
        fileIds = await Promise.all(
          attachedFiles.map((f) => uploadFileToDrive(runtime.cli.origin, token, f)),
        );
      }

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
      if (channelId) {
        params.channelId = channelId;
      }
      if (fileIds.length > 0) {
        params.fileIds = fileIds;
      }

      await runtime.cli.request('notes/create', params as Parameters<typeof runtime.cli.request>[1]);

      // 成功: 設定を保存してリセット (visibility/localOnly/cwEnabled は引き継ぐ)
      saveToStorage(SETTINGS_KEY, { visibility, localOnly, cwEnabled });
      text = '';
      cwText = '';
      previewMode = false;
      emojiPickerOpen = false;
      attachedFiles = [];
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

  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      attachedFiles = [...attachedFiles, ...imageFiles].slice(0, 16);
    }
  }

  function handleCancel() {
    text = '';
    cwText = '';
    previewMode = false;
    emojiPickerOpen = false;
    attachedFiles = [];
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
      <MessageSquare class="w-3 h-3 mt-0.5 shrink-0 text-info" aria-hidden="true" />
      <div class="min-w-0">
        <span class="font-semibold">@{replyNote.user?.username}</span> へのリプライ:
        <span class="opacity-70">{truncate(replyNote.text)}</span>
      </div>
    </div>
  {:else if isReply}
    <div class="flex items-center gap-1 text-xs text-info">
      <MessageSquare class="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>リプライ</span>
    </div>
  {/if}

  <!-- Renote対象プレビュー -->
  {#if isRenote && renoteNote}
    <div class="flex items-start gap-1.5 bg-base-300 rounded px-2 py-1 text-xs text-base-content/60">
      <Repeat2 class="w-3 h-3 mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <div class="min-w-0">
        <span class="font-semibold">@{renoteNote.user?.username}</span> をRenote:
        <span class="opacity-70">{truncate(renoteNote.text)}</span>
      </div>
    </div>
  {:else if isRenote}
    <div class="flex items-center gap-1 text-xs text-success">
      <Repeat2 class="w-3 h-3 shrink-0" aria-hidden="true" />
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
      onpaste={handlePaste}
    ></textarea>
  {/if}

  <!-- 絵文字ピッカー -->
  {#if emojiPickerOpen}
    <EmojiPickerPopup
      accountEmojis={runtime.emojis}
      deck={reactionDeck}
      emojis={emojiMap()}
      onselect={(name) => insertEmoji(name)}
      onclose={() => { emojiPickerOpen = false; }}
    />
  {/if}

  <!-- ファイル添付 -->
  <FileAttachmentArea
    files={attachedFiles}
    onchange={(f) => { attachedFiles = f; }}
    disabled={posting}
  />

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
        <Eye class="w-3.5 h-3.5" aria-hidden="true" />
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
          <Send class="w-3 h-3" aria-hidden="true" />
        {/if}
        {isRenote && !text.trim() ? 'Renote' : '投稿'}
      </button>
    </div>
  </div>

</div>
