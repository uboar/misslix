/**
 * MissLIX 型定義 — Phase 1: 認証・カラム管理に必要な型
 * ノート関連型はPhase 4で追加する
 */

import type { Stream, ChannelConnection, api, entities } from 'misskey-js';
import type { NotificationState } from './stores/notifications.svelte';

type APIClient = api.APIClient;
type EmojiDetailed = entities.EmojiDetailed;

// ─── アカウント ───

export type Account = {
  id: number;
  userName: string;
  hostUrl: string;
  token: string;
  sessionId?: string;
  ok: boolean;
  themeColor?: string;
};

export type AccountRuntime = {
  stream: Stream;
  cli: APIClient;
  mainConnection: ChannelConnection;
  notifState: NotificationState;
  emojis: EmojiDetailed[];
  busy: boolean;
  userId: string;
};

// ─── カラム ───

export type ChannelType =
  | 'homeTimeline'
  | 'localTimeline'
  | 'hybridTimeline'
  | 'globalTimeline'
  | 'channel'
  | 'antenna'
  | 'userList'
  | 'roleTimeline';

export type ColumnWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export const COLUMN_WIDTH_MAP: Record<ColumnWidth, string> = {
  sm: '12rem',
  md: '24rem',
  lg: '36rem',
  xl: '48rem',
  full: '100vw',
};

export type NoteDisplayConfig = {
  mediaHidden: boolean;
  mediaSize: number;
  reactionsHidden: boolean;
  reactionSize: number;
  cwExpanded: boolean;
  nsfwShown: boolean;
  collapseEnabled: boolean;
  collapseHeight: number;
};

export type ColumnConfig = {
  id: number;
  accountId: number;
  channel: ChannelType;
  channelId?: string;
  channelName: string;
  customName?: string;
  color: string;
  width: ColumnWidth;
  customWidth?: number;
  maxNotes: number;
  bufferSize: number;
  collapsed: boolean;
  autoCollapse: boolean;
  lowRate: boolean;
  reactionDeck: string[];
  noteDisplay: NoteDisplayConfig;
  /** カラムから投稿する際のデフォルト公開範囲 */
  defaultVisibility?: Visibility;
  /** カラムから投稿する際のデフォルトローカル限定設定 */
  defaultLocalOnly?: boolean;
};

export const DEFAULT_NOTE_DISPLAY: NoteDisplayConfig = {
  mediaHidden: false,
  mediaSize: 200,
  reactionsHidden: false,
  reactionSize: 24,
  cwExpanded: false,
  nsfwShown: false,
  collapseEnabled: true,
  collapseHeight: 500,
};

// ─── 可視性 ───

export type Visibility = 'public' | 'home' | 'followers' | 'specified';

// ─── 設定 ───

export type MediaDisplayMode = 'grid' | 'carousel';

export type SettingsType = {
  theme: string;
  emojiSpace: boolean;
  virtualScroll: boolean;
  autoFetch: boolean;
  notificationBuffer: number;
  muteUsers: string[];
  muteWords: string[];
  mediaDisplayMode: MediaDisplayMode;
};

export const DEFAULT_SETTINGS: SettingsType = {
  theme: 'dark',
  emojiSpace: true,
  virtualScroll: true,
  autoFetch: true,
  notificationBuffer: 100,
  muteUsers: [],
  muteWords: [],
  mediaDisplayMode: 'grid',
};

// ─── プリセット ───

export type ColumnPreset = {
  id: string;
  name: string;
  columns: ColumnConfig[];
  createdAt: number;
};

// ─── APIエンドポイント情報 ───

export type ChannelEndpointInfo = {
  streamChannel: string;
  restEndpoint: string;
  paramKey?: string;
};

// ─── ノート表示 (Phase 4) ───

/**
 * タイムライン上のノートラッパー型。
 * misskey-js の entities.Note を拡張し、再帰的な renote/reply を持つ。
 */
export type NoteWrapper = entities.Note & {
  renote?: NoteWrapper;
  reply?: NoteWrapper;
  reactionEmojis?: Record<string, string>;
};
