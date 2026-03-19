<script lang="ts">
  import type { entities } from 'misskey-js';
  import type { ColumnConfig } from '$lib/types';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';

  type Props = {
    note: entities.Note;
    config: ColumnConfig;
    emojis?: Record<string, string>;
  };

  let { note, config, emojis = {} }: Props = $props();

  // CW展開状態
  let cwExpanded = $state(config.noteDisplay.cwExpanded);

  // コンテンツ折り畳み状態
  let contentExpanded = $state(false);

  // CW有無
  const hasCw = $derived(!!note.cw);
  const cwText = $derived(note.cw ?? '');

  // 本文テキスト
  const bodyText = $derived(note.text ?? '');

  function toggleCw() {
    cwExpanded = !cwExpanded;
  }

  function toggleContent() {
    contentExpanded = !contentExpanded;
  }

  // 可視性アイコン
  const visibilityIcon = $derived({
    public: null,  // publicはアイコンなし
    home: 'home',
    followers: 'lock',
    specified: 'mention',
  }[note.visibility] ?? null);

  const visibilityLabel = $derived({
    public: '全体公開',
    home: 'ホーム',
    followers: 'フォロワー',
    specified: 'ダイレクト',
  }[note.visibility] ?? '');
</script>

<div class="note-body text-xs leading-relaxed text-base-content/90">

  <!-- 可視性インジケーター -->
  {#if visibilityIcon}
    <span class="inline-flex items-center gap-0.5 text-[0.6rem] text-base-content/40 mb-0.5" title={visibilityLabel}>
      {#if visibilityIcon === 'home'}
        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="9,22 9,12 15,12 15,22" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else if visibilityIcon === 'lock'}
        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else if visibilityIcon === 'mention'}
        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4"/>
          <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
      <span>{visibilityLabel}</span>
    </span>
  {/if}

  <!-- CW (Content Warning) -->
  {#if hasCw}
    <div class="cw-block">
      <!-- CW テキスト -->
      <div class="flex items-center gap-1.5">
        <span class="text-[0.6rem] px-1 py-0.5 rounded bg-warning/20 text-warning font-semibold uppercase tracking-wide">CW</span>
        <span class="text-xs text-base-content/70 flex-1">
          <MfmRenderer text={cwText} {emojis} isInline />
        </span>
        <button
          class="btn btn-xs btn-ghost px-1.5 py-0.5 h-auto min-h-0 text-[0.6rem] text-base-content/50 hover:text-base-content border border-base-300/50"
          onclick={toggleCw}
          aria-expanded={cwExpanded}
          aria-label={cwExpanded ? 'コンテンツを隠す' : 'コンテンツを表示'}
        >
          {cwExpanded ? '隠す' : '表示'}
        </button>
      </div>

      <!-- CWコンテンツ (トグル) -->
      {#if cwExpanded}
        <div class="cw-content mt-1.5 pl-2 border-l border-base-300/50">
          <!-- 本文 -->
          {#if bodyText}
            <div
              class="whitespace-pre-wrap break-words text-xs text-base-content/85"
              class:line-clamp-none={contentExpanded}
            >
              <MfmRenderer text={bodyText} {emojis} />
            </div>
          {/if}
        </div>
      {/if}
    </div>

  {:else}
    <!-- 通常本文 -->
    {#if bodyText}
      <div class="body-text relative">
        <div
          class="whitespace-pre-wrap break-words text-xs text-base-content/90 overflow-hidden"
          style={config.noteDisplay.collapseEnabled && !contentExpanded
            ? `max-height: ${config.noteDisplay.collapseHeight}px;`
            : ''}
        >
          <MfmRenderer text={bodyText} {emojis} />
        </div>

        <!-- 折り畳みグラデーション + 展開ボタン (高さ超過時のみ表示) -->
        {#if config.noteDisplay.collapseEnabled && !contentExpanded}
          <div class="collapse-fade absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-base-100 to-transparent pointer-events-none"></div>
          <button
            class="mt-0.5 text-[0.6rem] text-primary/70 hover:text-primary transition-colors"
            onclick={toggleContent}
          >
            続きを読む
          </button>
        {:else if config.noteDisplay.collapseEnabled && contentExpanded && bodyText.length > 200}
          <button
            class="mt-0.5 text-[0.6rem] text-base-content/40 hover:text-base-content/60 transition-colors"
            onclick={toggleContent}
          >
            折り畳む
          </button>
        {/if}
      </div>
    {/if}
  {/if}

</div>
