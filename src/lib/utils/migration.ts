import type { Account, ColumnConfig, ColumnPreset, MergeSourceDef, NoteDisplayConfig, SettingsType } from '$lib/types';
import { DEFAULT_NOTE_DISPLAY, DEFAULT_SETTINGS } from '$lib/types';

/**
 * Settings: 既存データに不足フィールドがあればデフォルト値で補完する。
 * 型が異なる値はデフォルト値に差し替える。
 */
export function migrateSettings(raw: unknown): SettingsType {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS };
  }
  const stored = raw as Record<string, unknown>;
  const result = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SettingsType)[]) {
    if (key in stored && stored[key] !== undefined) {
      result[key] = stored[key];
    }
  }
  return result as SettingsType;
}

/**
 * NoteDisplayConfig: 不足フィールドをデフォルト値で補完する。
 */
export function migrateNoteDisplay(raw: unknown): NoteDisplayConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_NOTE_DISPLAY };
  }
  return { ...DEFAULT_NOTE_DISPLAY, ...(raw as Partial<NoteDisplayConfig>) };
}

function isValidMergeSourceDef(raw: unknown): raw is MergeSourceDef {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const s = raw as Record<string, unknown>;
  return (
    typeof s.accountId === 'number' &&
    typeof s.channel === 'string' &&
    typeof s.channelName === 'string' &&
    typeof s.color === 'string'
  );
}

const VALID_WIDTHS = ['sm', 'md', 'lg', 'xl', 'full'] as const;
const VALID_VISIBILITIES = ['public', 'home', 'followers', 'specified'] as const;

/**
 * ColumnConfig: 必須フィールドが欠落している場合は null を返す。
 * 省略可能フィールドは適切なデフォルト値で補完する。
 */
export function migrateColumn(raw: unknown): ColumnConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;

  if (typeof c.id !== 'number' || typeof c.accountId !== 'number' || typeof c.channel !== 'string') {
    return null;
  }

  return {
    id: c.id as number,
    accountId: c.accountId as number,
    channel: c.channel as ColumnConfig['channel'],
    channelId: typeof c.channelId === 'string' ? c.channelId : undefined,
    channelName: typeof c.channelName === 'string' ? c.channelName : '',
    customName: typeof c.customName === 'string' ? c.customName : undefined,
    color: typeof c.color === 'string' ? c.color : '#86b300',
    width: VALID_WIDTHS.includes(c.width as ColumnConfig['width'])
      ? (c.width as ColumnConfig['width'])
      : 'md',
    customWidth: typeof c.customWidth === 'number' ? c.customWidth : undefined,
    maxNotes: typeof c.maxNotes === 'number' ? c.maxNotes : 100,
    bufferSize: typeof c.bufferSize === 'number' ? c.bufferSize : 250,
    collapsed: typeof c.collapsed === 'boolean' ? c.collapsed : false,
    autoCollapse: typeof c.autoCollapse === 'boolean' ? c.autoCollapse : false,
    lowRate: typeof c.lowRate === 'boolean' ? c.lowRate : false,
    reactionDeck: Array.isArray(c.reactionDeck)
      ? (c.reactionDeck as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    noteDisplay: migrateNoteDisplay(c.noteDisplay),
    defaultVisibility:
      typeof c.defaultVisibility === 'string' &&
      (VALID_VISIBILITIES as readonly string[]).includes(c.defaultVisibility)
        ? (c.defaultVisibility as ColumnConfig['defaultVisibility'])
        : undefined,
    defaultLocalOnly: typeof c.defaultLocalOnly === 'boolean' ? c.defaultLocalOnly : undefined,
    sourceColumns: Array.isArray(c.sourceColumns)
      ? (c.sourceColumns as unknown[]).filter(isValidMergeSourceDef)
      : undefined,
    sourcePresetId: typeof c.sourcePresetId === 'string' ? c.sourcePresetId : undefined,
  };
}

/**
 * ColumnConfig[]: 無効なエントリを除去し、各カラムを補完する。
 */
export function migrateColumns(raw: unknown): ColumnConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateColumn).filter((c): c is ColumnConfig => c !== null);
}

/**
 * Account: 必須フィールドが欠落している場合は null を返す。
 */
export function migrateAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const a = raw as Record<string, unknown>;

  if (typeof a.id !== 'number' || typeof a.hostUrl !== 'string' || typeof a.token !== 'string') {
    return null;
  }

  return {
    id: a.id as number,
    userName: typeof a.userName === 'string' ? a.userName : '',
    hostUrl: a.hostUrl as string,
    token: a.token as string,
    sessionId: typeof a.sessionId === 'string' ? a.sessionId : undefined,
    ok: typeof a.ok === 'boolean' ? a.ok : false,
    themeColor: typeof a.themeColor === 'string' ? a.themeColor : undefined,
  };
}

/**
 * Account[]: 無効なエントリを除去し、各アカウントを補完する。
 */
export function migrateAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateAccount).filter((a): a is Account => a !== null);
}

/**
 * ColumnPreset: 必須フィールドが欠落している場合は null を返す。
 */
export function migratePreset(raw: unknown): ColumnPreset | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;

  if (typeof p.id !== 'string' || typeof p.name !== 'string') return null;

  return {
    id: p.id as string,
    name: p.name as string,
    columns: migrateColumns(p.columns),
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
  };
}

/**
 * ColumnPreset[]: 無効なエントリを除去し、各プリセットを補完する。
 */
export function migratePresets(raw: unknown): ColumnPreset[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(migratePreset).filter((p): p is ColumnPreset => p !== null);
}
