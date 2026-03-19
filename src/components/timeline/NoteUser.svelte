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

  function handleClick() {
    if (onclick) onclick(user);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="note-user flex items-center gap-1.5 min-w-0 {onclick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}"
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
    <!-- 表示名 -->
    <span
      class="text-xs font-semibold text-base-content truncate"
      title={displayName}
    >
      <MfmRenderer text={displayName} emojis={mergedEmojis} isInline />
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
