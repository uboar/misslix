<script lang="ts">
  import type { ColumnConfig, AccountRuntime, Account } from '$lib/types';
  import NotificationPanel from '$components/notification/NotificationPanel.svelte';
  import QuickLinks from '$components/common/QuickLinks.svelte';
  import PostModal from '$components/composer/PostModal.svelte';

  type Props = {
    config: ColumnConfig;
    runtime?: AccountRuntime;
    account?: Account;
  };

  let { config, runtime, account }: Props = $props();

  // ── 通知パネル ──
  let notifPanelOpen = $state(false);
  let notifWrapperEl = $state<HTMLDivElement | null>(null);

  function openNotifPanel() {
    notifPanelOpen = true;
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

  // ── リンク集パネル ──
  let linksPanelOpen = $state(false);
  let linksWrapperEl = $state<HTMLDivElement | null>(null);

  function toggleLinksPanel() {
    linksPanelOpen = !linksPanelOpen;
  }

  function closeLinksPanel() {
    linksPanelOpen = false;
  }

  // ── 投稿モーダル ──
  let postModalOpen = $state(false);

  // ── 投稿モーダル用ランタイムマップ ──
  let runtimeMap = $derived(
    runtime
      ? new Map([[config.accountId, runtime]])
      : new Map<number, AccountRuntime>()
  );

  // ── パネル外クリックで閉じる ──
  $effect(() => {
    if (!notifPanelOpen && !linksPanelOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (notifPanelOpen && notifWrapperEl && !notifWrapperEl.contains(target)) {
        closeNotifPanel();
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
  class="column-footer shrink-0 flex items-center justify-between px-2 bg-base-200 border-t border-base-300 min-h-12"
  style="--accent: {config.color};"
>
  <!-- 左: 通知ベルアイコン -->
  <div class="flex items-center gap-1" bind:this={notifWrapperEl}>
    {#if runtime}
      <div class="relative">
        <!-- 通知ボタン: 未読時はアクセントカラー、通常時は半透明 -->
        <button
          class="btn btn-ghost btn-sm btn-square relative"
          class:text-base-content={!runtime.hasUnread}
          class:opacity-60={!runtime.hasUnread}
          onclick={toggleNotifPanel}
          aria-label="通知{runtime.hasUnread ? ' (未読あり)' : ''}"
          title="通知"
          style={runtime.hasUnread ? `color: ${config.color};` : ''}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          <!-- 未読インジケータ (赤い丸) -->
          {#if runtime.hasUnread}
            <span
              class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-error"
              aria-label="未読通知あり"
            ></span>
          {/if}
        </button>

        <!-- 通知パネル (上方向にポップアップ) -->
        {#if notifPanelOpen}
          <div class="absolute bottom-full left-0 mb-1 z-50">
            <NotificationPanel {runtime} onclose={closeNotifPanel} />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 中央: ノート投稿ボタン (目立つデザイン) -->
  <div class="flex items-center">
    <button
      class="btn btn-primary btn-sm gap-1 px-3 font-semibold"
      onclick={() => (postModalOpen = true)}
      aria-label="ノートを投稿"
      title="ノートを投稿"
      disabled={!runtime}
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span class="text-xs">ノート</span>
    </button>
  </div>

  <!-- 右: リンク集ボタン -->
  <div class="flex items-center gap-1" bind:this={linksWrapperEl}>
    {#if account}
      <div class="relative">
        <button
          class="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-base-content"
          onclick={toggleLinksPanel}
          aria-label="クイックリンク"
          title="クイックリンク"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </button>

        <!-- リンク集パネル (上方向にポップアップ) -->
        {#if linksPanelOpen}
          <div class="absolute bottom-full right-0 mb-1 z-50 bg-base-200 border border-base-300 rounded-lg shadow-xl p-3 w-48">
            <QuickLinks {account} onclose={closeLinksPanel} />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- 投稿モーダル (カラムアカウント固定) -->
{#if postModalOpen}
  <PostModal
    open={postModalOpen}
    onclose={() => (postModalOpen = false)}
    runtimes={runtimeMap}
  />
{/if}
