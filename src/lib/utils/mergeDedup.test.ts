import { describe, it, expect } from 'vitest';
import { getDeduplicationKey, isOriginCopy, shouldReplace } from './mergeDedup';
import type { entities } from 'misskey-js';

function makeNote(overrides: Partial<entities.Note> = {}): entities.Note {
  return {
    id: 'note1',
    createdAt: '2024-01-01T00:00:00Z',
    text: 'hello',
    cw: null,
    user: {
      id: 'user1',
      username: 'testuser',
      host: null,
      name: 'Test User',
      onlineStatus: 'online',
      avatarUrl: null,
      avatarBlurhash: null,
    },
    userId: 'user1',
    visibility: 'public',
    localOnly: false,
    reactionAcceptance: null,
    reactions: {},
    renoteCount: 0,
    repliesCount: 0,
    fileIds: [],
    files: [],
    replyId: null,
    renoteId: null,
    clippedCount: 0,
    ...overrides,
  } as entities.Note;
}

describe('getDeduplicationKey', () => {
  it('URIがあるノートはURIをキーにする', () => {
    const note = makeNote({ uri: 'https://remote.example.com/notes/abc' });
    const key = getDeduplicationKey(note, 'https://local.example.com');
    expect(key).toBe('https://remote.example.com/notes/abc');
  });

  it('URIがないノートはhost+idでキーを生成する', () => {
    const note = makeNote({ id: 'note123', uri: undefined });
    const key = getDeduplicationKey(note, 'https://local.example.com');
    expect(key).toBe('https://local.example.com/notes/note123');
  });

  it('hostUrlのプロトコルを除去する', () => {
    const note = makeNote({ id: 'n1', uri: undefined });
    const key = getDeduplicationKey(note, 'http://example.com');
    expect(key).toBe('https://example.com/notes/n1');
  });
});

describe('isOriginCopy', () => {
  it('host=null はオリジンコピー', () => {
    const note = makeNote({ user: { ...makeNote().user, host: null } });
    expect(isOriginCopy(note)).toBe(true);
  });

  it('host=undefined はオリジンコピー', () => {
    const note = makeNote();
    (note.user as any).host = undefined;
    expect(isOriginCopy(note)).toBe(true);
  });

  it('host="remote.example.com" はオリジンコピーではない', () => {
    const note = makeNote({
      user: { ...makeNote().user, host: 'remote.example.com' },
    });
    expect(isOriginCopy(note)).toBe(false);
  });
});

describe('shouldReplace', () => {
  it('incomingがオリジンコピーなら置換する', () => {
    const existing = makeNote({ user: { ...makeNote().user, host: 'remote.com' } });
    const incoming = makeNote({ user: { ...makeNote().user, host: null } });
    expect(shouldReplace(existing, incoming)).toBe(true);
  });

  it('incomingがリモートコピーなら置換しない', () => {
    const existing = makeNote({ user: { ...makeNote().user, host: null } });
    const incoming = makeNote({ user: { ...makeNote().user, host: 'remote.com' } });
    expect(shouldReplace(existing, incoming)).toBe(false);
  });
});
