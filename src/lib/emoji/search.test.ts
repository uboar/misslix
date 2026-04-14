import { describe, it, expect } from 'vitest';
import { searchCustomEmojis, searchUnicodeEmojis } from './search';
import type { entities } from 'misskey-js';
import type { UnicodeEmojiEntry } from './unicodeEmojiData';

type EmojiDetailed = entities.EmojiDetailed;

function makeEmoji(name: string, aliases: string[] = [], category = ''): EmojiDetailed {
  return { name, aliases, category, url: `https://example.com/${name}.png` } as EmojiDetailed;
}

function makeUnicode(emoji: string, name: string, slug: string): UnicodeEmojiEntry {
  return { emoji, name, slug };
}

describe('searchCustomEmojis', () => {
  const emojis = [
    makeEmoji('pikajin_excited'),
    makeEmoji('ok_hand', ['thumbs_up']),
    makeEmoji('ok', [], 'symbols'),
    makeEmoji('clapping_hands'),
    makeEmoji('heart'),
  ];

  it('空クエリは空配列を返す', () => {
    expect(searchCustomEmojis('', emojis)).toEqual([]);
    expect(searchCustomEmojis('  ', emojis)).toEqual([]);
  });

  it('部分一致で絵文字を返す', () => {
    const results = searchCustomEmojis('ok', emojis);
    const names = results.map((e) => e.name);
    expect(names).toContain('ok');
    expect(names).toContain('ok_hand');
  });

  it('完全一致の絵文字を先頭に移動する', () => {
    const results = searchCustomEmojis('ok', emojis);
    expect(results[0].name).toBe('ok');
  });

  it('エイリアスで検索できる', () => {
    const results = searchCustomEmojis('thumbs_up', emojis);
    expect(results.map((e) => e.name)).toContain('ok_hand');
  });

  it('エイリアス完全一致を先頭に移動する', () => {
    const results = searchCustomEmojis('thumbs_up', emojis);
    expect(results[0].name).toBe('ok_hand');
  });

  it('カテゴリで検索できる', () => {
    const results = searchCustomEmojis('symbols', emojis);
    expect(results.map((e) => e.name)).toContain('ok');
  });

  it('一致なしは空配列を返す', () => {
    expect(searchCustomEmojis('zzz', emojis)).toEqual([]);
  });

  it('大文字小文字を区別しない', () => {
    const results = searchCustomEmojis('HEART', emojis);
    expect(results.map((e) => e.name)).toContain('heart');
  });
});

describe('searchUnicodeEmojis', () => {
  const emojis: UnicodeEmojiEntry[] = [
    makeUnicode('👍', 'thumbs up', 'thumbs_up'),
    makeUnicode('🆗', 'ok button', 'ok_button'),
    makeUnicode('🆙', 'up! button', 'up_button'),
    makeUnicode('❤️', 'red heart', 'red_heart'),
    makeUnicode('🆒', 'cool button', 'cool_button'),
  ];

  it('空クエリは空配列を返す', () => {
    expect(searchUnicodeEmojis('', emojis)).toEqual([]);
    expect(searchUnicodeEmojis('  ', emojis)).toEqual([]);
  });

  it('名前の部分一致で返す', () => {
    const results = searchUnicodeEmojis('button', emojis);
    expect(results.length).toBe(3);
  });

  it('スラッグの部分一致で返す', () => {
    const results = searchUnicodeEmojis('heart', emojis);
    expect(results.map((e) => e.emoji)).toContain('❤️');
  });

  it('名前完全一致を先頭に移動する (スライス前)', () => {
    const results = searchUnicodeEmojis('ok button', emojis);
    expect(results[0].emoji).toBe('🆗');
  });

  it('スラッグ完全一致を先頭に移動する', () => {
    const results = searchUnicodeEmojis('ok_button', emojis);
    expect(results[0].emoji).toBe('🆗');
  });

  it('limit 件に切り詰める (完全一致はスライス前に先頭移動)', () => {
    // "button_N" という名前で100件生成し、99番目だけ名前が "button" の完全一致
    // クエリ "button" → 全100件が部分一致し、index 99の完全一致が先頭移動 → limit=10でも先頭に残る
    const many = Array.from({ length: 100 }, (_, i) =>
      makeUnicode(`e${i}`, `button_${i}`, `button_${i}`),
    );
    many[99] = makeUnicode('🎯', 'button', 'button');
    const results = searchUnicodeEmojis('button', many, 10);
    expect(results.length).toBe(10);
    expect(results[0].slug).toBe('button');
  });

  it('一致なしは空配列を返す', () => {
    expect(searchUnicodeEmojis('zzz', emojis)).toEqual([]);
  });
});
