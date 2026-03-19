import type { entities } from 'misskey-js';

type EmojiDetailed = entities.EmojiDetailed;

/**
 * EmojiDetailed[] を { name: url } のマップに変換する
 */
export function getEmojiMap(
  _hostUrl: string,
  emojis: EmojiDetailed[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const emoji of emojis) {
    if (emoji.name && emoji.url) {
      map[emoji.name] = emoji.url;
    }
  }
  return map;
}

const CACHE_NAME_PREFIX = 'misslix-emoji-';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間

/**
 * サーバーのカスタム絵文字一覧をCache APIでキャッシュして返す
 * キャッシュが有効な場合はそれを利用し、期限切れの場合はfetcherを呼んで更新する
 */
export async function getCachedEmojiMap(
  hostUrl: string,
  fetcher: () => Promise<EmojiDetailed[]>,
): Promise<Record<string, string>> {
  if (typeof caches === 'undefined') {
    // Cache API非対応環境
    const emojis = await fetcher();
    return getEmojiMap(hostUrl, emojis);
  }

  const cacheName = CACHE_NAME_PREFIX + hostUrl;
  const cacheKey = `${hostUrl}/emoji-map`;

  const cache = await caches.open(cacheName);
  const cached = await cache.match(cacheKey);

  if (cached) {
    const expiresAt = Number(cached.headers.get('x-expires-at') ?? '0');
    if (Date.now() < expiresAt) {
      return await cached.json();
    }
  }

  const emojis = await fetcher();
  const map = getEmojiMap(hostUrl, emojis);

  const response = new Response(JSON.stringify(map), {
    headers: {
      'Content-Type': 'application/json',
      'x-expires-at': String(Date.now() + CACHE_TTL_MS),
    },
  });

  await cache.put(cacheKey, response);
  return map;
}
