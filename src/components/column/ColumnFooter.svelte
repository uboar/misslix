<script lang="ts">
  import type { ColumnConfig, AccountRuntime, Account } from '$lib/types';
  import NotificationPanel from '$components/notification/NotificationPanel.svelte';
  import QuickLinks from '$components/common/QuickLinks.svelte';
  import ColumnComposerPanel from '$components/composer/ColumnComposerPanel.svelte';
  import { Bell, Link2, MessageCircle } from 'lucide-svelte';

  type Props = {
    config: ColumnConfig;
    runtime?: AccountRuntime;
    account?: Account;
  };

  let { config, runtime, account }: Props = $props();

  // ── 通知パネル ──
  let notifPanelOpen = $state(false);
  let notifWrapperEl = $state<HTMLDivElement | null>(null);
  let notifBtnEl = $state<HTMLButtonElement | null>(null);
  let notifPopupStyle = $state('');

  // ── 投稿パネル ──
  let composerPanelOpen = $state(false);
  let composerWrapperEl = $state<HTMLDivElement | null>(null);
  let composerBtnEl = $state<HTMLButtonElement | null>(null);
  let composerPopupStyle = $state('');
  let composerPopupEl = $state<HTMLDivElement | null>(null);

  // ── リンク集パネル ──
  let linksPanelOpen = $state(false);
  let linksWrapperEl = $state<HTMLDivElement | null>(null);
  let linksBtnEl = $state<HTMLButtonElement | null>(null);
  let linksPopupStyle = $state('');

  // ポップアップの位置をボタンの位置から計算する
  // ポップアップはボタンの上側に表示する (fixed positioning)
  function calcPopupStyle(btnEl: HTMLButtonElement | null, align: 'left' | 'right' | 'center'): string {
    if (!btnEl) return '';
    const rect = btnEl.getBoundingClientRect();
    const bottom = window.innerHeight - rect.top + 4; // ボタン上端から4px上
    const margin = 4; // ビューポート端からの最小余白
    if (align === 'right') {
      // 右端基準: ボタン右端に合わせる。左側にはみ出さないよう clamp
      const right = Math.max(margin, window.innerWidth - rect.right);
      return `position: fixed; bottom: ${bottom}px; right: ${right}px;`;
    } else if (align === 'center') {
      // 中央基準: ボタン中央に合わせ、左右にはみ出さないよう transform で調整
      const btnCenterX = rect.left + rect.width / 2;
      return `position: fixed; bottom: ${bottom}px; left: ${btnCenterX}px; transform: translateX(-50%);`;
    } else {
      // 左端基準: ボタン左端に合わせる。右側にはみ出さないよう clamp
      const left = Math.max(margin, rect.left);
      return `position: fixed; bottom: ${bottom}px; left: ${left}px;`;
    }
  }

  function openNotifPanel() {
    notifPopupStyle = calcPopupStyle(notifBtnEl, 'left');
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
    composerPopupStyle = calcPopupStyle(composerBtnEl, 'center');
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
      linksPopupStyle = calcPopupStyle(linksBtnEl, 'right');
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
      if (composerPanelOpen && composerWrapperEl && !composerWrapperEl.contains(target) &&
          (!composerPopupEl || !composerPopupEl.contains(target))) {
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
  class="column-footer shrink-0 relative flex items-stretch bg-base-200 border-t border-base-300"
  style="--accent: {config.color}; min-height: 2rem;"
>
  <!-- 左: 通知ベルアイコン -->
  <div class="flex items-stretch" bind:this={notifWrapperEl}>
    {#if runtime}
      <div class="relative flex items-stretch">
        <button
          bind:this={notifBtnEl}
          class="flex items-center justify-center px-2.5 relative hover:bg-base-300 transition-colors {notifPanelOpen ? 'bg-base-300' : ''}"
          class:opacity-60={!runtime.hasUnread}
          onclick={toggleNotifPanel}
          aria-label="通知{runtime.hasUnread ? ' (未読あり)' : ''}"
          title="通知"
          style={runtime.hasUnread ? `color: ${config.color};` : ''}
        >
          <Bell class="w-4 h-4" aria-hidden="true" />
          {#if runtime.hasUnread}
            <span
              class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-error"
              aria-label="未読通知あり"
            ></span>
          {/if}
        </button>

        {#if notifPanelOpen}
          <div class="z-50" style={notifPopupStyle}>
            <NotificationPanel {runtime} onclose={closeNotifPanel} />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- スペーサー -->
  <div class="flex-1"></div>

  <!-- 中央: ノート投稿ボタン (absolute で中央固定) -->
  {#if runtime}
    <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-stretch" bind:this={composerWrapperEl}>
      <div class="relative flex items-stretch">
        <button
          bind:this={composerBtnEl}
          class="flex items-center justify-center px-2.5 transition-colors
            {composerPanelOpen
              ? 'bg-primary text-primary-content'
              : 'text-primary hover:bg-primary/10'}"
          onclick={toggleComposerPanel}
          aria-label="ノートを投稿"
          title="ノートを投稿"
        >
          <MessageCircle class="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </div>

    {#if composerPanelOpen}
      <div class="z-50" style={composerPopupStyle} bind:this={composerPopupEl}>
        <ColumnComposerPanel {config} {runtime} onclose={closeComposerPanel} />
      </div>
    {/if}
  {/if}

  <!-- スペーサー -->
  <div class="flex-1"></div>

  <!-- 右: リンク集ボタン -->
  <div class="flex items-stretch" bind:this={linksWrapperEl}>
    {#if account}
      <div class="relative flex items-stretch">
        <button
          bind:this={linksBtnEl}
          class="flex items-center justify-center px-2.5 hover:bg-base-300 transition-colors text-base-content/60 hover:text-base-content {linksPanelOpen ? 'bg-base-300' : ''}"
          onclick={toggleLinksPanel}
          aria-label="クイックリンク"
          title="クイックリンク"
        >
          <Link2 class="w-4 h-4" aria-hidden="true" />
        </button>

        {#if linksPanelOpen}
          <div class="z-50 bg-base-200 border border-base-300 rounded-lg shadow-xl p-3 w-48" style="{linksPopupStyle} max-width: min(12rem, calc(100vw - 1rem));">
            <QuickLinks {account} onclose={closeLinksPanel} />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
