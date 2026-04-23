<script lang="ts">
  import type { AccountRuntime, Visibility, ComposerSettings } from '$lib/types';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';
  import EmojiPickerPopup from './EmojiPickerPopup.svelte';
  import FileAttachmentArea from './FileAttachmentArea.svelte';
  import {
    uploadFileToDrive,
    postNote,
    VISIBILITY_OPTIONS,
    insertEmojiAtCursor,
    extractImageFilesFromClipboard,
  } from './composerLogic';
  import { buildPostPoll, type PollDurationUnit } from '$lib/utils/poll';
  import { loadFromStorage, saveToStorage } from '$lib/utils/storage';
  import type { entities } from 'misskey-js';
  import { MessageSquare, Repeat2, Eye, Send, Paperclip, BarChart3, Plus, Trash2 } from 'lucide-svelte';

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
    /** タイムラインごとに設定を分離するためのカラムID */
    columnId?: number;
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
    columnId,
    oncomplete,
    oncancel,
  }: Props = $props();

  // ── 前回の投稿設定を復元 (カラムIDでタイムラインごとに分離) ──
  const SETTINGS_KEY = columnId != null ? `composer-last-settings-${columnId}` : 'composer-last-settings';
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
  let pollEnabled = $state(false);
  let pollChoices = $state<string[]>(['', '']);
  let pollMultiple = $state(false);
  let pollExpires = $state(true);
  let pollDurationValue = $state(1);
  let pollDurationUnit = $state<PollDurationUnit>('days');

  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let fileAreaComp = $state<FileAttachmentArea | null>(null);

  // テキストエリアがマウントされたら自動フォーカス
  $effect(() => {
    const el = textareaEl;
    if (el) {
      const id = requestAnimationFrame(() => el.focus());
      return () => cancelAnimationFrame(id);
    }
  });

  // ── 文字数 ──
  const charCount = $derived(text.length + (cwEnabled ? cwText.length : 0));

  // ── 絵文字マップ (プレビュー用 & ピッカー用) ──
  const emojiMap = $derived.by<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const e of runtime.emojis) {
      result[e.name] = e.url;
    }
    return result;
  });

  const pollPayload = $derived.by(() => buildPostPoll({
    enabled: pollEnabled,
    choices: pollChoices,
    multiple: pollMultiple,
    expires: pollExpires,
    durationValue: pollDurationValue,
    durationUnit: pollDurationUnit,
  }));
  const pollIsValid = $derived(!pollEnabled || !!pollPayload);

  // ── モード判定 ──
  const isReply = $derived(!!replyId);
  const isRenote = $derived(!!renoteId);

  // ── 送信可能判定 ──
  const canPost = $derived(
    (text.trim().length > 0 || (isRenote && !text.trim()) || attachedFiles.length > 0 || !!pollPayload) &&
    pollIsValid &&
    !posting
  );

  function insertEmoji(name: string) {
    const { text: newText, cursorPos } = insertEmojiAtCursor(name, text, textareaEl);
    text = newText;
    emojiPickerOpen = false;
    if (cursorPos >= 0) {
      requestAnimationFrame(() => {
        if (textareaEl) {
          textareaEl.setSelectionRange(cursorPos, cursorPos);
          textareaEl.focus();
        }
      });
    }
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

      await postNote(runtime.cli, {
        text: text.trim(),
        cw: cwEnabled && cwText.trim() ? cwText.trim() : null,
        visibility,
        localOnly,
        replyId: replyId ?? null,
        renoteId: renoteId ?? null,
        channelId: channelId ?? null,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
        poll: pollPayload,
      });

      // 成功: 設定を保存してリセット (visibility/localOnly/cwEnabled は引き継ぐ)
      saveToStorage(SETTINGS_KEY, { visibility, localOnly, cwEnabled });
      text = '';
      cwText = '';
      previewMode = false;
      emojiPickerOpen = false;
      attachedFiles = [];
      pollEnabled = false;
      pollChoices = ['', ''];
      pollMultiple = false;
      pollExpires = true;
      pollDurationValue = 1;
      pollDurationUnit = 'days';
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
    const imageFiles = extractImageFilesFromClipboard(e);
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
    pollEnabled = false;
    pollChoices = ['', ''];
    pollMultiple = false;
    pollExpires = true;
    pollDurationValue = 1;
    pollDurationUnit = 'days';
    error = '';
    oncancel?.();
  }

  function updatePollChoice(index: number, value: string) {
    pollChoices = pollChoices.map((choice, i) => i === index ? value : choice);
  }

  function addPollChoice() {
    if (pollChoices.length >= 6) return;
    pollChoices = [...pollChoices, ''];
  }

  function removePollChoice(index: number) {
    if (pollChoices.length <= 2) return;
    pollChoices = pollChoices.filter((_, i) => i !== index);
  }

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
      <MfmRenderer text={text} emojis={emojiMap} />
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
      emojis={emojiMap}
      onselect={(name) => insertEmoji(name)}
      onclose={() => { emojiPickerOpen = false; }}
    />
  {/if}

  <!-- ファイル添付プレビュー (ボタンは下のアクションバーへ移動) -->
  <FileAttachmentArea
    bind:this={fileAreaComp}
    files={attachedFiles}
    onchange={(f) => { attachedFiles = f; }}
    disabled={posting}
    showButton={false}
  />

  <!-- エラー表示 -->
  {#if error}
    <p class="text-xs text-error">{error}</p>
  {/if}

  <div class="rounded-md border border-base-300/70 bg-base-100/70 p-2">
    <div class="mb-2 flex items-center justify-between gap-2">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" class="checkbox checkbox-xs checkbox-primary" bind:checked={pollEnabled} />
        <span class="inline-flex items-center gap-1 text-xs text-base-content/70">
          <BarChart3 class="w-3.5 h-3.5" aria-hidden="true" />
          投票
        </span>
      </label>
      {#if pollEnabled}
        <button class="btn btn-ghost btn-xs btn-square" onclick={addPollChoice} disabled={pollChoices.length >= 6} aria-label="選択肢追加">
          <Plus class="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      {/if}
    </div>

    {#if pollEnabled}
      <div class="flex flex-col gap-2">
        {#each pollChoices as choice, index (index)}
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="input input-bordered input-xs flex-1 text-xs"
              placeholder={`選択肢 ${index + 1}`}
              value={choice}
              oninput={(e) => updatePollChoice(index, (e.currentTarget as HTMLInputElement).value)}
            />
            <button
              class="btn btn-ghost btn-xs btn-square"
              onclick={() => removePollChoice(index)}
              disabled={pollChoices.length <= 2}
              aria-label="選択肢を削除"
            >
              <Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        {/each}

        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" class="checkbox checkbox-xs" bind:checked={pollMultiple} />
            <span class="text-xs text-base-content/60">複数</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer select-none">
            <input type="checkbox" class="checkbox checkbox-xs" bind:checked={pollExpires} />
            <span class="text-xs text-base-content/60">期限</span>
          </label>
          {#if pollExpires}
            <input type="number" min="1" class="input input-bordered input-xs w-16" bind:value={pollDurationValue} />
            <select class="select select-bordered select-xs" bind:value={pollDurationUnit}>
              <option value="minutes">分</option>
              <option value="hours">時間</option>
              <option value="days">日</option>
            </select>
          {/if}
        </div>

        {#if !pollIsValid}
          <p class="text-xs text-error">投票は2件以上必要です。</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- アクションバー (絵文字・添付・公開範囲等) -->
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

    <!-- ファイル添付ボタン -->
    <button
      class="btn btn-ghost btn-xs {attachedFiles.length > 0 ? 'btn-active' : ''}"
      onclick={() => fileAreaComp?.openPicker()}
      title="ファイルを添付"
      disabled={posting}
    >
      <Paperclip class="w-3.5 h-3.5" aria-hidden="true" />
      {#if attachedFiles.length > 0}
        <span class="text-xs">{attachedFiles.length}</span>
      {/if}
    </button>

    <!-- 公開範囲 -->
    <select
      class="select select-bordered select-xs text-xs"
      bind:value={visibility}
    >
      {#each VISIBILITY_OPTIONS as opt (opt.value)}
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

  <!-- 投稿ボタン行 (横幅いっぱい) -->
  <div class="flex items-center gap-2">
    {#if oncancel}
      <button class="btn btn-ghost btn-xs shrink-0" onclick={handleCancel} disabled={posting}>
        キャンセル
      </button>
    {/if}
    <button
      class="btn btn-primary btn-sm flex-1 gap-1"
      onclick={post}
      disabled={!canPost}
    >
      {#if posting}
        <span class="loading loading-spinner loading-xs"></span>
      {:else}
        <Send class="w-3.5 h-3.5" aria-hidden="true" />
      {/if}
      {isRenote && !text.trim() ? 'Renote' : '投稿'}
    </button>
  </div>

</div>
