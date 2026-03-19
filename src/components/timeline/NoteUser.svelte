<script lang="ts">
  import type { entities } from 'misskey-js';
  import Avatar from '$components/common/Avatar.svelte';

  type Props = {
    user: entities.UserLite;
    hostUrl?: string;
    compact?: boolean;
  };

  let { user, hostUrl, compact = false }: Props = $props();

  // ユーザーの表示名
  const displayName = $derived(user.name || user.username);

  // @user@host 形式
  const fullHandle = $derived(
    user.host ? `@${user.username}@${user.host}` : `@${user.username}`
  );

  // アバターURL
  const avatarUrl = $derived(user.avatarUrl ?? null);
</script>

<div class="note-user flex items-center gap-1.5 min-w-0">
  <!-- アバター -->
  <Avatar
    url={avatarUrl}
    size={compact ? '1.5rem' : '2rem'}
    alt={user.username}
    class="shrink-0"
  />

  <!-- ユーザー情報 -->
  <div class="flex flex-col min-w-0 leading-tight">
    <!-- 表示名 -->
    <span
      class="text-xs font-semibold text-base-content truncate"
      title={displayName}
    >
      <!-- MFMRenderer integration point: replace span content with <MfmRenderer text={displayName} {emojis} /> -->
      {displayName}
    </span>

    <!-- ハンドル -->
    <span
      class="text-[0.65rem] text-base-content/40 truncate"
      title={fullHandle}
    >
      {fullHandle}
    </span>
  </div>
</div>
