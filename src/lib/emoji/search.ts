import type { entities } from 'misskey-js';
import type { UnicodeEmojiEntry } from './unicodeEmojiData';

type EmojiDetailed = entities.EmojiDetailed;

/**
 * カスタム絵文字を検索する。
 * 名前・エイリアス・カテゴリで部分一致し、
 * 完全一致（名前またはエイリアス）を先頭に移動して返す。
 */
export function searchCustomEmojis(query: string, emojis: EmojiDetailed[]): EmojiDetailed[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const filtered = emojis.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      (e.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
      (e.category ?? '').toLowerCase().includes(q),
  );

  // 完全一致（名前またはエイリアス）を先頭に移動
  const exactIndex = filtered.findIndex(
    (e) =>
      e.name.toLowerCase() === q || (e.aliases ?? []).some((a) => a.toLowerCase() === q),
  );
  if (exactIndex > 0) {
    const [exact] = filtered.splice(exactIndex, 1);
    filtered.unshift(exact);
  }

  return filtered;
}

/**
 * Unicode絵文字を検索する。
 * 名前・スラッグで部分一致し、完全一致を先頭に移動してから limit 件を返す。
 * スライスを完全一致の移動後に行うことで、文字数の少ない絵文字も確実にヒットする。
 */
export function searchUnicodeEmojis(
  query: string,
  emojis: UnicodeEmojiEntry[],
  limit = 50,
): UnicodeEmojiEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const filtered = emojis.filter((e) => e.name.includes(q) || e.slug.includes(q));

  // 完全一致（名前またはスラッグ）をスライス前に先頭へ移動
  const exactIndex = filtered.findIndex((e) => e.name === q || e.slug === q);
  if (exactIndex > 0) {
    const [exact] = filtered.splice(exactIndex, 1);
    filtered.unshift(exact);
  }

  return filtered.slice(0, limit);
}
