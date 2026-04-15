<script lang="ts">
  import type { AccountRuntime } from '$lib/types';
  import type { entities } from 'misskey-js';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import NotificationItem from './NotificationItem.svelte';

  type Props = {
    runtimes: Map<number, AccountRuntime>;
  };

  let { runtimes }: Props = $props();

  // アカウントIDごとにAPI取得した追加通知 (ページネーション用)
  let extraNotifications = $state<Map<number, entities.Notification[]>>(new Map());
  let loadingMore = $state(false);
  let hasMore = $state(true);
  let scrollEl = $state<HTMLElement | null>(null);

  type MergedItem = {
    notification: entities.Notification;
    accountId: number;
    runtime: AccountRuntime;
    sourceColor: string;
    sourceLabel: string;
  };

  // 全アカウントの通知を統合してソート (createdAt降順)
  const merged = $derived.by((): MergedItem[] => {
    const items: MergedItem[] = [];
    const seen = new Set<string>();

    for (const [accountId, runtime] of runtimes) {
      const account = accountStore.findById(accountId);
      const color = account?.themeColor ?? '#86b300';
      const host = account?.hostUrl?.replace(/^https?:\/\//, '') ?? '?';
      const label = `@${account?.userName ?? '?'}@${host}`;

      for (const n of runtime.notifState.notifications) {
        const key = `${accountId}:${n.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ notification: n, accountId, runtime, sourceColor: color, sourceLabel: label });
        }
      }

      for (const n of (extraNotifications.get(accountId) ?? [])) {
        const key = `${accountId}:${n.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ notification: n, accountId, runtime, sourceColor: color, sourceLabel: label });
        }
      }
    }

    return items.sort((a, b) =>
      new Date(b.notification.createdAt).getTime() - new Date(a.notification.createdAt).getTime()
    );
  });

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    loadingMore = true;

    let anyFetched = false;

    for (const [accountId, runtime] of runtimes) {
      const currentNotifs = [
        ...runtime.notifState.notifications,
        ...(extraNotifications.get(accountId) ?? []),
      ];
      const oldest = currentNotifs.at(-1);

      try {
        const more = await runtime.cli.request('i/notifications', {
          limit: 20,
          ...(oldest ? { untilId: oldest.id } : {}),
        }) as entities.Notification[];

        if (more.length > 0) {
          const existing = extraNotifications.get(accountId) ?? [];
          const next = new Map(extraNotifications);
          next.set(accountId, [...existing, ...more]);
          extraNotifications = next;
          anyFetched = true;
        }
      } catch {
        // 取得失敗は無視
      }
    }

    if (!anyFetched) hasMore = false;
    loadingMore = false;
  }

  function handleScroll() {
    if (!scrollEl) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore();
    }
  }

  // 水平スクロールをColumnContainerに転送する (縦スクロールに吸われるのを防ぐ)
  function handleWheel(e: WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const columnContainer = (e.currentTarget as HTMLElement).closest('.column-container') as HTMLElement | null;
      columnContainer?.scrollBy({ left: e.deltaX, behavior: 'auto' });
    }
  }

  $effect(() => {
    const el = scrollEl;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  });
</script>

<div
  class="flex-1 overflow-y-auto"
  bind:this={scrollEl}
  onscroll={handleScroll}
>
  {#if merged.length === 0}
    <div class="flex items-center justify-center h-20 text-base-content/40 text-sm">
      通知はありません
    </div>
  {:else}
    <ul class="divide-y divide-base-300">
      {#each merged as item (item.accountId + ':' + item.notification.id)}
        <NotificationItem
          notification={item.notification}
          runtime={item.runtime}
          sourceColor={item.sourceColor}
          sourceLabel={item.sourceLabel}
        />
      {/each}
    </ul>

    <!-- ローディング / 末尾インジケーター -->
    {#if loadingMore}
      <div class="flex items-center justify-center py-3">
        <span class="loading loading-spinner loading-xs text-base-content/30"></span>
      </div>
    {:else if !hasMore}
      <div class="flex items-center justify-center py-3">
        <span class="text-[10px] text-base-content/20">これ以上ありません</span>
      </div>
    {/if}
  {/if}
</div>
