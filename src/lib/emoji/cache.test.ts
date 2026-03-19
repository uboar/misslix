import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { entities } from 'misskey-js';
import { getEmojiMap, getCachedEmojiMap } from './cache';

type EmojiDetailed = entities.EmojiDetailed;

function makeEmoji(name: string, url: string): EmojiDetailed {
  return {
    id: name,
    aliases: [],
    name,
    category: null,
    host: null,
    url,
    license: null,
    isSensitive: false,
    localOnly: false,
    roleIdsThatCanBeUsedThisEmojiAsReaction: [],
  };
}

describe('getEmojiMap', () => {
  it('EmojiDetailed[] を { name: url } マップに変換する', () => {
    const emojis = [
      makeEmoji('like', 'https://example.com/like.png'),
      makeEmoji('heart', 'https://example.com/heart.png'),
    ];
    const result = getEmojiMap('https://example.com', emojis);
    expect(result).toEqual({
      like: 'https://example.com/like.png',
      heart: 'https://example.com/heart.png',
    });
  });

  it('空の配列を渡すと空のマップを返す', () => {
    const result = getEmojiMap('https://example.com', []);
    expect(result).toEqual({});
  });

  it('name が空文字列の絵文字はスキップする', () => {
    const emojis = [
      { ...makeEmoji('', 'https://example.com/no-name.png') },
      makeEmoji('valid', 'https://example.com/valid.png'),
    ];
    const result = getEmojiMap('https://example.com', emojis);
    // 空文字キーはスキップされ、valid のみ含まれる
    expect(Object.keys(result)).not.toContain('');
    expect(result).toHaveProperty('valid');
  });

  it('url が空文字列の絵文字はスキップする', () => {
    const emojis = [
      { ...makeEmoji('nourl', '') },
      makeEmoji('hasurl', 'https://example.com/has.png'),
    ];
    const result = getEmojiMap('https://example.com', emojis);
    expect(result).not.toHaveProperty('nourl');
    expect(result).toHaveProperty('hasurl');
  });

  it('hostUrl 引数は現在の実装では使用されないが、関数シグネチャとして受け取る', () => {
    const emojis = [makeEmoji('test', 'https://cdn.example.com/test.png')];
    const result = getEmojiMap('https://other-host.com', emojis);
    expect(result['test']).toBe('https://cdn.example.com/test.png');
  });

  it('同名の絵文字が複数ある場合は後の値で上書きされる', () => {
    const emojis = [
      makeEmoji('dup', 'https://example.com/first.png'),
      makeEmoji('dup', 'https://example.com/second.png'),
    ];
    const result = getEmojiMap('https://example.com', emojis);
    expect(result['dup']).toBe('https://example.com/second.png');
  });
});

describe('getCachedEmojiMap', () => {
  let originalCaches: typeof globalThis.caches;

  beforeEach(() => {
    vi.resetAllMocks();
    originalCaches = globalThis.caches;
  });

  afterEach(() => {
    if (originalCaches !== undefined) {
      globalThis.caches = originalCaches;
    } else {
      // @ts-ignore
      delete globalThis.caches;
    }
  });

  it('Cache API が存在しない環境では fetcher を直接呼び出して結果を返す', async () => {
    // @ts-ignore
    delete globalThis.caches;

    const emojis = [makeEmoji('star', 'https://example.com/star.png')];
    const fetcher = vi.fn().mockResolvedValue(emojis);

    const result = await getCachedEmojiMap('https://example.com', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ star: 'https://example.com/star.png' });
  });

  it('キャッシュが存在しない場合、fetcher を呼び出してキャッシュに保存する', async () => {
    const emojis = [makeEmoji('wave', 'https://example.com/wave.png')];
    const fetcher = vi.fn().mockResolvedValue(emojis);

    const mockCache = {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const mockCaches = {
      open: vi.fn().mockResolvedValue(mockCache),
    };
    // @ts-ignore
    globalThis.caches = mockCaches;

    const result = await getCachedEmojiMap('https://example.com', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockCache.put).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ wave: 'https://example.com/wave.png' });
  });

  it('キャッシュが有効な場合、fetcher を呼ばずにキャッシュを返す', async () => {
    const cachedData = { cached_emoji: 'https://example.com/cached.png' };
    const futureExpiry = Date.now() + 60 * 60 * 1000; // 1時間後

    const mockHeaders = new Headers({ 'x-expires-at': String(futureExpiry) });
    const mockCachedResponse = {
      headers: mockHeaders,
      json: vi.fn().mockResolvedValue(cachedData),
    };

    const mockCache = {
      match: vi.fn().mockResolvedValue(mockCachedResponse),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const mockCaches = {
      open: vi.fn().mockResolvedValue(mockCache),
    };
    // @ts-ignore
    globalThis.caches = mockCaches;

    const fetcher = vi.fn();
    const result = await getCachedEmojiMap('https://example.com', fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });

  it('キャッシュが期限切れの場合、fetcher を呼び出して新しいデータを保存する', async () => {
    const pastExpiry = Date.now() - 1000; // 1秒前に期限切れ

    const mockHeaders = new Headers({ 'x-expires-at': String(pastExpiry) });
    const mockExpiredResponse = {
      headers: mockHeaders,
      json: vi.fn().mockResolvedValue({ old_emoji: 'old.png' }),
    };

    const emojis = [makeEmoji('new_emoji', 'https://example.com/new.png')];
    const fetcher = vi.fn().mockResolvedValue(emojis);

    const mockCache = {
      match: vi.fn().mockResolvedValue(mockExpiredResponse),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const mockCaches = {
      open: vi.fn().mockResolvedValue(mockCache),
    };
    // @ts-ignore
    globalThis.caches = mockCaches;

    const result = await getCachedEmojiMap('https://example.com', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockCache.put).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ new_emoji: 'https://example.com/new.png' });
  });
});
