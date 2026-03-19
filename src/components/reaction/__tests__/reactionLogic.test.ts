/**
 * reactionLogic.ts のユニットテスト
 *
 * ReactionButton / ReactionDeck が使うリアクションロジックを検証する。
 * APIClient.request は vi.fn() でモック化し、実際のネットワーク通信は行わない。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { api } from 'misskey-js';
import {
  addReaction,
  deleteReaction,
  toggleReaction,
  filterEmojis,
  paginateDeck,
  isCustomEmoji,
} from '../reactionLogic';

type APIClient = api.APIClient;

// ─── フィクスチャ ───

function makeCliMock(): APIClient {
  return {
    request: vi.fn().mockResolvedValue(null),
  } as unknown as APIClient;
}

// ─── addReaction ───

describe('addReaction', () => {
  let cli: APIClient;

  beforeEach(() => {
    cli = makeCliMock();
  });

  it('notes/reactions/create を正しいパラメータで呼ぶ', async () => {
    await addReaction(cli, 'note1', ':like:');

    expect(cli.request).toHaveBeenCalledWith('notes/reactions/create', {
      noteId: 'note1',
      reaction: ':like:',
    });
  });

  it('Unicode 絵文字でも呼ばれる', async () => {
    await addReaction(cli, 'note2', '👍');

    expect(cli.request).toHaveBeenCalledWith('notes/reactions/create', {
      noteId: 'note2',
      reaction: '👍',
    });
  });

  it('API エラーが伝播する', async () => {
    (cli.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('forbidden'));

    await expect(addReaction(cli, 'note1', ':like:')).rejects.toThrow('forbidden');
  });
});

// ─── deleteReaction ───

describe('deleteReaction', () => {
  let cli: APIClient;

  beforeEach(() => {
    cli = makeCliMock();
  });

  it('notes/reactions/delete を noteId のみで呼ぶ', async () => {
    await deleteReaction(cli, 'note1');

    expect(cli.request).toHaveBeenCalledWith('notes/reactions/delete', { noteId: 'note1' });
  });

  it('API エラーが伝播する', async () => {
    (cli.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not found'));

    await expect(deleteReaction(cli, 'note1')).rejects.toThrow('not found');
  });
});

// ─── toggleReaction ───

describe('toggleReaction', () => {
  let cli: APIClient;
  let busy: boolean;
  let isBusy: () => boolean;
  let setBusy: (v: boolean) => void;

  beforeEach(() => {
    cli = makeCliMock();
    busy = false;
    isBusy = () => busy;
    setBusy = (v) => { busy = v; };
  });

  it('myReaction がない場合は addReaction が呼ばれる', async () => {
    await toggleReaction(cli, 'note1', ':like:', null, isBusy, setBusy);

    expect(cli.request).toHaveBeenCalledWith('notes/reactions/create', {
      noteId: 'note1',
      reaction: ':like:',
    });
    expect(cli.request).toHaveBeenCalledTimes(1);
  });

  it('myReaction が同じ場合は deleteReaction が呼ばれる', async () => {
    await toggleReaction(cli, 'note1', ':like:', ':like:', isBusy, setBusy);

    expect(cli.request).toHaveBeenCalledWith('notes/reactions/delete', { noteId: 'note1' });
    expect(cli.request).toHaveBeenCalledTimes(1);
  });

  it('myReaction が異なる場合は delete → create の順で呼ばれる', async () => {
    await toggleReaction(cli, 'note1', ':love:', ':like:', isBusy, setBusy);

    const calls = (cli.request as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toBe('notes/reactions/delete');
    expect(calls[1][0]).toBe('notes/reactions/create');
    expect(calls[1][1]).toMatchObject({ reaction: ':love:' });
  });

  it('busy 中は操作をスキップして false を返す', async () => {
    busy = true; // 既に busy 状態

    const result = await toggleReaction(cli, 'note1', ':like:', null, isBusy, setBusy);

    expect(result).toBe(false);
    expect(cli.request).not.toHaveBeenCalled();
  });

  it('操作が実行された場合 true を返す', async () => {
    const result = await toggleReaction(cli, 'note1', ':like:', null, isBusy, setBusy);

    expect(result).toBe(true);
  });

  it('操作完了後に busy が false に戻る', async () => {
    await toggleReaction(cli, 'note1', ':like:', null, isBusy, setBusy);

    expect(busy).toBe(false);
  });

  it('API エラー発生後も busy が false に戻る', async () => {
    (cli.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    await expect(
      toggleReaction(cli, 'note1', ':like:', null, isBusy, setBusy),
    ).rejects.toThrow('API Error');

    expect(busy).toBe(false);
  });

  it('myReaction が undefined でも addReaction が呼ばれる', async () => {
    await toggleReaction(cli, 'note1', ':like:', undefined, isBusy, setBusy);

    expect(cli.request).toHaveBeenCalledWith('notes/reactions/create', {
      noteId: 'note1',
      reaction: ':like:',
    });
  });
});

// ─── filterEmojis ───

describe('filterEmojis', () => {
  const deck = [':like:', ':love:', ':smile:', '👍', '❤️', ':thumbs_up:'];

  it('クエリが空のとき全件返す', () => {
    expect(filterEmojis(deck, '')).toEqual(deck);
  });

  it('クエリが空白のみのとき全件返す', () => {
    expect(filterEmojis(deck, '   ')).toEqual(deck);
  });

  it('部分一致でフィルタリングされる', () => {
    const result = filterEmojis(deck, 'like');
    expect(result).toContain(':like:');
    expect(result).not.toContain(':love:');
  });

  it('大文字小文字を区別しない', () => {
    const result = filterEmojis(deck, 'LIKE');
    expect(result).toContain(':like:');
  });

  it('該当なしのとき空配列を返す', () => {
    expect(filterEmojis(deck, 'xyz')).toEqual([]);
  });

  it('Unicode 絵文字も検索できる', () => {
    const result = filterEmojis(deck, '👍');
    expect(result).toContain('👍');
  });

  it('複数の結果が返る', () => {
    const result = filterEmojis(deck, 'l');
    // :like:, :smile: (contains l), :love:, :thumbs_up: (no l) -> :like:, :love:, :smile:
    expect(result.length).toBeGreaterThan(1);
  });

  it('空の deck に対して空配列を返す', () => {
    expect(filterEmojis([], 'like')).toEqual([]);
  });
});

// ─── paginateDeck ───

describe('paginateDeck', () => {
  const deck = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  it('ページ 0 の先頭 N 件を返す', () => {
    expect(paginateDeck(deck, 0, 3)).toEqual(['a', 'b', 'c']);
  });

  it('ページ 1 の次の N 件を返す', () => {
    expect(paginateDeck(deck, 1, 3)).toEqual(['d', 'e', 'f']);
  });

  it('最後のページが端数でも正しく返す', () => {
    expect(paginateDeck(deck, 2, 3)).toEqual(['g']);
  });

  it('範囲外のページは空配列を返す', () => {
    expect(paginateDeck(deck, 10, 3)).toEqual([]);
  });

  it('perPage が deck より大きいとき全件返す', () => {
    expect(paginateDeck(deck, 0, 100)).toEqual(deck);
  });

  it('空の deck は全ページで空配列を返す', () => {
    expect(paginateDeck([], 0, 5)).toEqual([]);
  });
});

// ─── isCustomEmoji ───

describe('isCustomEmoji', () => {
  it(':emoji_name: 形式は true', () => {
    expect(isCustomEmoji(':like:')).toBe(true);
    expect(isCustomEmoji(':thumbs_up:')).toBe(true);
    expect(isCustomEmoji(':a:')).toBe(true);
  });

  it('Unicode 絵文字は false', () => {
    expect(isCustomEmoji('👍')).toBe(false);
    expect(isCustomEmoji('❤️')).toBe(false);
  });

  it('コロンのみの文字列は false', () => {
    expect(isCustomEmoji('::')).toBe(false); // length === 2
  });

  it('コロンが片方だけの場合は false', () => {
    expect(isCustomEmoji(':like')).toBe(false);
    expect(isCustomEmoji('like:')).toBe(false);
  });

  it('空文字は false', () => {
    expect(isCustomEmoji('')).toBe(false);
  });

  it('通常テキストは false', () => {
    expect(isCustomEmoji('hello')).toBe(false);
  });
});
