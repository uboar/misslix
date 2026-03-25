import { describe, it, expect } from 'vitest';
import type { entities } from 'misskey-js';
import { checkMute } from './mute';

function makeNote(overrides: Record<string, unknown> = {}): entities.Note {
  return {
    id: 'note1',
    createdAt: '2024-01-01T00:00:00Z',
    userId: 'user1',
    user: {
      id: 'user1',
      username: 'alice',
      host: null,
      avatarUrl: null,
      avatarBlurhash: null,
      avatarDecorations: [],
      isBot: false,
      isCat: false,
      onlineStatus: 'unknown',
      badgeRoles: [],
    },
    text: 'Hello world',
    cw: null,
    visibility: 'public',
    localOnly: false,
    reactionAcceptance: null,
    reactionEmojis: {},
    reactions: {},
    reactionCount: 0,
    renoteCount: 0,
    repliesCount: 0,
    uri: undefined,
    url: undefined,
    ...overrides,
  } as unknown as entities.Note;
}

describe('checkMute', () => {
  describe('ユーザーミュート', () => {
    it('username@host 形式でミュートされたリモートユーザーを検出する', () => {
      const note = makeNote({
        user: {
          id: 'u1',
          username: 'bob',
          host: 'example.com',
          avatarUrl: null,
          avatarBlurhash: null,
          avatarDecorations: [],
          isBot: false,
          isCat: false,
          onlineStatus: 'unknown',
          badgeRoles: [],
        },
      });
      const result = checkMute(note, ['bob@example.com'], []);
      expect(result).not.toBeNull();
      expect(result).toContain('bob@example.com');
    });

    it('username@ 形式でミュートされたローカルユーザーを検出する', () => {
      const note = makeNote({
        user: {
          id: 'u2',
          username: 'alice',
          host: null,
          avatarUrl: null,
          avatarBlurhash: null,
          avatarDecorations: [],
          isBot: false,
          isCat: false,
          onlineStatus: 'unknown',
          badgeRoles: [],
        },
      });
      const result = checkMute(note, ['alice@'], []);
      expect(result).not.toBeNull();
      expect(result).toContain('alice@');
    });

    it('ミュートリストにないユーザーは null を返す', () => {
      const note = makeNote();
      const result = checkMute(note, ['other@'], []);
      expect(result).toBeNull();
    });

    it('Renote元のユーザーがミュートされている場合を検出する', () => {
      const renoteUser = {
        id: 'u3',
        username: 'charlie',
        host: 'remote.example',
        avatarUrl: null,
        avatarBlurhash: null,
        avatarDecorations: [],
        isBot: false,
        isCat: false,
        onlineStatus: 'unknown',
        badgeRoles: [],
      };
      const note = makeNote({
        renote: makeNote({
          user: renoteUser,
          text: 'Renoted text',
        }),
      });
      const result = checkMute(note, ['charlie@remote.example'], []);
      expect(result).not.toBeNull();
      expect(result).toContain('charlie@remote.example');
    });
  });

  describe('ワードミュート', () => {
    it('ノートテキストに含まれるワードを検出する', () => {
      const note = makeNote({ text: 'This contains a badword here' });
      const result = checkMute(note, [], ['badword']);
      expect(result).not.toBeNull();
      expect(result).toContain('badword');
    });

    it('正規表現パターンでワードミュートを検出する', () => {
      const note = makeNote({ text: 'test123 is here' });
      const result = checkMute(note, [], ['test\\d+']);
      expect(result).not.toBeNull();
    });

    it('CWテキストに含まれるワードを検出する', () => {
      const note = makeNote({ text: 'normal text', cw: 'sensitive topic' });
      const result = checkMute(note, [], ['sensitive']);
      expect(result).not.toBeNull();
    });

    it('Renote元のテキストに含まれるワードを検出する', () => {
      const note = makeNote({
        text: 'I agree',
        renote: makeNote({ text: 'This contains forbidden content' }),
      });
      const result = checkMute(note, [], ['forbidden']);
      expect(result).not.toBeNull();
    });

    it('テキストがマッチしない場合は null を返す', () => {
      const note = makeNote({ text: 'safe and clean content' });
      const result = checkMute(note, [], ['badword', 'offensive']);
      expect(result).toBeNull();
    });

    it('無効な正規表現は無視して処理を続ける', () => {
      const note = makeNote({ text: 'hello world' });
      // 無効な正規表現と有効なワードを混在させる
      const result = checkMute(note, [], ['[invalid(regex', 'hello']);
      // 無効な正規表現はスキップされ、有効な 'hello' でヒットする
      expect(result).not.toBeNull();
    });

    it('複数の無効な正規表現だけの場合は null を返す', () => {
      const note = makeNote({ text: 'hello world' });
      const result = checkMute(note, [], ['[invalid(regex', '(?invalid)']);
      expect(result).toBeNull();
    });
  });

  describe('ミュートなし', () => {
    it('空のミュートリストでは null を返す', () => {
      const note = makeNote();
      expect(checkMute(note, [], [])).toBeNull();
    });

    it('テキストが空の場合はワードミュートにかからない', () => {
      const note = makeNote({ text: null, cw: null });
      const result = checkMute(note, [], ['anyword']);
      expect(result).toBeNull();
    });
  });
});
