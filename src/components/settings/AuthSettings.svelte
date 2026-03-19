<script lang="ts">
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { MIAUTH_PERMISSIONS } from '$lib/api/endpoints';
  import type { Account } from '$lib/types';

  // ── MiAuth 状態 ──
  let miAuthHost = $state('');
  let miAuthUuid = $state('');
  let miAuthPending = $state(false);
  let miAuthLoading = $state(false);
  let miAuthError = $state('');

  // ── 直接トークン状態 ──
  let directHost = $state('');
  let directUserId = $state('');
  let directToken = $state('');
  let directLoading = $state(false);
  let directError = $state('');

  function normalizeHost(host: string): string {
    return host.startsWith('http') ? host : `https://${host}`;
  }

  // ── MiAuth フロー ──
  function startMiAuth() {
    miAuthError = '';
    const host = miAuthHost.trim();
    if (!host) {
      miAuthError = 'ホスト名を入力してください';
      return;
    }
    const uuid = crypto.randomUUID();
    miAuthUuid = uuid;
    const permissions = MIAUTH_PERMISSIONS.join(',');
    const origin = normalizeHost(host);
    const url = `${origin}/miauth/${uuid}?name=MissLIX&permission=${encodeURIComponent(permissions)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    miAuthPending = true;
  }

  async function completeMiAuth() {
    miAuthError = '';
    miAuthLoading = true;
    try {
      const host = miAuthHost.trim();
      const origin = normalizeHost(host);
      const res = await fetch(`${origin}/api/miauth/${miAuthUuid}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; token?: string; user?: { username: string } };
      if (!data.ok || !data.token) {
        miAuthError = '認証が完了していません。Misskeyでの認証後に「認証完了」を押してください。';
        return;
      }
      const account: Account = {
        id: Date.now(),
        userName: data.user?.username ?? '',
        hostUrl: origin,
        token: data.token,
        sessionId: miAuthUuid,
        ok: true,
      };
      accountStore.addAccount(account);
      // リセット
      miAuthHost = '';
      miAuthUuid = '';
      miAuthPending = false;
    } catch (e) {
      miAuthError = e instanceof Error ? e.message : '認証チェックに失敗しました';
    } finally {
      miAuthLoading = false;
    }
  }

  function cancelMiAuth() {
    miAuthPending = false;
    miAuthUuid = '';
    miAuthError = '';
  }

  // ── 直接トークン ──
  async function addDirectToken() {
    directError = '';
    const host = directHost.trim();
    const userId = directUserId.trim();
    const token = directToken.trim();
    if (!host || !userId || !token) {
      directError = 'すべての項目を入力してください';
      return;
    }
    directLoading = true;
    try {
      const origin = normalizeHost(host);
      // トークンの有効性を確認する
      const res = await fetch(`${origin}/api/i`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ i: token }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const user = await res.json() as { username?: string };
      const account: Account = {
        id: Date.now(),
        userName: user.username ?? userId,
        hostUrl: origin,
        token,
        ok: true,
      };
      accountStore.addAccount(account);
      directHost = '';
      directUserId = '';
      directToken = '';
    } catch (e) {
      directError = e instanceof Error ? e.message : 'トークンの検証に失敗しました';
    } finally {
      directLoading = false;
    }
  }

  // ── アカウント削除 ──
  function removeAccount(id: number) {
    accountStore.removeAccount(id);
  }
</script>

<div class="space-y-6">
  <!-- アカウント一覧 -->
  <section>
    <h4 class="font-semibold mb-2">登録済みアカウント</h4>
    {#if accountStore.accounts.length === 0}
      <p class="text-base-content/50 text-sm">アカウントがありません</p>
    {:else}
      <ul class="space-y-2">
        {#each accountStore.accounts as account (account.id)}
          <li class="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2">
            <div>
              <span class="font-medium">@{account.userName}</span>
              <span class="text-base-content/60 text-sm ml-2">{account.hostUrl}</span>
            </div>
            <button
              class="btn btn-xs btn-error btn-outline"
              onclick={() => removeAccount(account.id)}
            >
              削除
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="divider"></div>

  <!-- MiAuth 認証 -->
  <section>
    <h4 class="font-semibold mb-3">MiAuth 認証</h4>
    {#if !miAuthPending}
      <div class="flex gap-2">
        <input
          type="text"
          class="input input-bordered flex-1"
          placeholder="ホスト名 (例: misskey.io)"
          bind:value={miAuthHost}
          onkeydown={(e) => e.key === 'Enter' && startMiAuth()}
        />
        <button class="btn btn-primary" onclick={startMiAuth}>
          MiAuth 認証
        </button>
      </div>
    {:else}
      <div class="space-y-3">
        <p class="text-sm">
          Misskeyで認証が完了したら「認証完了」ボタンを押してください。
        </p>
        <div class="flex gap-2">
          <button
            class="btn btn-success"
            onclick={completeMiAuth}
            disabled={miAuthLoading}
          >
            {#if miAuthLoading}
              <span class="loading loading-spinner loading-sm"></span>
            {/if}
            認証完了
          </button>
          <button class="btn btn-ghost" onclick={cancelMiAuth}>
            キャンセル
          </button>
        </div>
      </div>
    {/if}
    {#if miAuthError}
      <p class="text-error text-sm mt-2">{miAuthError}</p>
    {/if}
  </section>

  <div class="divider"></div>

  <!-- 直接トークン入力 -->
  <section>
    <h4 class="font-semibold mb-3">直接トークン入力</h4>
    <div class="space-y-2">
      <input
        type="text"
        class="input input-bordered w-full"
        placeholder="ホスト名 (例: misskey.io)"
        bind:value={directHost}
      />
      <input
        type="text"
        class="input input-bordered w-full"
        placeholder="ユーザーID"
        bind:value={directUserId}
      />
      <input
        type="password"
        class="input input-bordered w-full"
        placeholder="アクセストークン"
        bind:value={directToken}
      />
      <button
        class="btn btn-primary w-full"
        onclick={addDirectToken}
        disabled={directLoading}
      >
        {#if directLoading}
          <span class="loading loading-spinner loading-sm"></span>
        {/if}
        アカウントを追加
      </button>
    </div>
    {#if directError}
      <p class="text-error text-sm mt-2">{directError}</p>
    {/if}
  </section>
</div>
