import type { ChannelType, ChannelEndpointInfo } from '$lib/types';

/** チャンネル種別ごとに有効な取得オプション */
export const FETCH_OPTION_SUPPORT: Record<ChannelType, { withReplies: boolean; withRenotes: boolean; onlyMedia: boolean }> = {
  homeTimeline:              { withReplies: true,  withRenotes: true,  onlyMedia: true  },
  localTimeline:             { withReplies: false, withRenotes: true,  onlyMedia: true  },
  hybridTimeline:            { withReplies: true,  withRenotes: true,  onlyMedia: true  },
  globalTimeline:            { withReplies: false, withRenotes: true,  onlyMedia: true  },
  channel:                   { withReplies: false, withRenotes: true,  onlyMedia: false },
  antenna:                   { withReplies: false, withRenotes: false, onlyMedia: false },
  userList:                  { withReplies: false, withRenotes: true,  onlyMedia: true  },
  roleTimeline:              { withReplies: false, withRenotes: false, onlyMedia: false },
  userTimeline:              { withReplies: false, withRenotes: true,  onlyMedia: true  },
  mergeTimeline:             { withReplies: false, withRenotes: false, onlyMedia: false },
  mergeNotificationTimeline: { withReplies: false, withRenotes: false, onlyMedia: false },
  accountUtility:            { withReplies: false, withRenotes: false, onlyMedia: false },
};

/**
 * チャンネル種別ごとのストリーミングチャンネル名とRESTエンドポイントのマッピング
 */
export const CHANNEL_ENDPOINTS: Record<ChannelType, ChannelEndpointInfo> = {
  homeTimeline: {
    streamChannel: 'homeTimeline',
    restEndpoint: 'notes/timeline',
  },
  localTimeline: {
    streamChannel: 'localTimeline',
    restEndpoint: 'notes/local-timeline',
  },
  hybridTimeline: {
    streamChannel: 'hybridTimeline',
    restEndpoint: 'notes/hybrid-timeline',
  },
  globalTimeline: {
    streamChannel: 'globalTimeline',
    restEndpoint: 'notes/global-timeline',
  },
  channel: {
    streamChannel: 'channel',
    restEndpoint: 'channels/timeline',
    paramKey: 'channelId',
  },
  antenna: {
    streamChannel: 'antenna',
    restEndpoint: 'antennas/notes',
    paramKey: 'antennaId',
  },
  userList: {
    streamChannel: 'userList',
    restEndpoint: 'notes/user-list-timeline',
    paramKey: 'listId',
  },
  roleTimeline: {
    streamChannel: 'roleTimeline',
    restEndpoint: 'roles/notes',
    paramKey: 'roleId',
  },
  userTimeline: {
    streamChannel: '',
    restEndpoint: 'users/notes',
    paramKey: 'userId',
  },
  mergeTimeline: {
    streamChannel: '',
    restEndpoint: '',
  },
  mergeNotificationTimeline: {
    streamChannel: '',
    restEndpoint: 'i/notifications',
  },
  accountUtility: {
    streamChannel: '',
    restEndpoint: '',
  },
};

/**
 * MiAuth認証で要求する権限
 */
export const MIAUTH_PERMISSIONS = [
  'read:account',
  'write:account',
  'read:blocks',
  'write:blocks',
  'read:drive',
  'write:drive',
  'read:favorites',
  'write:favorites',
  'read:following',
  'write:following',
  'read:mutes',
  'write:mutes',
  'write:notes',
  'read:notifications',
  'write:notifications',
  'read:reactions',
  'write:reactions',
  'write:votes',
  'read:channels',
  'write:channels',
] as const;
