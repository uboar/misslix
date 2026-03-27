/**
 * マージタイムライン用の重複排除ユーティリティ
 */
import type { entities } from 'misskey-js';

/**
 * ノートの重複排除キーを生成する。
 * 連合ノートはURIで一意に識別。ローカルノートはhost+idでフォールバック。
 */
export function getDeduplicationKey(note: entities.Note, accountHostUrl: string): string {
  if (note.uri) return note.uri;
  const host = accountHostUrl.replace(/^https?:\/\//, '');
  return `https://${host}/notes/${note.id}`;
}

/**
 * ノートがオリジンサーバー (投稿者のホームサーバー) のコピーか判定する。
 * user.host が null/undefined の場合、そのノートは閲覧アカウントのサーバー上で
 * 投稿されたオリジナルである。
 */
export function isOriginCopy(note: entities.Note): boolean {
  return note.user.host === null || note.user.host === undefined;
}

/**
 * 既存のノートを新しい到着ノートで置換すべきか判定する。
 * オリジンサーバーのコピーを優先する。
 */
export function shouldReplace(
  _existingNote: entities.Note,
  incomingNote: entities.Note,
): boolean {
  return isOriginCopy(incomingNote);
}
