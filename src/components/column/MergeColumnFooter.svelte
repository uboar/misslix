<script lang="ts">
  import type { ColumnConfig, AccountRuntime } from '$lib/types';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import ColumnComposerPanel from '$components/composer/ColumnComposerPanel.svelte';
  import { MessageCircle, X, ChevronDown } from 'lucide-svelte';

  type Props = {
    config: ColumnConfig;
    runtimes: Map<number, AccountRuntime>;
    selectedAccountId: number | undefined;
    onselect: (accountId: number) => void;
  };

  let { config, runtimes, selectedAccountId, onselect }: Props = $props();

  // ── モバイル判定 ──
  let isMobile = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    isMobile = mq.matches;
    const handler = (e: MediaQueryListEvent) => { isMobile = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  // ── アカウントドロップダウン ──
  let accountDropdownOpen = $state(false);

  const accountEntries = $derived(
    Array.from(runtimes.keys())
      .map(id => accountStore.findById(id))
      .filter((a): a is NonNullable<typeof a> => !!a)
  );

  const selectedAccount = $derived(
    selectedAccountId != null ? accountStore.findById(selectedAccountId) : undefined
  );

  const selectedRuntime = $derived(
    selectedAccountId != null ? runtimes.get(selectedAccountId) : undefined
  );

  function handleAccountSelect(accountId: number) {
    onselect(accountId);
    accountDropdownOpen = false;
  }

  // ── 投稿パネル ──
  let composerPanelOpen = $state(false);
  let composerWrapperEl = $state<HTMLDivElement | null>(null);
  let composerBtnEl = $state<HTMLButtonElement | null>(null);
  let composerPopupStyle = $state('');
  let composerPopupEl = $state<HTMLDivElement | null>(null);

  // モバイルモーダル
  let mobileModalEl = $state<HTMLDialogElement | null>(null);
  let mobileModalOpen = $state(false);

  $effect(() => {
    if (!mobileModalEl) return;
    if (mobileModalOpen) {
      mobileModalEl.showModal();
    } else {
      mobileModalEl.close();
    }
  });

  function calcPopupStyle(btnEl: HTMLButtonElement | null): string {
    if (!btnEl) return '';
    const rect = btnEl.getBoundingClientRect();
    const bottom = window.innerHeight - rect.top + 4;
    const btnCenterX = rect.left + rect.width / 2;
    return `position: fixed; bottom: ${bottom}px; left: ${btnCenterX}px; transform: translateX(-50%);`;
  }

  function toggleComposerPanel() {
    if (isMobile) {
      mobileModalOpen = true;
      return;
    }
    if (composerPanelOpen) {
      composerPanelOpen = false;
    } else {
      composerPopupStyle = calcPopupStyle(composerBtnEl);
      composerPanelOpen = true;
    }
  }

  // ── パネル外クリックで閉じる ──
  $effect(() => {
    if (!composerPanelOpen && !accountDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (composerPanelOpen && composerWrapperEl && !composerWrapperEl.contains(target) &&
          (!composerPopupEl || !composerPopupEl.contains(target))) {
        composerPanelOpen = false;
      }
      if (accountDropdownOpen) {
        accountDropdownOpen = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<!-- モバイル用モーダル -->
<dialog bind:this={mobileModalEl} class="modal modal-middle" onclose={() => { mobileModalOpen = false; }}>
  <div class="modal-box p-0 max-h-[85dvh] overflow-hidden flex flex-col rounded-xl w-full max-w-md">
    <div class="flex items-center justify-between px-4 py-3 border-b border-base-300 shrink-0">
      <h3 class="font-semibold text-base">ノートを投稿</h3>
      <button class="btn btn-ghost btn-sm btn-circle" onclick={() => { mobileModalOpen = false; }} aria-label="閉じる">
        <X class="w-4 h-4" />
      </button>
    </div>
    <div class="overflow-y-auto flex-1 p-4">
      {#if selectedRuntime}
        <ColumnComposerPanel {config} runtime={selectedRuntime} onclose={() => { mobileModalOpen = false; }} hideHeader={true} />
      {/if}
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>

<!-- マージカラムフッター -->
<div
  class="column-footer shrink-0 relative flex items-stretch bg-base-200 border-t border-base-300"
  style="--accent: {config.color}; min-height: 4rem;"
>
  <!-- 左: アカウント選択 -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="relative flex items-stretch">
    <button
      class="flex items-center gap-1.5 px-3 hover:bg-base-300 transition-colors text-xs text-base-content/70 hover:text-base-content"
      onclick={(e) => { e.stopPropagation(); accountDropdownOpen = !accountDropdownOpen; }}
      aria-label="アカウント選択"
      title="リアクション・投稿アカウント"
    >
      {#if selectedAccount?.themeColor}
        <span
          class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style="background-color: {selectedAccount.themeColor};"
          aria-hidden="true"
        ></span>
      {/if}
      <span class="truncate max-w-[12rem]">
        {#if selectedAccount}
          @{selectedAccount.userName}@{selectedAccount.hostUrl.replace(/^https?:\/\//, '')}
        {:else}
          アカウント
        {/if}
      </span>
      <ChevronDown class="w-3 h-3 shrink-0 opacity-50" aria-hidden="true" />
    </button>

    {#if accountDropdownOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="fixed inset-0 z-40" onclick={() => { accountDropdownOpen = false; }}></div>
      <ul
        class="absolute bottom-full left-0 mb-1 z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl py-1 min-w-[12rem]"
        role="listbox"
        aria-label="アカウント選択"
      >
        {#each accountEntries as account (account.id)}
          <li>
            <button
              class="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-base-200 transition-colors
                {account.id === selectedAccountId ? 'bg-primary/10 text-primary' : ''}"
              role="option"
              aria-selected={account.id === selectedAccountId}
              onclick={() => handleAccountSelect(account.id)}
            >
              {#if account.themeColor}
                <span
                  class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style="background-color: {account.themeColor};"
                  aria-hidden="true"
                ></span>
              {:else}
                <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0 bg-base-content/20" aria-hidden="true"></span>
              {/if}
              <span class="truncate">@{account.userName}@{account.hostUrl.replace(/^https?:\/\//, '')}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- 右: 投稿ボタン -->
  {#if selectedRuntime}
    <div class="flex-1 flex items-stretch" bind:this={composerWrapperEl}>
      <button
        bind:this={composerBtnEl}
        class="flex-1 flex items-center justify-center transition-colors
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

    {#if composerPanelOpen}
      <div class="z-50" style={composerPopupStyle} bind:this={composerPopupEl}>
        <ColumnComposerPanel {config} runtime={selectedRuntime} onclose={() => { composerPanelOpen = false; }} />
      </div>
    {/if}
  {:else}
    <div class="flex-1"></div>
  {/if}
</div>
