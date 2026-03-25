<script lang="ts">
  import type { entities } from 'misskey-js';
  import type { AccountRuntime } from '$lib/types';
  import Modal from '$components/common/Modal.svelte';
  import Avatar from '$components/common/Avatar.svelte';
  import MfmRenderer from '$lib/mfm/MfmRenderer.svelte';

  type Props = {
    open: boolean;
    onclose: () => void;
    user: entities.UserLite;
    runtime?: AccountRuntime;
    emojis?: Record<string, string>;
    hostUrl?: string;
  };

  let { open, onclose, user, runtime, emojis = {}, hostUrl }: Props = $props();

  // ユーザー詳細情報 (APIから取得)
  let detail = $state<entities.UserDetailed | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // フォロー操作中
  let followBusy = $state(false);

  // ユーザー固有の絵文字をマージ (詳細情報取得後に detail.emojis も追加)
  const mergedEmojis = $derived({
    ...emojis,
    ...(user.emojis as Record<string, string> | undefined ?? {}),
    ...(detail?.emojis as Record<string, string> | undefined ?? {}),
  });

  const displayName = $derived(user.name || user.username);
  const fullHandle = $derived(
    user.host ? `@${user.username}@${user.host}` : `@${user.username}`
  );

  // フォロー状態
  const isFollowing = $derived(
    (detail as (entities.UserDetailed & { isFollowing?: boolean }) | null)?.isFollowing ?? false
  );
  const isFollowed = $derived(
    (detail as (entities.UserDetailed & { isFollowed?: boolean }) | null)?.isFollowed ?? false
  );
  const hasPendingRequest = $derived(
    (detail as (entities.UserDetailed & { hasPendingFollowRequestFromYou?: boolean }) | null)?.hasPendingFollowRequestFromYou ?? false
  );

  // 自分自身かどうか
  const isSelf = $derived(runtime ? runtime.userId === user.id : false);

  // モーダルが開かれたらユーザー詳細を取得
  $effect(() => {
    if (open && runtime) {
      fetchUserDetail();
    }
    if (!open) {
      detail = null;
      error = null;
    }
  });

  async function fetchUserDetail() {
    if (!runtime) return;
    loading = true;
    error = null;
    try {
      const res = await runtime.cli.request('users/show', { userId: user.id });
      detail = res as entities.UserDetailed;
    } catch (e) {
      error = 'ユーザー情報の取得に失敗しました';
      console.error('[UserDetailModal] fetch error:', e);
    } finally {
      loading = false;
    }
  }

  async function handleFollow() {
    if (!runtime || followBusy || isSelf) return;
    followBusy = true;
    try {
      if (isFollowing || hasPendingRequest) {
        await runtime.cli.request('following/delete', { userId: user.id });
      } else {
        await runtime.cli.request('following/create', { userId: user.id });
      }
      // 再取得して状態を更新
      await fetchUserDetail();
    } catch (e) {
      console.error('[UserDetailModal] follow/unfollow error:', e);
    } finally {
      followBusy = false;
    }
  }

  function getFollowButtonText(): string {
    if (hasPendingRequest) return 'リクエスト中';
    if (isFollowing) return 'フォロー解除';
    return 'フォロー';
  }

  function getFollowButtonClass(): string {
    if (hasPendingRequest) return 'btn-warning';
    if (isFollowing) return 'btn-outline btn-error';
    return 'btn-primary';
  }

  function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }
</script>

<Modal {open} {onclose}>
  <div class="flex flex-col gap-4">
    <!-- バナー -->
    {#if detail?.bannerUrl}
      <div class="relative -mx-6 -mt-6 mb-0 h-28 overflow-hidden rounded-t-2xl">
        <img
          src={detail.bannerUrl}
          alt=""
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-base-100/80"></div>
      </div>
    {/if}

    <!-- ユーザー基本情報 -->
    <div class="flex items-start gap-3 {detail?.bannerUrl ? '-mt-10 relative z-10' : 'pr-8'}">
      <Avatar
        url={user.avatarUrl ?? null}
        size="4rem"
        alt={user.username}
        class="shrink-0 ring-2 ring-base-100"
      />

      <div class="flex-1 min-w-0 mt-2">
        <div class="text-base font-bold text-base-content truncate">
          <MfmRenderer text={displayName} emojis={mergedEmojis} isInline />
        </div>
        <div class="text-xs text-base-content/50 truncate">
          {fullHandle}
        </div>
        {#if isFollowed}
          <span class="badge badge-xs badge-ghost mt-0.5">フォローされています</span>
        {/if}
      </div>

      <!-- フォローボタン -->
      {#if runtime && !isSelf}
        <button
          class="btn btn-sm {getFollowButtonClass()} mt-2 shrink-0"
          onclick={handleFollow}
          disabled={followBusy || loading}
        >
          {#if followBusy}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            {getFollowButtonText()}
          {/if}
        </button>
      {/if}
    </div>

    <!-- ローディング -->
    {#if loading && !detail}
      <div class="flex justify-center py-4">
        <span class="loading loading-spinner loading-md"></span>
      </div>
    {/if}

    <!-- エラー -->
    {#if error}
      <div class="text-error text-sm text-center">{error}</div>
    {/if}

    <!-- 詳細情報 -->
    {#if detail}
      <!-- 統計 -->
      <div class="flex gap-4 text-sm">
        <div class="flex flex-col items-center">
          <span class="font-bold text-base-content">{formatCount(detail.notesCount)}</span>
          <span class="text-[0.65rem] text-base-content/50">ノート</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="font-bold text-base-content">{formatCount(detail.followingCount)}</span>
          <span class="text-[0.65rem] text-base-content/50">フォロー</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="font-bold text-base-content">{formatCount(detail.followersCount)}</span>
          <span class="text-[0.65rem] text-base-content/50">フォロワー</span>
        </div>
      </div>

      <!-- 説明 -->
      {#if detail.description}
        <div class="text-sm text-base-content/80 break-words">
          <MfmRenderer text={detail.description} emojis={mergedEmojis} />
        </div>
      {/if}

      <!-- フィールド -->
      {#if detail.fields && detail.fields.length > 0}
        <div class="space-y-1">
          {#each detail.fields as field}
            <div class="flex gap-2 text-xs">
              <span class="font-semibold text-base-content/60 shrink-0">{field.name}</span>
              <span class="text-base-content/80 break-all min-w-0">
                <MfmRenderer text={field.value} emojis={mergedEmojis} />
              </span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- プロフィールリンク -->
      <div class="pt-2 border-t border-base-300/60">
        <a
          href={detail.url ?? `${hostUrl ?? (user.host ? `https://${user.host}` : 'https://misskey.io')}/@${user.username}`}
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-primary hover:underline"
        >
          プロフィールページを開く
        </a>
      </div>
    {/if}
  </div>
</Modal>
