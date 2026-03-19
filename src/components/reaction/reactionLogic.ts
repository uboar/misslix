/**
 * reaction ロジック — ReactionButton / ReactionDeck 共通のビジネスロジック
 *
 * Svelte コンポーネントから切り出した純粋関数群。
 * 外部 API 呼出しは引数の cli に委譲するため、テストでモック可能。
 */

import type { api } from 'misskey-js';

type APIClient = api.APIClient;

// ─── リアクション追加/削除 ───

/**
 * リアクションを追加する。
 */
export async function addReaction(
  cli: APIClient,
  noteId: string,
  reaction: string,
): Promise<void> {
  await cli.request('notes/reactions/create', { noteId, reaction });
}

/**
 * リアクションを削除する。
 */
export async function deleteReaction(cli: APIClient, noteId: string): Promise<void> {
  await cli.request('notes/reactions/delete', { noteId });
}

/**
 * 現在のリアクション状態を見てトグル操作を行う。
 *
 * - myReaction が reaction と一致 → 削除
 * - myReaction が別の reaction → 削除してから追加（入れ替え）
 * - myReaction がない → 追加
 *
 * busy フラグが true のときは何もせず false を返す（二重呼出し防止）。
 *
 * @returns 操作が実行された場合 true、busy のためスキップした場合 false
 */
export async function toggleReaction(
  cli: APIClient,
  noteId: string,
  reaction: string,
  myReaction: string | null | undefined,
  isBusy: () => boolean,
  setBusy: (v: boolean) => void,
): Promise<boolean> {
  if (isBusy()) return false;

  setBusy(true);
  try {
    if (myReaction === reaction) {
      // 同じリアクション → 削除
      await deleteReaction(cli, noteId);
    } else if (myReaction) {
      // 異なるリアクションがある → 削除してから追加
      await deleteReaction(cli, noteId);
      await addReaction(cli, noteId, reaction);
    } else {
      // リアクションなし → 追加
      await addReaction(cli, noteId, reaction);
    }
    return true;
  } finally {
    setBusy(false);
  }
}

// ─── デッキフィルタリング ───

/**
 * 絵文字リストを検索クエリでフィルタリングする。
 * クエリが空の場合は全件返す。
 * 大文字小文字を区別しない。
 */
export function filterEmojis(emojis: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return emojis;
  return emojis.filter((e) => e.toLowerCase().includes(q));
}

/**
 * リアクションデッキ（文字列配列）からページネーションされたスライスを返す。
 */
export function paginateDeck(deck: string[], page: number, perPage: number): string[] {
  const start = page * perPage;
  return deck.slice(start, start + perPage);
}

/**
 * カスタム絵文字かどうかを判定する。
 * `:emoji_name:` 形式なら true。
 */
export function isCustomEmoji(reaction: string): boolean {
  return reaction.startsWith(':') && reaction.endsWith(':') && reaction.length > 2;
}
