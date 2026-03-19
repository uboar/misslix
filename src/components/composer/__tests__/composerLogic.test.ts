/**
 * composerLogic.ts のユニットテスト
 *
 * PostModal / InlineComposer が使う投稿ロジックを検証する。
 * APIClient.request は vi.fn() でモック化し、実際のネットワーク通信は行わない。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { api } from 'misskey-js';
import type { Account, AccountRuntime, Visibility } from '$lib/types';
import {
  selectAll,
  deselectAll,
  toggleAccount,
  toggleCw,
  canPost,
  postNote,
  postToMultipleAccounts,
  VISIBILITY_LABELS,
} from '../composerLogic';

type APIClient = api.APIClient;

// ─── フィクスチャ ───

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 1,
    userName: 'alice',
    hostUrl: 'https://example.com',
    token: 'token_abc',
    ok: true,
    ...overrides,
  };
}

function makeCliMock(): APIClient {
  return {
    request: vi.fn().mockResolvedValue({}),
  } as unknown as APIClient;
}

function makeRuntime(cli: APIClient): AccountRuntime {
  return {
    cli,
    stream: {} as AccountRuntime['stream'],
    mainConnection: {} as AccountRuntime['mainConnection'],
    notifications: [],
    hasUnread: false,
    emojis: [],
    busy: false,
    userId: 'test-user-id',
  };
}

// ─── selectAll / deselectAll ───

describe('selectAll', () => {
  it('全アカウントの ID を含む Set を返す', () => {
    const accounts = [makeAccount({ id: 1 }), makeAccount({ id: 2 }), makeAccount({ id: 3 })];
    const result = selectAll(accounts);
    expect(result.size).toBe(3);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
  });

  it('空配列のとき空 Set を返す', () => {
    const result = selectAll([]);
    expect(result.size).toBe(0);
  });

  it('アカウントが 1 件のとき Set に 1 要素', () => {
    const result = selectAll([makeAccount({ id: 42 })]);
    expect(result.size).toBe(1);
    expect(result.has(42)).toBe(true);
  });
});

describe('deselectAll', () => {
  it('空 Set を返す', () => {
    const result = deselectAll();
    expect(result.size).toBe(0);
  });
});

// ─── toggleAccount ───

describe('toggleAccount', () => {
  it('含まれていない ID を追加する', () => {
    const selected = new Set([1, 2]);
    const result = toggleAccount(selected, 3);
    expect(result.has(3)).toBe(true);
    expect(result.size).toBe(3);
  });

  it('含まれている ID を削除する', () => {
    const selected = new Set([1, 2, 3]);
    const result = toggleAccount(selected, 2);
    expect(result.has(2)).toBe(false);
    expect(result.size).toBe(2);
  });

  it('元の Set を変更しない（イミュータブル）', () => {
    const selected = new Set([1]);
    toggleAccount(selected, 2);
    expect(selected.size).toBe(1);
  });

  it('空 Set に追加できる', () => {
    const result = toggleAccount(new Set(), 5);
    expect(result.has(5)).toBe(true);
  });

  it('唯一の要素を削除すると空 Set になる', () => {
    const result = toggleAccount(new Set([1]), 1);
    expect(result.size).toBe(0);
  });
});

// ─── toggleCw ───

describe('toggleCw', () => {
  it('有効化すると空文字列を返す', () => {
    expect(toggleCw(true)).toBe('');
  });

  it('無効化すると null を返す', () => {
    expect(toggleCw(false)).toBeNull();
  });
});

// ─── canPost ───

describe('canPost', () => {
  it('テキストがあり選択アカウントが 1 以上なら true', () => {
    expect(canPost('hello', 1)).toBe(true);
  });

  it('テキストが空白のみなら false', () => {
    expect(canPost('   ', 1)).toBe(false);
  });

  it('テキストが空でも renoteId があれば true', () => {
    expect(canPost('', 1, 'renote123')).toBe(true);
  });

  it('選択アカウントが 0 なら false（テキストがあっても）', () => {
    expect(canPost('hello', 0)).toBe(false);
  });

  it('選択アカウント 0 + renoteId でも false', () => {
    expect(canPost('', 0, 'renote123')).toBe(false);
  });

  it('テキストが空で renoteId もなければ false', () => {
    expect(canPost('', 2)).toBe(false);
  });

  it('テキストが半角スペースのみでも false', () => {
    expect(canPost(' \t\n', 1)).toBe(false);
  });
});

// ─── postNote ───

describe('postNote', () => {
  let cli: APIClient;

  beforeEach(() => {
    cli = makeCliMock();
  });

  it('基本パラメータで notes/create を呼ぶ', async () => {
    await postNote(cli, {
      text: 'Hello',
      visibility: 'public',
      localOnly: false,
    });

    expect(cli.request).toHaveBeenCalledTimes(1);
    expect(cli.request).toHaveBeenCalledWith(
      'notes/create',
      expect.objectContaining({
        text: 'Hello',
        visibility: 'public',
        localOnly: false,
      }),
    );
  });

  it('CW が設定されているとき cw パラメータが含まれる', async () => {
    await postNote(cli, {
      text: 'Secret',
      cw: 'ネタバレ注意',
      visibility: 'public',
      localOnly: false,
    });

    expect(cli.request).toHaveBeenCalledWith(
      'notes/create',
      expect.objectContaining({ cw: 'ネタバレ注意' }),
    );
  });

  it('CW が null のとき cw パラメータは含まれない', async () => {
    await postNote(cli, {
      text: 'Normal',
      cw: null,
      visibility: 'public',
      localOnly: false,
    });

    const callArg = (cli.request as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('cw');
  });

  it('replyId が設定されているとき replyId パラメータが含まれる', async () => {
    await postNote(cli, {
      text: 'Reply text',
      visibility: 'public',
      localOnly: false,
      replyId: 'note_reply_123',
    });

    expect(cli.request).toHaveBeenCalledWith(
      'notes/create',
      expect.objectContaining({ replyId: 'note_reply_123' }),
    );
  });

  it('renoteId が設定されているとき renoteId パラメータが含まれる', async () => {
    await postNote(cli, {
      text: '',
      visibility: 'public',
      localOnly: false,
      renoteId: 'note_renote_456',
    });

    expect(cli.request).toHaveBeenCalledWith(
      'notes/create',
      expect.objectContaining({ renoteId: 'note_renote_456' }),
    );
  });

  it('localOnly: true のとき localOnly パラメータが true', async () => {
    await postNote(cli, {
      text: 'Local only',
      visibility: 'home',
      localOnly: true,
    });

    expect(cli.request).toHaveBeenCalledWith(
      'notes/create',
      expect.objectContaining({ localOnly: true }),
    );
  });

  it('visibility が home のとき正しく渡る', async () => {
    await postNote(cli, { text: 'Home post', visibility: 'home', localOnly: false });

    expect(cli.request).toHaveBeenCalledWith(
      'notes/create',
      expect.objectContaining({ visibility: 'home' }),
    );
  });

  it('visibility が followers のとき正しく渡る', async () => {
    await postNote(cli, { text: 'Followers post', visibility: 'followers', localOnly: false });

    expect(cli.request).toHaveBeenCalledWith(
      'notes/create',
      expect.objectContaining({ visibility: 'followers' }),
    );
  });

  it('API がエラーを throw したとき例外が伝播する', async () => {
    (cli.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    await expect(
      postNote(cli, { text: 'fail', visibility: 'public', localOnly: false }),
    ).rejects.toThrow('API Error');
  });
});

// ─── postToMultipleAccounts ───

describe('postToMultipleAccounts', () => {
  it('選択した全アカウントの cli.request が呼ばれる', async () => {
    const cli1 = makeCliMock();
    const cli2 = makeCliMock();
    const runtimes = new Map([
      [1, makeRuntime(cli1)],
      [2, makeRuntime(cli2)],
    ]);
    const selectedIds = new Set([1, 2]);

    await postToMultipleAccounts(runtimes, selectedIds, {
      text: 'Multi post',
      visibility: 'public',
      localOnly: false,
    });

    expect(cli1.request).toHaveBeenCalledTimes(1);
    expect(cli2.request).toHaveBeenCalledTimes(1);
  });

  it('選択していないアカウントの cli.request は呼ばれない', async () => {
    const cli1 = makeCliMock();
    const cli2 = makeCliMock();
    const runtimes = new Map([
      [1, makeRuntime(cli1)],
      [2, makeRuntime(cli2)],
    ]);
    const selectedIds = new Set([1]); // 2 は選択しない

    await postToMultipleAccounts(runtimes, selectedIds, {
      text: 'Single post',
      visibility: 'public',
      localOnly: false,
    });

    expect(cli1.request).toHaveBeenCalledTimes(1);
    expect(cli2.request).not.toHaveBeenCalled();
  });

  it('Promise.allSettled で一部失敗しても全結果が返る', async () => {
    const cli1 = makeCliMock();
    const cli2 = makeCliMock();
    (cli2.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('rate limited'));

    const runtimes = new Map([
      [1, makeRuntime(cli1)],
      [2, makeRuntime(cli2)],
    ]);

    const results = await postToMultipleAccounts(runtimes, new Set([1, 2]), {
      text: 'Partial fail',
      visibility: 'public',
      localOnly: false,
    });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
  });

  it('selectedIds が空のとき 0 件の results を返す', async () => {
    const cli1 = makeCliMock();
    const runtimes = new Map([[1, makeRuntime(cli1)]]);

    const results = await postToMultipleAccounts(runtimes, new Set(), {
      text: 'No accounts',
      visibility: 'public',
      localOnly: false,
    });

    expect(results).toHaveLength(0);
    expect(cli1.request).not.toHaveBeenCalled();
  });

  it('runtimes に存在しない ID が selectedIds にあっても無視される', async () => {
    const runtimes = new Map<number, AccountRuntime>();
    const results = await postToMultipleAccounts(runtimes, new Set([999]), {
      text: 'Ghost account',
      visibility: 'public',
      localOnly: false,
    });

    expect(results).toHaveLength(0);
  });

  it('全件成功のとき全結果が fulfilled', async () => {
    const cli1 = makeCliMock();
    const cli2 = makeCliMock();
    const cli3 = makeCliMock();
    const runtimes = new Map([
      [1, makeRuntime(cli1)],
      [2, makeRuntime(cli2)],
      [3, makeRuntime(cli3)],
    ]);

    const results = await postToMultipleAccounts(runtimes, new Set([1, 2, 3]), {
      text: 'All success',
      visibility: 'public',
      localOnly: false,
    });

    expect(results).toHaveLength(3);
    results.forEach((r) => expect(r.status).toBe('fulfilled'));
  });
});

// ─── VISIBILITY_LABELS ───

describe('VISIBILITY_LABELS', () => {
  it('全ての可視性種別にラベルが定義されている', () => {
    const visibilities: Visibility[] = ['public', 'home', 'followers', 'specified'];
    visibilities.forEach((v) => {
      expect(VISIBILITY_LABELS[v]).toBeTruthy();
    });
  });
});
