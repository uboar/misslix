<script lang="ts">
  import type { Account } from '$lib/types';

  type Props = {
    account: Account;
    onclose?: () => void;
  };

  let { account, onclose }: Props = $props();

  let hostUrl = $derived(
    account.hostUrl.endsWith('/')
      ? account.hostUrl.slice(0, -1)
      : account.hostUrl,
  );

  const links = $derived([
    { label: 'ホーム', path: '/' },
    { label: '通知', path: '/my/notifications' },
    { label: 'メッセージ', path: '/my/messaging' },
    { label: 'お気に入り', path: '/my/favorites' },
    { label: 'リスト', path: '/my/lists' },
    { label: 'アンテナ', path: '/my/antennas' },
    { label: 'チャンネル', path: '/channels' },
    { label: '設定', path: '/settings' },
  ]);
</script>

<div class="space-y-1">
  <h4 class="text-xs font-semibold text-base-content/60 mb-2">
    @{account.userName} — クイックリンク
  </h4>
  {#each links as link}
    <a
      href="{hostUrl}{link.path}"
      target="_blank"
      rel="noopener noreferrer"
      class="block px-2 py-1 text-sm rounded hover:bg-base-200 transition-colors"
      onclick={onclose}
    >
      {link.label}
    </a>
  {/each}
</div>
