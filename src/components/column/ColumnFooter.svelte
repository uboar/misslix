<script lang="ts">
  import type { ColumnConfig, AccountRuntime, Account } from '$lib/types';
  import NotificationPanel from '$components/notification/NotificationPanel.svelte';
  import QuickLinks from '$components/common/QuickLinks.svelte';
  import ColumnComposerPanel from '$components/composer/ColumnComposerPanel.svelte';

  type Props = {
    config: ColumnConfig;
    runtime?: AccountRuntime;
    account?: Account;
  };

  let { config, runtime, account }: Props = $props();

  // ── 通知パネル ──
  let notifPanelOpen = $state(false);
  let notifWrapperEl = $state<HTMLDivElement | null>(null);

  // ── 投稿パネル ──
  let composerPanelOpen = $state(false);
  let composerWrapperEl = $state<HTMLDivElement | null>(null);

  // ── リンク集パネル ──
  let linksPanelOpen = $state(false);
  let linksWrapperEl = $state<HTMLDivElement | null>(null);

  function openNotifPanel() {
    notifPanelOpen = true;
    composerPanelOpen = false;
    linksPanelOpen = false;
    if (runtime) {
      runtime.hasUnread = false;
    }
  }

  function closeNotifPanel() {
    notifPanelOpen = false;
  }

  function toggleNotifPanel() {
    if (notifPanelOpen) {
      closeNotifPanel();
    } else {
      openNotifPanel();
    }
  }

  function openComposerPanel() {
    composerPanelOpen = true;
    notifPanelOpen = false;
    linksPanelOpen = false;
  }

  function closeComposerPanel() {
    composerPanelOpen = false;
  }

  function toggleComposerPanel() {
    if (composerPanelOpen) {
      closeComposerPanel();
    } else {
      openComposerPanel();
    }
  }

  function toggleLinksPanel() {
    if (linksPanelOpen) {
      linksPanelOpen = false;
    } else {
      linksPanelOpen = true;
      notifPanelOpen = false;
      composerPanelOpen = false;
    }
  }

  function closeLinksPanel() {
    linksPanelOpen = false;
  }

  // ── パネル外クリックで閉じる ──
  $effect(() => {
    if (!notifPanelOpen && !composerPanelOpen && !linksPanelOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (notifPanelOpen && notifWrapperEl && !notifWrapperEl.contains(target)) {
        closeNotifPanel();
      }
      if (composerPanelOpen && composerWrapperEl && !composerWrapperEl.contains(target)) {
        closeComposerPanel();
      }
      if (linksPanelOpen && linksWrapperEl && !linksWrapperEl.contains(target)) {
        closeLinksPanel();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });
</script>

<!-- カラムフッター -->
<div
  class="column-footer shrink-0 flex items-stretch bg-base-200 border-t border-base-300"
  style="--accent: {config.color}; min-height: 2rem;"
>
  <!-- 左: 通知ベルアイコン -->
  <div class="flex items-stretch" bind:this={notifWrapperEl}>
    {#if runtime}
      <div class="relative flex items-stretch">
        <button
          class="flex items-center justify-center px-2.5 relative hover:bg-base-300 transition-colors {notifPanelOpen ? 'bg-base-300' : ''}"
          class:opacity-60={!runtime.hasUnread}
          onclick={toggleNotifPanel}
          aria-label="通知{runtime.hasUnread ? ' (未読あり)' : ''}"
          title="通知"
          style={runtime.hasUnread ? `color: ${config.color};` : ''}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          {#if runtime.hasUnread}
            <span
              class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-error"
              aria-label="未読通知あり"
            ></span>
          {/if}
        </button>

        {#if notifPanelOpen}
          <div class="absolute bottom-full left-0 mb-1 z-50">
            <NotificationPanel {runtime} onclose={closeNotifPanel} />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 中央: リンク集ボタン -->
  <div class="flex items-stretch" bind:this={linksWrapperEl}>
    {#if account}
      <div class="relative flex items-stretch">
        <button
          class="flex items-center justify-center px-2.5 hover:bg-base-300 transition-colors text-base-content/60 hover:text-base-content {linksPanelOpen ? 'bg-base-300' : ''}"
          onclick={toggleLinksPanel}
          aria-label="クイックリンク"
          title="クイックリンク"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </button>

        {#if linksPanelOpen}
          <div class="absolute bottom-full right-0 mb-1 z-50 bg-base-200 border border-base-300 rounded-lg shadow-xl p-3 w-48">
            <QuickLinks {account} onclose={closeLinksPanel} />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- スペーサー -->
  <div class="flex-1"></div>

  <!-- 右: ノート投稿ボタン -->
  {#if runtime}
    <div class="flex items-stretch" bind:this={composerWrapperEl}>
      <div class="relative flex items-stretch">
        <button
          class="flex items-center justify-center gap-1.5 px-3 font-semibold text-xs transition-colors
            {composerPanelOpen
              ? 'bg-primary text-primary-content'
              : 'text-primary hover:bg-primary/10'}"
          onclick={toggleComposerPanel}
          aria-label="ノートを投稿"
          title="ノートを投稿"
        >
          <svg
            class="w-3.5 h-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            aria-hidden="true"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>ノート</span>
        </button>

        {#if composerPanelOpen}
          <div class="absolute bottom-full right-0 mb-1 z-50">
            <ColumnComposerPanel {config} {runtime} onclose={closeComposerPanel} />
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
