import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { entities } from 'misskey-js';
import type { AccountRuntime, ColumnConfig } from '$lib/types';
import { DEFAULT_NOTE_DISPLAY } from '$lib/types';
import { connectTimeline } from './streaming';

// misskey-js の Stream をモック
function makeStreamMock() {
  const channelListeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  const streamListeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  const mockConnection = {
    _eventName: '',
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!channelListeners[event]) channelListeners[event] = [];
      channelListeners[event].push(handler);
    }),
    dispose: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      channelListeners[event]?.forEach((h) => h(...args));
    },
  };

  const mockStream = {
    useChannel: vi.fn((_channelName: string, _params?: unknown) => mockConnection),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!streamListeners[event]) streamListeners[event] = [];
      streamListeners[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (streamListeners[event]) {
        streamListeners[event] = streamListeners[event].filter((h) => h !== handler);
      }
    }),
    send: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      streamListeners[event]?.forEach((h) => h(...args));
    },
  };

  return { mockStream, mockConnection, channelListeners, streamListeners };
}

function makeRuntime(mockStream: ReturnType<typeof makeStreamMock>['mockStream']): AccountRuntime {
  return {
    stream: mockStream as unknown as AccountRuntime['stream'],
    cli: {} as AccountRuntime['cli'],
    mainConnection: {} as AccountRuntime['mainConnection'],
    notifications: [],
    hasUnread: false,
    emojis: [],
    busy: false,
  };
}

function makeColumnConfig(overrides: Partial<ColumnConfig> = {}): ColumnConfig {
  return {
    id: 1,
    accountId: 1,
    channel: 'homeTimeline',
    channelName: 'Home',
    color: '#86b300',
    width: 'md',
    maxNotes: 100,
    bufferSize: 250,
    collapsed: false,
    autoCollapse: false,
    lowRate: false,
    reactionDeck: [],
    noteDisplay: { ...DEFAULT_NOTE_DISPLAY },
    ...overrides,
  };
}

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
    text: 'test',
    cw: null,
    visibility: 'public',
    localOnly: false,
    reactionAcceptance: null,
    reactionEmojis: {},
    reactions: {},
    renoteCount: 0,
    repliesCount: 0,
    ...overrides,
  } as entities.Note;
}

describe('connectTimeline', () => {
  let mockSetup: ReturnType<typeof makeStreamMock>;

  beforeEach(() => {
    mockSetup = makeStreamMock();
  });

  it('homeTimeline チャンネルに接続するとき useChannel が正しい引数で呼ばれる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig({ channel: 'homeTimeline' });

    connectTimeline(runtime, config, { onNote: vi.fn() });

    expect(mockSetup.mockStream.useChannel).toHaveBeenCalledWith('homeTimeline', undefined);
  });

  it('localTimeline チャンネルに接続するとき useChannel が正しいチャンネル名で呼ばれる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig({ channel: 'localTimeline' });

    connectTimeline(runtime, config, { onNote: vi.fn() });

    expect(mockSetup.mockStream.useChannel).toHaveBeenCalledWith('localTimeline', undefined);
  });

  it('channel タイプのとき channelId がパラメータとして渡される', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig({ channel: 'channel', channelId: 'ch123' });

    connectTimeline(runtime, config, { onNote: vi.fn() });

    expect(mockSetup.mockStream.useChannel).toHaveBeenCalledWith('channel', { channelId: 'ch123' });
  });

  it('antenna タイプのとき antennaId がパラメータとして渡される', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig({ channel: 'antenna', channelId: 'ant456' });

    connectTimeline(runtime, config, { onNote: vi.fn() });

    expect(mockSetup.mockStream.useChannel).toHaveBeenCalledWith('antenna', { antennaId: 'ant456' });
  });

  it('channelId が未定義の場合、paramKey があってもパラメータは undefined になる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig({ channel: 'channel', channelId: undefined });

    connectTimeline(runtime, config, { onNote: vi.fn() });

    expect(mockSetup.mockStream.useChannel).toHaveBeenCalledWith('channel', undefined);
  });

  it('note イベントが発生したとき onNote コールバックが呼ばれる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();
    const onNote = vi.fn();

    connectTimeline(runtime, config, { onNote });

    const note = makeNote();
    mockSetup.mockConnection.emit('note', note);

    expect(onNote).toHaveBeenCalledWith(note);
    expect(onNote).toHaveBeenCalledTimes(1);
  });

  it('複数の note イベントでそれぞれ onNote が呼ばれる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();
    const onNote = vi.fn();

    connectTimeline(runtime, config, { onNote });

    mockSetup.mockConnection.emit('note', makeNote({ id: 'n1' }));
    mockSetup.mockConnection.emit('note', makeNote({ id: 'n2' }));

    expect(onNote).toHaveBeenCalledTimes(2);
  });

  it('disconnect() を呼ぶと connection.dispose() が実行される', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();

    const conn = connectTimeline(runtime, config, { onNote: vi.fn() });
    conn.disconnect();

    expect(mockSetup.mockConnection.dispose).toHaveBeenCalledTimes(1);
  });

  it('onNoteUpdated コールバックがある場合、noteUpdated イベントが stream.on で登録される', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();
    const onNoteUpdated = vi.fn();

    connectTimeline(runtime, config, { onNote: vi.fn(), onNoteUpdated });

    expect(mockSetup.mockStream.on).toHaveBeenCalledWith('noteUpdated', expect.any(Function));
  });

  it('noteUpdated イベントが発生したとき onNoteUpdated コールバックが呼ばれる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();
    const onNoteUpdated = vi.fn();

    connectTimeline(runtime, config, { onNote: vi.fn(), onNoteUpdated });

    const eventData = { id: 'note1', type: 'reacted' as const, body: { reaction: ':like:' } };
    mockSetup.mockStream.emit('noteUpdated', eventData);

    expect(onNoteUpdated).toHaveBeenCalledWith(eventData);
  });

  it('disconnect() を呼ぶと stream.off で noteUpdated リスナーが解除される', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();
    const onNoteUpdated = vi.fn();

    const conn = connectTimeline(runtime, config, { onNote: vi.fn(), onNoteUpdated });
    conn.disconnect();

    expect(mockSetup.mockStream.off).toHaveBeenCalledWith('noteUpdated', expect.any(Function));
  });

  it('onNoteUpdated がない場合、disconnect() は stream.off を呼ばない', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();

    const conn = connectTimeline(runtime, config, { onNote: vi.fn() });
    conn.disconnect();

    expect(mockSetup.mockStream.off).not.toHaveBeenCalled();
  });

  it('subNote() を呼ぶと stream.send が subNote コマンドで呼ばれる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();

    const conn = connectTimeline(runtime, config, { onNote: vi.fn() });
    conn.subNote('note123');

    expect(mockSetup.mockStream.send).toHaveBeenCalledWith('subNote', { id: 'note123' });
  });

  it('unsubNote() を呼ぶと stream.send が unsubNote コマンドで呼ばれる', () => {
    const runtime = makeRuntime(mockSetup.mockStream);
    const config = makeColumnConfig();

    const conn = connectTimeline(runtime, config, { onNote: vi.fn() });
    conn.unsubNote('note456');

    expect(mockSetup.mockStream.send).toHaveBeenCalledWith('unsubNote', { id: 'note456' });
  });
});
