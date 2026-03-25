<script lang="ts">
  import type { entities } from 'misskey-js';
  import Avatar from '$components/common/Avatar.svelte';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';

  type Props = {
    user: entities.UserLite;
    hostUrl?: string;
    compact?: boolean;
    emojis?: Record<string, string>;
    onclick?: (user: entities.UserLite) => void;
  };

  let { user, hostUrl, compact = false, emojis = {}, onclick }: Props = $props();

  // ユーザーの表示名
  const displayName = $derived(user.name || user.username);

  // @user@host 形式
  const fullHandle = $derived(
    user.host ? `@${user.username}@${user.host}` : `@${user.username}`
  );

  // アバターURL
  const avatarUrl = $derived(user.avatarUrl ?? null);

  // ユーザー固有の絵文字をマージ (リモートユーザーのカスタム絵文字を含む)
  const mergedEmojis = $derived({
    ...emojis,
    ...(user.emojis as Record<string, string> | undefined ?? {}),
  });

  // 外部サーバーユーザーかどうか
  const isRemote = $derived(!!user.host);

  // サーバー表示名 (instance.name があればそれを使い、なければ host)
  const serverName = $derived(
    isRemote
      ? (user.instance?.name || user.host)
      : null
  );

  // サーバーテーマカラー
  const serverThemeColor = $derived(user.instance?.themeColor ?? null);

  function handleClick() {
    if (onclick) onclick(user);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="note-user flex items-center gap-1.5 min-w-0 w-fit max-w-full {onclick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}"
  onclick={handleClick}
>
  <!-- アバター -->
  <Avatar
    url={avatarUrl}
    size={compact ? '1.5rem' : '2rem'}
    alt={user.username}
    class="shrink-0"
  />

  <!-- ユーザー情報 -->
  <div class="flex flex-col min-w-0 leading-tight">
    <!-- 表示名 + サーバーバッジ行 -->
    <div class="flex items-center gap-1 min-w-0">
      <span
        class="text-xs font-semibold text-base-content truncate"
        title={displayName}
      >
        <MfmRenderer text={displayName} emojis={mergedEmojis} isInline />
      </span>

      <!-- 外部サーバーバッジ -->
      {#if isRemote && serverName}
        <span
          class="server-badge shrink-0 inline-flex items-center px-1 py-px rounded text-[0.55rem] font-medium leading-none opacity-80"
          style="background-color: {serverThemeColor ?? '#6b7280'}1a; color: {serverThemeColor ?? '#6b7280'}; border: 1px solid {serverThemeColor ?? '#6b7280'}40;"
          title={user.host ?? ''}
          aria-label="サーバー: {serverName}"
        >
          {serverName}
        </span>
      {/if}
    </div>

    <!-- ハンドル -->
    <span
      class="text-[0.65rem] text-base-content/40 truncate"
      title={fullHandle}
    >
      {fullHandle}
    </span>
  </div>
</div>
