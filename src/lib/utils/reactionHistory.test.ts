import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getReactionHistory,
  addReactionHistory,
  clearReactionHistory,
} from './reactionHistory';

// localStorage モック
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  });
});

describe('getReactionHistory', () => {
  it('初期状態では空配列を返す', () => {
    expect(getReactionHistory()).toEqual([]);
  });

  it('保存された履歴を返す', () => {
    store['misslix:reactionHistory'] = JSON.stringify([':like:', ':heart:']);
    expect(getReactionHistory()).toEqual([':like:', ':heart:']);
  });
});

describe('addReactionHistory', () => {
  it('リアクションを先頭に追加する', () => {
    addReactionHistory(':like:');
    addReactionHistory(':heart:');
    expect(getReactionHistory()).toEqual([':heart:', ':like:']);
  });

  it('重複を除去する', () => {
    addReactionHistory(':like:');
    addReactionHistory(':heart:');
    addReactionHistory(':like:');
    expect(getReactionHistory()).toEqual([':like:', ':heart:']);
  });

  it('上限20件を超えると古いものが削除される', () => {
    for (let i = 0; i < 25; i++) {
      addReactionHistory(`:emoji_${i}:`);
    }
    const history = getReactionHistory();
    expect(history.length).toBe(20);
    expect(history[0]).toBe(':emoji_24:');
  });
});

describe('clearReactionHistory', () => {
  it('履歴をクリアする', () => {
    addReactionHistory(':like:');
    clearReactionHistory();
    expect(getReactionHistory()).toEqual([]);
  });
});
