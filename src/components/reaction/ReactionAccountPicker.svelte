<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { ChevronDown } from 'lucide-svelte';

  type Props = {
    runtimes: Map<number, AccountRuntime>;
    selectedAccountId: number;
    onselect: (accountId: number) => void;
  };

  let { runtimes, selectedAccountId, onselect }: Props = $props();

  let dropdownOpen = $state(false);

  const accountEntries = $derived(
    Array.from(runtimes.keys())
      .map(id => accountStore.findById(id))
      .filter((a): a is NonNullable<typeof a> => !!a)
  );

  const selectedAccount = $derived(accountStore.findById(selectedAccountId));

  const selectedLabel = $derived(
    selectedAccount
      ? `@${selectedAccount.userName}`
      : '?'
  );

  function handleSelect(accountId: number) {
    onselect(accountId);
    dropdownOpen = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative inline-flex">
  <button
    class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[0.55rem]
      text-base-content/50 hover:text-base-content/80 hover:bg-base-200
      transition-colors duration-150 border border-base-300/40"
    title="リアクション送信アカウント"
    aria-label="リアクション送信アカウント選択"
    aria-haspopup="listbox"
    aria-expanded={dropdownOpen}
    onclick={(e) => { e.stopPropagation(); dropdownOpen = !dropdownOpen; }}
  >
    {#if selectedAccount?.themeColor}
      <span
        class="inline-block w-2 h-2 rounded-full shrink-0"
        style="background-color: {selectedAccount.themeColor};"
        aria-hidden="true"
      ></span>
    {/if}
    <span class="truncate max-w-[5rem]">{selectedLabel}</span>
    <ChevronDown class="w-2.5 h-2.5 shrink-0 opacity-50" aria-hidden="true" />
  </button>

  {#if dropdownOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 z-40" onclick={() => { dropdownOpen = false; }}></div>
    <ul
      class="absolute bottom-full left-0 mb-1 z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl py-1 min-w-[10rem]"
      role="listbox"
      aria-label="アカウント選択"
    >
      {#each accountEntries as account (account.id)}
        <li>
          <button
            class="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs text-left hover:bg-base-200 transition-colors
              {account.id === selectedAccountId ? 'bg-primary/10 text-primary' : ''}"
            role="option"
            aria-selected={account.id === selectedAccountId}
            onclick={() => handleSelect(account.id)}
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
