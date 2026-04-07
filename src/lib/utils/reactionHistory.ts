/**
 * リアクション履歴管理
 *
 * 最近使用したリアクションをlocalStorageに保存し、
 * リアクションデッキのサジェストに利用する。
 */

import { loadFromStorage, saveToStorage } from '$lib/utils/storage';

const STORAGE_KEY_PREFIX = 'reactionHistory';
const MAX_HISTORY = 20;

function storageKey(timelineId?: number): string {
  return timelineId != null ? `${STORAGE_KEY_PREFIX}_${timelineId}` : STORAGE_KEY_PREFIX;
}

/**
 * リアクション履歴を取得する
 */
export function getReactionHistory(timelineId?: number): string[] {
  return loadFromStorage<string[]>(storageKey(timelineId), []);
}

/**
 * リアクションを履歴に追加する（先頭に挿入、重複除去、上限管理）
 */
export function addReactionHistory(reaction: string, timelineId?: number): void {
  const key = storageKey(timelineId);
  const history = loadFromStorage<string[]>(key, []);
  const updated = [reaction, ...history.filter((r) => r !== reaction)].slice(
    0,
    MAX_HISTORY,
  );
  saveToStorage(key, updated);
}

/**
 * リアクション履歴をクリアする
 */
export function clearReactionHistory(timelineId?: number): void {
  saveToStorage(storageKey(timelineId), []);
}
