<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { X } from 'lucide-svelte';

  let settings = $derived(settingsStore.settings);

  // ユーザーミュート
  let newMuteUser = $state('');
  let muteUserError = $state('');

  function addMuteUser() {
    muteUserError = '';
    const value = newMuteUser.trim();
    if (!value) {
      muteUserError = 'ユーザーを入力してください';
      return;
    }
    if (settings.muteUsers.includes(value)) {
      muteUserError = 'すでに追加されています';
      return;
    }
    settingsStore.update({ muteUsers: [...settings.muteUsers, value] });
    newMuteUser = '';
  }

  function removeMuteUser(user: string) {
    settingsStore.update({ muteUsers: settings.muteUsers.filter((u) => u !== user) });
  }

  function onMuteUserKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') addMuteUser();
  }

  // ワードミュート
  let newMuteWord = $state('');
  let muteWordError = $state('');

  function validateRegex(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }

  function onMuteWordInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    newMuteWord = value;
    if (value && !validateRegex(value)) {
      muteWordError = '無効な正規表現です';
    } else {
      muteWordError = '';
    }
  }

  function addMuteWord() {
    muteWordError = '';
    const value = newMuteWord.trim();
    if (!value) {
      muteWordError = 'ワードを入力してください';
      return;
    }
    if (!validateRegex(value)) {
      muteWordError = '無効な正規表現です';
      return;
    }
    if (settings.muteWords.includes(value)) {
      muteWordError = 'すでに追加されています';
      return;
    }
    settingsStore.update({ muteWords: [...settings.muteWords, value] });
    newMuteWord = '';
  }

  function removeMuteWord(word: string) {
    settingsStore.update({ muteWords: settings.muteWords.filter((w) => w !== word) });
  }

  function onMuteWordKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') addMuteWord();
  }
</script>

<div class="space-y-6">
  <!-- ユーザーミュート -->
  <section>
    <h4 class="font-semibold mb-3">ユーザーミュート</h4>
    <div class="flex gap-2 mb-2">
      <input
        type="text"
        class="input input-bordered flex-1 input-sm"
        placeholder="user@host"
        bind:value={newMuteUser}
        onkeydown={onMuteUserKeydown}
      />
      <button class="btn btn-primary btn-sm" onclick={addMuteUser}>追加</button>
    </div>
    {#if muteUserError}
      <p class="text-error text-xs mb-2">{muteUserError}</p>
    {/if}
    {#if settings.muteUsers.length === 0}
      <p class="text-base-content/40 text-sm">ミュートユーザーなし</p>
    {:else}
      <ul class="space-y-1">
        {#each settings.muteUsers as user (user)}
          <li class="flex items-center justify-between bg-base-200 rounded px-3 py-1.5">
            <span class="text-sm font-mono">{user}</span>
            <button
              class="btn btn-ghost btn-xs text-base-content/40 hover:text-error"
              onclick={() => removeMuteUser(user)}
              aria-label="削除"
            >
              <X class="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="divider"></div>

  <!-- ワードミュート -->
  <section>
    <h4 class="font-semibold mb-1">ワードミュート</h4>
    <p class="text-base-content/50 text-xs mb-3">正規表現で入力できます</p>
    <div class="flex gap-2 mb-2">
      <input
        type="text"
        class="input input-bordered flex-1 input-sm {muteWordError ? 'input-error' : ''}"
        placeholder="キーワード or /regex/"
        value={newMuteWord}
        oninput={onMuteWordInput}
        onkeydown={onMuteWordKeydown}
      />
      <button class="btn btn-primary btn-sm" onclick={addMuteWord} disabled={!!muteWordError && !!newMuteWord}>追加</button>
    </div>
    {#if muteWordError}
      <p class="text-error text-xs mb-2">{muteWordError}</p>
    {/if}
    {#if settings.muteWords.length === 0}
      <p class="text-base-content/40 text-sm">ミュートワードなし</p>
    {:else}
      <ul class="space-y-1">
        {#each settings.muteWords as word (word)}
          <li class="flex items-center justify-between bg-base-200 rounded px-3 py-1.5">
            <span class="text-sm font-mono truncate max-w-xs">{word}</span>
            <button
              class="btn btn-ghost btn-xs text-base-content/40 hover:text-error shrink-0"
              onclick={() => removeMuteWord(word)}
              aria-label="削除"
            >
              <X class="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
