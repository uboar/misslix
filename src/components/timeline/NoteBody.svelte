<script lang="ts">
  import { tick } from 'svelte';
  import type { entities } from 'misskey-js';
  import type { ColumnConfig } from '$lib/types';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';
  import { Home, Lock, AtSign, GlobeOff, Hash } from 'lucide-svelte';

  type Props = {
    note: entities.Note;
    config: ColumnConfig;
    emojis?: Record<string, string>;
    channel?: { id: string; name: string; color: string } | null;
    hostUrl?: string;
  };

  let { note, config, emojis = {}, channel = null, hostUrl = '' }: Props = $props();

  // CW展開状態
  let cwExpanded = $state(config.noteDisplay.cwExpanded);

  // コンテンツ折り畳み状態
  let contentExpanded = $state(false);

  // コンテンツがcollapseHeightを超えているか
  let contentDiv = $state<HTMLElement | undefined>(undefined);
  let isOverflowing = $state(false);

  $effect(() => {
    if (contentDiv && config.noteDisplay.collapseEnabled) {
      const el = contentDiv;
      const collapseHeight = config.noteDisplay.collapseHeight;
      // DOM確定後に測定してレイアウトシフトを防止
      tick().then(() => {
        if (el.isConnected) {
          isOverflowing = el.scrollHeight > collapseHeight;
        }
      });
    }
  });

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

  // ローカルのみ判定
  const isLocalOnly = $derived(!!(note as entities.Note & { localOnly?: boolean }).localOnly);
</script>

<div class="note-body text-xs leading-relaxed text-base-content/90">

  <!-- チャンネル・可視性・ローカルのみ インジケーター行 (横並び) -->
  {#if channel || visibilityIcon || isLocalOnly}
    <div class="flex items-center gap-1.5 mb-0.5 flex-wrap min-h-0">

      <!-- チャンネルバッジ -->
      {#if channel}
        <a
          class="inline-flex items-center gap-0.5 px-1 py-0 rounded-full text-[0.6rem] font-medium leading-none transition-all duration-150 hover:opacity-80 shrink-0"
          style="background-color: {channel.color}18; color: {channel.color}; border: 1px solid {channel.color}30;"
          href="{hostUrl}/channels/{channel.id}"
          target="_blank"
          rel="noopener noreferrer"
          title="チャンネル: {channel.name}"
          onclick={(e) => e.stopPropagation()}
        >
          <Hash class="w-2.5 h-2.5 shrink-0 opacity-80" aria-hidden="true" />
          <span class="truncate max-w-[10rem]">{channel.name}</span>
        </a>
      {/if}

      <!-- 可視性アイコン (home / followers / specified) -->
      {#if visibilityIcon}
        <span class="inline-flex items-center gap-0.5 text-[0.6rem] text-base-content/40 shrink-0" title={visibilityLabel}>
          {#if visibilityIcon === 'home'}
            <Home class="w-2.5 h-2.5" aria-hidden="true" />
          {:else if visibilityIcon === 'lock'}
            <Lock class="w-2.5 h-2.5" aria-hidden="true" />
          {:else if visibilityIcon === 'mention'}
            <AtSign class="w-2.5 h-2.5" aria-hidden="true" />
          {/if}
          <span>{visibilityLabel}</span>
        </span>
      {/if}

      <!-- ローカルのみ (連合なし) アイコン -->
      {#if isLocalOnly}
        <span
          class="local-only-badge inline-flex items-center text-[0.6rem] text-info/60 font-medium shrink-0"
          title="ローカルのみ (連合なし)"
          aria-label="ローカルのみのノート"
        >
          <GlobeOff class="w-2.5 h-2.5" aria-hidden="true" />
        </span>
      {/if}

    </div>
  {/if}

  <!-- CW (Content Warning) -->
  {#if hasCw}
    <div class="cw-block">
      <!-- CW テキスト行: 全体をクリックで展開/折り畳み -->
      <button
        class="cw-header flex items-center gap-1.5 w-full text-left rounded px-1 py-0.5 -mx-1
          hover:bg-warning/5 active:bg-warning/10 transition-colors cursor-pointer"
        onclick={toggleCw}
        aria-expanded={cwExpanded}
        aria-label={cwExpanded ? 'コンテンツを隠す' : 'コンテンツを表示'}
      >
        <span class="text-[0.6rem] px-1 py-0.5 rounded bg-warning/20 text-warning font-semibold uppercase tracking-wide shrink-0">CW</span>
        <span class="text-xs text-base-content/70 flex-1 text-left">
          <MfmRenderer text={cwText} {emojis} isInline />
        </span>
        <span class="text-[0.6rem] text-base-content/40 shrink-0 ml-1 select-none">
          {cwExpanded ? '▲' : '▼'}
        </span>
      </button>

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
      <div class="body-text">
        <div
          bind:this={contentDiv}
          class="relative whitespace-pre-wrap break-words text-xs text-base-content/90 overflow-hidden"
          style={config.noteDisplay.collapseEnabled && !contentExpanded && isOverflowing
            ? `max-height: ${config.noteDisplay.collapseHeight}px;`
            : ''}
        >
          <MfmRenderer text={bodyText} {emojis} />
          <!-- 折り畳みグラデーション (コンテンツdiv内に配置してボタンと重ならないようにする) -->
          {#if config.noteDisplay.collapseEnabled && !contentExpanded && isOverflowing}
            <div class="collapse-fade absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-base-100 to-transparent pointer-events-none"></div>
          {/if}
        </div>

        <!-- 展開ボタン (グラデーション外に配置) -->
        {#if config.noteDisplay.collapseEnabled && !contentExpanded && isOverflowing}
          <div class="flex justify-center mt-1">
            <button
              class="btn btn-xs btn-ghost px-4 py-1 h-auto min-h-0 text-xs text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors rounded-full border border-primary/20 hover:border-primary/40"
              onclick={toggleContent}
            >
              続きを読む
            </button>
          </div>
        {:else if config.noteDisplay.collapseEnabled && contentExpanded && isOverflowing}
          <div class="flex justify-center mt-1">
            <button
              class="btn btn-xs btn-ghost px-4 py-1 h-auto min-h-0 text-xs text-base-content/40 hover:text-base-content/60 hover:bg-base-content/5 transition-colors rounded-full border border-base-content/10 hover:border-base-content/20"
              onclick={toggleContent}
            >
              折り畳む
            </button>
          </div>
        {/if}
      </div>
    {/if}
  {/if}

</div>
