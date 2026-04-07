<script lang="ts">
  import type { ChannelType, ColumnConfig, AccountRuntime, MergeSourceDef } from '$lib/types';
  import { DEFAULT_NOTE_DISPLAY, DEFAULT_FETCH_OPTIONS } from '$lib/types';
  import { accountStore } from '$lib/stores/accounts.svelte';
  import { timelineStore } from '$lib/stores/timelines.svelte';
  import { presetStore } from '$lib/stores/presets.svelte';
  import { showApiError } from '$lib/utils/error';
  import Modal from '../common/Modal.svelte';
  import { ChevronRight, ChevronLeft, Check, Layers, Plus, X, Bell } from 'lucide-svelte';

  type Props = {
    open: boolean;
    onclose: () => void;
    runtimes: Map<number, AccountRuntime>;
  };

  let { open, onclose, runtimes }: Props = $props();

  // ステップ: 1=アカウント選択, 2=チャンネル種別選択, 3=追加パラメータ入力, 'merge'=マージTL作成
  let step = $state<1 | 2 | 3 | 'merge'>(1);
  let selectedAccountId = $state<number | null>(null);
  let selectedChannel = $state<ChannelType | null>(null);
  let channelId = $state('');
  let channelName = $state('');

  // リスト選択モード
  type InputMode = 'direct' | 'list';
  let inputMode = $state<InputMode>('list');
  type ListItem = { id: string; name: string };
  let listItems = $state<ListItem[]>([]);
  let listLoading = $state(false);
  let listError = $state<string | null>(null);

  // ユーザーTL用ユーザー検索
  let userSearchQuery = $state('');
  let userSearchResults = $state<ListItem[]>([]);
  let userSearchLoading = $state(false);
  let userSearchError = $state<string | null>(null);
  let userSearchTimer: ReturnType<typeof setTimeout> | null = null;

  // マージTL用状態
  type MergeMode = 'preset' | 'manual';
  let mergeMode = $state<MergeMode>('preset');
  let selectedPresetId = $state<string | null>(null);
  let mergeSources = $state<MergeSourceDef[]>([]);
  let mergeCustomName = $state('マージTL');
  // マニュアル追加用
  let manualAccountId = $state<number | null>(null);
  let manualChannel = $state<ChannelType | null>(null);

  const CHANNEL_LABELS: Record<ChannelType, string> = {
    homeTimeline: 'ホーム',
    localTimeline: 'ローカル',
    hybridTimeline: 'ソーシャル',
    globalTimeline: 'グローバル',
    channel: 'チャンネル',
    antenna: 'アンテナ',
    userList: 'リスト',
    roleTimeline: 'ロール',
    userTimeline: 'ユーザー',
    mergeTimeline: 'マージ',
    mergeNotificationTimeline: 'マージ通知',
    accountUtility: 'アカウントユーティリティ',
  };

  const CHANNEL_DESCRIPTIONS: Record<ChannelType, string> = {
    homeTimeline: 'フォローしているユーザーのノート',
    localTimeline: 'このサーバーのノート',
    hybridTimeline: 'ホーム + ローカルの複合',
    globalTimeline: '全サーバーのノート',
    channel: '特定のチャンネルのノート',
    antenna: 'アンテナで捕捉したノート',
    userList: 'リスト内ユーザーのノート',
    roleTimeline: '特定ロールのユーザーのノート',
    userTimeline: '特定ユーザーのノート一覧',
    mergeTimeline: '複数タイムラインを統合表示',
    mergeNotificationTimeline: '全アカウントの通知を一つに集約',
    accountUtility: '投稿・通知・リンクを全アカウント分まとめて表示',
  };

  const CHANNEL_NEEDS_ID: ChannelType[] = ['channel', 'antenna', 'userList', 'roleTimeline', 'userTimeline'];

  const ACCENT_COLORS = [
    '#86b300', '#0095f6', '#ff6b35', '#9b59b6',
    '#e74c3c', '#2ecc71', '#f39c12', '#1abc9c',
    '#e91e63', '#3f51b5', '#00bcd4', '#ff5722',
  ];

  let selectedColor = $state(ACCENT_COLORS[0]);

  let needsId = $derived(
    selectedChannel !== null && CHANNEL_NEEDS_ID.includes(selectedChannel)
  );

  let canProceedStep2 = $derived(selectedChannel !== null);

  let canAdd = $derived(
    selectedAccountId !== null &&
    selectedChannel !== null &&
    (!needsId || (channelId.trim() !== '' && channelName.trim() !== ''))
  );

  function resetState() {
    step = 1;
    selectedAccountId = null;
    selectedChannel = null;
    channelId = '';
    channelName = '';
    selectedColor = ACCENT_COLORS[0];
    inputMode = 'list';
    listItems = [];
    listLoading = false;
    listError = null;
    userSearchQuery = '';
    userSearchResults = [];
    userSearchLoading = false;
    userSearchError = null;
    if (userSearchTimer) { clearTimeout(userSearchTimer); userSearchTimer = null; }
    mergeMode = 'preset';
    selectedPresetId = null;
    mergeSources = [];
    mergeCustomName = 'マージTL';
    manualAccountId = null;
    manualChannel = null;
  }

  function handleClose() {
    resetState();
    onclose();
  }

  function selectAccount(id: number) {
    selectedAccountId = id;
    const account = accountStore.accounts.find(a => a.id === id);
    if (account?.themeColor) {
      selectedColor = account.themeColor;
    } else {
      selectedColor = ACCENT_COLORS[0];
    }
    step = 2;
  }

  function selectChannel(ch: ChannelType) {
    selectedChannel = ch;
    channelName = CHANNEL_LABELS[ch];
    if (CHANNEL_NEEDS_ID.includes(ch)) {
      step = 3;
      fetchList();
    }
  }

  async function fetchList() {
    if (selectedAccountId === null || selectedChannel === null) return;
    const runtime = runtimes.get(selectedAccountId);
    if (!runtime) {
      listError = 'アカウントのランタイムが見つかりません';
      return;
    }

    listLoading = true;
    listError = null;
    listItems = [];

    try {
      const cli = runtime.cli;
      let items: ListItem[] = [];

      if (selectedChannel === 'channel') {
        const res = await cli.request('channels/my-favorites', {});
        items = (res as any[]).map((ch: any) => ({ id: ch.id, name: ch.name }));
      } else if (selectedChannel === 'antenna') {
        const res = await cli.request('antennas/list', {});
        items = (res as any[]).map((a: any) => ({ id: a.id, name: a.name }));
      } else if (selectedChannel === 'userList') {
        const res = await cli.request('users/lists/list', {});
        items = (res as any[]).map((l: any) => ({ id: l.id, name: l.name }));
      } else if (selectedChannel === 'roleTimeline') {
        const res = await cli.request('roles/list', {});
        items = (res as any[]).map((r: any) => ({ id: r.id, name: r.name }));
      }

      listItems = items;
    } catch (e) {
      listError = 'リストの取得に失敗しました';
      showApiError(e, 'リスト取得');
    } finally {
      listLoading = false;
    }
  }

  function selectListItem(item: ListItem) {
    channelId = item.id;
    channelName = item.name;
  }

  async function searchUsers(query: string) {
    if (!query.trim() || selectedAccountId === null) {
      userSearchResults = [];
      return;
    }
    const runtime = runtimes.get(selectedAccountId);
    if (!runtime) return;

    userSearchLoading = true;
    userSearchError = null;
    try {
      const res = await runtime.cli.request('users/search', { query: query.trim(), limit: 20, origin: 'local' });
      userSearchResults = (res as any[]).map((u: any) => ({
        id: u.id,
        name: u.name ? `${u.name} (@${u.username})` : `@${u.username}`,
      }));
    } catch (e) {
      userSearchError = 'ユーザーの検索に失敗しました';
    } finally {
      userSearchLoading = false;
    }
  }

  function handleUserSearchInput(e: Event) {
    const query = (e.target as HTMLInputElement).value;
    userSearchQuery = query;
    if (userSearchTimer) clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(() => searchUsers(query), 400);
  }

  function handleAdd() {
    if (!canAdd || selectedAccountId === null || selectedChannel === null) return;

    const finalChannelName = needsId
      ? (channelName.trim() || CHANNEL_LABELS[selectedChannel])
      : CHANNEL_LABELS[selectedChannel];

    const column: ColumnConfig = timelineStore.createDefaultColumn(
      selectedAccountId,
      selectedChannel,
      finalChannelName,
      {
        color: selectedColor,
        channelId: needsId ? channelId.trim() : undefined,
      }
    );
    timelineStore.addColumn(column);
    handleClose();
  }

  function goBack() {
    if (step === 3) {
      step = 2;
      listItems = [];
      listError = null;
    } else if (step === 2) {
      step = 1;
    } else if (step === 'merge') {
      step = 1;
      mergeSources = [];
      selectedPresetId = null;
    }
  }

  // マージTL: プリセット選択時にソース生成
  function selectPresetForMerge(presetId: string) {
    selectedPresetId = presetId;
    const preset = presetStore.getPreset(presetId);
    if (!preset) return;
    mergeSources = preset.columns
      .filter(c => c.channel !== 'mergeTimeline')
      .map(c => ({
        accountId: c.accountId,
        channel: c.channel,
        channelId: c.channelId,
        channelName: c.customName || c.channelName,
        color: c.color,
      }));
    mergeCustomName = `${preset.name} (マージ)`;
  }

  // マニュアル: ソース追加
  function addManualSource() {
    if (manualAccountId === null || manualChannel === null) return;
    if (manualChannel === 'mergeTimeline') return;
    const account = accountStore.findById(manualAccountId);
    const host = account?.hostUrl?.replace(/^https?:\/\//, '') ?? '?';
    const color = account?.themeColor ?? ACCENT_COLORS[mergeSources.length % ACCENT_COLORS.length];
    mergeSources = [...mergeSources, {
      accountId: manualAccountId,
      channel: manualChannel,
      channelName: `${CHANNEL_LABELS[manualChannel]}@${host}`,
      color,
    }];
    manualChannel = null;
  }

  // マニュアル: ソース削除
  function removeSource(index: number) {
    mergeSources = mergeSources.filter((_, i) => i !== index);
  }

  // マージTL: カラム追加
  function handleAddMerge() {
    if (mergeSources.length === 0) return;
    const column: ColumnConfig = {
      id: Date.now(),
      accountId: -1,
      channel: 'mergeTimeline',
      channelName: 'マージTL',
      customName: mergeCustomName || 'マージTL',
      color: selectedColor,
      width: 'lg',
      maxNotes: 200,
      bufferSize: 500,
      collapsed: false,
      autoCollapse: false,
      lowRate: false,
      reactionDeck: [],
      noteDisplay: { ...DEFAULT_NOTE_DISPLAY },
      fetchOptions: { ...DEFAULT_FETCH_OPTIONS },
      sourceColumns: mergeSources,
      sourcePresetId: selectedPresetId ?? undefined,
    };
    timelineStore.addColumn(column);
    handleClose();
  }

  // マージ通知TL: カラム追加 (アカウント選択不要)
  function handleAddMergeNotification() {
    const column: ColumnConfig = {
      id: Date.now(),
      accountId: -1,
      channel: 'mergeNotificationTimeline',
      channelName: 'マージ通知',
      customName: 'マージ通知',
      color: selectedColor,
      width: 'md',
      maxNotes: 200,
      bufferSize: 500,
      collapsed: false,
      autoCollapse: false,
      lowRate: false,
      reactionDeck: [],
      noteDisplay: { ...DEFAULT_NOTE_DISPLAY },
      fetchOptions: { ...DEFAULT_FETCH_OPTIONS },
    };
    timelineStore.addColumn(column);
    handleClose();
  }

</script>

<Modal open={open} onclose={handleClose} title="カラムを追加">
  <!-- ステップインジケーター -->
  {#if step === 'merge'}
    <ul class="steps steps-horizontal w-full mb-5 text-xs">
      <li class="step step-primary">モード</li>
      <li class="step step-primary">ソース設定</li>
    </ul>
  {:else}
    <ul class="steps steps-horizontal w-full mb-5 text-xs">
      <li class="step" class:step-primary={step >= 1}>アカウント</li>
      <li class="step" class:step-primary={step >= 2}>タイムライン</li>
      {#if needsId || step === 3}
        <li class="step" class:step-primary={step >= 3}>詳細</li>
      {/if}
    </ul>
  {/if}

  <!-- ステップ 1: アカウント選択 -->
  {#if step === 1}
    <div class="space-y-2">
      <!-- マージTL / マージ通知TL作成ボタン -->
      {#if accountStore.accounts.length > 0}
        <button
          class="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 transition-colors text-left"
          onclick={() => { step = 'merge'; }}
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Layers class="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-primary">マージタイムライン</p>
            <p class="text-xs text-base-content/50">複数のタイムラインを統合して表示</p>
          </div>
          <ChevronRight class="w-4 h-4 text-primary/50 shrink-0" aria-hidden="true" />
        </button>
        <button
          class="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-secondary/50 hover:border-secondary hover:bg-secondary/5 transition-colors text-left mb-3"
          onclick={handleAddMergeNotification}
        >
          <div class="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <Bell class="w-4 h-4 text-secondary" aria-hidden="true" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-secondary">マージ通知タイムライン</p>
            <p class="text-xs text-base-content/50">全アカウントの通知を一つに集約</p>
          </div>
          <ChevronRight class="w-4 h-4 text-secondary/50 shrink-0" aria-hidden="true" />
        </button>
        <div class="divider text-xs text-base-content/30 my-2">または通常カラム</div>
      {/if}

      {#if accountStore.accounts.length === 0}
        <div class="text-center py-8 text-base-content/50">
          <p class="text-sm">アカウントが登録されていません。</p>
          <p class="text-xs mt-1">設定からアカウントを追加してください。</p>
        </div>
      {:else}
        <p class="text-xs text-base-content/60 mb-3">タイムラインを表示するアカウントを選択してください</p>
        {#each accountStore.accounts as account (account.id)}
          <button
            class="w-full flex items-center gap-3 p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-colors text-left"
            onclick={() => selectAccount(account.id)}
          >
            <!-- アカウントカラーインジケーター -->
            <div
              class="w-2 h-8 rounded-full shrink-0"
              style="background-color: {account.themeColor ?? '#86b300'};"
            ></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{account.userName}</p>
              <p class="text-xs text-base-content/50 truncate">{account.hostUrl}</p>
            </div>
            {#if !account.ok}
              <span class="badge badge-error badge-xs">オフライン</span>
            {/if}
            <ChevronRight class="w-4 h-4 text-base-content/30 shrink-0" aria-hidden="true" />
          </button>
        {/each}
      {/if}
    </div>

  <!-- ステップ 2: チャンネル種別選択 -->
  {:else if step === 2}
    <div>
      <button class="btn btn-ghost btn-xs gap-1 mb-3 -ml-1" onclick={goBack}>
        <ChevronLeft class="w-3 h-3" aria-hidden="true" />
        戻る
      </button>

      <p class="text-xs text-base-content/60 mb-3">タイムラインの種類を選択してください</p>

      <div class="grid grid-cols-2 gap-2">
        {#each Object.entries(CHANNEL_LABELS).filter(([k]) => k !== 'mergeTimeline') as [ch, label]}
          {@const channelType = ch as ChannelType}
          <button
            class="flex flex-col items-start gap-1 p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-colors text-left"
            class:border-primary={selectedChannel === channelType}
            class:bg-base-200={selectedChannel === channelType}
            onclick={() => selectChannel(channelType)}
          >
            <span class="text-sm font-semibold">{label}</span>
            <span class="text-xs text-base-content/50 leading-tight">{CHANNEL_DESCRIPTIONS[channelType]}</span>
          </button>
        {/each}
      </div>

      <!-- ID不要なチャンネルの場合は、色選択してすぐ追加できる -->
      {#if selectedChannel !== null && !needsId}
        <div class="mt-4 pt-4 border-t border-base-300">
          <p class="text-xs text-base-content/60 mb-2">アクセントカラー</p>
          <div class="flex flex-wrap gap-2 mb-4">
            {#each ACCENT_COLORS as color}
              <button
                class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                class:border-base-content={selectedColor === color}
                class:border-transparent={selectedColor !== color}
                style="background-color: {color};"
                onclick={() => selectedColor = color}
                aria-label="カラー {color}"
              ></button>
            {/each}
          </div>
          <button
            class="btn btn-primary w-full btn-sm"
            disabled={!canProceedStep2}
            onclick={handleAdd}
          >
            追加する
          </button>
        </div>
      {/if}
    </div>

  <!-- ステップ 3: 追加パラメータ入力 -->
  {:else if step === 3}
    <div>
      <button class="btn btn-ghost btn-xs gap-1 mb-3 -ml-1" onclick={goBack}>
        <ChevronLeft class="w-3 h-3" aria-hidden="true" />
        戻る
      </button>

      <p class="text-xs text-base-content/60 mb-4">
        {selectedChannel ? CHANNEL_LABELS[selectedChannel] : ''}の詳細を入力してください
      </p>

      <!-- 入力モード切替タブ -->
      <div role="tablist" class="tabs tabs-box tabs-sm mb-4">
        <button
          role="tab"
          class="tab"
          class:tab-active={inputMode === 'list'}
          onclick={() => inputMode = 'list'}
        >リストから選択</button>
        <button
          role="tab"
          class="tab"
          class:tab-active={inputMode === 'direct'}
          onclick={() => inputMode = 'direct'}
        >ID直接入力</button>
      </div>

      {#if inputMode === 'list'}
        <!-- リスト選択モード -->
        {#if selectedChannel === 'userTimeline'}
          <!-- ユーザー検索 -->
          <div class="space-y-2">
            <input
              type="search"
              class="input input-bordered input-sm w-full"
              placeholder="ユーザー名で検索..."
              value={userSearchQuery}
              oninput={handleUserSearchInput}
            />
            {#if userSearchLoading}
              <div class="flex items-center justify-center py-4">
                <span class="loading loading-spinner loading-sm text-primary"></span>
                <span class="text-xs text-base-content/50 ml-2">検索中...</span>
              </div>
            {:else if userSearchError}
              <p class="text-xs text-error text-center py-2">{userSearchError}</p>
            {:else if userSearchResults.length > 0}
              <div class="max-h-48 overflow-y-auto space-y-1">
                {#each userSearchResults as item (item.id)}
                  <button
                    class="w-full flex items-center gap-2 p-2 rounded-lg border transition-colors text-left text-sm"
                    class:border-primary={channelId === item.id}
                    class:bg-base-200={channelId === item.id}
                    class:border-base-300={channelId !== item.id}
                    class:hover:border-primary={channelId !== item.id}
                    class:hover:bg-base-200={channelId !== item.id}
                    onclick={() => selectListItem(item)}
                  >
                    <span class="flex-1 truncate">{item.name}</span>
                    {#if channelId === item.id}
                      <Check class="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    {/if}
                  </button>
                {/each}
              </div>
            {:else if userSearchQuery.trim()}
              <p class="text-xs text-base-content/50 text-center py-2">ユーザーが見つかりません</p>
            {:else}
              <p class="text-xs text-base-content/40 text-center py-2">ユーザー名を入力して検索</p>
            {/if}
          </div>
        {:else}
          <div class="space-y-2">
            {#if listLoading}
              <div class="flex items-center justify-center py-6">
                <span class="loading loading-spinner loading-sm text-primary"></span>
                <span class="text-xs text-base-content/50 ml-2">読み込み中...</span>
              </div>
            {:else if listError}
              <div class="text-center py-4">
                <p class="text-xs text-error">{listError}</p>
                <button class="btn btn-ghost btn-xs mt-2" onclick={fetchList}>再試行</button>
              </div>
            {:else if listItems.length === 0}
              <div class="text-center py-4">
                <p class="text-xs text-base-content/50">
                  {#if selectedChannel === 'channel'}お気に入りチャンネルがありません
                  {:else if selectedChannel === 'antenna'}アンテナがありません
                  {:else if selectedChannel === 'userList'}リストがありません
                  {:else if selectedChannel === 'roleTimeline'}ロールがありません
                  {/if}
                </p>
                <p class="text-xs text-base-content/40 mt-1">ID直接入力タブから追加できます</p>
              </div>
            {:else}
              <div class="max-h-48 overflow-y-auto space-y-1">
                {#each listItems as item (item.id)}
                  <button
                    class="w-full flex items-center gap-2 p-2 rounded-lg border transition-colors text-left text-sm"
                    class:border-primary={channelId === item.id}
                    class:bg-base-200={channelId === item.id}
                    class:border-base-300={channelId !== item.id}
                    class:hover:border-primary={channelId !== item.id}
                    class:hover:bg-base-200={channelId !== item.id}
                    onclick={() => selectListItem(item)}
                  >
                    <span class="flex-1 truncate">{item.name}</span>
                    <span class="text-xs text-base-content/30 font-mono shrink-0">{item.id.slice(0, 8)}</span>
                    {#if channelId === item.id}
                      <Check class="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- 選択済み表示名編集 -->
        {#if channelId}
          <div class="form-control mt-3">
            <label class="label py-1" for="channel-name-input-list">
              <span class="label-text text-xs">表示名</span>
            </label>
            <input
              id="channel-name-input-list"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="カラムの表示名..."
              bind:value={channelName}
            />
          </div>
        {/if}
      {:else}
        <!-- ID直接入力モード -->
        <div class="space-y-3">
          <div class="form-control">
            <label class="label py-1" for="channel-id-input">
              <span class="label-text text-xs">
                {#if selectedChannel === 'channel'}チャンネルID
                {:else if selectedChannel === 'antenna'}アンテナID
                {:else if selectedChannel === 'userList'}リストID
                {:else if selectedChannel === 'roleTimeline'}ロールID
                {:else if selectedChannel === 'userTimeline'}ユーザーID
                {:else}ID
                {/if}
              </span>
            </label>
            <input
              id="channel-id-input"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="IDを入力..."
              bind:value={channelId}
            />
            <p class="text-xs text-base-content/40 mt-1">
              MisskeyのURLやAPIレスポンスから確認できます
            </p>
          </div>

          <div class="form-control">
            <label class="label py-1" for="channel-name-input-direct">
              <span class="label-text text-xs">表示名</span>
            </label>
            <input
              id="channel-name-input-direct"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="カラムの表示名..."
              bind:value={channelName}
            />
          </div>
        </div>
      {/if}

      <!-- アクセントカラー -->
      <div class="form-control mt-3">
        <div class="label py-1">
          <span class="label-text text-xs">アクセントカラー</span>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each ACCENT_COLORS as color}
            <button
              class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              class:border-base-content={selectedColor === color}
              class:border-transparent={selectedColor !== color}
              style="background-color: {color};"
              onclick={() => selectedColor = color}
              aria-label="カラー {color}"
            ></button>
          {/each}
        </div>
      </div>

      <div class="mt-5 pt-4 border-t border-base-300">
        <button
          class="btn btn-primary w-full btn-sm"
          disabled={!canAdd}
          onclick={handleAdd}
        >
          追加する
        </button>
      </div>
    </div>

  <!-- マージタイムライン作成ステップ -->
  {:else if step === 'merge'}
    <div>
      <button class="btn btn-ghost btn-xs gap-1 mb-3 -ml-1" onclick={goBack}>
        <ChevronLeft class="w-3 h-3" aria-hidden="true" />
        戻る
      </button>

      <!-- モード切替 -->
      <div role="tablist" class="tabs tabs-box tabs-sm mb-4">
        <button
          role="tab"
          class="tab"
          class:tab-active={mergeMode === 'preset'}
          onclick={() => { mergeMode = 'preset'; mergeSources = []; selectedPresetId = null; }}
        >プリセットから</button>
        <button
          role="tab"
          class="tab"
          class:tab-active={mergeMode === 'manual'}
          onclick={() => { mergeMode = 'manual'; mergeSources = []; selectedPresetId = null; }}
        >マニュアル</button>
      </div>

      {#if mergeMode === 'preset'}
        <!-- プリセット選択 -->
        {#if presetStore.presets.length === 0}
          <div class="text-center py-6 text-base-content/50">
            <p class="text-sm">保存済みプリセットがありません</p>
            <p class="text-xs mt-1">まずカラムを配置してプリセットに保存してください</p>
          </div>
        {:else}
          <p class="text-xs text-base-content/60 mb-3">統合するプリセットを選択</p>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            {#each presetStore.presets as preset (preset.id)}
              <button
                class="w-full flex items-center gap-2 p-2.5 rounded-lg border transition-colors text-left"
                class:border-primary={selectedPresetId === preset.id}
                class:bg-base-200={selectedPresetId === preset.id}
                class:border-base-300={selectedPresetId !== preset.id}
                onclick={() => selectPresetForMerge(preset.id)}
              >
                <Layers class="w-4 h-4 shrink-0 text-base-content/40" aria-hidden="true" />
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-medium truncate block">{preset.name}</span>
                  <span class="text-[0.6rem] text-base-content/40">{preset.columns.length}カラム</span>
                </div>
                {#if selectedPresetId === preset.id}
                  <Check class="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <!-- マニュアル追加 -->
        <p class="text-xs text-base-content/60 mb-3">ソースを追加してください</p>

        <div class="flex gap-2 items-end mb-3">
          <div class="flex-1">
            <label class="text-[0.6rem] text-base-content/50 mb-0.5 block">アカウント</label>
            <select
              class="select select-bordered select-xs w-full"
              bind:value={manualAccountId}
            >
              <option value={null}>選択...</option>
              {#each accountStore.accounts as account (account.id)}
                <option value={account.id}>
                  @{account.userName}@{account.hostUrl.replace(/^https?:\/\//, '')}
                </option>
              {/each}
            </select>
          </div>
          <div class="flex-1">
            <label class="text-[0.6rem] text-base-content/50 mb-0.5 block">タイムライン</label>
            <select
              class="select select-bordered select-xs w-full"
              bind:value={manualChannel}
            >
              <option value={null}>選択...</option>
              {#each Object.entries(CHANNEL_LABELS).filter(([k]) => k !== 'mergeTimeline') as [ch, label]}
                <option value={ch}>{label}</option>
              {/each}
            </select>
          </div>
          <button
            class="btn btn-primary btn-xs btn-square shrink-0"
            disabled={manualAccountId === null || manualChannel === null}
            onclick={addManualSource}
            title="追加"
          >
            <Plus class="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      {/if}

      <!-- 選択されたソース一覧 -->
      {#if mergeSources.length > 0}
        <div class="mt-3 pt-3 border-t border-base-300">
          <p class="text-xs text-base-content/60 mb-2">ソース ({mergeSources.length})</p>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            {#each mergeSources as source, i}
              <div class="flex items-center gap-2 px-2 py-1.5 rounded bg-base-200/60 text-xs">
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  style="background-color: {source.color};"
                  aria-hidden="true"
                ></span>
                <span class="flex-1 truncate">{source.channelName}</span>
                <button
                  class="btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100"
                  onclick={() => removeSource(i)}
                  title="削除"
                >
                  <X class="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- 表示名・カラー・追加ボタン -->
      {#if mergeSources.length > 0}
        <div class="mt-4 space-y-3">
          <div class="form-control">
            <label class="label py-1" for="merge-name-input">
              <span class="label-text text-xs">表示名</span>
            </label>
            <input
              id="merge-name-input"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="マージTL"
              bind:value={mergeCustomName}
            />
          </div>

          <div class="form-control">
            <div class="label py-1">
              <span class="label-text text-xs">アクセントカラー</span>
            </div>
            <div class="flex flex-wrap gap-2">
              {#each ACCENT_COLORS as color}
                <button
                  class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  class:border-base-content={selectedColor === color}
                  class:border-transparent={selectedColor !== color}
                  style="background-color: {color};"
                  onclick={() => selectedColor = color}
                  aria-label="カラー {color}"
                ></button>
              {/each}
            </div>
          </div>

          <button
            class="btn btn-primary w-full btn-sm mt-2"
            onclick={handleAddMerge}
          >
            マージTLを追加
          </button>
        </div>
      {/if}
    </div>
  {/if}
</Modal>
