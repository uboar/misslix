/**
 * リアクション履歴管理
 *
 * 最近使用したリアクションをlocalStorageに保存し、
 * リアクションデッキのサジェストに利用する。
 */

import { loadFromStorage, saveToStorage } from '$lib/utils/storage';

const STORAGE_KEY = 'reactionHistory';
const MAX_HISTORY = 20;

/**
 * リアクション履歴を取得する
 */
export function getReactionHistory(): string[] {
  return loadFromStorage<string[]>(STORAGE_KEY, []);
}

/**
 * リアクションを履歴に追加する（先頭に挿入、重複除去、上限管理）
 */
export function addReactionHistory(reaction: string): void {
  const history = getReactionHistory();
  const updated = [reaction, ...history.filter((r) => r !== reaction)].slice(
    0,
    MAX_HISTORY,
  );
  saveToStorage(STORAGE_KEY, updated);
}

/**
 * リアクション履歴をクリアする
 */
export function clearReactionHistory(): void {
  saveToStorage(STORAGE_KEY, []);
}
