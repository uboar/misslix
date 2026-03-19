import { describe, it, expect } from 'vitest';
import { parseMfm, parseMfmPlain } from './parser';

describe('parseMfm', () => {
  it('プレーンテキストをパースしてテキストノードの配列を返す', () => {
    const result = parseMfm('Hello world');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('空文字列をパースすると空配列を返す', () => {
    const result = parseMfm('');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('ボールドテキストをパースしてボールドノードを含む配列を返す', () => {
    const result = parseMfm('**bold**');
    expect(result.some((node) => node.type === 'bold')).toBe(true);
  });

  it('イタリックテキストをパースしてイタリックノードを含む配列を返す', () => {
    const result = parseMfm('*italic*');
    expect(result.some((node) => node.type === 'italic')).toBe(true);
  });

  it('メンション (@user) をパースしてメンションノードを返す', () => {
    const result = parseMfm('@alice');
    expect(result.some((node) => node.type === 'mention')).toBe(true);
  });

  it('ハッシュタグをパースしてハッシュタグノードを返す', () => {
    const result = parseMfm('#hashtag');
    expect(result.some((node) => node.type === 'hashtag')).toBe(true);
  });

  it('URLをパースしてURLノードを返す', () => {
    const result = parseMfm('https://example.com');
    expect(result.some((node) => node.type === 'url')).toBe(true);
  });

  it('カスタム絵文字 (:emoji:) をパースしてemojiCodeノードを返す', () => {
    const result = parseMfm(':like:');
    expect(result.some((node) => node.type === 'emojiCode')).toBe(true);
  });

  it('複合テキストを正しくパースしてノードの配列を返す', () => {
    const result = parseMfm('Hello **world** @alice');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('各ノードは type プロパティを持つ', () => {
    const result = parseMfm('some text');
    for (const node of result) {
      expect(node).toHaveProperty('type');
    }
  });
});

describe('parseMfmPlain', () => {
  it('プレーンテキストをパースしてノードの配列を返す', () => {
    const result = parseMfmPlain('Hello world');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('空文字列をパースすると空配列を返す', () => {
    const result = parseMfmPlain('');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('カスタム絵文字をパースしてemojiCodeノードを返す', () => {
    const result = parseMfmPlain(':smile:');
    expect(result.some((node) => node.type === 'emojiCode')).toBe(true);
  });

  it('Unicode絵文字をパースしてunicodeEmojiノードを返す', () => {
    const result = parseMfmPlain('Hello 😀');
    expect(result.some((node) => node.type === 'unicodeEmoji')).toBe(true);
  });

  it('各ノードは type プロパティを持つ', () => {
    const result = parseMfmPlain('test :emoji:');
    for (const node of result) {
      expect(node).toHaveProperty('type');
    }
  });

  it('MFMの装飾構文 (**bold**) はシンプルモードではテキストとして扱われる', () => {
    // parseSimpleはブロック構文を解析しないため、boldノードは含まれない
    const result = parseMfmPlain('**bold**');
    const hasBold = result.some((node) => node.type === 'bold');
    // parseSimpleはboldを解析しないはず
    expect(hasBold).toBe(false);
  });
});
