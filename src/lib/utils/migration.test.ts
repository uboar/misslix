import { describe, it, expect } from 'vitest';
import {
  migrateSettings,
  migrateNoteDisplay,
  migrateColumn,
  migrateColumns,
  migrateAccount,
  migrateAccounts,
  migratePreset,
  migratePresets,
} from './migration';
import { DEFAULT_NOTE_DISPLAY, DEFAULT_SETTINGS } from '$lib/types';

// ─── migrateSettings ───

describe('migrateSettings', () => {
  it('returns DEFAULT_SETTINGS for null', () => {
    expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns DEFAULT_SETTINGS for non-object', () => {
    expect(migrateSettings('string')).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings(42)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it('returns DEFAULT_SETTINGS for empty object', () => {
    expect(migrateSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid stored values', () => {
    const stored = { ...DEFAULT_SETTINGS, theme: 'light', emojiSpace: false };
    const result = migrateSettings(stored);
    expect(result.theme).toBe('light');
    expect(result.emojiSpace).toBe(false);
  });

  it('fills missing fields with defaults', () => {
    const stored = { theme: 'light' }; // missing many fields
    const result = migrateSettings(stored);
    expect(result.theme).toBe('light');
    expect(result.muteUsers).toEqual([]);
    expect(result.muteWords).toEqual([]);
    expect(result.mediaDisplayMode).toBe('grid');
    expect(result.notificationBuffer).toBe(100);
  });

  it('ignores unknown fields', () => {
    const stored = { ...DEFAULT_SETTINGS, unknownField: 'should be ignored' };
    const result = migrateSettings(stored);
    expect('unknownField' in result).toBe(false);
  });
});

// ─── migrateNoteDisplay ───

describe('migrateNoteDisplay', () => {
  it('returns defaults for null', () => {
    expect(migrateNoteDisplay(null)).toEqual(DEFAULT_NOTE_DISPLAY);
  });

  it('returns defaults for non-object', () => {
    expect(migrateNoteDisplay('bad')).toEqual(DEFAULT_NOTE_DISPLAY);
  });

  it('fills missing fields with defaults', () => {
    const partial = { mediaHidden: true };
    const result = migrateNoteDisplay(partial);
    expect(result.mediaHidden).toBe(true);
    expect(result.mediaSize).toBe(DEFAULT_NOTE_DISPLAY.mediaSize);
    expect(result.collapseEnabled).toBe(DEFAULT_NOTE_DISPLAY.collapseEnabled);
  });

  it('returns full valid config as-is', () => {
    const full = { ...DEFAULT_NOTE_DISPLAY, mediaSize: 300 };
    expect(migrateNoteDisplay(full)).toEqual(full);
  });
});

// ─── migrateColumn ───

describe('migrateColumn', () => {
  const validColumn = {
    id: 1,
    accountId: 10,
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
  };

  it('returns null for null/non-object', () => {
    expect(migrateColumn(null)).toBeNull();
    expect(migrateColumn('bad')).toBeNull();
    expect(migrateColumn([])).toBeNull();
  });

  it('returns null when id is missing', () => {
    const { id: _id, ...noId } = validColumn;
    expect(migrateColumn(noId)).toBeNull();
  });

  it('returns null when accountId is missing', () => {
    const { accountId: _aid, ...noAccountId } = validColumn;
    expect(migrateColumn(noAccountId)).toBeNull();
  });

  it('returns null when channel is missing', () => {
    const { channel: _ch, ...noChannel } = validColumn;
    expect(migrateColumn(noChannel)).toBeNull();
  });

  it('migrates a valid column', () => {
    const result = migrateColumn(validColumn);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.accountId).toBe(10);
    expect(result!.channel).toBe('homeTimeline');
  });

  it('fills missing optional fields with defaults', () => {
    const minimal = { id: 1, accountId: 10, channel: 'localTimeline' };
    const result = migrateColumn(minimal);
    expect(result).not.toBeNull();
    expect(result!.channelName).toBe('');
    expect(result!.color).toBe('#86b300');
    expect(result!.width).toBe('md');
    expect(result!.maxNotes).toBe(100);
    expect(result!.bufferSize).toBe(250);
    expect(result!.collapsed).toBe(false);
    expect(result!.autoCollapse).toBe(false);
    expect(result!.lowRate).toBe(false);
    expect(result!.reactionDeck).toEqual([]);
    expect(result!.noteDisplay).toEqual(DEFAULT_NOTE_DISPLAY);
  });

  it('falls back to "md" for invalid width', () => {
    const result = migrateColumn({ ...validColumn, width: 'invalid' });
    expect(result!.width).toBe('md');
  });

  it('migrates noteDisplay when partial', () => {
    const col = { ...validColumn, noteDisplay: { mediaHidden: true } };
    const result = migrateColumn(col);
    expect(result!.noteDisplay.mediaHidden).toBe(true);
    expect(result!.noteDisplay.mediaSize).toBe(DEFAULT_NOTE_DISPLAY.mediaSize);
  });

  it('filters non-string values from reactionDeck', () => {
    const col = { ...validColumn, reactionDeck: ['👍', 42, null, '❤️'] };
    const result = migrateColumn(col);
    expect(result!.reactionDeck).toEqual(['👍', '❤️']);
  });

  it('sets undefined for invalid defaultVisibility', () => {
    const col = { ...validColumn, defaultVisibility: 'invalid' };
    const result = migrateColumn(col);
    expect(result!.defaultVisibility).toBeUndefined();
  });

  it('keeps valid defaultVisibility', () => {
    const col = { ...validColumn, defaultVisibility: 'home' };
    const result = migrateColumn(col);
    expect(result!.defaultVisibility).toBe('home');
  });
});

// ─── migrateColumns ───

describe('migrateColumns', () => {
  it('returns empty array for non-array', () => {
    expect(migrateColumns(null)).toEqual([]);
    expect(migrateColumns({})).toEqual([]);
  });

  it('filters out invalid columns', () => {
    const arr = [
      { id: 1, accountId: 10, channel: 'homeTimeline' },
      { notAColumn: true },
      { id: 2, accountId: 20, channel: 'localTimeline' },
    ];
    const result = migrateColumns(arr);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });
});

// ─── migrateAccount ───

describe('migrateAccount', () => {
  const validAccount = {
    id: 1,
    userName: 'testuser',
    hostUrl: 'https://misskey.example',
    token: 'abc123',
    ok: true,
  };

  it('returns null for non-object', () => {
    expect(migrateAccount(null)).toBeNull();
    expect(migrateAccount('bad')).toBeNull();
  });

  it('returns null when id is missing', () => {
    const { id: _id, ...noId } = validAccount;
    expect(migrateAccount(noId)).toBeNull();
  });

  it('returns null when hostUrl is missing', () => {
    const { hostUrl: _h, ...noHost } = validAccount;
    expect(migrateAccount(noHost)).toBeNull();
  });

  it('returns null when token is missing', () => {
    const { token: _t, ...noToken } = validAccount;
    expect(migrateAccount(noToken)).toBeNull();
  });

  it('migrates a valid account', () => {
    const result = migrateAccount(validAccount);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.ok).toBe(true);
  });

  it('defaults ok to false when missing', () => {
    const { ok: _ok, ...noOk } = validAccount;
    const result = migrateAccount(noOk);
    expect(result!.ok).toBe(false);
  });

  it('defaults userName to empty string when missing', () => {
    const { userName: _u, ...noName } = validAccount;
    const result = migrateAccount(noName);
    expect(result!.userName).toBe('');
  });
});

// ─── migrateAccounts ───

describe('migrateAccounts', () => {
  it('returns empty array for non-array', () => {
    expect(migrateAccounts(null)).toEqual([]);
  });

  it('filters out invalid accounts', () => {
    const arr = [
      { id: 1, hostUrl: 'https://example.com', token: 'tok1', ok: true },
      { notAnAccount: true },
      { id: 2, hostUrl: 'https://other.com', token: 'tok2', ok: false },
    ];
    const result = migrateAccounts(arr);
    expect(result).toHaveLength(2);
  });
});

// ─── migratePreset ───

describe('migratePreset', () => {
  it('returns null for non-object', () => {
    expect(migratePreset(null)).toBeNull();
    expect(migratePreset('bad')).toBeNull();
  });

  it('returns null when id is missing', () => {
    expect(migratePreset({ name: 'Test', columns: [], createdAt: 0 })).toBeNull();
  });

  it('returns null when name is missing', () => {
    expect(migratePreset({ id: 'abc', columns: [], createdAt: 0 })).toBeNull();
  });

  it('migrates a valid preset', () => {
    const preset = {
      id: 'preset-1',
      name: 'My Preset',
      columns: [{ id: 1, accountId: 10, channel: 'homeTimeline' }],
      createdAt: 1000000,
    };
    const result = migratePreset(preset);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('preset-1');
    expect(result!.name).toBe('My Preset');
    expect(result!.columns).toHaveLength(1);
    expect(result!.createdAt).toBe(1000000);
  });

  it('uses Date.now() for missing createdAt', () => {
    const before = Date.now();
    const result = migratePreset({ id: 'x', name: 'Y', columns: [] });
    const after = Date.now();
    expect(result!.createdAt).toBeGreaterThanOrEqual(before);
    expect(result!.createdAt).toBeLessThanOrEqual(after);
  });
});

// ─── migratePresets ───

describe('migratePresets', () => {
  it('returns empty array for non-array', () => {
    expect(migratePresets(null)).toEqual([]);
  });

  it('filters out invalid presets', () => {
    const arr = [
      { id: 'a', name: 'A', columns: [], createdAt: 1 },
      { bad: true },
    ];
    const result = migratePresets(arr);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });
});
