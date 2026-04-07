<script lang="ts">
  import type { ColumnConfig, AccountRuntime, Account } from '$lib/types';
  import { COLUMN_WIDTH_MAP } from '$lib/types';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import ColumnHeader from './ColumnHeader.svelte';
  import InlineComposer from '../composer/InlineComposer.svelte';
  import NotificationItem from '../notification/NotificationItem.svelte';
  import QuickLinks from '../common/QuickLinks.svelte';
  import { ChevronRight, X, Bell, MessageCircle, Link2 } from 'lucide-svelte';

  type Props = {
    config: ColumnConfig;
    runtimes: Map<number, AccountRuntime>;
    ondragstart?: (e: DragEvent) => void;
    ondragend?: (e: DragEvent) => void;
    ondragover?: (e: DragEvent) => void;
    ondragleave?: (e: DragEvent) => void;
    ondrop?: (e: DragEvent) => void;
    dropIndicator?: 'left' | 'right' | null;
  };

  let { config, runtimes, ondragstart, ondragend, ondragover, ondragleave, ondrop, dropIndicator = null }: Props = $props();

  type TabType = 'compose' | 'notif' | 'links';
  let activeTabs = $state<Record<number, TabType>>({});

  function getActiveTab(accountId: number): TabType {
    return activeTabs[accountId] ?? 'compose';
  }

  function setActiveTab(accountId: number, tab: TabType) {
    activeTabs = { ...activeTabs, [accountId]: tab };
    if (tab === 'notif') {
      const runtime = runtimes.get(accountId);
      if (runtime) runtime.notifState.hasUnread = false;
    }
  }

  let accounts = $derived(accountStore.activeAccounts);

  let collapsed = $derived(config.collapsed);
  const COLLAPSED_WIDTH = '3rem';
  const MIN_WIDTH_PX = 128;

  let columnWidth = $derived(
    collapsed
      ? COLLAPSED_WIDTH
      : config.customWidth != null
        ? `${config.customWidth}px`
        : COLUMN_WIDTH_MAP[config.width]
  );

  function getContrastTextColor(hex: string): string {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return 'rgba(255,255,255,0.9)';
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.179 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)';
  }

  const collapsedTextColor = $derived(getContrastTextColor(config.color));

  // ─── リサイズ処理 ───
  let isResizing = $state(false);
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function handleResizePointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    resizeStartX = e.clientX;
    const el = (e.currentTarget as HTMLElement).parentElement!;
    resizeStartWidth = el.getBoundingClientRect().width;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleResizePointerMove(e: PointerEvent) {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartX;
    const newWidth = Math.max(MIN_WIDTH_PX, resizeStartWidth + dx);
    timelineStore.updateColumn(config.id, { customWidth: Math.round(newWidth) });
  }

  function handleResizePointerUp(e: PointerEvent) {
    if (!isResizing) return;
    isResizing = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  let wasDragged = $state(false);

  function handleDragStartWrapper(e: DragEvent) {
    wasDragged = false;
    ondragstart?.(e);
  }

  function handleDragEndWrapper(e: DragEvent) {
    wasDragged = true;
    ondragend?.(e);
    setTimeout(() => { wasDragged = false; }, 0);
  }

  function handleToggle() {
    if (wasDragged) return;
    timelineStore.updateColumn(config.id, { collapsed: !config.collapsed });
  }

  function handleRemove() {
    timelineStore.removeColumn(config.id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="column flex flex-col h-full border-r border-base-300 bg-base-100 overflow-hidden shrink-0 relative"
  class:transition-all={!isResizing}
  class:duration-200={!isResizing}
  class:ease-in-out={!isResizing}
  class:opacity-50={dropIndicator !== null}
  style="width: {columnWidth}; min-width: {columnWidth};"
  role="region"
  aria-label={config.customName || 'アカウントユーティリティ'}
  {ondragover}
  {ondragleave}
  {ondrop}
>
  {#if collapsed}
    <div class="flex flex-col items-center w-full h-full overflow-hidden" style="background-color: {config.color}; color: {collapsedTextColor};">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col items-center flex-1 py-2 gap-2 w-full overflow-hidden cursor-pointer transition-colors"
        style="background-color: {config.color};"
        draggable="true"
        ondragstart={handleDragStartWrapper}
        ondragend={handleDragEndWrapper}
        onclick={handleToggle}
        title="展開"
      >
        <ChevronRight class="w-3 h-3 shrink-0 opacity-70" aria-hidden="true" style="color: {collapsedTextColor};" />
        <div
          class="flex-1 flex items-center justify-center overflow-hidden"
          style="writing-mode: vertical-rl; text-orientation: mixed;"
        >
          <span
            class="text-xs font-semibold select-none truncate opacity-90"
            title={config.customName || 'アカウントユーティリティ'}
            style="max-height: 12rem; color: {collapsedTextColor};"
          >
            {config.customName || 'アカウントユーティリティ'}
          </span>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100"
          style="color: {collapsedTextColor};"
          onclick={(e) => { e.stopPropagation(); handleRemove(); }}
          aria-label="カラムを削除"
          title="カラムを削除"
        >
          <X class="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  {:else}
    <ColumnHeader
      {config}
      onremove={handleRemove}
      ontoggle={handleToggle}
      ondragstart={handleDragStartWrapper}
      ondragend={handleDragEndWrapper}
    />

    <!-- アカウント一覧 -->
    <div class="flex-1 overflow-y-auto">
      {#if accounts.length === 0}
        <div class="flex items-center justify-center h-20 text-base-content/40 text-sm px-4 text-center">
          アカウントが登録されていません
        </div>
      {:else}
        {#each accounts as account (account.id)}
          {@const runtime = runtimes.get(account.id)}
          {@const activeTab = getActiveTab(account.id)}
          {@const hasUnread = runtime?.notifState.hasUnread ?? false}

          <div class="border-b border-base-300">
            <!-- アカウントヘッダー -->
            <div
              class="flex items-center gap-2 px-3 py-2 bg-base-200 sticky top-0 z-10"
              style="border-left: 3px solid {account.themeColor ?? config.color};"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold truncate">@{account.userName}</p>
                <p class="text-[10px] text-base-content/50 truncate">{account.hostUrl.replace(/^https?:\/\//, '')}</p>
              </div>
              {#if hasUnread}
                <span
                  class="w-2 h-2 rounded-full bg-error shrink-0"
                  aria-label="未読通知あり"
                ></span>
              {/if}
            </div>

            <!-- タブバー -->
            <div class="flex border-b border-base-300 bg-base-100">
              <button
                class="flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors
                  {activeTab === 'compose'
                    ? 'text-primary border-b-2 border-primary font-semibold'
                    : 'text-base-content/50 hover:text-base-content hover:bg-base-200'}"
                onclick={() => setActiveTab(account.id, 'compose')}
                aria-label="投稿"
                title="投稿"
              >
                <MessageCircle class="w-3.5 h-3.5" aria-hidden="true" />
                <span>投稿</span>
              </button>
              <button
                class="flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors relative
                  {activeTab === 'notif'
                    ? 'text-primary border-b-2 border-primary font-semibold'
                    : 'text-base-content/50 hover:text-base-content hover:bg-base-200'}"
                onclick={() => setActiveTab(account.id, 'notif')}
                aria-label="通知{hasUnread ? ' (未読あり)' : ''}"
                title="通知"
                style={activeTab !== 'notif' && hasUnread ? `color: ${account.themeColor ?? config.color};` : ''}
              >
                <Bell class="w-3.5 h-3.5" aria-hidden="true" />
                <span>通知</span>
                {#if hasUnread && activeTab !== 'notif'}
                  <span class="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-error" aria-hidden="true"></span>
                {/if}
              </button>
              <button
                class="flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors
                  {activeTab === 'links'
                    ? 'text-primary border-b-2 border-primary font-semibold'
                    : 'text-base-content/50 hover:text-base-content hover:bg-base-200'}"
                onclick={() => setActiveTab(account.id, 'links')}
                aria-label="クイックリンク"
                title="クイックリンク"
              >
                <Link2 class="w-3.5 h-3.5" aria-hidden="true" />
                <span>リンク</span>
              </button>
            </div>

            <!-- タブコンテンツ -->
            <div class="bg-base-100">
              {#if activeTab === 'compose'}
                {#if runtime}
                  <div class="p-2">
                    <InlineComposer
                      {runtime}
                      columnId={config.id}
                      defaultVisibility={config.defaultVisibility}
                      defaultLocalOnly={config.defaultLocalOnly}
                      reactionDeck={config.reactionDeck}
                    />
                  </div>
                {:else}
                  <div class="flex items-center justify-center h-12 text-base-content/40 text-xs">
                    オフライン
                  </div>
                {/if}

              {:else if activeTab === 'notif'}
                {#if runtime}
                  {#if runtime.notifState.notifications.length === 0}
                    <div class="flex items-center justify-center h-12 text-base-content/40 text-xs">
                      通知はありません
                    </div>
                  {:else}
                    <ul class="divide-y divide-base-300 max-h-64 overflow-y-auto">
                      {#each runtime.notifState.notifications as notification (notification.id)}
                        <NotificationItem {notification} {runtime} />
                      {/each}
                    </ul>
                  {/if}
                {:else}
                  <div class="flex items-center justify-center h-12 text-base-content/40 text-xs">
                    オフライン
                  </div>
                {/if}

              {:else if activeTab === 'links'}
                <div class="p-3">
                  <QuickLinks {account} hideHeader={true} />
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  <!-- リサイズハンドル -->
  {#if !collapsed}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="resize-handle absolute top-0 right-0 w-2 h-full z-20 cursor-col-resize flex items-stretch"
      onpointerdown={handleResizePointerDown}
      onpointermove={handleResizePointerMove}
      onpointerup={handleResizePointerUp}
    >
      <div
        class="w-px ml-auto h-full transition-opacity duration-150 opacity-0 hover:opacity-50"
        class:opacity-80={isResizing}
        style="background-color: oklch(var(--p));"
      ></div>
    </div>
  {/if}
</div>
