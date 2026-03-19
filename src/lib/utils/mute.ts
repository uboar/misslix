/**
 * ミュート判定ロジック
 *
 * ユーザーミュートおよびワードミュートの判定を行う。
 * Renote元のノートも再帰的にチェックする。
 */

import type { entities } from 'misskey-js';

/**
 * ユーザーの識別子を "username@host" 形式で返す。
 * ローカルユーザー (host が null) の場合は "username@" を返す。
 */
function getUserIdentifier(user: entities.Note['user']): string {
  return `${user.username}@${user.host ?? ''}`;
}

/**
 * ノートのテキストを連結して返す (text + cw)。
 */
function getNoteText(note: entities.Note): string {
  const parts: string[] = [];
  if (note.text) parts.push(note.text);
  if (note.cw) parts.push(note.cw);
  return parts.join(' ');
}

/**
 * ノートがミュート対象かどうかを判定する。
 *
 * @param note - 判定対象のノート
 * @param muteUsers - ミュートユーザーリスト ("user@host" 形式)
 * @param muteWords - ミュートワードリスト (正規表現文字列)
 * @returns ミュート理由の文字列、またはnull（ミュートでない場合）
 */
export function checkMute(
  note: entities.Note,
  muteUsers: string[],
  muteWords: string[],
): string | null {
  // ユーザーミュートチェック (ノート投稿者)
  const userIdentifier = getUserIdentifier(note.user);
  if (muteUsers.includes(userIdentifier)) {
    return `ミュートユーザー: ${userIdentifier}`;
  }

  // ユーザーミュートチェック (Renote元)
  if (note.renote) {
    const renoteUserIdentifier = getUserIdentifier(note.renote.user);
    if (muteUsers.includes(renoteUserIdentifier)) {
      return `ミュートユーザー: ${renoteUserIdentifier}`;
    }
  }

  // ワードミュートチェック
  const noteText = getNoteText(note);
  const renoteText = note.renote ? getNoteText(note.renote) : '';
  const fullText = [noteText, renoteText].filter(Boolean).join(' ');

  for (const wordPattern of muteWords) {
    let regex: RegExp;
    try {
      regex = new RegExp(wordPattern);
    } catch {
      // 無効な正規表現は無視する
      continue;
    }

    if (fullText && regex.test(fullText)) {
      return `ミュートワード: (${wordPattern})`;
    }
  }

  return null;
}
