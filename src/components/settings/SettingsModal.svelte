<script lang="ts">
  import Modal from '../common/Modal.svelte';
  import AuthSettings from './AuthSettings.svelte';

  type Props = {
    open: boolean;
    onclose: () => void;
  };

  let { open, onclose }: Props = $props();

  type Tab = 'account' | 'general' | 'mute';
  let activeTab = $state<Tab>('account');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'account', label: 'アカウント' },
    { id: 'general', label: '一般' },
    { id: 'mute', label: 'ミュート' },
  ];
</script>

<Modal {open} {onclose} title="設定">
  {#snippet children()}
    <div class="tabs tabs-bordered mb-4">
      {#each tabs as tab (tab.id)}
        <button
          class="tab {activeTab === tab.id ? 'tab-active' : ''}"
          onclick={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="min-h-48">
      {#if activeTab === 'account'}
        <AuthSettings />
      {:else if activeTab === 'general'}
        <p class="text-base-content/50 text-sm">一般設定は Phase 6 で実装予定です。</p>
      {:else if activeTab === 'mute'}
        <p class="text-base-content/50 text-sm">ミュート設定は Phase 6 で実装予定です。</p>
      {/if}
    </div>
  {/snippet}
</Modal>
