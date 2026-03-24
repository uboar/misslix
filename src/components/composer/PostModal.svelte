<script lang="ts">
  import type { Account, AccountRuntime, Visibility } from '$lib/types';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import Modal from '../common/Modal.svelte';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';
  import EmojiPickerPopup from './EmojiPickerPopup.svelte';
  import FileAttachmentArea from './FileAttachmentArea.svelte';
  import { uploadFileToDrive } from './composerLogic';
  import { loadFromStorage, saveToStorage } from '$lib/utils/storage';
  import { Check, X, Eye, Send } from 'lucide-svelte';

  type PostResult = {
    accountId: number;
    userName: string;
    status: 'fulfilled' | 'rejected';
    error?: unknown;
  };

  type Props = {
    open: boolean;
    onclose: () => void;
    runtimes: Map<number, AccountRuntime>;
    onpost?: (results: PostResult[]) => void;
  };

  let { open, onclose, runtimes, onpost }: Props = $props();

  // ── フォーム状態 ──
  let text = $state('');
  let cwEnabled = $state(false);
  let cwText = $state('');
  let visibility = $state<Visibility>('public');
  let localOnly = $state(false);
  let selectedAccountIds = $state<Set<number>>(new Set());
  let previewMode = $state(false);
  let emojiPickerOpen = $state(false);
  let posting = $state(false);
  let attachedFiles = $state<File[]>([]);
  let postResults = $state<PostResult[]>([]);
  let showResults = $state(false);

  // ── テキストエリア ref ──
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  // ── 文字数カウント ──
  const charCount = $derived(text.length + (cwEnabled ? cwText.length : 0));

  // ── アクティブアカウント (runtime が存在するもの) ──
  const availableAccounts = $derived(
    accountStore.activeAccounts.filter((a) => runtimes.has(a.id))
  );

  // ── 選択済みアカウントの絵文字マップ (プレビュー用: 最初の選択アカウントを使用) ──
  const previewEmojis = $derived<Record<string, string>>(() => {
    const firstId = [...selectedAccountIds][0];
    if (firstId == null) return {};
    const runtime = runtimes.get(firstId);
    if (!runtime) return {};
    const result: Record<string, string> = {};
    for (const e of runtime.emojis) {
      result[e.name] = e.url;
    }
    return result;
  });

  type ComposerSettings = { visibility: Visibility; localOnly: boolean; cwEnabled: boolean };
  const SETTINGS_KEY = 'composer-last-settings';

  // モーダルが開いたとき: アカウントを全選択し状態リセット、前回の設定を復元
  $effect(() => {
    if (open) {
      // 全アカウント選択
      selectedAccountIds = new Set(availableAccounts.map((a) => a.id));
      postResults = [];
      showResults = false;
      previewMode = false;
      emojiPickerOpen = false;
      // 前回の投稿設定を復元
      const saved = loadFromStorage<ComposerSettings | null>(SETTINGS_KEY, null);
      if (saved) {
        visibility = saved.visibility;
        localOnly = saved.localOnly;
        cwEnabled = saved.cwEnabled;
      }
    }
  });

  function toggleAccount(id: number) {
    const next = new Set(selectedAccountIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedAccountIds = next;
  }

  function toggleAllAccounts() {
    if (selectedAccountIds.size === availableAccounts.length) {
      selectedAccountIds = new Set();
    } else {
      selectedAccountIds = new Set(availableAccounts.map((a) => a.id));
    }
  }

  function insertEmoji(emojiName: string) {
    const insertion = `:${emojiName}: `;
    if (!textareaEl) {
      text += insertion;
      return;
    }
    const start = textareaEl.selectionStart ?? text.length;
    const end = textareaEl.selectionEnd ?? text.length;
    text = text.slice(0, start) + insertion + text.slice(end);
    emojiPickerOpen = false;
    // カーソルを挿入位置の末尾に移動
    requestAnimationFrame(() => {
      if (textareaEl) {
        const pos = start + insertion.length;
        textareaEl.setSelectionRange(pos, pos);
        textareaEl.focus();
      }
    });
  }

  // 表示用の絵文字リスト (最初の選択アカウントのカスタム絵文字)
  const pickerAccountEmojis = $derived(() => {
    const firstId = [...selectedAccountIds][0];
    if (firstId == null) return [];
    const runtime = runtimes.get(firstId);
    if (!runtime) return [];
    return runtime.emojis;
  });

  // 絵文字URLマップ (最初の選択アカウント)
  const pickerEmojiMap = $derived(() => {
    const firstId = [...selectedAccountIds][0];
    if (firstId == null) return {} as Record<string, string>;
    const runtime = runtimes.get(firstId);
    if (!runtime) return {} as Record<string, string>;
    const result: Record<string, string> = {};
    for (const e of runtime.emojis) {
      result[e.name] = e.url;
    }
    return result;
  });

  async function post() {
    if (!text.trim() && !cwEnabled) return;
    if (selectedAccountIds.size === 0) return;

    posting = true;
    postResults = [];

    const targets = availableAccounts.filter((a) => selectedAccountIds.has(a.id));

    const results = await Promise.allSettled(
      targets.map(async (account) => {
        const runtime = runtimes.get(account.id);
        if (!runtime) throw new Error('runtime not found');

        // ファイルをアカウントのドライブにアップロード
        let fileIds: string[] = [];
        if (attachedFiles.length > 0) {
          fileIds = await Promise.all(
            attachedFiles.map((f) => uploadFileToDrive(account.hostUrl, account.token, f)),
          );
        }

        const params: Record<string, unknown> = {
          text: text || undefined,
          visibility,
          localOnly,
        };
        if (cwEnabled && cwText.trim()) {
          params.cw = cwText.trim();
        }
        if (fileIds.length > 0) {
          params.fileIds = fileIds;
        }

        await runtime.cli.request('notes/create', params as Parameters<typeof runtime.cli.request>[1]);
        return account;
      })
    );

    const mapped: PostResult[] = results.map((r, i) => {
      const account = targets[i];
      if (r.status === 'fulfilled') {
        return { accountId: account.id, userName: account.userName, status: 'fulfilled' };
      } else {
        return { accountId: account.id, userName: account.userName, status: 'rejected', error: r.reason };
      }
    });

    postResults = mapped;
    posting = false;

    const allOk = mapped.every((r) => r.status === 'fulfilled');
    if (allOk) {
      // 全成功: 設定を保存してリセット・閉じる
      saveToStorage<ComposerSettings>(SETTINGS_KEY, { visibility, localOnly, cwEnabled });
      resetForm();
      onpost?.(mapped);
      onclose();
    } else {
      // 一部失敗: 結果を表示
      showResults = true;
      onpost?.(mapped);
    }
  }

  function resetForm() {
    text = '';
    cwEnabled = false;
    cwText = '';
    visibility = 'public';
    localOnly = false;
    previewMode = false;
    emojiPickerOpen = false;
    postResults = [];
    showResults = false;
    attachedFiles = [];
  }

  function handleClose() {
    if (!posting) {
      resetForm();
      onclose();
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

  const visibilityOptions: { value: Visibility; label: string; icon: string }[] = [
    { value: 'public', label: 'パブリック', icon: '🌐' },
    { value: 'home', label: 'ホーム', icon: '🏠' },
    { value: 'followers', label: 'フォロワー', icon: '🔒' },
  ];

  const canPost = $derived(
    (text.trim().length > 0 || (cwEnabled && cwText.trim().length > 0) || attachedFiles.length > 0) &&
    selectedAccountIds.size > 0 &&
    !posting
  );
</script>

<Modal open={open} onclose={handleClose} title="新規投稿">
  <div class="flex flex-col gap-3 min-w-[min(480px,90vw)]">

    <!-- アカウント選択 -->
    {#if availableAccounts.length > 0}
      <div class="form-control">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold text-base-content/70 uppercase tracking-wide">投稿アカウント</span>
          {#if availableAccounts.length > 1}
            <button
              class="btn btn-ghost btn-xs"
              onclick={toggleAllAccounts}
            >
              {selectedAccountIds.size === availableAccounts.length ? '全解除' : '全選択'}
            </button>
          {/if}
        </div>
        <div class="flex flex-wrap gap-2">
          {#each availableAccounts as account (account.id)}
            {@const selected = selectedAccountIds.has(account.id)}
            <button
              class="btn btn-sm gap-1.5 transition-all {selected
                ? 'btn-primary'
                : 'btn-ghost opacity-50 hover:opacity-80'}"
              onclick={() => toggleAccount(account.id)}
              title="{account.userName}@{account.hostUrl}"
            >
              {#if account.themeColor}
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  style="background-color: {account.themeColor};"
                ></span>
              {/if}
              <span class="max-w-28 truncate text-xs">@{account.userName}</span>
              {#if selected}
                <Check class="w-3 h-3 shrink-0" aria-hidden="true" />
              {/if}
            </button>
          {/each}
        </div>
      </div>
      <div class="divider my-0"></div>
    {:else}
      <div class="alert alert-warning text-sm py-2">
        有効なアカウントがありません。設定からアカウントを追加してください。
      </div>
    {/if}

    <!-- CW -->
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          class="checkbox checkbox-sm checkbox-warning"
          bind:checked={cwEnabled}
        />
        <span class="text-xs font-semibold text-warning">CW (Content Warning)</span>
      </label>
    </div>

    {#if cwEnabled}
      <input
        type="text"
        class="input input-bordered input-sm input-warning w-full text-sm"
        placeholder="警告文を入力..."
        bind:value={cwText}
      />
    {/if}

    <!-- テキストエリア / プレビュー切替 -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-base-content/50">{charCount} 文字</span>
      <div class="flex gap-1">
        <!-- 絵文字ピッカートグル -->
        <button
          class="btn btn-ghost btn-xs gap-1 {emojiPickerOpen ? 'btn-active' : ''}"
          onclick={() => { emojiPickerOpen = !emojiPickerOpen; previewMode = false; }}
          title="絵文字を挿入"
        >
          <span>😀</span>
          <span class="text-xs">絵文字</span>
        </button>
        <!-- プレビュートグル -->
        <button
          class="btn btn-ghost btn-xs gap-1 {previewMode ? 'btn-active' : ''}"
          onclick={() => { previewMode = !previewMode; emojiPickerOpen = false; }}
          title="プレビュー"
        >
          <Eye class="w-3.5 h-3.5" aria-hidden="true" />
          <span class="text-xs">プレビュー</span>
        </button>
      </div>
    </div>

    <!-- 絵文字ピッカー -->
    {#if emojiPickerOpen}
      <EmojiPickerPopup
        accountEmojis={pickerAccountEmojis()}
        emojis={pickerEmojiMap()}
        onselect={(name) => insertEmoji(name)}
        onclose={() => { emojiPickerOpen = false; }}
      />
    {/if}

    <!-- 本文入力 / プレビュー -->
    {#if previewMode}
      <div class="border border-base-300 rounded-lg p-3 min-h-24 bg-base-200 text-sm break-words">
        {#if text.trim()}
          <MfmRenderer text={text} emojis={previewEmojis()} />
        {:else}
          <span class="text-base-content/40 italic">プレビューするテキストを入力してください</span>
        {/if}
      </div>
    {:else}
      <textarea
        bind:this={textareaEl}
        class="textarea textarea-bordered w-full text-sm resize-none min-h-28"
        placeholder="いまなにしてる？"
        bind:value={text}
        rows={5}
        onpaste={handlePaste}
      ></textarea>
    {/if}

    <!-- ファイル添付 -->
    <FileAttachmentArea
      files={attachedFiles}
      onchange={(f) => { attachedFiles = f; }}
      disabled={posting}
    />

    <!-- 公開範囲 / ローカル限定 -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="text-xs text-base-content/60">公開範囲:</span>
        <select
          class="select select-bordered select-xs"
          bind:value={visibility}
        >
          {#each visibilityOptions as opt (opt.value)}
            <option value={opt.value}>{opt.icon} {opt.label}</option>
          {/each}
        </select>
      </div>

      <label class="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          class="checkbox checkbox-xs"
          bind:checked={localOnly}
        />
        <span class="text-xs text-base-content/70">ローカル限定</span>
      </label>
    </div>

    <!-- 投稿結果 (一部失敗時) -->
    {#if showResults && postResults.length > 0}
      <div class="flex flex-col gap-1 mt-1">
        {#each postResults as result (result.accountId)}
          <div class="flex items-center gap-2 text-xs {result.status === 'fulfilled' ? 'text-success' : 'text-error'}">
            {#if result.status === 'fulfilled'}
              <Check class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {:else}
              <X class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {/if}
            <span>@{result.userName}</span>
            {#if result.status === 'rejected'}
              <span class="opacity-70 truncate">{String(result.error)}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- アクションボタン -->
    <div class="flex justify-end gap-2 mt-1">
      <button class="btn btn-ghost btn-sm" onclick={handleClose} disabled={posting}>
        キャンセル
      </button>
      <button
        class="btn btn-primary btn-sm gap-1.5"
        onclick={post}
        disabled={!canPost}
      >
        {#if posting}
          <span class="loading loading-spinner loading-xs"></span>
          投稿中...
        {:else}
          <Send class="w-3.5 h-3.5" aria-hidden="true" />
          {selectedAccountIds.size > 1 ? `${selectedAccountIds.size}アカウントに投稿` : '投稿'}
        {/if}
      </button>
    </div>

  </div>
</Modal>
